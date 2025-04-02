import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import React, { useEffect, useRef, useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { VideoFile } from './Videos';
import { eegChartOptions } from '../Viewer/ChartUtils';
import { merge } from 'lodash';
import { AllData } from '../Loader/LoaderTypes';
import { formatDate } from '../Loader/Loader';
import 'chartjs-adapter-date-fns';

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
        const visibleEndTime = visibleStartTime + secondsToShow * 1000;

        const visibleVideos = videoFiles.filter(video => {
            const videoTime = video.timestamp;
            const visible = videoTime >= visibleStartTime && videoTime <= visibleEndTime;
            // if (visible) {
            //     console.info(`VideoFilmstrip visibleVideos`, video.name, videoTime, visibleStartTime, visibleEndTime, visible)
            // }
            return visible;
        });

        const annotations: any = {};

        visibleVideos.forEach((video, index) => {
            const isCurrentVideo = currentVideo && video.name === currentVideo.name;
            
            annotations[`video-${index}`] = {
                type: 'box',
                xMin: video.timestamp,
                xMax: video.timestamp + 1000,
                yMin: 0,
                yMax: 1,
                backgroundColor: isCurrentVideo ? 'rgba(46, 204, 113, 0.4)' : 'rgba(255, 99, 132, 0.3)',
                borderColor: isCurrentVideo ? 'rgba(46, 204, 113, 0.9)' : 'rgba(255, 99, 132, 0.8)',
                borderWidth: isCurrentVideo ? 3 : 2,
                label: {
                    content: isCurrentVideo ? `▶ ${video.name}` : video.name,
                    enabled: true,
                    position: 'start',
                    font: {
                        size: 12,
                        weight: isCurrentVideo ? 'bold' : 'normal'
                    },
                    color: isCurrentVideo ? 'rgb(0, 100, 0)' : 'black'
                },
                click: () => onVideoClick(video),
            };
            
            // Add motion indicators if durations data is available
            if (video.durations) {
                // Pre-motion (red) section
                if (video.durations.pre_motion_seconds > 0) {
                    annotations[`pre-motion-${index}`] = {
                        type: 'box',
                        xMin: video.timestamp - (video.durations.pre_motion_seconds * 1000),
                        xMax: video.timestamp,
                        yMin: 0,
                        yMax: 1,
                        backgroundColor: 'rgba(255, 0, 0, 0.2)',
                        borderColor: 'rgba(255, 0, 0, 0.5)',
                        borderWidth: 1,
                        click: () => onVideoClick(video),
                    };
                }
                
                // Post-motion (green) section
                if (video.durations.post_motion_seconds > 0) {
                    annotations[`post-motion-${index}`] = {
                        type: 'box',
                        xMin: video.timestamp,
                        xMax: video.timestamp + (video.durations.post_motion_seconds * 1000),
                        yMin: 0,
                        yMax: 1,
                        backgroundColor: 'rgba(0, 255, 0, 0.2)',
                        borderColor: 'rgba(0, 255, 0, 0.5)',
                        borderWidth: 1,
                        click: () => onVideoClick(video),
                    };
                }
            }
        });

        // console.info(`VideoFilmstrip visibleVideos=${visibleVideos.length} currentTime=${currentTime} secondsToShow=${secondsToShow} currentVideoTime=${currentVideoTime} currentVideo=${currentVideo} visibleStartTime=${visibleStartTime} visibleEndTime=${visibleEndTime}`, annotations)

        if (currentVideoTime !== undefined && currentVideo) {
            const videoStartTime = currentVideo.real_start_timestamp;
                
            // Calculate the adjusted playback position based on the actual starting time
            const adjustedPlaybackPosition = videoStartTime + (currentVideoTime * 1000);
            
            annotations['playback-position'] = {
                type: 'line',
                xMin: adjustedPlaybackPosition,
                xMax: adjustedPlaybackPosition,
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
                        type: 'time',
                        min: visibleStartTime,
                        max: visibleEndTime,
                        ticks: {
                            count: 10,
                            callback: (value) => {
                                const date = new Date(value);
                                return formatDate(date);
                            }
                        }
                    },
                    y: {
                        min: 0,
                        max: 1,
                    }
                },
                plugins: {
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
                                if (!video) return '';
                                
                                const labels = [
                                    `Time: ${new Date(video.timestamp).toLocaleString()}`
                                ];
                                
                                if (video.event_id) {
                                    labels.push(`Event: ${video.event_id}`);
                                }
                                
                                if (video.durations) {
                                    labels.push(`Duration: ${video.durations.total_seconds.toFixed(2)}s`);
                                    labels.push(`Pre-motion: ${video.durations.pre_motion_seconds.toFixed(2)}s`);
                                    labels.push(`Post-motion: ${video.durations.post_motion_seconds.toFixed(2)}s`);
                                }
                                
                                if (video.frame_count) {
                                    labels.push(`Frames: ${video.frame_count}`);
                                }
                                
                                return labels;
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