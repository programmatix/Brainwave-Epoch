import React, { useMemo } from 'react';
import { AllData } from '../Loader/LoaderTypes';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { merge } from 'lodash';
import { eegChartOptions } from './ChartUtils';
import { formatDate } from '../Loader/Loader';
import { Temporal } from '@js-temporal/polyfill';

Chart.register(...registerables, annotationPlugin);

interface RawPhysicalFeaturesChartProps {
    allData: AllData;
    scrollPosition: number;
    samplesPerSecond: number;
    secondsToShow: number;
    currentTime: Temporal.ZonedDateTime;
}

export const RawPhysicalFeaturesChart: React.FC<RawPhysicalFeaturesChartProps> = ({
    allData,
    scrollPosition,
    samplesPerSecond,
    secondsToShow,
    currentTime
}) => {
    const chartRef = React.useRef<HTMLCanvasElement | null>(null);
    const [chart, setChart] = React.useState<Chart | null>(null);

    const startTime = allData.processedEDF.startDate.epochMilliseconds;
    const samplesToShow = secondsToShow * samplesPerSecond;

    const visibleStartTime = currentTime.epochMilliseconds;
    const visibleEndTime = visibleStartTime + secondsToShow * 1000;

    const visibleFeatures = useMemo(() => {
        if (!allData.rawPhysicalFeatures || !allData.rawPhysicalFeatures.length) return [];

        const startTimeVisible = startTime + (scrollPosition / samplesPerSecond) * 1000;
        const endTimeVisible = startTimeVisible + (samplesToShow / samplesPerSecond) * 1000;

        const visibleFeatures = allData.rawPhysicalFeatures.filter(f => f.timestamp >= startTimeVisible && f.timestamp <= endTimeVisible);

        console.info(`RawPhysicalFeaturesChart visibleFeatures=${visibleFeatures.length} startTimeVisible=${startTimeVisible} endTimeVisible=${endTimeVisible} samplesToShow=${samplesToShow} samplesPerSecond=${samplesPerSecond} scrollPosition=${scrollPosition}`, visibleFeatures)
        return visibleFeatures;
        // Binary search to find the starting index
        // let startIdx = 0;
        // let endIdx = allData.rawPhysicalFeatures.length - 1;
        // let firstVisibleIdx = 0;

        // while (startIdx <= endIdx) {
        //     const midIdx = Math.floor((startIdx + endIdx) / 2);
        //     const midTime = allData.rawPhysicalFeatures[midIdx].timestamp;

        //     if (midTime < startTimeVisible) {
        //         startIdx = midIdx + 1;
        //     } else {
        //         endIdx = midIdx - 1;
        //         firstVisibleIdx = midIdx;
        //     }
        // }

        // // Find the end index - start from where we found the first visible item
        // startIdx = firstVisibleIdx;
        // endIdx = allData.rawPhysicalFeatures.length - 1;
        // let lastVisibleIdx = firstVisibleIdx;

        // while (startIdx <= endIdx) {
        //     const midIdx = Math.floor((startIdx + endIdx) / 2);
        //     const midTime = allData.rawPhysicalFeatures[midIdx].timestamp;

        //     if (midTime > endTimeVisible) {
        //         endIdx = midIdx - 1;
        //     } else {
        //         startIdx = midIdx + 1;
        //         lastVisibleIdx = midIdx;
        //     }
        // }

        //console.info(`RawPhysicalFeaturesChart firstVisibleIdx=${firstVisibleIdx} lastVisibleIdx=${lastVisibleIdx} startTime=${startTime} startTimeVisible=${startTimeVisible} endTimeVisible=${endTimeVisible} samplesToShow=${samplesToShow} samplesPerSecond=${samplesPerSecond} scrollPosition=${scrollPosition}`)

        //return allData.rawPhysicalFeatures.slice(firstVisibleIdx, lastVisibleIdx + 1);

    }, [allData.rawPhysicalFeatures, startTime, scrollPosition, samplesPerSecond, samplesToShow]);

    React.useEffect(() => {
        if (!allData.rawPhysicalFeatures) return;

        const ctx = chartRef.current?.getContext('2d');
        if (!ctx) return;

        if (chart) {
            chart.destroy();
        }

        const config: ChartConfiguration = {
            type: 'line',
            data: {
                labels: visibleFeatures.map(f => f.timestamp),
                datasets: [
                    {
                        label: 'Movement',
                        data: visibleFeatures.map(f => f.movement),
                        borderColor: '#8b5cf6',
                        backgroundColor: '#8b5cf6',
                        borderWidth: 2,
                        pointRadius: 4,
                    }
                ]
            },
            options: merge(
                eegChartOptions(`Movement`, allData, scrollPosition), {
                scales: {
                    x: {
                        type: 'time',
                        min: visibleStartTime,
                        max: visibleEndTime,
                        ticks: {
                            count: 10,
                            callback: (value, index, ticks) => {
                                const tickEvery = 3000 // ticks.length / 10;
                                if (index % tickEvery === 0) {
                                    const date = new Date(value);
                                    // console.log('[RawPhysicalFeaturesChart] Ticks', {
                                    //     value,
                                    //     index,
                                    //     ticks: ticks.length,
                                    //     tickEvery
                                    // });
                                    return formatDate(date);
                                }
                                return undefined;
                            }

                            // callback: (value, index, ticks) => {
                            //     const v = visibleFeatures[index]
                            //     //console.info(`RawPhysicalFeaturesChart x ticks callback v=${v.timestamp} value=${value} index=${index} scrollPosition=${scrollPosition} samplesPerSecond=${samplesPerSecond} secondsToShow=${secondsToShow} samplesToShow=${samplesToShow} startTime=${startTime} v=${v}`)
                            //     const formattedTime = formatDate(new Date(v.timestamp));
                            //     return formattedTime;
                            // }
                        }
                    },
                    y: {
                        min: -0.2,
                        max: 1,
                    }
                },
                plugins: {
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: (tooltipItems) => {
                                const feature = visibleFeatures[tooltipItems[0].dataIndex];
                                return new Date(feature.timestamp).toLocaleString();
                            },
                            label: (tooltipItem) => {
                                const feature = visibleFeatures[tooltipItem.dataIndex];
                                return feature ? `Movement: ${feature.movement}` : '';
                            }
                        }
                    }

                }
                // interaction: {
                //     mode: 'index',
                //     intersect: false,
                // },
                // scales: {
                //     x: {
                //         // type: 'linear',
                //         // min: startTime + (scrollPosition / samplesPerSecond) * 1000,
                //         // max: startTime + ((scrollPosition + samplesToShow) / samplesPerSecond) * 1000,
                //         // ticks: {
                //         //     maxTicksLimit: 10,
                //         //     callback: (value) => {
                //         //         const date = new Date(value);
                //         //         return date.toLocaleTimeString();
                //         //     }
                //         // }
                //     }
                // }
            }) as any
        };

        const newChart = new Chart(ctx, config);
        setChart(newChart);

        return () => {
            newChart.destroy();
        };
    }, [allData, scrollPosition, samplesPerSecond, secondsToShow, visibleFeatures]);

    if (!allData.rawPhysicalFeatures) return null;

    return (
        <div className="w-full" style={{ height: '100px' }}>
            <p className="text-sm text-gray-500 text-center">O2Ring only provides values every 4s (so a 1 just means that some movement was seen in the 4s since last), and some raw values that look flaky are skipped</p>
            <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}; 