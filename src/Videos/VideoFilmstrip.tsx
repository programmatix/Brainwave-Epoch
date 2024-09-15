import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import React, { useEffect, useRef } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { VideoFile } from './Videos';

Chart.register(...registerables, annotationPlugin);

interface VideoFilmstripChartProps {
    videoFiles: VideoFile[];
    currentTime: Temporal.ZonedDateTime;
    secondsToShow: number;
    onVideoClick: (video: VideoFile) => void;
}

export const VideoFilmstrip: React.FC<VideoFilmstripChartProps> = ({
    videoFiles,
    currentTime,
    secondsToShow,
    onVideoClick
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

        const visibleStartTime = currentTime.epochSeconds;
        const visibleEndTime = visibleStartTime + secondsToShow;

        const visibleVideos = videoFiles.filter(video => {
            const videoTime = video.timestamp.epochSeconds;
            return videoTime >= visibleStartTime && videoTime <= visibleEndTime;
        });

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
                        title: { display: true, text: 'Videos' },
                        min: 0,
                        max: 1
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    annotation: {
                        annotations: visibleVideos.map((video, index) => ({
                            type: 'box',
                            xMin: video.timestamp.epochSeconds,
                            xMax: video.timestamp.epochSeconds + 1, // Adjust width as needed
                            yMin: 0,
                            yMax: 1,
                            backgroundColor: 'rgba(255, 99, 132, 0.3)',
                            borderColor: 'rgba(255, 99, 132, 0.8)',
                            borderWidth: 2,
                            label: {
                                content: video.name,
                                enabled: true,
                                position: 'start',
                                font: {
                                    size: 12
                                },
                                color: 'black'
                            },
                            click: () => onVideoClick(video),
                        }))
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: (tooltipItems) => {
                                const video = visibleVideos[tooltipItems[0].dataIndex];
                                return video.name;
                            },
                            label: (tooltipItem) => {
                                const video = visibleVideos[tooltipItem.dataIndex];
                                return `Time: ${video.timestamp.toLocaleString()}`;
                            }
                        }
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
    }, [videoFiles, currentTime, secondsToShow, onVideoClick]);

    return (
        <div className="w-full" style={{ height: '100px' }}>
            <canvas ref={chartRef} />
        </div>
    );
};