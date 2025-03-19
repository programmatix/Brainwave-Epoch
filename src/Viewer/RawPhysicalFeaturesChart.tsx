import React, { useMemo } from 'react';
import { AllData } from '../Loader/LoaderTypes';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { merge } from 'lodash';
import { eegChartOptions } from './ChartUtils';

Chart.register(...registerables, annotationPlugin);

interface RawPhysicalFeaturesChartProps {
    allData: AllData;
    scrollPosition: number;
    samplesPerSecond: number;
    secondsToShow: number;
}

export const RawPhysicalFeaturesChart: React.FC<RawPhysicalFeaturesChartProps> = ({
    allData,
    scrollPosition,
    samplesPerSecond,
    secondsToShow
}) => {
    const chartRef = React.useRef<HTMLCanvasElement | null>(null);
    const [chart, setChart] = React.useState<Chart | null>(null);

    const startTime = allData.processedEDF.startDate.epochMilliseconds;
    const samplesToShow = secondsToShow * samplesPerSecond;

    const visibleFeatures = useMemo(() => {
        if (!allData.rawPhysicalFeatures || !allData.rawPhysicalFeatures.length) return [];
        
        const startTimeVisible = startTime + (scrollPosition / samplesPerSecond) * 1000;
        const endTimeVisible = startTimeVisible + (samplesToShow / samplesPerSecond) * 1000;
        
        // Binary search to find the starting index
        let startIdx = 0;
        let endIdx = allData.rawPhysicalFeatures.length - 1;
        let firstVisibleIdx = 0;
        
        while (startIdx <= endIdx) {
            const midIdx = Math.floor((startIdx + endIdx) / 2);
            const midTime = allData.rawPhysicalFeatures[midIdx].timestamp;
            
            if (midTime < startTimeVisible) {
                startIdx = midIdx + 1;
            } else {
                endIdx = midIdx - 1;
                firstVisibleIdx = midIdx;
            }
        }
        
        // Find the end index - start from where we found the first visible item
        startIdx = firstVisibleIdx;
        endIdx = allData.rawPhysicalFeatures.length - 1;
        let lastVisibleIdx = firstVisibleIdx;
        
        while (startIdx <= endIdx) {
            const midIdx = Math.floor((startIdx + endIdx) / 2);
            const midTime = allData.rawPhysicalFeatures[midIdx].timestamp;
            
            if (midTime > endTimeVisible) {
                endIdx = midIdx - 1;
            } else {
                startIdx = midIdx + 1;
                lastVisibleIdx = midIdx;
            }
        }
        
        return allData.rawPhysicalFeatures.slice(firstVisibleIdx, lastVisibleIdx + 1);
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
                // labels: visibleFeatures.map(f => f.timestamp.toString()),
                datasets: [
                    {
                        label: 'Movement',
                        data: visibleFeatures.map(f => f.movement),
                        borderColor: '#8b5cf6',
                        backgroundColor: '#8b5cf6',
                    }
                ]
            },
            options: merge(
                eegChartOptions(`Movement`, allData, scrollPosition), {
                // interaction: {
                //     mode: 'index',
                //     intersect: false,
                // },
                scales: {
                    x: {
                        type: 'linear',
                        min: startTime + (scrollPosition / samplesPerSecond) * 1000,
                        max: startTime + ((scrollPosition + samplesToShow) / samplesPerSecond) * 1000,
                        ticks: {
                            maxTicksLimit: 10,
                            callback: (value) => {
                                const date = new Date(value);
                                return date.toLocaleTimeString();
                            }
                        }
                    }
                }
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
            <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}; 