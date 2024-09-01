import React from 'react';
import { AllData, SlowWaveEvent, SpindleEvent } from '../Loader/LoaderTypes';

interface CombinedSlowWaveSpindleTimelineProps {
    allData: AllData;
    channel: string;
    scrollPosition: number;
    totalSamples: number;
    width: number;
    onTimelineClick: (position: number) => void;
}

export const CombinedSlowWaveSpindleTimeline: React.FC<CombinedSlowWaveSpindleTimelineProps> = ({
    allData,
    channel,
    scrollPosition,
    totalSamples,
    width,
    onTimelineClick,
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

    const slowWaveEvents = allData.slowWaveEvents?.[channel] || [];
    const spindleEvents = allData.spindleEvents?.[channel] || [];

    const renderEvent = (event: SlowWaveEvent | SpindleEvent, color: string) => {
        const startSample = secondsToSamples(event.Start);
        const endSample = secondsToSamples(event.End);
        return (
            <rect
                key={`${event.Start}-${event.End}-${color}`}
                x={(startSample / totalSamples) * width}
                y="0"
                width={Math.max(1, ((endSample - startSample) / totalSamples) * width)}
                height="15"
                fill={color}
            />
        );
    };

    return (
        <div>
            <svg width={width} height="15" onClick={handleClick}>
                {slowWaveEvents.map(event => renderEvent(event, 'blue'))}
                {spindleEvents.map(event => renderEvent(event, 'purple'))}
                <line
                    x1={scrollIndicatorPosition}
                    y1="0"
                    x2={scrollIndicatorPosition}
                    y2="15"
                    stroke="black"
                    strokeWidth={2}
                />
            </svg>
        </div>
    );
};