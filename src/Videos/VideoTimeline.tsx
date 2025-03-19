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
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
  allData,
  videoFiles,
  startTime,
  duration,
  width,
  onTimelineClick,
}) => {
  return (
    <div>
      <svg width={width} height="30">
        {videoFiles.map((video, index) => {
          const startX = ((video.timestamp - startTime.epochMilliseconds) / duration) * width;
          return (
            <rect
              key={index}
              x={startX}
              y="0"
              width="1"
              height="20"
              fill="blue"
              onClick={() => {
                const epoch = Math.floor((video.timestamp - allData.processedEDF.startDate.epochMilliseconds) / SECONDS_PER_EPOCH);
                onTimelineClick(epoch);
              }}
            />
          );
        })}
      </svg>
    </div>
  );
};