import React, { useState, useRef } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { VideoTimeline } from './VideoTimeline';
import { VideoFilmstrip } from './VideoFilmstrip';
import { VideoFile } from './Videos';
import { AllData } from '../Loader/LoaderTypes';
interface VideoViewerProps {
  allData: AllData;
  scrollPosition: number;
  videoFiles: VideoFile[];
  startTime: Temporal.ZonedDateTime;
  duration: number;
  currentTime: Temporal.ZonedDateTime;
  secondsToShow: number;
}

export const VideoViewer: React.FC<VideoViewerProps> = ({
  allData,
  scrollPosition,
  videoFiles,
  startTime,
  duration,
  currentTime,
  secondsToShow,
}) => {
  const [currentVideo, setCurrentVideo] = useState<VideoFile | null>(null);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoClick = (video: VideoFile) => {
    setCurrentVideo(video);
    setPlaybackTime(0);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setPlaybackTime(videoRef.current.currentTime);
    }
  };

  return (
    <div className="video-viewer">
      <VideoFilmstrip
        allData={allData}
        scrollPosition={scrollPosition}
        videoFiles={videoFiles}
        currentTime={currentTime}
        secondsToShow={secondsToShow}
        onVideoClick={handleVideoClick}
        currentVideoTime={currentVideo ? playbackTime : undefined}
        currentVideo={currentVideo}
      />
      {currentVideo && (
        <div className="video-player">
            <div>{currentVideo.name}</div>
            <div>{currentVideo.timestamp.toLocaleString()}</div>
          <video
            ref={videoRef}
            src={`http://192.168.1.180:5000/media/${currentVideo.name}`}
            controls
            autoPlay
            width="1280"
            onTimeUpdate={handleTimeUpdate}
          />
        </div>
      )}
    </div>
  );
};