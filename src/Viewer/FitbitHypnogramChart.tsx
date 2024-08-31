import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import React, { useEffect, useRef } from 'react';
import { AllData } from '../Loader/LoaderTypes';

Chart.register(...registerables, annotationPlugin);

interface FitbitHypnogramChartProps {
    allData: AllData;
    scrollPosition: number;
    samplesPerSecond: number;
    secondsToShow: number;
}

const stateToNumber: Record<string, number> = {
    'wake': 0,
    'rem': 1,
    'light': 2,
    'deep': 3,
};

const stageColorMap: Record<string, string> = {
    'wake': '#ef4444',
    'rem': '#22c55e',
    'light': '#93c5fd',
    'deep': '#1e3a8a',
};

export const FitbitHypnogramChart: React.FC<FitbitHypnogramChartProps> = ({
    allData,
    scrollPosition,
    samplesPerSecond,
    secondsToShow,
}) => {
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<Chart | null>(null);

    useEffect(() => {
        if (!chartRef.current || !allData.fitbitHypnogram) return;

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const startTime = allData.processedEDF.startDate.epochSeconds;
        const endTime = startTime + allData.processedEDF.duration;
        const visibleStartTime = startTime + scrollPosition / samplesPerSecond;
        const visibleEndTime = visibleStartTime + secondsToShow;

        const datasets = Object.entries(stateToNumber).map(([state, yValue]) => {
            const data = allData.fitbitHypnogram
                .filter(entry => entry.state === state)
                .flatMap(entry => [
                    { x: entry.startTime.epochSeconds, y: yValue },
                    { x: entry.endTime.epochSeconds, y: yValue },
                    { x: entry.endTime.epochSeconds, y: null },
                ]);

            return {
                label: state,
                data: data,
                borderColor: stageColorMap[state],
                backgroundColor: stageColorMap[state],
                stepped: true as const,
                fill: false,
                spanGaps: false,
            };
        });

        const config: ChartConfiguration = {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    x: {
                        type: 'linear',
                        min: visibleStartTime,
                        max: visibleEndTime,
                        ticks: {
                            callback: (value) => {
                                const date = new Date(value as number * 1000);
                                return date.toLocaleTimeString();
                            }
                        }
                    },
                    y: {
                        title: { display: true, text: 'Fitbit' },
                        reverse: true,
                        min: -0.5,
                        max: 3.5,
                        ticks: {
                            callback: (value) => {
                                return ['Wake', 'REM', 'Light', 'Deep'][Math.round(value as number)];
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        left: 50,
                        right: 20,
                    }
                },
            plugins: {
                    legend: { display: false },
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
        <div className="w-full" style={{ height: '200px' }}>
            <canvas ref={chartRef} />
        </div>
    );
};