import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { AllData } from '../Loader/LoaderTypes';
import { FitbitHypnogramChart } from './FitbitHypnogramChart';
import { NightEventsChart } from './NightEventsChart';
import { ComparisonControls } from './ComparisonControls';
import { generateAnnotations, generateAnnotationsForLeft } from './EEGChartAnnotations';
import { LabelContent, millisecondsToSamples, sampleIndexToTime } from './ChartUtils';
import { useStore, StoreState } from '../Store/Store';
import { Temporal } from '@js-temporal/polyfill';
import { parseDateString } from '../Loader/Loader';
import { Slider } from './Slider';

Chart.register(...registerables, annotationPlugin);

export const SECONDS_PER_EPOCH = 30;
export const SECONDS_TO_SHOW = 30;

interface EEGChartsProps {
    allData: AllData;
    scrollPosition: number;
}

export const EEGCharts: React.FC<EEGChartsProps> = ({ allData, scrollPosition }) => {
    const chartRefs = useRef<(HTMLCanvasElement | null)[]>([]);
    const [charts, setCharts] = useState<(Chart | null)[]>([]);
    const [compareEpoch, setCompareEpoch] = useState<number | null>(null);
    const [compareEpochInput, setCompareEpochInput] = useState('');
    const [showSlowWaveEvents, setShowSlowWaveEvents] = useState(false);
    const [showSpindleEvents, setShowSpindleEvents] = useState(false);
    const [showEpochInfo, setShowEpochInfo] = useState(true);
    const [showTable, setShowTable] = useState(true);
    const [yAxisRange, setYAxisRange] = useState(100);
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
        const samplesToShow = samplesPerSecond * SECONDS_TO_SHOW;
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


        const startDate = allData.processedEDF.startDate.epochSeconds;
        const startDateMillis = allData.processedEDF.startDate.epochMilliseconds;

        const newCharts = signalsToShow.map((signal, index) => {
            const ctx = chartRefs.current[index]?.getContext('2d');
            if (!ctx) return null;

            const data = signal.samples.slice(scrollPosition, scrollPosition + samplesToShow);

            const datasets = [{
                label: signal.label,
                data: data,
                borderColor: `hsl(${index * 360 / signalsToShow.length}, 100%, 50%)`,
                pointRadius: 0,
                borderWidth: 1.5,
            }];

            if (compareEpoch !== null) {
                const compareStartSample = compareEpoch * SECONDS_PER_EPOCH * samplesPerSecond;
                const compareData = signal.samples.slice(compareStartSample, compareStartSample + samplesToShow);
                datasets.push({
                    label: `${signal.label} (Compare)`,
                    data: compareData,
                    borderColor: `hsla(${index * 360 / signalsToShow.length}, 100%, 50%, 0.5)`,
                    pointRadius: 0,
                    borderWidth: 1.5,
                    //borderDash: [5, 5],
                });
            }

            const slowWaveEvents = allData.slowWaveEvents?.[signal.label] || [];
            const visibleSlowWaveEvents = showSlowWaveEvents ? slowWaveEvents.filter(event => {
                const eventStartSample = secondsToSamples(event.Start);
                const eventEndSample = secondsToSamples(event.End);
                return eventStartSample < scrollPosition + samplesToShow && eventEndSample > scrollPosition;
            }) : [];

            const spindleEvents = allData.spindleEvents?.[signal.label] || [];
            const visibleSpindleEvents = showSpindleEvents ? spindleEvents.filter(event => {
                const eventStartSample = secondsToSamples(event.Start);
                const eventEndSample = secondsToSamples(event.End);
                return eventStartSample < scrollPosition + samplesToShow && eventEndSample > scrollPosition;
            }) : [];

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

            const config: ChartConfiguration = {
                type: 'line',
                data: {
                    labels: Array(samplesToShow).fill(''),
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            display: index === 0 || index === signalsToShow.length - 1,
                            position: index === 0 ? 'top' : 'bottom',
                            title: { display: true, text: 'Time' },
                            ticks: {
                                maxTicksLimit: 10,
                                callback: (value, index, ticks) => {
                                    return allData.processedEDF.signals[0].timeLabels[scrollPosition + index]?.formatted
                                }
                            },
                            grid: {
                                display: true
                            }
                        },
                        y: {
                            title: { display: true, text: `${signal.label} (${signal.physicalDimension})` },
                            min: yMin,
                            max: yMax,
                            position: 'left',
                            grid: {
                                color: 'rgba(0, 0, 0, 0.1)'
                            }
                        },
                    },
                    layout: {
                        padding: {
                            left: 50,
                            right: 20,
                        }
                    },
                    animation: false,
                    plugins: {
                        legend: { display: false },
                        annotation: {
                            annotations: {
                                ...markAnnotations,
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

                        console.log('Chart click', time.toInstant().epochSeconds, time.toInstant().toString());
                        handleChartClick(time, channel);
                    },
                }
            };

            return new Chart(ctx, config);
        });

        setCharts(newCharts);

        return () => {
            newCharts.forEach(chart => chart?.destroy());
        };
    }, [allData, scrollPosition, compareEpoch, showSlowWaveEvents, showSpindleEvents, showEpochInfo, handleChartClick, marks, deleteMark, yAxisRange]);

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
            {signalsToShow.map((signal, index) => {
                const startEpochIndex = Math.floor(scrollPosition / (samplesPerSecond * SECONDS_PER_EPOCH));
                const endEpochIndex = Math.ceil((scrollPosition + samplesPerSecond * SECONDS_TO_SHOW) / (samplesPerSecond * SECONDS_PER_EPOCH));
                const annotations: LabelContent = generateAnnotationsForLeft(
                    allData,
                    startEpochIndex,
                    endEpochIndex,
                    scrollPosition,
                    samplesPerSecond,
                    compareEpoch,
                    signal
                );
                return (
                    <div key={index} className="w-full flex-grow flex" style={{ width: '100%', height: '300px' }}>
                        {showTable && (
                            <div className="w-1/4 p-2">
                                <div className="overflow-auto h-full">
                                    <table>
                                        {annotations.map((annotation, i) => (
                                            <tr key={i} style={{ fontSize: '12px', backgroundColor: 'black', color: 'white' }}>
                                                <td>
                                                    {annotation.key}
                                                </td>
                                                <td>
                                                    {<p style={{ color: annotation.color }}>{annotation.value}</p>}
                                                </td>
                                                <td>
                                                    {<p style={{ color: annotation.compColor }}>{annotation.compValue}</p>}
                                                </td>
                                                <td>
                                                    {<p style={{ color: annotation.diffPercentColor }}>{annotation.diffPercent?.toFixed(0)}%</p>}
                                                </td>
                                            </tr>
                                        ))}
                                    </table>
                                </div>
                            </div>
                        )}
                        <div className="w-3/4" style={{ width: '100%', height: '100%' }}>
                            <canvas ref={el => chartRefs.current[index] = el} style={{ width: '100%', height: '100%' }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
