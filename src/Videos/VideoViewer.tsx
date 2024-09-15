import React, { useState } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { VideoTimeline } from './VideoTimeline';
import { VideoFilmstrip } from './VideoFilmstrip';
import { VideoFile } from './Videos';

interface VideoViewerProps {
  videoFiles: VideoFile[];
  startTime: Temporal.ZonedDateTime;
  duration: number;
  currentTime: Temporal.ZonedDateTime;
  secondsToShow: number;
}

export const VideoViewer: React.FC<VideoViewerProps> = ({
  videoFiles,
  startTime,
  duration,
  currentTime,
  secondsToShow,
}) => {
  const [currentVideo, setCurrentVideo] = useState<VideoFile | null>(null);

  const handleVideoClick = (video: VideoFile) => {
    setCurrentVideo(video);
  };

  return (
    <div className="video-viewer">
      <VideoFilmstrip
        videoFiles={videoFiles}
        currentTime={currentTime}
        secondsToShow={secondsToShow}
        onVideoClick={handleVideoClick}
      />
      {currentVideo && (
        <div className="video-player">
            <div>{currentVideo.name}</div>
            <div>{currentVideo.timestamp.toLocaleString()}</div>
          <video
            src={`http://192.168.1.72:5000/media/${currentVideo.name}`}
            controls
            width="640"
            height="360"
          />
        </div>
      )}
    </div>
  );
};