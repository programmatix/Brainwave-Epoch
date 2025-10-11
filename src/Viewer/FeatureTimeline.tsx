import React from 'react';
import { AllData, ProcessedSleepStageEntryFeatures, StageFeatureMinMax } from '../Loader/LoaderTypes';
import { getColorForValueFromMinMax } from './ChartUtils';

interface FeatureTimelineProps {
    allData: AllData;
    scrollPosition: number;
    totalSamples: number;
    width: number;
    onTimelineClick: (position: number) => void;
    selectedFeature: string;
    channel: string;
    onMouseMove: (e: React.MouseEvent<SVGSVGElement>, width: number, duration: number) => void;
}

type StageBucket = keyof StageFeatureMinMax['forAllStats'];
const stageBuckets: StageBucket[] = ['All', 'Sleep', 'NonDeepSleep', 'W', 'N1', 'N2', 'N3', 'R'];
const isStageBucket = (value: string | undefined): value is StageBucket =>
    !!value && stageBuckets.includes(value as StageBucket);

export const FeatureTimeline: React.FC<FeatureTimelineProps> = ({
    allData,
    scrollPosition,
    totalSamples,  
    width,
    onTimelineClick,
    selectedFeature,
    channel,
    onMouseMove,
}) => {
    const selectedFeatureKey = selectedFeature as keyof ProcessedSleepStageEntryFeatures;

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newPosition = Math.floor((x / width) * totalSamples);
        onTimelineClick(newPosition);
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        onMouseMove(e, width, totalSamples / allData.processedEDF.signals[0].samplingRate);
    };

    const scrollIndicatorPosition = (scrollPosition / totalSamples) * width;

    return (
        <div>
            <svg width={width} height="15" onClick={handleClick} onMouseMove={handleMouseMove}>
                {allData.sleepStages?.map((stage, index) => {
                    const featureValue = stage.Channels[channel]?.[selectedFeatureKey];
                    const featureMinMax = allData.sleepStageFeatureMinMax?.[channel]?.[selectedFeatureKey];
                    const stageMinMax = featureMinMax && isStageBucket(stage.Stage)
                        ? featureMinMax.forAllStats[stage.Stage]
                        : undefined;
                    const colorMinMax = stageMinMax && stageMinMax.p90 !== stageMinMax.p10
                        ? stageMinMax
                        : featureMinMax?.forAllStats.All;
                    const color = colorMinMax && typeof featureValue === 'number'
                        ? getColorForValueFromMinMax(featureValue, colorMinMax)
                        : 'gray';
                    return (
                        <rect
                            key={index}
                            x={(index / allData.sleepStages.length) * width}
                            y="0"
                            width={(1 / allData.sleepStages.length) * width}
                            height="15"
                            fill={color}
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
