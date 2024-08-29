import React, { useCallback, useEffect } from 'react';
import { AllData } from '../Loader/ProcessorTypes';
import { SleepStageTimeline } from './SleepStageTimeline';
import { SlowWaveTimeline } from './SlowWaveTimeline';
import { NightEventsTimeline } from './NightEventsTimeline';

interface TimelineNavigationProps {
  allData: AllData;
  scrollPosition: number;
  setScrollPosition: any;
  totalSamples: number;
  samplesPerSecond: number;
  samplesPerEpoch: number;
}

const TIMELINE_WIDTH = 1000;

export const TimelineNavigation: React.FC<TimelineNavigationProps> = ({
  allData,
  scrollPosition,
  setScrollPosition,
  totalSamples,
  samplesPerSecond,
  samplesPerEpoch,
}) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setScrollPosition((prev) => Math.max(0, prev - 50));
    } else if (e.key === 'ArrowRight') {
      setScrollPosition((prev) => Math.min(totalSamples - 1, prev + 50));
    } else if (e.key === 'q') {
      const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
      setScrollPosition(Math.max(0, (currentEpoch - 1) * samplesPerEpoch));
    } else if (e.key === 'e') {
      const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
      setScrollPosition(Math.min(totalSamples - 1, (currentEpoch + 1) * samplesPerEpoch));
    }
  }, [setScrollPosition, totalSamples, scrollPosition, samplesPerEpoch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const handleTimelineClick = (newPosition: number) => {
    setScrollPosition(Math.min(totalSamples - 1, Math.max(0, newPosition)));
  };

  const startDate = allData.processedEDF.startDate.epochSeconds;

  return (
    <div className="flex flex-col gap-4">
      <SleepStageTimeline
        sleepStages={allData.sleepStages}
        scrollPosition={scrollPosition}
        totalSamples={totalSamples}
        samplesPerSecond={samplesPerSecond}
        samplesPerEpoch={samplesPerEpoch}
        width={TIMELINE_WIDTH}
        onTimelineClick={handleTimelineClick}
      />
      {allData.slowWaveEvents && Object.entries(allData.slowWaveEvents).map(([channel, events]) => (
        <SlowWaveTimeline
          key={channel}
          channel={channel}
          events={events}
          totalSamples={totalSamples}
          width={TIMELINE_WIDTH}
          onTimelineClick={handleTimelineClick}
          allData={allData}
        />
      ))}
      {allData.nightEvents && (
        <NightEventsTimeline
          allData={allData}
          totalSamples={totalSamples}
          width={TIMELINE_WIDTH}
          onTimelineClick={handleTimelineClick}
        />
      )}
    </div>
  );
};