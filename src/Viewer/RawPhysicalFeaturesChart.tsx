import React from 'react';
import { AllData } from '../Loader/LoaderTypes';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';

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

    React.useEffect(() => {
        if (!allData.rawPhysicalFeatures) return;

        const ctx = chartRef.current?.getContext('2d');
        if (!ctx) return;

        if (chart) {
            chart.destroy();
        }

        const startTime = allData.processedEDF.startDate.epochMilliseconds;
        const samplesToShow = secondsToShow * samplesPerSecond;
        const visibleFeatures = allData.rawPhysicalFeatures.filter(f => {
            const time = f.timestamp.epochMilliseconds;
            const startTimeVisible = startTime + (scrollPosition / samplesPerSecond) * 1000;
            const endTimeVisible = startTimeVisible + (samplesToShow / samplesPerSecond) * 1000;
            return time >= startTimeVisible && time <= endTimeVisible;
        });

        const config: ChartConfiguration = {
            type: 'line',
            data: {
                labels: visibleFeatures.map(f => f.timestamp.toInstant().toString()),
                datasets: [
                    {
                        label: 'Movement',
                        data: visibleFeatures.map(f => f.movement),
                        borderColor: '#8b5cf6',
                        backgroundColor: '#8b5cf6',
                        yAxisID: 'y1',
                        spanGaps: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: 'Time'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Movement'
                        }
                    }
                }
            }
        };

        const newChart = new Chart(ctx, config);
        setChart(newChart);

        return () => {
            newChart.destroy();
        };
    }, [allData, scrollPosition, samplesPerSecond, secondsToShow]);

    if (!allData.rawPhysicalFeatures) return null;

    return (
        <div className="w-full" style={{ height: '200px' }}>
            <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}; 