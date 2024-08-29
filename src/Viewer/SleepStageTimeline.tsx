import React, { useState } from 'react';
import { ProcessedSleepStages } from '../Loader/LoaderTypes';

type SleepStage = 'W' | 'N1' | 'N2' | 'N3' | 'R';

const stageColorMap: Record<SleepStage, string> = {
  'W': '#ef4444',
  'N1': '#93c5fd',
  'N2': '#3b82f6',
  'N3': '#1e3a8a',
  'R': '#22c55e',
};

interface SleepStageTimelineProps {
  sleepStages: ProcessedSleepStages;
  scrollPosition: number;
  totalSamples: number;
  samplesPerSecond: number;
  samplesPerEpoch: number;
  width: number;
  onTimelineClick: (position: number) => void;
}

export const SleepStageTimeline: React.FC<SleepStageTimelineProps> = ({
  sleepStages,
  scrollPosition,
  totalSamples,
  samplesPerSecond,
  samplesPerEpoch,
  width,
  onTimelineClick,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const SECONDS_TO_SHOW = 30;
  const viewboxWidth = (SECONDS_TO_SHOW * samplesPerSecond / totalSamples) * width;
  const viewboxPosition = (scrollPosition / totalSamples) * width;

  const handleTimelineClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPosition = Math.floor((x / width) * totalSamples);
    onTimelineClick(newPosition);
  };

  return (
    <svg
      width={width}
      height="50"
      onClick={handleTimelineClick}
    >
      {sleepStages?.map((stage, index) => (
        <rect
          key={index}
          x={(index / sleepStages.length) * width}
          y="0"
          width={(1 / sleepStages.length) * width}
          height="30"
          fill={stageColorMap[stage.Channels['Aggregated'].Stage as SleepStage] || '#d1d5db'}
        />
      ))}
      <rect
        x={viewboxPosition}
        y="0"
        width={viewboxWidth}
        height="30"
        fill="none"
        stroke="black"
        strokeWidth="2"
        style={{ cursor: 'grab' }}
      />
    </svg>
  );
};