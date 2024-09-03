import React from 'react';
import { ProcessedSleepStages } from '../Loader/LoaderTypes';

interface PredictedSleepStageTimelineProps {
    sleepStages: ProcessedSleepStages;
    scrollPosition: number;
    totalSamples: number;
    width: number;
    onTimelineClick: (position: number) => void;
}

export const PredictedSleepStageTimeline: React.FC<PredictedSleepStageTimelineProps> = ({
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

    const getStageColor = (stage: ProcessedSleepStages[0]) => {
        if (stage.Predictions_Wake === 1) return '#ef4444';
        if (stage.Predictions_AnyDeep === 1 || stage.Predictions_Ambiguous_Deep === 1 || stage.Predictions_Deep === 1) return '#1e3a8a';
        if (stage.Predictions_Non_Deep === 1) return '#3b82f6';
        if (stage.Predictions_Noise === 1) return 'black';
        return 'gray';
    };

    return (
        <div>
            <svg width={width} height="15" onClick={handleClick}>
                {sleepStages.map((stage, index) => (
                    <React.Fragment key={index}>
                        <rect
                            x={(index / sleepStages.length) * width}
                            y="0"
                            width={(1 / sleepStages.length) * width}
                            height="15"
                            fill={getStageColor(stage)}
                        />
                        {(stage.Predictions_has_microwaking_start > 0 || stage.Predictions_has_microwaking_end > 0) && (
                            <circle
                                cx={((index + 0.5) / sleepStages.length) * width}
                                cy="7.5"
                                r="2"
                                fill="red"
                            />
                        )}
                    </React.Fragment>
                ))}
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