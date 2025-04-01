import React, { useState, useRef, useEffect } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { VideoTimeline } from './VideoTimeline';
import { VideoFilmstrip } from './VideoFilmstrip';
import { VideoFile } from './Videos';
import { AllData } from '../Loader/LoaderTypes';
import { useStore, StoreState } from '../Store/Store';
import { AudioFile } from '../Audio/Audio';

interface VideoViewerProps {
  allData: AllData;
  scrollPosition: number;
  videoFiles: VideoFile[];
  startTime: Temporal.ZonedDateTime;
  duration: number;
  currentTime: Temporal.ZonedDateTime;
  secondsToShow: number;
  audioFiles?: AudioFile[];
}

export const VideoViewer: React.FC<VideoViewerProps> = ({
  allData,
  scrollPosition,
  videoFiles,
  startTime,
  duration,
  currentTime,
  secondsToShow,
  audioFiles = [],
}) => {
  const { 
    currentVideo, 
    setCurrentVideo, 
    currentAudio, 
    setCurrentAudio, 
    isAudioSyncedWithVideo, 
    setAudioSyncedWithVideo 
  } = useStore((state: StoreState) => ({
    currentVideo: state.currentVideo,
    setCurrentVideo: state.setCurrentVideo,
    currentAudio: state.currentAudio,
    setCurrentAudio: state.setCurrentAudio,
    isAudioSyncedWithVideo: state.isAudioSyncedWithVideo,
    setAudioSyncedWithVideo: state.setAudioSyncedWithVideo
  }));
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Helper function to sync audio with video
  const syncAudioWithVideo = () => {
    if (!videoRef.current || !audioRef.current || !currentVideo || !currentAudio || !isAudioSyncedWithVideo) {
      return;
    }

    const videoTimestamp = currentVideo.timestamp;
    const audioTimestamp = currentAudio.timestamp;
    
    // Calculate time offset between video and audio
    const offsetMs = videoTimestamp - audioTimestamp;
    const offsetSeconds = offsetMs / 1000;
    
    // Set the audio position based on current video position and offset
    const targetAudioTime = videoRef.current.currentTime + offsetSeconds;
    
    console.log('[VideoSync] Syncing audio position', {
      videoTime: videoRef.current.currentTime,
      offsetSeconds,
      targetAudioTime
    });
    
    // Set audio time
    audioRef.current.currentTime = Math.max(0, targetAudioTime);
  };

  const findCorrespondingAudio = (video: VideoFile): AudioFile | null => {
    if (!audioFiles || audioFiles.length === 0) {
      console.log('[FindAudio] No audio files available');
      return null;
    }

    // Find the audio file closest to the video timestamp
    // Preference for audio files that start before the video
    const videoTimestamp = video.timestamp;
    
    console.log('[FindAudio] Looking for audio matching video:', video.name, 'at timestamp:', videoTimestamp, 'from', audioFiles.length, 'files');
    
    // First, try to find audio that overlaps with the video time
    const overlappingAudio = audioFiles.filter(audio => 
      audio.timestamp <= videoTimestamp && 
      audio.timestamp + audio.duration_ms >= videoTimestamp
    );
    
    if (overlappingAudio.length > 0) {
      // Sort by how close the start time is to the video
      const matchedAudio = overlappingAudio.sort((a, b) => 
        Math.abs(a.timestamp - videoTimestamp) - Math.abs(b.timestamp - videoTimestamp)
      )[0];
      
      console.log('[FindAudio] Found overlapping audio:', matchedAudio.name, 'with timestamp:', matchedAudio.timestamp);
      return matchedAudio;
    }
    
    // If no overlapping audio, find the closest one
    const closestAudio = audioFiles.sort((a, b) => 
      Math.abs(a.timestamp - videoTimestamp) - Math.abs(b.timestamp - videoTimestamp)
    )[0];
    
    console.log('[FindAudio] No overlapping audio found, using closest audio:', closestAudio.name, 
      'with timestamp:', closestAudio.timestamp, 
      'time difference:', Math.abs(closestAudio.timestamp - videoTimestamp) / 1000, 'seconds');
    
    return closestAudio;
  };

  const handleVideoClick = (video: VideoFile) => {
    console.log('[VideoClick]', {
      clickedVideo: video.name,
      currentVideo: currentVideo?.name,
      videoTimestamp: video.timestamp
    });
    
    if (currentVideo && video.name === currentVideo.name) {
      console.log('[VideoClick] Same video clicked, restarting from beginning');
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(e => console.error('[VideoClick] Error playing video:', e));
      }
      setPlaybackTime(0);
    } else {
      console.log('[VideoClick] New video selected:', video.name);
      setCurrentVideo(video);
      
      // Find and set corresponding audio
      const matchingAudio = findCorrespondingAudio(video);
      if (matchingAudio) {
        console.log('[VideoClick] Setting corresponding audio:', matchingAudio.name);
        setCurrentAudio(matchingAudio);
        setAudioSyncedWithVideo(true);
      } else {
        console.log('[VideoClick] No corresponding audio found');
        setCurrentAudio(null);
        setAudioSyncedWithVideo(false);
      }
      
      setPlaybackTime(0);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setPlaybackTime(videoRef.current.currentTime);
    }
  };
  
  // Event handlers for video
  const handleVideoPlay = () => {
    console.log('[VideoEvent] Play');
    if (isAudioSyncedWithVideo && audioRef.current && currentAudio) {
      syncAudioWithVideo();
      audioRef.current.play().catch(e => console.error('[VideoEvent] Error playing audio:', e));
    }
  };
  
  const handleVideoPause = () => {
    console.log('[VideoEvent] Pause');
    if (isAudioSyncedWithVideo && audioRef.current) {
      audioRef.current.pause();
    }
  };
  
  const handleVideoSeeked = () => {
    console.log('[VideoEvent] Seeked to', videoRef.current?.currentTime);
    if (isAudioSyncedWithVideo && audioRef.current && videoRef.current) {
      syncAudioWithVideo();
      
      // If video is playing, ensure audio is playing too
      if (!videoRef.current.paused) {
        audioRef.current.play().catch(e => console.error('[VideoEvent] Error playing audio after seek:', e));
      }
    }
  };
  
  // Reset sync state when video or audio changes
  useEffect(() => {
    return () => {
      // Cleanup function
      if (!currentVideo || !currentAudio) {
        setAudioSyncedWithVideo(false);
      }
    };
  }, [currentVideo, currentAudio, setAudioSyncedWithVideo]);

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
          <div className="video-info">
            <div><strong>{currentVideo.name}</strong></div>
            <div>{new Date(currentVideo.timestamp).toLocaleString()}</div>
            {isAudioSyncedWithVideo && currentAudio && (
              <div className="text-green-600 text-sm">
                Synced with audio: {currentAudio.name}
              </div>
            )}
          </div>
          <video
            ref={videoRef}
            src={`http://192.168.1.180:5000/media/${currentVideo.name}`}
            controls
            autoPlay
            width="800"
            onTimeUpdate={handleTimeUpdate}
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
            onSeeked={handleVideoSeeked}
          />
        </div>
      )}
      {isAudioSyncedWithVideo && currentAudio && (
        <audio
          ref={audioRef}
          src={`http://192.168.1.180:5000/audio/${currentAudio.name}`}
          controls={false}
          hidden
          onEnded={() => {
            // Restart audio if video is still playing
            if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
              audioRef.current.play().catch(e => console.error('[AudioSync] Error restarting audio:', e));
            }
          }}
        />
      )}
    </div>
  );
};