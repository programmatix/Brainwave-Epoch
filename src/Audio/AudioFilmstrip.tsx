import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import React, { useEffect, useRef } from 'react';
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
            // Audio is visible if any part of it overlaps with the visible range
            const visible = (audioStartTime <= visibleEndTime && audioEndTime >= visibleStartTime);
            return visible;
        });

        const annotations: any = {};

        visibleAudios.forEach((audio, index) => {
            const isCurrentAudio = currentAudio && audio.name === currentAudio.name;
            
            annotations[`audio-${index}`] = {
                type: 'box',
                xMin: audio.timestamp,
                xMax: audio.timestamp + audio.duration_ms,
                yMin: 0,
                yMax: 1,
                backgroundColor: isCurrentAudio ? 'rgba(65, 105, 225, 0.4)' : 'rgba(65, 105, 225, 0.2)', // Royal blue
                borderColor: isCurrentAudio ? 'rgba(65, 105, 225, 0.9)' : 'rgba(65, 105, 225, 0.6)',
                borderWidth: isCurrentAudio ? 3 : 2,
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

        if (currentAudioTime !== undefined && currentAudio) {
            const playbackPosition = currentAudio.timestamp + (currentAudioTime * 1000);
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
                eegChartOptions(`Audio`, allData, scrollPosition), {
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
    }, [audioFiles, currentTime, secondsToShow, onAudioClick, currentAudioTime, currentAudio]);

    return (
        <div className="w-full" style={{ height: '100px' }}>
            <canvas ref={chartRef} />
        </div>
    );
}; 