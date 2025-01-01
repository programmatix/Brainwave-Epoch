import React from 'react';
import { AllData, ProcessedSleepStages } from '../Loader/LoaderTypes';
import { getColorForValue, getColorForValueFromMinMax } from './ChartUtils';

interface FinalWakeModelFeatureTimelineProps {
    allData: AllData;
    scrollPosition: number;
    totalSamples: number;
    width: number;
    onTimelineClick: (position: number) => void;
}

export const FinalWakeModelFeatureTimeline: React.FC<FinalWakeModelFeatureTimelineProps> = ({
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

    const features = allData.sleepStages?.[0]?.finalWakeModel ?
        Object.keys(allData.sleepStages[0].finalWakeModel) : [];

    const height = features.length;

    console.log("FinalWakeModelFeatureTimeline", allData, features);

    return (
        <div>
            <svg width={width} height={height} onClick={handleClick}>
                {features.slice(1).map((feature, featureIndex) => (
                    allData.sleepStages?.map((stage, stageIndex) => { 
                        const featureValue = stage.finalWakeModel?.[feature];
                        if (featureValue === undefined || isNaN(featureValue)) {
                            return null;
                        }
                        try {
                            return (
                                <rect
                                    key={`${feature}-${stageIndex}`}
                                    x={(stageIndex / allData.sleepStages.length) * width}
                                    y={featureIndex}
                                    width={(1 / allData.sleepStages.length) * width}
                                    height="1"
                                    fill={getColorForValue(featureValue, 0, 1)}
                                >
                                    {/* <title>{feature}: {featureValue.toFixed(3)}</title> */}
                                </rect>
                            );
                        } catch (error) {
                            console.error("Error in FinalWakeModelFeatureTimeline", error, featureValue, typeof featureValue);
                            return null;
                        }
                    })
                ))}
                <line
                    x1={scrollIndicatorPosition}
                    y1="0"
                    x2={scrollIndicatorPosition}
                    y2={height}
                    stroke="black"
                    strokeWidth={2}
                />
            </svg>
        </div>
    );
};