import React from 'react';
import { VideoFile } from './Videos';
import { Temporal } from '@js-temporal/polyfill';
import { SECONDS_PER_EPOCH } from '../Viewer/EEGCharts';
import { AllData } from '../Loader/LoaderTypes';
interface VideoTimelineProps {
  allData: AllData;
  videoFiles: VideoFile[];
  startTime: Temporal.ZonedDateTime;
  duration: number;
  width: number;
  onTimelineClick: (newEpoch: number) => void;
  scrollPosition?: number;
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  allData,
  videoFiles,
  startTime,
  duration,
  width,
  onTimelineClick,
  scrollPosition
}) => {
  const start = allData.processedEDF.startDate.epochMilliseconds

  const handleTimelineClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickTimeSeconds = (x / width) * duration;
    const clickTimeSamples = clickTimeSeconds * allData.processedEDF.signals[0].samplingRate;
    const epoch = Math.floor(clickTimeSamples / SECONDS_PER_EPOCH);
    console.info("VideoTimeline handleTimelineClick", epoch, clickTimeSeconds, x, width, duration)
    onTimelineClick(clickTimeSamples);
  };

  const currentX = scrollPosition !== undefined 
    ? (scrollPosition / duration) * width 
    : null;

  return (
    <div>
      <svg width={width} height="30" className="cursor-pointer" onClick={handleTimelineClick}>
        {videoFiles.map((video, index) => {
          const startX = ((video.timestamp - start) / 1000 / duration) * width;
          //console.info("VideoTimeline", video.name, video.timestamp, startX, start)
          return (
            <rect
              key={index}
              x={startX}
              y="0"
              width="1"
              height="20"
              fill="blue"
            />
          );
        })}
        
        {currentX !== null && (
          <line
            x1={currentX}
            y1="0"
            x2={currentX}
            y2="30"
            stroke="black"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
};