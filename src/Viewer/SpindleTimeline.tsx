import React from 'react';
import { SpindleEvent } from '../Loader/LoaderTypes';
import { AllData } from '../Loader/LoaderTypes';

interface SpindleTimelineProps {
    allData: AllData;
    channel: string;
    events: SpindleEvent[];
    scrollPosition: number;
    totalSamples: number;
    width: number;
    onTimelineClick: (position: number) => void;
}

export const SpindleTimeline: React.FC<SpindleTimelineProps> = ({
    channel,
    events,
    scrollPosition,
    totalSamples,
    width,
    onTimelineClick,
    allData,
}) => {
    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newPosition = Math.floor((x / width) * totalSamples);
        onTimelineClick(newPosition);
    };

    const secondsToSamples = (seconds: number) => {
        return Math.floor(seconds * allData.processedEDF.signals[0].samplingRate);
    };

    const scrollIndicatorPosition = (scrollPosition / totalSamples) * width;

    return (
        <div>
            <svg width={width} height="30" onClick={handleClick}>
                {events.map((event, index) => {
                    const startSample = secondsToSamples(event.Start);
                    const endSample = secondsToSamples(event.End);
                    return (
                        <rect
                            key={index}
                            x={(startSample / totalSamples) * width}
                            y="0"
                            width={Math.max(1, ((endSample - startSample) / totalSamples) * width)}
                            height="30"
                            fill="#9333ea"
                        />
                    );
                })}
                <line
                    x1={scrollIndicatorPosition}
                    y1={0}
                    x2={scrollIndicatorPosition}
                    y2={30}
                    stroke="red"
                    strokeWidth={2}
                />
            </svg>
        </div>
    );
};