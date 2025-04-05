import React from 'react';
import { AudioFile } from './Audio';
import { Temporal } from '@js-temporal/polyfill';
import { AllData } from '../Loader/LoaderTypes';

interface AudioTimelineProps {
    allData: AllData;
    audioFiles: AudioFile[];
    startTime: Temporal.ZonedDateTime;
    duration: number;
    width: number;
    onTimelineClick: (position: number) => void;
    onMouseMove: (e: React.MouseEvent<HTMLElement>, width: number, duration: number, type: string) => void;
}

export const AudioTimeline: React.FC<AudioTimelineProps> = ({
    allData,
    audioFiles,
    startTime,
    duration,
    width,
    onTimelineClick,
    onMouseMove
}) => {
    const startMs = startTime.epochMilliseconds;
    const endMs = startMs + (duration * 1000);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const position = (x / width) * duration;
        onTimelineClick(position);
    };

    return (
        <div 
            className="relative h-8 bg-gray-100 rounded cursor-pointer"
            onClick={handleClick}
            onMouseMove={(e) => onMouseMove(e, width, duration, 'audio')}
        >
            {audioFiles.map((audio, index) => {
                // Only show audio files that overlap with the visible range
                if (audio.timestamp + audio.duration_ms < startMs || audio.timestamp > endMs) {
                    return null;
                }

                // Calculate position and width of the audio file
                const start = Math.max(0, (audio.timestamp - startMs) / (duration * 1000));
                const end = Math.min(1, (audio.timestamp + audio.duration_ms - startMs) / (duration * 1000));
                const left = start * width;
                const w = (end - start) * width;

                return (
                    <div key={index} className="absolute h-full">
                        {/* Main audio file box */}
                        <div
                            className="absolute h-full bg-blue-200 border border-blue-400"
                            style={{ left: `${left}px`, width: `${w}px` }}
                        >
                            {/* Audio segments */}
                            {audio.metadata?.audio?.map((segment, segmentIndex) => {
                                const segmentStart = new Date(segment.start_timestamp).getTime();
                                const segmentEnd = new Date(segment.end_timestamp).getTime();
                                
                                // Only show segments that overlap with the visible range
                                if (segmentEnd < startMs || segmentStart > endMs) {
                                    return null;
                                }

                                const segmentLeft = Math.max(0, (segmentStart - startMs) / (duration * 1000));
                                const segmentRight = Math.min(1, (segmentEnd - startMs) / (duration * 1000));
                                const segmentWidth = (segmentRight - segmentLeft) * width;

                                return (
                                    <div
                                        key={segmentIndex}
                                        className="absolute h-full bg-orange-300 border border-orange-500"
                                        style={{ 
                                            left: `${segmentLeft * width}px`, 
                                            width: `${segmentWidth}px`,
                                            zIndex: 2
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}; 