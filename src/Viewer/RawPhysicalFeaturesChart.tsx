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
    const chartRefs = React.useRef<(HTMLCanvasElement | null)[]>([]);
    const [charts, setCharts] = React.useState<(Chart | null)[]>([]);

    React.useEffect(() => {
        if (!allData.rawPhysicalFeatures) return;

        const ctx = chartRefs.current[0]?.getContext('2d');
        if (!ctx) return;

        if (charts[0]) {
            charts[0].destroy();
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
        setCharts([newChart]);

        return () => {
            newChart.destroy();
        };
    }, [allData, scrollPosition, samplesPerSecond, secondsToShow]);

    React.useEffect(() => {
        if (!allData.rawPhysicalFeatures) return;

        const ctx = chartRefs.current[1]?.getContext('2d');
        if (!ctx) return;

        if (charts[1]) {
            charts[1].destroy();
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
                        label: 'HR',
                        data: visibleFeatures.map(f => f.hr),
                        borderColor: '#ef4444',
                        backgroundColor: '#ef4444',
                        yAxisID: 'y1',
                        spanGaps: true
                    },
                    {
                        label: 'Temperature',
                        data: visibleFeatures.map(f => f.temp),
                        borderColor: '#3b82f6',
                        backgroundColor: '#3b82f6',
                        yAxisID: 'y2',
                        spanGaps: true
                    },
                    {
                        label: 'O2',
                        data: visibleFeatures.map(f => f.o2),
                        borderColor: '#10b981',
                        backgroundColor: '#10b981',
                        yAxisID: 'y3',
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
                            text: 'HR (bpm)'
                        }
                    },
                    y2: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Temperature (°C)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    },
                    y3: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'O2 (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        };

        const newChart = new Chart(ctx, config);
        setCharts(prev => [...prev, newChart]);

        return () => {
            newChart.destroy();
        };
    }, [allData, scrollPosition, samplesPerSecond, secondsToShow]);

    if (!allData.rawPhysicalFeatures) return null;

    return (
        <div className="flex flex-col space-y-4">
            <div className="w-full" style={{ height: '200px' }}>
                <canvas ref={el => chartRefs.current[0] = el} style={{ width: '100%', height: '100%' }} />
            </div>
            <div className="w-full" style={{ height: '200px' }}>
                <canvas ref={el => chartRefs.current[1] = el} style={{ width: '100%', height: '100%' }} />
            </div>
        </div>
    );
}; 