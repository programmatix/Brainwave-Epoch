import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import React, { useEffect, useRef, useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { VideoFile } from './Videos';
import { eegChartOptions } from '../Viewer/ChartUtils';
import { merge } from 'lodash';
import { AllData } from '../Loader/LoaderTypes';

Chart.register(...registerables, annotationPlugin);

interface VideoFilmstripChartProps {
    allData: AllData;
    scrollPosition: number;
    videoFiles: VideoFile[];
    currentTime: Temporal.ZonedDateTime;
    secondsToShow: number;
    onVideoClick: (video: VideoFile) => void;
    currentVideoTime?: number;
    currentVideo?: VideoFile | null;
}

export const VideoFilmstrip: React.FC<VideoFilmstripChartProps> = ({
    allData,
    scrollPosition,
    videoFiles,
    currentTime,
    secondsToShow,
    onVideoClick,
    currentVideoTime,
    currentVideo
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

        const visibleStartTime = currentTime.epochMilliseconds;
        const visibleEndTime = visibleStartTime + secondsToShow;

        const visibleVideos = videoFiles.filter(video => {
            const videoTime = video.timestamp;
            return videoTime >= visibleStartTime && videoTime <= visibleEndTime;
        });

        const annotations: any = {};
        
        visibleVideos.forEach((video, index) => {
            annotations[`video-${index}`] = {
                type: 'box',
                xMin: video.timestamp,
                xMax: video.timestamp + 1000,
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
            };
        });
        
        if (currentVideoTime !== undefined && currentVideo) {
            const playbackPosition = currentVideo.timestamp + (currentVideoTime * 1000);
            annotations['playback-position'] = {
                type: 'line',
                xMin: playbackPosition,
                xMax: playbackPosition,
                yMin: 0,
                yMax: 1,
                borderColor: 'rgba(0, 0, 255, 0.8)',
                borderWidth: 2,
                borderDash: [6, 6],
            };
        }

        const config: ChartConfiguration = {
            type: 'line',
            data: {
                datasets: [{
                    data: [],
                }]
            },
            options: merge(
                eegChartOptions(`Videos`, allData, scrollPosition), {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        // type: 'linear',
                        // min: visibleStartTime * 1000,
                        // max: visibleEndTime * 1000,
                        // ticks: {
                        //     maxTicksLimit: 10,
                        //     callback: (value) => {
                        //         const date = new Date(value);
                        //         return date.toLocaleTimeString();
                        //     }
                        // }
                    },
                    y: {
                        min: 0,
                        max: 1,
                    }
                },
                // layout: {
                //     padding: {
                //         left: 57,
                //         right: 20,
                //     }
                // },
                // animation: false,
                plugins: {
                    // legend: {
                    //     display: false
                    // },
                    annotation: {
                        annotations: annotations
                    },
                    tooltip: {
                        enabled: true,
                        callbacks: {
                            title: (tooltipItems) => {
                                const video = visibleVideos[tooltipItems[0].dataIndex];
                                return video?.name || '';
                            },
                            label: (tooltipItem) => {
                                const video = visibleVideos[tooltipItem.dataIndex];
                                return video ? `Time: ${video.timestamp.toLocaleString()}` : '';
                            }
                        }
                    }
                }
            }) as any
        };

        chartInstance.current = new Chart(ctx, config);

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [videoFiles, currentTime, secondsToShow, onVideoClick, currentVideoTime, currentVideo]);

    return (
        <div className="w-full" style={{ height: '100px' }}>
            <canvas ref={chartRef} />
        </div>
    );
};