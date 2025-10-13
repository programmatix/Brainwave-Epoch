import React, { useRef, useEffect, useState, useCallback, Profiler } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { AllData, Artifact, Microwaking } from '../Loader/LoaderTypes';
import { FitbitHypnogramChart } from './FitbitHypnogramChart';
import { NightEventsChart } from './NightEventsChart';
import { ComparisonControls } from './ComparisonControls';
import { generateAnnotations, generateAnnotationsForLeft } from './EEGChartAnnotations';
import { eegChartOptions, LabelContent, millisecondsToSamples, sampleIndexToTime } from './ChartUtils';
import { useStore, StoreState } from '../Store/Store';
import { parseDateString } from '../Loader/Loader';
import { Slider } from './Slider';
import { MetricsTable } from './MetricsTable';
import { detectBlinks } from '../BlinkDetection/BlinkDetector';
import { VideoViewer } from '../Videos/VideoViewer';
import MovementTimeline from '../Movement/MovementTimeline';
import { RawPhysicalFeaturesChart } from './RawPhysicalFeaturesChart';
import { AudioFilmstrip } from '../Audio/AudioFilmstrip';
import { merge } from 'lodash';
import { AudioViewer } from '../Audio/AudioViewer';

Chart.register(...registerables, annotationPlugin);

export const SECONDS_PER_EPOCH = 30;
export const SECONDS_TO_SHOW = 30;
const BANDPASS_LOW_CUTOFF_HZ = 0.3;
const BANDPASS_HIGH_CUTOFF_HZ = 1.5;
const BANDPASS_TRANSITION_HZ = 0.2;

const bandpassCoefficientCache = new Map<number, Float64Array>();

const blackmanWindow = (length: number): Float64Array => {
    const window = new Float64Array(length);
    const denom = length - 1;
    for (let n = 0; n < length; n++) {
        window[n] = 0.42 - 0.5 * Math.cos((2 * Math.PI * n) / denom) + 0.08 * Math.cos((4 * Math.PI * n) / denom);
    }
    return window;
};

// Design a long Blackman-windowed FIR with ~0.2 Hz transition bands on each side.
const calculateFirCoefficients = (sampleRate: number): Float64Array => {
    const transition = BANDPASS_TRANSITION_HZ;
    let numTaps = Math.max(3, Math.ceil((3.3 * sampleRate) / transition));
    if (numTaps % 2 === 0) {
        numTaps += 1;
    }
    const nyquist = sampleRate / 2;

    const lowerEdge = Math.max(0, (BANDPASS_LOW_CUTOFF_HZ - transition) / sampleRate);
    const upperEdge = Math.min(nyquist / sampleRate, (BANDPASS_HIGH_CUTOFF_HZ + transition) / sampleRate);

    if (lowerEdge >= upperEdge) {
        return Float64Array.of(1);
    }

    const coeffs = new Float64Array(numTaps);
    const m = numTaps - 1;
    const center = m / 2;
    const window = blackmanWindow(numTaps);

    for (let n = 0; n < numTaps; n++) {
        const k = n - center;
        if (k === 0) {
            coeffs[n] = 2 * (upperEdge - lowerEdge);
        } else {
            coeffs[n] = (Math.sin(2 * Math.PI * upperEdge * k) - Math.sin(2 * Math.PI * lowerEdge * k)) / (Math.PI * k);
        }
        coeffs[n] *= window[n];
    }

    return coeffs;
};

const getBandpassCoefficients = (sampleRate: number): Float64Array => {
    if (!bandpassCoefficientCache.has(sampleRate)) {
        bandpassCoefficientCache.set(sampleRate, calculateFirCoefficients(sampleRate));
    }
    return bandpassCoefficientCache.get(sampleRate)!;
};

const applyFIR = (input: Float64Array, coeffs: Float64Array): Float64Array => {
    const output = new Float64Array(input.length);
    for (let i = 0; i < input.length; i++) {
        let acc = 0;
        const limit = Math.min(i, coeffs.length - 1);
        for (let j = 0; j <= limit; j++) {
            acc += coeffs[j] * input[i - j];
        }
        output[i] = acc;
    }
    return output;
};

