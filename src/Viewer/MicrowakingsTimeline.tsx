import React from 'react';
import { AllData, Microwaking } from '../Loader/LoaderTypes';

interface MicrowakingsTimelineProps {
    allData: AllData;
    scrollPosition: number;
    totalSamples: number;
    width: number;
    onTimelineClick: (position: number) => void;
}

export const MicrowakingsTimeline: React.FC<MicrowakingsTimelineProps> = ({
    allData,
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
    const startDate = allData.processedEDF.startDate.epochSeconds;
    const duration = allData.processedEDF.duration;

    return (
        <div>
            <svg width={width} height="15" onClick={handleClick}>
                {allData.microwakings?.map((microwaking: Microwaking, index: number) => {
                    const startX = ((microwaking.Start.epochSeconds - startDate) / duration) * width;
                    const endX = ((microwaking.End.epochSeconds - startDate) / duration) * width;
                    return (
                        <rect
                            key={index}
                            x={startX}
                            y="0"
                            width={endX - startX}
                            height="15"
                            fill="rgba(255, 0, 0, 1)"
                        />
                    );
                })}
                <line
                    x1={scrollIndicatorPosition}
                    y1={0}
                    x2={scrollIndicatorPosition}
                    y2={15}
                    stroke="black"
                    strokeWidth={2}
                />
            </svg>
        </div>
    );
};