import React from 'react';
import { Scorings } from '../Loader/LoaderTypes';

const stageColorMap: Record<string, string> = {
    'Wake': '#ef4444',
    'Deep': '#1e3a8a',
    'Non-Deep': '#3b82f6',
    'Ambiguous Deep': '#1e3a8a',
    'Unsure': 'gray',
  };
  
interface ScoredEpochsTimelineProps {
    scorings: Scorings;
    scrollPosition: number;
    totalSamples: number;
    samplesPerEpoch: number;
    width: number;
    onTimelineClick: (position: number) => void;
}

export const ScoredEpochsTimeline: React.FC<ScoredEpochsTimelineProps> = ({
    scorings,
    scrollPosition,
    totalSamples,
    samplesPerEpoch,
    width,
    onTimelineClick,
}) => {
    const totalEpochs = Math.ceil(totalSamples / samplesPerEpoch);
    const epochWidth = width / totalEpochs;

    return (
        <svg width={width} height="20">
            {scorings.map((scoring) => (
                <rect
                    key={scoring.epochIndex}
                    x={scoring.epochIndex * epochWidth}
                    y={0}
                    width={epochWidth}
                    height={20}
                    fill={stageColorMap[scoring.stage]}
                />
            ))}
            <rect
                x={(scrollPosition / totalSamples) * width}
                y={0}
                width={2}
                height={20}
                fill="red"
            />
        </svg>
    );
};