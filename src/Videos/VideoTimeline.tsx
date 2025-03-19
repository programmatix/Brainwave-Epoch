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
  const start = allData.processedEDF.startDate.epochMilliseconds

  return (
    <div>
      <svg width={width} height="30">
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
              onClick={() => {
                const epoch = Math.floor((video.timestamp - start) / SECONDS_PER_EPOCH);
                onTimelineClick(epoch);
              }}
            />
          );
        })}
      </svg>
    </div>
  );
};