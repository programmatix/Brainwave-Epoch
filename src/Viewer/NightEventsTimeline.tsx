import React from 'react';
import { AllData } from '../Loader/ProcessorTypes';

interface NightEventsTimelineProps {
  allData: AllData;
  totalSamples: number;
  width: number;
  onTimelineClick: (position: number) => void;
}

export const NightEventsTimeline: React.FC<NightEventsTimelineProps> = ({
  allData,
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

  return (
    <div>
      <svg width={width} height="30" onClick={handleClick}>
        {allData.nightEvents.map((event, eventIndex) => (
            <rect
              key={`${eventIndex}`} 
              x={((event.timestamp.epochSeconds - allData.processedEDF.startDate.epochSeconds) / totalSamples) * width}
              y="0"
              width={((event.timestamp.epochSeconds - event.timestamp.epochSeconds) / totalSamples) * width}
              height="30"
              fill="#9333ea"
            />
        ))}
      </svg>
    </div>
  );
};