const filtfilt = (data: number[], coeffs: Float64Array): number[] => {
    if (!data.length) {
        return new Array(data.length).fill(NaN);
    }

    if (coeffs.length === 1) {
        return data.slice();
    }

    if (coeffs.length < 3) {
        return data.map(() => NaN);
    }

    const order = coeffs.length - 1;
    const padLength = Math.min(data.length - 1, 3 * order);

    if (padLength < 1) {
        return data.slice();
    }

    const front: number[] = [];
    for (let i = padLength; i >= 1; i--) {
        const idx = Math.min(i, data.length - 1);
        front.push(2 * data[0] - data[idx]);
    }

    const back: number[] = [];
    for (let i = data.length - 2; i > data.length - padLength - 2; i--) {
        const idx = Math.max(i, 0);
        back.push(2 * data[data.length - 1] - data[idx]);
    }

    const extended = Float64Array.from([...front, ...data, ...back]);
    const forward = applyFIR(extended, coeffs);
    const reversedForward = Float64Array.from(forward).reverse();
    const backward = applyFIR(reversedForward, coeffs);
    const result = Array.from(backward.reverse().slice(padLength, padLength + data.length));

    return result;
};

// Approximate YASA's slow-wave preprocessing (MNE FIR bandpass with filtfilt) so the overlay
// matches the signal YASA inspects before marking SWS peaks.
const applyYasaLikeBandpass = (input: number[], sampleRate: number): number[] => {
    if (!input.length) {
        return input;
    }

    if (!sampleRate || sampleRate <= 0) {
        return input.map(() => NaN);
    }

    const mask = input.map(value => Number.isFinite(value));
    if (!mask.some(Boolean)) {
        return input.map(() => NaN);
    }

    const clean = new Array<number>(input.length);
    let lastValid = input.find(value => Number.isFinite(value));
    if (lastValid === undefined) {
        return input.map(() => NaN);
    }

    for (let i = 0; i < input.length; i++) {
        const value = input[i];
        if (Number.isFinite(value)) {
            lastValid = value;
            clean[i] = value;
        } else {
            clean[i] = lastValid;
        }
    }

    const coeffs = getBandpassCoefficients(sampleRate);
    const filtered = filtfilt(clean, coeffs);

    return filtered.map((value, index) => (mask[index] ? value : NaN));
};

interface EEGChartsProps {
    allData: AllData;
    scrollPosition: number;
    showVideo?: boolean;
    showAudio?: boolean;
}

