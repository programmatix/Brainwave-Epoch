import React from 'react';
import { VideoFile } from './Videos';
import { Temporal } from '@js-temporal/polyfill';
import { SECONDS_PER_EPOCH } from '../Viewer/EEGCharts';

interface VideoTimelineProps {
  videoFiles: VideoFile[];
  startTime: Temporal.ZonedDateTime;
  duration: number;
  width: number;
  onTimelineClick: (newEpoch: number) => void;
}

export const VideoTimeline: React.FC<VideoTimelineProps> = ({
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
          const startX = ((video.timestamp.epochSeconds - startTime.epochSeconds) / duration) * width;
          return (
            <rect
              key={index}
              x={startX}
              y="0"
              width="1"
              height="30"
              fill="blue"
              onClick={() => {
                const epoch = Math.floor(video.timestamp.epochSeconds / SECONDS_PER_EPOCH);
                onTimelineClick(epoch);
              }}
            />
          );
        })}
      </svg>
    </div>
  );
};