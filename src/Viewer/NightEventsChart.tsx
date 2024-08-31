import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import React, { useEffect, useRef } from 'react';
import { AllData } from '../Loader/LoaderTypes';

Chart.register(...registerables, annotationPlugin);

interface NightEventsChartProps {
    allData: AllData;
    scrollPosition: number;
    samplesPerSecond: number;
    secondsToShow: number;
}

export const NightEventsChart: React.FC<NightEventsChartProps> = ({
    allData,
    scrollPosition,
    samplesPerSecond,
    secondsToShow
}) => {
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (!chartRef.current) return;

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const startTime = allData.processedEDF.startDate.epochSeconds;
        const visibleStartTime = startTime + scrollPosition / samplesPerSecond;
        const visibleEndTime = visibleStartTime + secondsToShow;

        const visibleEvents = allData.nightEvents?.filter(event => {
            const eventTime = event.timestamp.epochSeconds;
            return eventTime >= visibleStartTime && eventTime <= visibleEndTime;
        }) || [];

        const config: ChartConfiguration = {
            type: 'line',
            data: {
                datasets: [{
                    data: [],
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'linear',
                        min: visibleStartTime,
                        max: visibleEndTime,
                        ticks: {
                            callback: (value: number) => {
                                const date = new Date(value * 1000);
                                return date.toLocaleTimeString();
                            }
                        }
                    },
                    y: {
                        title: { display: true, text: 'Events' },
                        // display: false,
                        min: 0,
                        max: 1
                    }
                },
                layout: {
                    padding: {
                        left: 50,
                        right: 20,
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    annotation: {
                        annotations: visibleEvents.map((event, index) => ({
                            type: 'line',
                            xMin: event.timestamp.epochSeconds,
                            xMax: event.timestamp.epochSeconds,
                            borderColor: 'rgba(255, 99, 132, 0.8)',
                            borderWidth: 2,
                            label: {
                                content: event.event,
                                enabled: true,
                                yAdjust: index % 2 === 0 ? 0 : 20,
                            }
                        }))
                    }
                }
            }
        };

        chartInstance.current = new Chart(ctx, config);

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [allData, scrollPosition, samplesPerSecond, secondsToShow]);

    return (
        <div className="w-full" style={{ height: '100px' }}>
            <canvas ref={chartRef} />
        </div>
    );
};