export const EEGCharts: React.FC<EEGChartsProps> = ({ allData, scrollPosition, showVideo = false, showAudio = false }) => {
    const chartRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const [charts, setCharts] = useState<(Chart | null)[]>([]);
    const [compareEpoch, setCompareEpoch] = useState<number | null>(null);
    const [compareEpochInput, setCompareEpochInput] = useState('');
    const [showSlowWaveEvents, setShowSlowWaveEvents] = useState(false);
    const [showSpindleEvents, setShowSpindleEvents] = useState(false);
    const [showEpochInfo, setShowEpochInfo] = useState(true);
    const [showTable, setShowTable] = useState(false); // disabled by default as slow
    const [yAxisRange, setYAxisRange] = useState(100);
    const [showBlinks, setShowBlinks] = useState(false);
    const [showArtifacts, setShowArtifacts] = useState(true);
    const [artifactMode, setArtifactMode] = useState('annotate');
    const { handleChartClick, marks, deleteMark } = useStore((state: StoreState) => ({
        handleChartClick: state.handleChartClick,
        marks: state.marks,
        deleteMark: state.deleteMark
    }))

    const samplesPerSecond = allData.processedEDF.signals[0].samplingRate;

    const handleCompare = () => {
        const epochIndex = parseInt(compareEpochInput);
        if (!isNaN(epochIndex) && epochIndex >= 0 && epochIndex < allData.sleepStages.length) {
            setCompareEpoch(epochIndex);
        }
    };

    const handleRandomCompare = (stage: string) => {
        const stageEpochs = allData.sleepStages.filter(s => s.Stage === stage);
        if (stageEpochs.length > 0) {
            const randomEpoch = stageEpochs[Math.floor(Math.random() * stageEpochs.length)];
            setCompareEpoch(randomEpoch.Epoch);
            setCompareEpochInput(randomEpoch.Epoch.toString());
        }
    };

    const clearCompare = () => {
        setCompareEpoch(null);
        setCompareEpochInput('');
    };

    useEffect(() => {
        if (compareEpochInput === '') {
            clearCompare();
        }
    }, [compareEpochInput]);

    useEffect(() => {
        console.log(`useEffect`)

        const samplesToShow = Math.floor(samplesPerSecond * SECONDS_TO_SHOW);
        const signalsToShow = allData.processedEDF.signals.filter(signal => signal.label !== 'EDF Annotations');

        charts.forEach(chart => chart?.destroy());
        setCharts([]);

        const startEpochIndex = Math.floor(scrollPosition / (samplesPerSecond * SECONDS_PER_EPOCH));
        const endEpochIndex = Math.ceil((scrollPosition + samplesToShow) / (samplesPerSecond * SECONDS_PER_EPOCH));

        const yMax = yAxisRange;
        const yMin = -yAxisRange;

        const secondsToSamples = (seconds: number) => {
            return Math.floor(seconds * samplesPerSecond);
        };

        const millisecondsToSamplesLocal = (milliseconds: number) => {
            return millisecondsToSamples(milliseconds, samplesPerSecond);
        };


        const startDate = allData.processedEDF.startDate.epochMilliseconds / 1000;
        const startDateMillis = allData.processedEDF.startDate.epochMilliseconds;

        const newCharts = signalsToShow.map((signal, index) => {
            console.log(`signal`, signal)

            const ctx = chartRefs.current[index]?.getContext('2d');
            if (!ctx) return null;

            const data = artifactMode === 'remove' ? signal.samples.slice(scrollPosition, scrollPosition + samplesToShow).map((value, index) => {
                const sampleIndex = scrollPosition + index;
                const isInArtifact = allData.artifacts?.some(artifact =>
                    sampleIndex >= artifact.start && sampleIndex <= artifact.end
                ) || false;
                return isInArtifact ? NaN : value;
            }) : signal.samples.slice(scrollPosition, scrollPosition + samplesToShow);

            console.log(`data`, data)

            const datasets = [{
                label: signal.label,
                data: data,
                borderColor: `hsl(${index * 360 / signalsToShow.length}, 100%, 50%)`,
                pointRadius: 0,
                borderWidth: 1.5,
                spanGaps: true,
            }];

            if (showSlowWaveEvents) {
                const filteredData = applyYasaLikeBandpass(data, samplesPerSecond);
                if (filteredData.some(value => Number.isFinite(value))) {
                    datasets.push({
                        label: `${signal.label} (0.3-1.5 Hz)`,
                        data: filteredData,
                        borderColor: `hsla(${index * 360 / signalsToShow.length}, 100%, 50%, 0.35)`,
                        pointRadius: 0,
                        borderWidth: 1,
                        spanGaps: true,
                    });
                }
            }

            if (compareEpoch !== null) {
                const compareStartSample = compareEpoch * SECONDS_PER_EPOCH * samplesPerSecond;
                const compareData = artifactMode === 'remove' ?
                    signal.samples.slice(compareStartSample, compareStartSample + samplesToShow).map((value, index) => {
                        const sampleIndex = compareStartSample + index;
                        const isInArtifact = allData.artifacts?.some(artifact =>
                            sampleIndex >= artifact.start && sampleIndex <= artifact.end
                        ) || false;
                        return isInArtifact ? NaN : value;
                    }) :
                    signal.samples.slice(compareStartSample, compareStartSample + samplesToShow);

                datasets.push({
                    label: `${signal.label} (Compare)`,
                    data: compareData,
                    borderColor: `hsla(${index * 360 / signalsToShow.length}, 100%, 50%, 0.5)`,
                    pointRadius: 0,
                    borderWidth: 1.5,
                    spanGaps: true,
                });

                if (showSlowWaveEvents) {
                    const compareFilteredData = applyYasaLikeBandpass(compareData, samplesPerSecond);
                    if (compareFilteredData.some(value => Number.isFinite(value))) {
                        datasets.push({
                            label: `${signal.label} (Compare 0.3-1.5 Hz)`,
                            data: compareFilteredData,
                            borderColor: `hsla(${index * 360 / signalsToShow.length}, 100%, 50%, 0.25)`,
                            pointRadius: 0,
                            borderWidth: 1,
                            spanGaps: true,
                        });
                    }
                }
            }

            console.log(`signal.label`, signal.label)

            const slowWaveEvents = allData.slowWaveEvents?.[signal.label] || [];
            const visibleSlowWaveEvents = showSlowWaveEvents ? slowWaveEvents.filter(event => {
                const eventStartSample = secondsToSamples(event.Start);
                const eventEndSample = secondsToSamples(event.End);
                return eventStartSample < scrollPosition + samplesToShow && eventEndSample > scrollPosition;
            }) : [];

            const slowWavePeakPoints = showSlowWaveEvents ? visibleSlowWaveEvents.flatMap((event, eventIndex) => {
                const ptp = event.PTP;
                const createPoint = (
                    peakSeconds: number | undefined,
                    amplitude: number | undefined,
                    peakType: 'neg' | 'pos',
                    csvIndex: number | undefined
                ) => {
                    if (typeof peakSeconds !== 'number' || typeof amplitude !== 'number') {
                        return null;
                    }

                    const absoluteSampleIndex = secondsToSamples(peakSeconds);
                    const relativeSampleIndex = absoluteSampleIndex - scrollPosition;

                    if (relativeSampleIndex < 0 || relativeSampleIndex >= samplesToShow) {
                        return null;
                    }

                    const radius = ptp && isFinite(ptp) ? Math.max(3, Math.min(8, ptp / 35)) : 4;
                    const color = peakType === 'neg' ? 'rgba(59, 130, 246, 0.9)' : 'rgba(249, 115, 22, 0.9)';

                    return {
                        x: relativeSampleIndex,
                        y: amplitude,
                        ptp,
                        peakSeconds,
                        amplitude,
                        peakType,
                        color,
                        radius,
                        csvIndex,
                        absoluteSampleIndex
                    };
                };

                const csvIndex = typeof event.CsvIndex === 'number' ? event.CsvIndex : eventIndex;

                return [
                    createPoint(event.NegPeak, event.ValNegPeak, 'neg', csvIndex),
                    createPoint(event.PosPeak, event.ValPosPeak, 'pos', csvIndex)
                ].filter(Boolean) as {
                    x: number;
                    y: number;
                    ptp?: number;
                    peakSeconds?: number;
                    amplitude?: number;
                    peakType: 'neg' | 'pos';
                    color: string;
                    radius: number;
                    csvIndex?: number;
                    absoluteSampleIndex?: number;
                }[];
            }) : [];

            if (slowWavePeakPoints.length > 0) {
                datasets.push({
                    label: 'Slow-wave peaks',
                    type: 'scatter',
                    data: slowWavePeakPoints,
                    parsing: false,
                    showLine: false,
                    pointRadius: (ctx: any) => ctx.raw?.radius ?? 4,
                    pointHoverRadius: (ctx: any) => (ctx.raw?.radius ?? 4) + 2,
                    pointBackgroundColor: (ctx: any) => ctx.raw?.color ?? 'rgba(54, 162, 235, 0.85)',
                    pointBorderColor: (ctx: any) => ctx.raw?.color ?? 'rgba(54, 162, 235, 1)',
                    pointBorderWidth: 1.5,
                    hitRadius: 6,
                    hoverBorderWidth: 2,
                } as any);
            }

            const spindleEvents = allData.spindleEvents?.[signal.label] || [];
            const visibleSpindleEvents = showSpindleEvents ? spindleEvents.filter(event => {
                const eventStartSample = secondsToSamples(event.Start);
                const eventEndSample = secondsToSamples(event.End);
                return eventStartSample < scrollPosition + samplesToShow && eventEndSample > scrollPosition;
            }) : [];

            console.log(`visibleSlowWaveEvents`, visibleSlowWaveEvents)

            const markAnnotations = marks.filter(mark => mark.channel === signal.label).map((mark, index) => ({
                type: 'line',
                xMin: millisecondsToSamplesLocal(parseDateString(mark.timestamp).toInstant().epochMilliseconds - startDateMillis) - scrollPosition,
                xMax: millisecondsToSamplesLocal(parseDateString(mark.timestamp).toInstant().epochMilliseconds - startDateMillis) - scrollPosition,
                borderColor: 'black',
                borderWidth: 2,
                label: {
                    content: mark.type,
                    backgroundColor: 'black',
                    color: 'red',
                    display: true,
                    position: 'top'

                },
                click: (event: any) => {
                    console.log(`Deleting mark`, mark, event)
                    deleteMark(mark.timestamp, mark.channel);
                    event.native.stopPropagation();
                }
            }))

            console.log(`markAnnotations`, markAnnotations)

            const microwakingAnnotations = allData.microwakings?.map((microwaking: Microwaking, index: number) => {

                const startSamplesSinceBegin = microwaking.Start.epochMilliseconds - allData.processedEDF.startDate.epochMilliseconds
                const endSamplesSinceBegin = microwaking.End.epochMilliseconds - allData.processedEDF.startDate.epochMilliseconds
                const startSample = millisecondsToSamples(startSamplesSinceBegin, samplesPerSecond);

                const endSample = millisecondsToSamples(endSamplesSinceBegin, samplesPerSecond);

                const xMin = startSample - scrollPosition;
                const xMax = endSample - scrollPosition;

                //console.log(`microwaking`, microwaking.Start.toString(), `startSamplesSinceBegin`, startSamplesSinceBegin, `endSamplesSinceBegin`, endSamplesSinceBegin, `startSample`, startSample, `endSample`, endSample, `xMin`, xMin, `xMax`, xMax, `scrollPosition`, scrollPosition)

                return {
                    type: 'box',
                    xMin: xMin,
                    xMax: xMax,
                    yMin: 'min',
                    yMax: 'max',
                    backgroundColor: 'rgba(255, 0, 0, 0.2)',
                    borderColor: 'rgba(255, 0, 0, 1)',
                    borderWidth: 1,
                };
            }) || [];

            console.log(`microwakingAnnotations`, microwakingAnnotations)

            const blinkAnnotations = showBlinks ? Object.fromEntries(
                detectBlinks(signal.samples.slice(scrollPosition, scrollPosition + samplesToShow), samplesPerSecond)
                    .map((blink, i) => [`blink${i}`, {
                        type: 'box',
                        xMin: Math.max(0, blink.peakIdx - 25),
                        xMax: Math.min(samplesToShow, blink.peakIdx + 25),
                        yMin: yMin,
                        yMax: yMax,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        label: {
                            content: `Peak: ${blink.peakValue.toFixed(1)}µV\nDuration: ${(blink.blinkLength / samplesPerSecond * 1000).toFixed(0)}ms`,
                            display: false,
                            position: 'top'
                        },
                        enter: ({ element }) => {
                            element.label.options.display = true;
                            element.chart.update('none');
                        },
                        leave: ({ element }) => {
                            element.label.options.display = false;
                            element.chart.update('none');
                        }

                    }])
            ) : {};

            console.log(`blinkAnnotations`, blinkAnnotations)

            // Add artifact annotations
            const artifactAnnotations = artifactMode === 'annotate' ? allData.artifacts?.map((artifact: Artifact, artifactIndex: number) => {
                const artifactStartSample = artifact.start - scrollPosition;
                const artifactEndSample = artifact.end - scrollPosition;

                // Only show artifacts that are visible in the current view
                if (artifactEndSample < 0 || artifactStartSample > samplesToShow) {
                    return null;
                }

                // Adjust to ensure we only show the visible portion of the artifact
                const visibleStartSample = Math.max(0, artifactStartSample);
                const visibleEndSample = Math.min(samplesToShow, artifactEndSample);

                return [`artifact${artifactIndex}`, {
                    type: 'box',
                    xMin: visibleStartSample,
                    xMax: visibleEndSample,
                    yMin: signal.label === 'Artifacts' ? 0 : yMin,
                    yMax: signal.label === 'Artifacts' ? 1 : yMax,
                    backgroundColor: 'rgba(255, 0, 0, 0.2)',
                    borderColor: 'rgba(255, 0, 0, 0.8)',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    label: {
                        content: 'Artifact',
                        display: false,
                        position: 'top'
                    },
                    enter: ({ element }) => {
                        element.label.options.display = true;
                        element.chart?.update('none');
                    },
                    leave: ({ element }) => {
                        element.label.options.display = false;
                        element.chart?.update('none');
                    }
                }];
            }).filter(Boolean) || [] : [];

            console.log(`samplesToShow`, samplesToShow)

            const config: ChartConfiguration = {
                type: 'line',
                data: {
                    labels: Array(samplesToShow).fill(''),
                    datasets: datasets
                },
                options: merge(
                    eegChartOptions(`${signal.label} (${signal.physicalDimension})`, allData, scrollPosition),
                    {
                        scales: {
                            x: {
                                display: index === 0 || index === signalsToShow.length - 1,
                                position: index === 0 ? 'top' : 'bottom',
                                ticks: {
                                    count: 10,
                                    // autoSkip: false,
                                    maxTicksLimit: 10,
                                    callback: (value, index, ticks) => {
                                        //console.info(`x ticks callback value=${value} index=${index} ticks=${ticks}`)
                                        return allData.processedEDF.signals[0].timeLabels[scrollPosition + index]?.formatted
                                    }
                                },

                            },
                            y: {
                                min: signal.label == 'Artifacts' ? 0 : yMin,
                                max: signal.label == 'Artifacts' ? 1 : yMax,
                            },
                        },
                        // layout: {
                        //     padding: {
                        //         left: 37,
                        //         right: 10,
                        //     }
                        // },
                        plugins: {
                            annotation: {
                                annotations: {
                                    ...markAnnotations,
                                    ...microwakingAnnotations,
                                    ...blinkAnnotations,
                                    ...Object.fromEntries(artifactAnnotations),

                                    ...(showEpochInfo ? generateAnnotations(
                                        allData,
                                        startEpochIndex,
                                        endEpochIndex,
                                        scrollPosition,
                                        samplesPerSecond,
                                        compareEpoch,
                                        signal
                                    ) : []),
                                    ...(showSlowWaveEvents ? Object.fromEntries(
                                        visibleSlowWaveEvents.map((event, eventIndex) => {
                                            const eventStartSample = secondsToSamples(event.Start) - scrollPosition;
                                            const eventEndSample = secondsToSamples(event.End) - scrollPosition;
                                            return [`slowWave${eventIndex}`, {
                                                type: 'box',
                                                xMin: eventStartSample,
                                                xMax: eventEndSample,
                                                yMin: yMin,
                                                yMax: yMax,
                                                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                                                borderColor: 'rgba(54, 162, 235, 1)',
                                                borderWidth: 1,
                                            }];
                                        })
                                    ) : []),
                                    ...(showSpindleEvents ? Object.fromEntries(
                                        visibleSpindleEvents.map((event, eventIndex) => {
                                            const eventStartSample = secondsToSamples(event.Start) - scrollPosition;
                                            const eventEndSample = secondsToSamples(event.End) - scrollPosition;
                                            return [`spindle${eventIndex}`, {
                                                type: 'box',
                                                xMin: eventStartSample,
                                                xMax: eventEndSample,
                                                yMin: yMin,
                                                yMax: yMax,
                                                backgroundColor: 'rgba(147, 51, 234, 0.2)',
                                                borderColor: 'rgba(147, 51, 234, 1)',
                                                borderWidth: 1,
                                            }];
                                        })
                                    ) : []),
                                },
                                // click: (context: any, event: any) => {
                                //     console.log(`context`, context, `event`, event)
                                //     if (context.element) {
                                //         const clickedAnnotation = context.element;
                                //         if (clickedAnnotation.options.click) {
                                //             clickedAnnotation.options.click();
                                //             event.preventDefault();
                                //             event.native.stopPropagation();
                                //         }
                                //     }
                                // }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context: any) => {
                                        if ((context.dataset as any)?.type === 'scatter') {
                                            const raw = context.raw;
                                            if (raw?.peakType) {
                                                const prefix = raw.peakType === 'neg' ? 'Neg peak' : 'Pos peak';
                                                const amplitude = typeof raw.amplitude === 'number' ? `${raw.amplitude.toFixed(1)}µV` : 'N/A';
                                                const timeSeconds = typeof raw.peakSeconds === 'number' ? `${raw.peakSeconds.toFixed(2)}s` : 'N/A';
                                                const ptpLabel = typeof raw.ptp === 'number' ? `PTP ${raw.ptp.toFixed(1)}µV` : undefined;
                                                const csvIndexLabel = typeof raw.csvIndex === 'number' ? `CSV index: ${raw.csvIndex}` : undefined;
                                                const exactTimeLabel = typeof raw.peakSeconds === 'number' ? `Exact time: ${raw.peakSeconds.toFixed(5)}s` : undefined;

                                                const lines = [
                                                    ptpLabel ? `${prefix}: ${amplitude} @ ${timeSeconds} (${ptpLabel})` : `${prefix}: ${amplitude} @ ${timeSeconds}`
                                                ];

                                                if (csvIndexLabel) {
                                                    lines.push(csvIndexLabel);
                                                }

                                                if (exactTimeLabel) {
                                                    lines.push(exactTimeLabel);
                                                }

                                                return lines.join('\n');
                                            }
                                        }

                                        const value = context.parsed?.y;
                                        if (typeof value !== 'number' || Number.isNaN(value)) {
                                            return context.dataset?.label || signal.label;
                                        }

                                        const absoluteSampleIndex = scrollPosition + context.dataIndex;
                                        const formattedTime = allData.processedEDF.signals[0].timeLabels[absoluteSampleIndex]?.formatted;
                                        const label = context.dataset?.label || signal.label;
                                        const timePoint = sampleIndexToTime(allData, absoluteSampleIndex);
                                        const tooltipMillis = timePoint.toInstant().epochMilliseconds;
                                        const hypnogramEntry = allData.fitbitHypnogram?.find(entry => {
                                            const startMillis = entry.startTime.toInstant().epochMilliseconds;
                                            const endMillis = entry.endTime.toInstant().epochMilliseconds;
                                            return tooltipMillis >= startMillis && tooltipMillis < endMillis;
                                        });
                                        const stageInfo = hypnogramEntry ? `Stage: ${hypnogramEntry.state}` : undefined;

                                        const baseParts = [
                                            formattedTime ? `${label}: ${value.toFixed(1)}µV @ ${formattedTime}` : `${label}: ${value.toFixed(1)}µV`,
                                            stageInfo
                                        ].filter(Boolean);
                                        const base = baseParts.join('\n');
                                        if (typeof context.dataset?.label === 'string' && context.dataset.label.includes('0.3-1.5 Hz')) {
                                            return `${base}\nPlotted as an approximation of YASA's pre-SWS filtering; helps explain detection offsets. See projects/SlowWaves.md.`;
                                        }

                                        return base;
                                    }
                                }
                            }
                        },
                        onClick: (event: any, elements: any[], chart: Chart) => {
                            const left = event.chart.chartArea.left
                            const right = event.chart.chartArea.right
                            const xAsPctOfChartWidth = (event.x - left) / (right - left);
                            const sampleIndexRaw = Math.floor(xAsPctOfChartWidth * samplesToShow);
                            const sampleIndex = sampleIndexRaw + scrollPosition;

                            console.info(`event`, event, `left`, left, `xAsPctOfChartWidth`, xAsPctOfChartWidth, `sampleIndexRaw`, sampleIndexRaw, `sampleIndex`, sampleIndex, `scrollPosition`, scrollPosition, `samplesToShow`, samplesToShow, `samplesPerSecond`, samplesPerSecond, `SECONDS_PER_EPOCH`, SECONDS_PER_EPOCH, `SECONDS_TO_SHOW`, SECONDS_TO_SHOW)

                            const time = sampleIndexToTime(allData, sampleIndex);
                            const channel = signal.label;

                            console.log('Chart click', time.toInstant().epochMilliseconds / 1000, time.toInstant().toString());
                            handleChartClick(time, channel);
                        },
                    }) as any
            };

            return new Chart(ctx, config);
        });

        setCharts(newCharts);

        return () => {
            newCharts.forEach(chart => chart?.destroy());
        };
    }, [allData, scrollPosition, compareEpoch, showSlowWaveEvents, showSpindleEvents, showEpochInfo, handleChartClick, marks, deleteMark, yAxisRange, showBlinks, showArtifacts, artifactMode]);

    const signalsToShow = allData.processedEDF.signals.filter(signal => signal.label !== 'EDF Annotations');

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'i') {
            setShowEpochInfo(prev => !prev)
        } else if (e.key === 't') {
            setShowTable(prev => !prev)
        }
    }, []);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    const startEpochIndex = Math.floor(scrollPosition / (samplesPerSecond * SECONDS_PER_EPOCH));
    const endEpochIndex = Math.ceil((scrollPosition + samplesPerSecond * SECONDS_TO_SHOW) / (samplesPerSecond * SECONDS_PER_EPOCH));
    // Since we're focussed on one channel now we're going to maximise left space and only show that
    const annotations: LabelContent = generateAnnotationsForLeft(
        allData,
        startEpochIndex,
        endEpochIndex,
        scrollPosition,
        samplesPerSecond,
        compareEpoch,
        signalsToShow[0]
    );

    const currentTime = allData.processedEDF.startDate.add({ seconds: Math.floor(scrollPosition / samplesPerSecond) });


    return (
        <div className="flex-col flex h-full" id="eeg-charts">
            <ComparisonControls
                compareEpochInput={compareEpochInput}
                setCompareEpochInput={setCompareEpochInput}
                handleCompare={handleCompare}
                handleRandomCompare={handleRandomCompare}
                clearCompare={clearCompare}
            />
            <div className="flex space-x-4 p-4">
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={showSlowWaveEvents}
                        onChange={() => setShowSlowWaveEvents(!showSlowWaveEvents)}
                        className="toggle toggle-primary"
                    />
                    <span>Show Slow Wave Events</span>
                </label>
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={showSpindleEvents}
                        onChange={() => setShowSpindleEvents(!showSpindleEvents)}
                        className="toggle toggle-primary"
                    />
                    <span>Show Spindle Events</span>
                </label>
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={showEpochInfo}
                        onChange={() => setShowEpochInfo(!showEpochInfo)}
                        className="toggle toggle-primary"
                    />
                    <span>Show Epoch Info (i)</span>
                </label>
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={showTable}
                        onChange={() => setShowTable(!showTable)}
                        className="toggle toggle-primary"
                    />
                    <span>Show Table (t)</span>
                </label>
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={showBlinks}
                        onChange={() => setShowBlinks(!showBlinks)}
                        className="toggle toggle-primary"
                    />
                    <span>Show Blinks</span>
                </label>
                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={showArtifacts}
                        onChange={() => setShowArtifacts(!showArtifacts)}
                        className="toggle toggle-primary"
                    />
                    <span>Show Artifacts</span>
                </label>
                <label className="flex items-center space-x-2">
                    <span>Artifacts:</span>
                    <select
                        className="select select-bordered select-sm"
                        value={artifactMode}
                        onChange={(e) => setArtifactMode(e.target.value)}
                    >
                        <option value="ignore">Ignore</option>
                        <option value="remove">Remove</option>
                        <option value="annotate">Annotate</option>
                    </select>
                </label>
                <div className="flex items-center space-x-2">
                    <span>Y-Axis Range: ±{yAxisRange}</span>
                    <Slider
                        min={100}
                        max={800}
                        step={100}
                        value={yAxisRange}
                        onChange={(value) => setYAxisRange(value)}
                    />
                </div>
            </div>
            {allData.fitbitHypnogram && (
                <FitbitHypnogramChart
                    allData={allData}
                    scrollPosition={scrollPosition}
                    samplesPerSecond={samplesPerSecond}
                    secondsToShow={SECONDS_TO_SHOW}
                />
            )}
            {allData.nightEvents && (
                <NightEventsChart
                    allData={allData}
                    scrollPosition={scrollPosition}
                    samplesPerSecond={samplesPerSecond}
                    secondsToShow={SECONDS_TO_SHOW}
                />
            )}
            <div className="flex flex-grow">
                {showTable && (
                    <div className="w-1/4 p-2">
                        <MetricsTable annotations={annotations} />
                    </div>
                )}

                <div className={`${showTable ? 'w-3/4' : 'w-full'} flex flex-col flex-grow`}>
                    {signalsToShow.map((signal, index) => {
                        return (
                            <div key={index} className="w-full" style={{ height: '300px' }}>
                                <canvas ref={el => chartRefs.current[index] = el} style={{ width: '100%', height: '100%' }} />
                            </div>
                        );
                    })}

                    {allData.rawPhysicalFeatures ? (
                        <RawPhysicalFeaturesChart
                            allData={allData}
                            scrollPosition={scrollPosition}
                            samplesPerSecond={samplesPerSecond}
                            secondsToShow={SECONDS_TO_SHOW}
                            currentTime={currentTime}
                        />
                    ) : (
                        <div className="text-center p-4">No raw physical features data available</div>
                    )}

                    {showVideo && (
                        <Profiler id="VideoViewer" onRender={(id, phase, actualDuration) => {
                            if (actualDuration > 16) { // Log if render takes more than 16ms (60fps threshold)
                                console.warn(`[Profiler] ${id} ${phase} render took ${actualDuration}ms`);
                            }
                        }}>
                            <VideoViewer
                                allData={allData}
                                scrollPosition={scrollPosition}
                                videoFiles={allData.videos}
                                startTime={allData.processedEDF.startDate}
                                duration={allData.processedEDF.duration}
                                currentTime={currentTime}
                                secondsToShow={SECONDS_PER_EPOCH}
                                audioFiles={allData.audio}
                            />
                        </Profiler>
                    )}

                    {showAudio && (
                        <Profiler id="AudioViewer" onRender={(id, phase, actualDuration) => {
                            if (actualDuration > 16) { // Log if render takes more than 16ms (60fps threshold)
                                console.warn(`[Profiler] ${id} ${phase} render took ${actualDuration}ms`);
                            }
                        }}>
                            <AudioViewer
                                allData={allData}
                                scrollPosition={scrollPosition}
                                audioFiles={allData.audio}
                                startTime={allData.processedEDF.startDate}
                                duration={allData.processedEDF.duration}
                                currentTime={currentTime}   
                                secondsToShow={SECONDS_PER_EPOCH}
                            />
                        </Profiler>
                    )}
                </div>
            </div>
        </div>
    );
};
