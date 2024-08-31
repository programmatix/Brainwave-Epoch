import React from 'react';
import { ProcessedSleepStages } from '../Loader/LoaderTypes';

interface DefiniteAwakeSleepTimelineProps {
    sleepStages: ProcessedSleepStages;
    scrollPosition: number;
    totalSamples: number;
    width: number;
    onTimelineClick: (position: number) => void;
}

export const DefiniteAwakeSleepTimeline: React.FC<DefiniteAwakeSleepTimelineProps> = ({
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
                        fill={stage.DefinitelyAwake ? 'red' : (stage.DefinitelySleep ? 'blue' : 'gray')}
                    />
                ))}
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