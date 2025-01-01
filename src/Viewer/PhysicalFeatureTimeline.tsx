import React from 'react';
import { AllData, ProcessedSleepStages } from '../Loader/LoaderTypes';
import { getColorForValue, getColorForValueFromMinMax } from './ChartUtils';

interface PhysicalFeatureTimelineProps {
    allData: AllData;
    scrollPosition: number;
    totalSamples: number;
    width: number;
    onTimelineClick: (position: number) => void;
    selectedFeature: string;
}

export const PhysicalFeatureTimeline: React.FC<PhysicalFeatureTimelineProps> = ({
    allData,
    scrollPosition,
    totalSamples,
    width,
    onTimelineClick,
    selectedFeature,
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
            <svg width={width} height="15" onClick={handleClick}>
                {allData.sleepStages?.map((stage, index) => {
                    const featureValue = stage.physicalFeatures?.[selectedFeature];
                    return (
                        <rect
                            key={index}
                            x={(index / allData.sleepStages.length) * width}
                            y="0"
                            width={(1 / allData.sleepStages.length) * width}
                            height="15"
                            fill={'blue'}
                        />
                    );
                })}
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