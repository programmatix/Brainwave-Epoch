import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { AllData, Artifact, Microwaking } from '../Loader/LoaderTypes';
import { FitbitHypnogramChart } from './FitbitHypnogramChart';
import { NightEventsChart } from './NightEventsChart';
import { ComparisonControls } from './ComparisonControls';
import { generateAnnotations, generateAnnotationsForLeft } from './EEGChartAnnotations';
import { LabelContent, millisecondsToSamples, sampleIndexToTime } from './ChartUtils';
import { useStore, StoreState } from '../Store/Store';
import { Temporal } from '@js-temporal/polyfill';
import { parseDateString } from '../Loader/Loader';
import { Slider } from './Slider';
import { MetricsTable } from './MetricsTable';
import { detectBlinks } from '../BlinkDetection/BlinkDetector';
import { VideoViewer } from '../Videos/VideoViewer';
import MovementTimeline from '../Movement/MovementTimeline';
import { RawPhysicalFeaturesChart } from './RawPhysicalFeaturesChart';

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

            const data = artifactMode === 'remove' ? signal.samples.slice(scrollPosition, scrollPosition + samplesToShow).map((value, index) => {
                const sampleIndex = scrollPosition + index;
                const isInArtifact = allData.artifacts?.some(artifact => 
                    sampleIndex >= artifact.start && sampleIndex <= artifact.end
                ) || false;
                return isInArtifact ? NaN : value;
            }) : signal.samples.slice(scrollPosition, scrollPosition + samplesToShow);

            const datasets = [{
                label: signal.label,
                data: data,
                borderColor: `hsl(${index * 360 / signalsToShow.length}, 100%, 50%)`,
                pointRadius: 0,
                borderWidth: 1.5,
                spanGaps: true,
            }];

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

            //console.log(`markAnnotations`, markAnnotations)

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

            //console.log(`microwakingAnnotations`, microwakingAnnotations)

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
                        element.chart.update('none');
                    },
                    leave: ({ element }) => {
                        element.label.options.display = false;
                        element.chart.update('none');
                    }
                }];
            }).filter(Boolean) || [] : [];

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
                            min: signal.label == 'Artifacts' ? 0 : yMin,
                            max: signal.label == 'Artifacts' ? 1 : yMax,
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

                    {/* Raw Physical Features */}
                    <div className="border border-base-300 bg-base-100 rounded-box mb-2">
                        <div className="text-xl font-medium flex items-center gap-2">
                            Raw Physical Features
                        </div>
                        
                        <div className="p-4">
                            {allData.rawPhysicalFeatures ? (
                                <RawPhysicalFeaturesChart
                                    allData={allData}
                                    scrollPosition={scrollPosition}
                                    samplesPerSecond={samplesPerSecond}
                                    secondsToShow={SECONDS_TO_SHOW}
                                />
                            ) : (
                                <div className="text-center p-4">No raw physical features data available</div>
                            )}
                        </div>
                    </div>

                    <div className="collapse-content">
                        <VideoViewer
                            videoFiles={allData.videos}
                            startTime={allData.processedEDF.startDate}
                            duration={allData.processedEDF.duration}
                            currentTime={currentTime}
                            secondsToShow={SECONDS_PER_EPOCH}
                        />
                    </div>

                </div>
            </div>
        </div>
    );
};
