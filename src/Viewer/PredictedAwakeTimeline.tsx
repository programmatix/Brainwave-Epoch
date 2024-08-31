import React from 'react';
import { ProcessedSleepStages } from '../Loader/LoaderTypes';

interface PredictedAwakeTimelineProps {
    sleepStages: ProcessedSleepStages;
    scrollPosition: number;
    totalSamples: number;
    width: number;
    onTimelineClick: (position: number) => void;
}

export const PredictedAwakeTimeline: React.FC<PredictedAwakeTimelineProps> = ({
    sleepStages,
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

    const scrollIndicatorPosition = (scrollPosition / totalSamples) * width;

    return (
        <div>
            <svg width={width} height="30" onClick={handleClick}>
                {sleepStages.map((stage, index) => (
                    <rect
                        key={index}
                        x={(index / sleepStages.length) * width}
                        y="0"
                        width={(1 / sleepStages.length) * width}
                        height="30"
                        fill={`rgb(${255 * stage.PredictedAwake}, 0, ${255 * (1 - stage.PredictedAwake)})`}
                    />
                ))}
                <line
                    x1={scrollIndicatorPosition}
                    y1={0}
                    x2={scrollIndicatorPosition}
                    y2={30}
                    stroke="black"
                    strokeWidth={2}
                />
            </svg>
        </div>
    );
};