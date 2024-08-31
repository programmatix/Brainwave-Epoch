import React, { useRef, useEffect, useState } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { AllData } from '../Loader/LoaderTypes';
import { FitbitHypnogramChart } from './FitbitHypnogramChart';
import { NightEventsChart } from './NightEventsChart';

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

    const samplesPerSecond = allData.processedEDF.signals[0].samplingRate;

    useEffect(() => {
        const samplesToShow = samplesPerSecond * SECONDS_TO_SHOW;
        const signalsToShow = allData.processedEDF.signals.filter(signal => signal.label !== 'EDF Annotations');

        charts.forEach(chart => chart?.destroy());
        setCharts([]);

        const startEpochIndex = Math.floor(scrollPosition / (samplesPerSecond * SECONDS_PER_EPOCH));
        const endEpochIndex = Math.ceil((scrollPosition + samplesToShow) / (samplesPerSecond * SECONDS_PER_EPOCH));

        const yMax = 200;
        const yMin = -200;

        const secondsToSamples = (seconds: number) => {
            return Math.floor(seconds * samplesPerSecond);
        };

        const startDate = allData.processedEDF.startDate.epochSeconds;

        const newCharts = signalsToShow.map((signal, index) => {
            const ctx = chartRefs.current[index]?.getContext('2d');
            if (!ctx) return null;

            const data = signal.samples.slice(scrollPosition, scrollPosition + samplesToShow);

            const slowWaveEvents = allData.slowWaveEvents?.[signal.label] || [];
            const visibleSlowWaveEvents = slowWaveEvents.filter(event => {
                const eventStartSample = secondsToSamples(event.Start);
                const eventEndSample = secondsToSamples(event.End);
                return eventStartSample < scrollPosition + samplesToShow && eventEndSample > scrollPosition;
            });

            const spindleEvents = allData.spindleEvents?.[signal.label] || [];
            const visibleSpindleEvents = spindleEvents.filter(event => {
                const eventStartSample = secondsToSamples(event.Start);
                const eventEndSample = secondsToSamples(event.End);
                return eventStartSample < scrollPosition + samplesToShow && eventEndSample > scrollPosition;
            });

            const config: ChartConfiguration = {
                type: 'line',
                data: {
                    labels: Array(samplesToShow).fill(''),
                    datasets: [{
                        label: signal.label,
                        data: data,
                        borderColor: `hsl(${index * 360 / signalsToShow.length}, 100%, 50%)`,
                        pointRadius: 0,
                        borderWidth: 1.5,
                    }]
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
                            // top: 20,
                            // bottom: index === signalsToShow.length - 1 ? 30 : 0
                        }
                    },
                    animation: false,
                    plugins: {
                        legend: { display: false },
                        annotation: {
                            annotations: {
                                ...Object.fromEntries(
                                    Array.from({ length: endEpochIndex - startEpochIndex }, (_, i) => {
                                        const epochIndex = startEpochIndex + i;
                                        const epochStartSample = epochIndex * SECONDS_PER_EPOCH * samplesPerSecond - scrollPosition;
                                        const sleepStage = allData.sleepStages[epochIndex];
                                        const channelData = sleepStage?.Channels[signal.label];
                                        return [
                                            [`epoch${epochIndex}`, {
                                                type: 'line',
                                                xMin: epochStartSample,
                                                xMax: epochStartSample,
                                                borderColor: 'rgba(128, 128, 128, 0.5)',
                                                borderWidth: 1,
                                            }],
                                            [`epochInfo${epochIndex}`, {
                                                type: 'label',
                                                position: 'start',
                                                xValue: epochStartSample + 1,
                                                yValue: yMax,
                                                content: [
                                                    `${sleepStage?.Timestamp}`,
                                                    `Epoch: ${epochIndex}`,
                                                    `Stage: ${channelData?.Stage || 'N/A'}`,
                                                    `Confidence: ${channelData?.Confidence?.toFixed(2) || 'N/A'}`,
                                                    `EEG AbsPow: ${sleepStage?.eeg_abspow?.toFixed(2) || 'N/A'}`,
                                                    `EEG Alpha: ${sleepStage?.eeg_alpha?.toFixed(2) || 'N/A'}`,
                                                    `EEG Beta: ${sleepStage?.eeg_beta?.toFixed(2) || 'N/A'}`,
                                                    // ... (add more eeg_ fields as needed)
                                                ],
                                                font: { size: 10 },
                                                textAlign: 'left',
                                                padding: { top: 5, left: 5 }
                                            }]
                                        ];
                                    }).flat()
                                ),
                                ...Object.fromEntries(
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
                                ),
                                ...Object.fromEntries(
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
                                ),
                            },
                        }
                    },
                }
            };

            return new Chart(ctx, config);
        });

        setCharts(newCharts);

        return () => {
            newCharts.forEach(chart => chart?.destroy());
        };
    }, [allData, scrollPosition]);

    const signalsToShow = allData.processedEDF.signals.filter(signal => signal.label !== 'EDF Annotations');

    return (
        <div className="flex-col flex h-full">
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
            {signalsToShow.map((_, index) => (
                <div key={index} className="w-full flex-grow" style={{ width: '100%', height: '300px' }}>
                    <canvas ref={el => chartRefs.current[index] = el} style={{ width: '100%', height: '100%' }} />
                </div>
            ))}
        </div>
    );
};