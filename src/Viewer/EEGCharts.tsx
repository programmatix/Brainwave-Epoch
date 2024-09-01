import React, { useRef, useEffect, useState } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { AllData, ProcessedSleepStageEntryFeatures } from '../Loader/LoaderTypes';
import { FitbitHypnogramChart } from './FitbitHypnogramChart';
import { NightEventsChart } from './NightEventsChart';

Chart.register(...registerables, annotationPlugin);

export const SECONDS_PER_EPOCH = 30;
export const SECONDS_TO_SHOW = 30;

interface EEGChartsProps {
    allData: AllData;
    scrollPosition: number;
}

function getColorForValue(value: number, min: number, max: number): string {
    const normalizedValue = (value - min) / (max - min);
    const hue = normalizedValue * 120; // 0 (red) to 120 (green)
    return `hsl(${hue}, 100%, 50%)`;
}

type LabelContent = [string, string | number, string?][];

function createLabelCanvas(content: LabelContent, width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.clearRect(0, 0, width, height);
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Find the maximum width of the keys for alignment
    const keyWidth = Math.max(...content.map(([key]) => ctx.measureText(key + ':').width));

    let y = 5;
    content.forEach(([key, value, color]) => {
        ctx.fillStyle = 'black';
        ctx.fillText(key, 5, y);

        ctx.fillStyle = color || 'black';
        ctx.fillText(value.toString(), keyWidth + 10, y);

        y += 15;
    });

    return canvas;
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

                                        const content: LabelContent = [
                                            ['Epoch', `${epochIndex} (${sleepStage?.Timestamp.toString()})`],
                                            ['Stage', `${channelData?.Stage || 'N/A'} (${((channelData?.Confidence || 0) * 100).toFixed(0)}% confidence)`],
                                        ];

                                        const orderedKeys = [
                                            "eeg_sdelta", "eeg_fdelta", "eeg_theta", "eeg_alpha", "eeg_beta"
                                        ];
    
                                        orderedKeys.forEach(key => {
                                            const value = sleepStage[key as keyof ProcessedSleepStageEntryFeatures];
                                            if (typeof value === 'number') {
                                                const minMax = allData.sleepStageFeatureMinMax[key as keyof ProcessedSleepStageEntryFeatures];
                                                const color = getColorForValue(value, minMax.min, minMax.max);
                                                content.push([key, value.toFixed(2), color]);
                                            }
                                        });
    

                                        Object.entries(sleepStage)
                                            .filter(([key]) => key.startsWith('eeg_')
                                                && content.find(c => c[0] == key) == undefined
                                                // Removing the rolling averages
                                                && !key.includes('p2')
                                                && !key.includes('c7')
                                                // EDA suggests they are not very useful
                                                && !key.includes('eeg_at')
                                                && !key.includes('eeg_db')
                                                && !key.includes('eeg_ds')
                                                && !key.includes('eeg_dt')
                                                && !key.includes('eeg_hcomp')
                                                && !key.includes('eeg_hmob')
                                                && !key.includes('eeg_sigma')
                                                && !key.includes('eeg_sigma')
                                                && !key.includes('eeg_std')
                                            )
                                            .forEach(([key, value]) => {
                                                const minMax = allData.sleepStageFeatureMinMax[key as keyof ProcessedSleepStageEntryFeatures];
                                                const color = getColorForValue(value as number, minMax.min, minMax.max);
                                                const v = key.includes("petrosian") ? (value as number).toFixed(4) 
                                                : key.includes("nzc") ? (value as number).toFixed(0) 
                                                : (value as number).toFixed(2);
                                                content.push([key, v, color]);
                                            });

                                        const labelCanvas = createLabelCanvas(content, 300, (content.length + 1) * 15);

                                        return [
                                            [`epochInfo${epochIndex}`, {
                                                type: 'label',
                                                position: 'start',
                                                xValue: epochStartSample + 1,
                                                yValue: yMax,
                                                content: labelCanvas,
                                                backgroundColor: 'rgba(255, 255, 255, 0.5)',
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