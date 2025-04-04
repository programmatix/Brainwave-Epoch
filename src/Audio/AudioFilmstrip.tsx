import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import React, { useEffect, useRef, useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { AudioFile } from './Audio';
import { eegChartOptions } from '../Viewer/ChartUtils';
import { merge } from 'lodash';
import { AllData } from '../Loader/LoaderTypes';
import { formatDate } from '../Loader/Loader';
import 'chartjs-adapter-date-fns';

Chart.register(...registerables, annotationPlugin);

interface AudioFilmstripChartProps {
    allData: AllData;
    scrollPosition: number;
    audioFiles: AudioFile[];
    currentTime: Temporal.ZonedDateTime;
    secondsToShow: number;
    onAudioClick: (audio: AudioFile) => void;
    currentAudioTime?: number;
    currentAudio?: AudioFile | null;
}

export const AudioFilmstrip: React.FC<AudioFilmstripChartProps> = ({
    allData,
    scrollPosition,
    audioFiles,
    currentTime,
    secondsToShow,
    onAudioClick,
    currentAudioTime,
    currentAudio
}) => {
    const chartRef = useRef<HTMLCanvasElement | null>(null);
    const chartInstance = useRef<Chart | null>(null);
    const [forceUpdate, setForceUpdate] = useState<number>(0);

    // Listen for audio position updates from the video player
    useEffect(() => {
        const handleAudioPositionUpdate = (event: CustomEvent) => {
            // If we have a chart instance and currentAudio, try to update the playback line directly
            if (chartInstance.current && currentAudio && typeof window !== 'undefined' && window.storeAPI) {
                const state = window.storeAPI.getState();
                if (state.isAudioSyncedWithVideo && state.currentVideo && state.currentAudio) {
                    const { videoTime, videoTimestamp, audioTimestamp } = event.detail;
                    
                    let playbackPosition: number | undefined;
                    
                    if (videoTimestamp >= audioTimestamp) {
                        // Video starts after audio
                        const offsetSeconds = (videoTimestamp - audioTimestamp) / 1000;
                        playbackPosition = audioTimestamp + ((videoTime + offsetSeconds) * 1000);
                    } else {
                        // Audio starts after video
                        const offsetSeconds = (audioTimestamp - videoTimestamp) / 1000;
                        if (videoTime >= offsetSeconds) {
                            playbackPosition = audioTimestamp + ((videoTime - offsetSeconds) * 1000);
                        }
                    }

                    console.log('[AudioFilmstrip] Calculated playback position:', {
                        videoTime,
                        videoTimestamp,
                        videoTimestampDate: new Date(videoTimestamp).toLocaleString(),
                        audioTimestamp,
                        audioTimestampDate: new Date(audioTimestamp).toLocaleString(),
                        playbackPosition,
                        playbackPositionDate: new Date(playbackPosition).toLocaleString()
                    });
                    
                    if (playbackPosition) {
                        // Update the existing annotation instead of recreating the chart
                        const annotations = chartInstance.current.options.plugins?.annotation?.annotations as any;
                        if (annotations && annotations['playback-position']) {
                            annotations['playback-position'].xMin = playbackPosition;
                            annotations['playback-position'].xMax = playbackPosition;
                            chartInstance.current.update('none'); // Minimal update
                            return; // Skip full redraw
                        } else {
                            // If no annotation exists yet, force a full update
                            setForceUpdate(prev => prev + 1);
                        }
                    }
                }
            } else {
                // Fallback to force redraw
                setForceUpdate(prev => prev + 1);
            }
        };

        window.addEventListener('audioPositionUpdate', handleAudioPositionUpdate as EventListener);
        
        return () => {
            window.removeEventListener('audioPositionUpdate', handleAudioPositionUpdate as EventListener);
        };
    }, [currentAudio]);

    useEffect(() => {
        if (!chartRef.current) return;

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const visibleStartTime = currentTime.epochMilliseconds;
        const visibleEndTime = visibleStartTime + secondsToShow * 1000;

        const visibleAudios = audioFiles.filter(audio => {
            const audioStartTime = audio.timestamp;
            const audioEndTime = audio.timestamp + audio.duration_ms;
            return (audioStartTime <= visibleEndTime && audioEndTime >= visibleStartTime);
        });

        const annotations: any = {};

        visibleAudios.forEach((audio, index) => {
            const isCurrentAudio = currentAudio && audio.name === currentAudio.name;
            
            // Add segment boxes first (so they appear on top)
            audio.metadata?.audio?.forEach((segment, segmentIndex) => {
                const segmentStartTime = new Date(segment.start_timestamp).getTime();
                const segmentEndTime = new Date(segment.end_timestamp).getTime();
                
                annotations[`audio-${index}-segment-${segmentIndex}`] = {
                    type: 'box',
                    xMin: segmentStartTime,
                    xMax: segmentEndTime,
                    yMin: 0.1,
                    yMax: 0.9,
                    backgroundColor: 'rgba(255, 165, 0, 0.3)',
                    borderColor: 'rgba(255, 165, 0, 0.8)',
                    borderWidth: 2,
                    z: 2,
                    label: {
                        content: `Segment ${segmentIndex + 1}`,
                        enabled: true,
                        position: 'center',
                        font: {
                            size: 10
                        }
                    },
                    click: () => {
                        console.log('[AudioFilmstrip] Clicked segment', {
                            audio,
                            segment
                        });
                        onAudioClick(audio);
                        // Dispatch a custom event to seek to the segment start time
                        window.dispatchEvent(new CustomEvent('seekAudio', {
                            detail: {
                                audioFile: audio,
                                time: segment.start_time
                            }
                        }));
                    }
                };
            });

            // Add the main audio file box (with lower z-index)
            annotations[`audio-${index}`] = {
                type: 'box',
                xMin: audio.timestamp,
                xMax: audio.timestamp + audio.duration_ms,
                yMin: 0,
                yMax: 1,
                backgroundColor: isCurrentAudio ? 'rgba(65, 105, 225, 0.4)' : 'rgba(65, 105, 225, 0.2)',
                borderColor: isCurrentAudio ? 'rgba(65, 105, 225, 0.9)' : 'rgba(65, 105, 225, 0.6)',
                borderWidth: isCurrentAudio ? 3 : 2,
                z: 1,
                label: {
                    content: isCurrentAudio ? `♪ ${audio.name}` : audio.name,
                    enabled: true,
                    position: 'start',
                    font: {
                        size: 12,
                        weight: isCurrentAudio ? 'bold' : 'normal'
                    },
                    color: isCurrentAudio ? 'navy' : 'black'
                },
                click: () => onAudioClick(audio),
            };
        });

        // Show playback position in both independent mode and sync mode
        if (currentAudio) {
            let playbackPosition: number | undefined;
            
            if (currentAudioTime !== undefined) {
                // Independent mode - use the provided currentAudioTime
                playbackPosition = currentAudio.timestamp + (currentAudioTime * 1000);
            } else if (typeof window !== 'undefined' && window.storeAPI) {
                // Try to get state from the global store API for sync mode
                const state = window.storeAPI.getState();
                if (state.isAudioSyncedWithVideo && state.currentVideo && state.currentAudio && state.currentAudio.name === currentAudio.name) {
                    // Find the video element to get current playback time
                    const videoElement = document.querySelector('video');
                    if (videoElement) {
                        const videoPlaybackTime = videoElement.currentTime;
                        const videoTimestamp = state.currentVideo.real_start_timestamp;
                        const audioTimestamp = state.currentAudio.timestamp;
                        
                        console.log('[AudioFilmstrip] Calculating sync position:', {
                            videoTime: videoPlaybackTime,
                            videoTimestamp,
                            audioTimestamp
                        });
                        
                        if (videoTimestamp >= audioTimestamp) {
                            // Video starts after audio
                            const offsetSeconds = (videoTimestamp - audioTimestamp) / 1000;
                            // Calculate position based on video time and offset
                            playbackPosition = audioTimestamp + ((videoPlaybackTime + offsetSeconds) * 1000);
                        } else {
                            // Audio starts after video
                            const offsetSeconds = (audioTimestamp - videoTimestamp) / 1000;
                            if (videoPlaybackTime >= offsetSeconds) {
                                playbackPosition = audioTimestamp + ((videoPlaybackTime - offsetSeconds) * 1000);
                            }
                        }
                        
                        console.log('[AudioFilmstrip] Calculated playback position:', playbackPosition);
                    }
                }
            }
            
            if (playbackPosition) {
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
        }

        const config: ChartConfiguration = {
            type: 'line',
            data: {
                datasets: [{
                    data: [],
                }]
            },
            options: merge(
                eegChartOptions(`Audio`, allData, scrollPosition), {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (event, elements) => {
                    if (elements && elements.length > 0) {
                        const element = elements[0];
                        const annotation = chartInstance.current?.options.plugins?.annotation?.annotations[element.element.options.id];
                        if (annotation && annotation.click) {
                            annotation.click();
                        }
                    }
                },
                onHover: (event, elements) => {
                    if (event.native) {
                        const target = event.native.target as HTMLElement;
                        if (elements && elements.length > 0) {
                            target.style.cursor = 'pointer';
                        } else {
                            target.style.cursor = 'default';
                        }
                    }
                },
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
                                    // console.log('[AudioFilmstrip] Ticks', {
                                    //     value,
                                    //     index,
                                    //     ticks: ticks.length,
                                    //     tickEvery
                                    // });
                                    return formatDate(date);
                                }
                                return undefined;
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
                                const audio = visibleAudios[tooltipItems[0].dataIndex];
                                return audio?.name || '';
                            },
                            label: (tooltipItem) => {
                                const audio = visibleAudios[tooltipItem.dataIndex];
                                if (!audio) return '';
                                
                                const labels = [
                                    `Time: ${new Date(audio.timestamp).toLocaleString()}`,
                                    `Duration: ${(audio.duration_ms / 1000).toFixed(1)}s`,
                                    `Size: ${(audio.file_size_in_bytes / 1024 / 1024).toFixed(2)} MB`
                                ];
                                
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
    }, [audioFiles, currentTime, secondsToShow, onAudioClick, currentAudioTime, currentAudio, forceUpdate]);

    return (
        <div className="w-full" style={{ height: '100px' }}>
            <canvas ref={chartRef} />
        </div>
    );
}; 