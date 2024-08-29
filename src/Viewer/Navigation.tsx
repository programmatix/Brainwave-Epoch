import React, { useState, useEffect, useCallback } from 'react';
import { ProcessedSleepStages } from '../Loader/LoaderTypes';
import { AllData } from '../Loader/ProcessorTypes';

type SleepStage = 'W' | 'N1' | 'N2' | 'N3' | 'R';

const stageColors: Record<SleepStage, string> = {
  'W': 'bg-red-500',
  'N1': 'bg-blue-300',
  'N2': 'bg-blue-500',
  'N3': 'bg-navy-700',
  'R': 'bg-green-500',
};

interface TimelineNavigationProps {
  allData: AllData;
  scrollPosition: number;
  setScrollPosition: any;
  totalSamples: number;
  samplesPerSecond: number;
  samplesPerEpoch: number;
}

const SECONDS_TO_SHOW = 30;

export const TimelineNavigation: React.FC<TimelineNavigationProps> = ({
  allData,
  scrollPosition,
  setScrollPosition,
  totalSamples,
  samplesPerSecond,
  samplesPerEpoch,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  console.log('scrollPosition', scrollPosition);

  const timelineWidth = 1000;
  const viewboxWidth = (SECONDS_TO_SHOW * samplesPerSecond / totalSamples) * timelineWidth;
  const viewboxPosition = (scrollPosition / totalSamples) * timelineWidth;

  const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);

  const setEpoch = (epoch: number) => {
    const newPosition = epoch * samplesPerEpoch;
    setScrollPosition(Math.min(newPosition, totalSamples - 1));
  };

  const handleTimelineClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPosition = Math.floor((x / timelineWidth) * totalSamples);
    setEpoch(Math.floor(newPosition / samplesPerEpoch));
  };

  const handleViewboxDragStart = (e: React.MouseEvent<SVGRectElement>) => {
    setIsDragging(true);
  };

  const handleViewboxDragEnd = () => {
    setIsDragging(false);
  };
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setScrollPosition((prev) => Math.max(0, prev - 50));
    } else if (e.key === 'ArrowRight') {
      setScrollPosition((prev) => Math.min(totalSamples - 1, prev + 50));
    } else if (e.key === 'q') {
      setEpoch(Math.max(0, currentEpoch - 1));
    } else if (e.key === 'e') {
      setEpoch(Math.min(Math.floor((totalSamples - 1) / samplesPerEpoch), currentEpoch + 1));
    }
  }, [setScrollPosition, totalSamples, currentEpoch, samplesPerEpoch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleViewboxDrag = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newPosition = Math.floor((x / timelineWidth) * totalSamples);
    setScrollPosition(newPosition);
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleSampleIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = Number(e.target.value);
    setScrollPosition(newPosition);
  };

  const stageColorMap: Record<SleepStage, string> = {
    'W': '#ef4444',
    'N1': '#93c5fd',
    'N2': '#3b82f6',
    'N3': '#1e3a8a',
    'R': '#22c55e',
  };

  return (
    <div className="flex flex-col gap-4">
      <svg
        width={timelineWidth}
        height="50"
        onMouseMove={handleViewboxDrag}
        onClick={handleTimelineClick}
      >
        {allData.sleepStages?.map((stage, index) => (
          <rect
            key={index}
            x={(index / allData.sleepStages.length) * timelineWidth}
            y="0"
            width={(1 / allData.sleepStages.length) * timelineWidth}
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
          onMouseDown={handleViewboxDragStart}
          onMouseUp={handleViewboxDragEnd}
          style={{ cursor: 'grab' }}
        />
      </svg>
      <div className="flex justify-between items-center">
        <input
          type="range"
          min="0"
          max={totalSamples - 1}
          value={scrollPosition}
          onChange={(e) => setScrollPosition(Number(e.target.value))}
          className="w-full"
        />
        <div className="ml-4 flex items-center">
          Sample Index:
          <input
            type="number"
            value={scrollPosition}
            onChange={handleSampleIndexChange}
            className="w-24 ml-2 input input-bordered input-sm"
          />
        </div>
      </div>
    </div>
  );
};