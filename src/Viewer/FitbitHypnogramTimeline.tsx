import React from 'react';
import { AllData } from '../Loader/LoaderTypes';
import { FitbitHypnogram } from '../Loader/LoaderTypes';

interface FitbitHypnogramTimelineProps {
  fitbitHypnogram: FitbitHypnogram;
  scrollPosition: number;
  totalSamples: number;
  width: number;
  onTimelineClick: (position: number) => void;
  allData: AllData;
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>, width: number, duration: number) => void;
}

const stateColorMap: Record<string, string> = {
  'wake': '#ef4444',
  'light': '#93c5fd',
  'deep': '#1e3a8a',
  'rem': '#22c55e',
};

export const FitbitHypnogramTimeline: React.FC<FitbitHypnogramTimelineProps> = ({
  fitbitHypnogram,
  scrollPosition,
  totalSamples,
  width,
  onTimelineClick,
  allData,
  onMouseMove,
}) => {
  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPosition = Math.floor((x / width) * totalSamples);
    onTimelineClick(newPosition);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    onMouseMove(e, width, allData.processedEDF.duration);
  };

  const startDate = allData.processedEDF.startDate.epochSeconds;
  const duration = allData.processedEDF.duration;

  const scrollIndicatorPosition = (scrollPosition / totalSamples) * width;

  return (
    <div>
      <svg width={width} height="15" onClick={handleClick} onMouseMove={handleMouseMove}>
        {fitbitHypnogram.map((entry, index) => {
          const startX = ((entry.startTime.epochSeconds - startDate) / duration) * width;
          const endX = ((entry.endTime.epochSeconds - startDate) / duration) * width;
          return (
            <rect
              key={index}
              x={startX}
              y="0"
              width={endX - startX}
              height="30"
              fill={stateColorMap[entry.state] || '#d1d5db'}
            />
          );
        })}
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