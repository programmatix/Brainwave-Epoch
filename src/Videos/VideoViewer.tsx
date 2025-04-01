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
      console.log('[VideoSync] Sync aborted - missing references or not in sync mode');
      return;
    }

    try {
      const videoTimestamp = currentVideo.timestamp;
      const audioTimestamp = currentAudio.timestamp;
      
      // Calculate time offset between video and audio
      const offsetMs = videoTimestamp - audioTimestamp;
      const offsetSeconds = offsetMs / 1000;
      
      // Set the audio position based on current video position and offset
      const currentVideoTime = videoRef.current.currentTime;
      let targetAudioTime = 0;
      
      if (videoTimestamp >= audioTimestamp) {
        // Video starts after audio, so we need to advance audio
        targetAudioTime = currentVideoTime + offsetSeconds;
      } else {
        // Audio starts after video
        const audioOffsetMs = audioTimestamp - videoTimestamp;
        const audioOffsetSeconds = audioOffsetMs / 1000;
        
        // Only play audio if video has reached the audio start point
        if (currentVideoTime >= audioOffsetSeconds) {
          targetAudioTime = currentVideoTime - audioOffsetSeconds;
        } else {
          console.log('[VideoSync] Video hasn\'t reached audio start point yet');
          audioRef.current.pause();
          return;
        }
      }
      
      console.log('[VideoSync] Syncing audio position', {
        videoTime: currentVideoTime,
        offsetSeconds: offsetSeconds,
        targetAudioTime: targetAudioTime,
        audioDuration: audioRef.current.duration
      });
      
      // Ensure we don't set time beyond audio duration
      if (audioRef.current.duration && targetAudioTime >= audioRef.current.duration) {
        console.log('[VideoSync] Target time exceeds audio duration, audio ended');
        return;
      }
      
      // Set audio time - using a more direct approach
      audioRef.current.currentTime = Math.max(0, targetAudioTime);
      
      // Verify the time was set correctly
      console.log('[VideoSync] Audio time after sync:', audioRef.current.currentTime);
    } catch (error) {
      console.error('[VideoSync] Error during sync:', error);
    }
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
      
      // Re-establish audio sync if possible
      const matchingAudio = findCorrespondingAudio(video);
      if (matchingAudio) {
        console.log('[VideoClick] Re-syncing with audio:', matchingAudio.name);
        setCurrentAudio(matchingAudio);
        setAudioSyncedWithVideo(true);
        
        // Force sync immediately
        setTimeout(() => {
          if (videoRef.current && audioRef.current) {
            syncAudioWithVideo();
            if (!videoRef.current.paused) {
              audioRef.current.play().catch(e => console.error('[VideoClick] Error playing audio:', e));
            }
          }
        }, 50);
      }
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
      
      // When synced with audio, we need to redraw the AudioFilmstrip
      if (isAudioSyncedWithVideo && currentAudio) {
        // Force AudioFilmstrip to update by dispatching a custom event
        const updateEvent = new CustomEvent('audioPositionUpdate', {
          detail: {
            videoTime: videoRef.current.currentTime,
            videoTimestamp: currentVideo?.timestamp,
            audioTimestamp: currentAudio?.timestamp
          }
        });
        window.dispatchEvent(updateEvent);
      }
    }
  };
  
  // Event handlers for video
  const handleVideoPlay = () => {
    console.log('[VideoEvent] Play');
    if (isAudioSyncedWithVideo && audioRef.current && currentAudio) {
      // Force re-sync before playing
      syncAudioWithVideo();
      
      // Try to play the audio
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('[VideoEvent] Audio playback successfully started');
          })
          .catch(e => {
            console.error('[VideoEvent] Error playing audio:', e);
            // Try one more time with a slight delay
            setTimeout(() => {
              if (audioRef.current && !videoRef.current?.paused) {
                audioRef.current.play()
                  .catch(e2 => console.error('[VideoEvent] Second attempt to play audio failed:', e2));
              }
            }, 100);
          });
      }
      
      console.log('[VideoEvent] Playing audio at time:', audioRef.current.currentTime);
    }
  };
  
  const handleVideoPause = () => {
    console.log('[VideoEvent] Pause');
    if (isAudioSyncedWithVideo && audioRef.current) {
      console.log('[VideoEvent] Pausing audio at time:', audioRef.current.currentTime);
      audioRef.current.pause();
    }
  };
  
  const handleVideoSeeked = () => {
    if (!videoRef.current) return;
    
    console.log('[VideoEvent] Seeked to', videoRef.current.currentTime);
    if (isAudioSyncedWithVideo && audioRef.current && currentAudio) {
      // Force re-sync of audio
      syncAudioWithVideo();
      
      // If video is playing, ensure audio is playing too
      if (!videoRef.current.paused) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => {
            console.error('[VideoEvent] Error playing audio after seek:', e);
            // Try again with a small delay
            setTimeout(() => {
              if (audioRef.current && !videoRef.current?.paused) {
                audioRef.current.play()
                  .catch(e2 => console.error('[VideoEvent] Second attempt to play audio after seek failed:', e2));
              }
            }, 100);
          });
        }
      }
    }
  };
  
  // Add volume change handler
  const handleVolumeChange = () => {
    if (videoRef.current && audioRef.current && isAudioSyncedWithVideo) {
      // Sync audio volume with video volume
      audioRef.current.volume = videoRef.current.volume;
      audioRef.current.muted = videoRef.current.muted;
      console.log('[VideoEvent] Volume changed, syncing audio volume:', videoRef.current.volume, 'muted:', videoRef.current.muted);
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

  // Initialize sync when isAudioSyncedWithVideo changes
  useEffect(() => {
    if (isAudioSyncedWithVideo && currentVideo && currentAudio && videoRef.current && audioRef.current) {
      console.log('[VideoSync] Initial sync setup');
      
      // Make sure the video element is loaded
      if (videoRef.current.readyState >= 2) {
        syncAudioWithVideo();
        
        // If video is already playing, start audio too
        if (!videoRef.current.paused) {
          audioRef.current.play().catch(e => console.error('[VideoSync] Initial audio play error:', e));
        }
      } else {
        // Wait for video to be ready before syncing
        const handleVideoLoaded = () => {
          console.log('[VideoSync] Video loaded, performing initial sync');
          syncAudioWithVideo();
          
          if (!videoRef.current.paused) {
            audioRef.current.play().catch(e => console.error('[VideoSync] Initial audio play error after load:', e));
          }
          
          videoRef.current.removeEventListener('loadeddata', handleVideoLoaded);
        };
        
        videoRef.current.addEventListener('loadeddata', handleVideoLoaded);
        return () => {
          if (videoRef.current) {
            videoRef.current.removeEventListener('loadeddata', handleVideoLoaded);
          }
        };
      }
    }
  }, [isAudioSyncedWithVideo, currentVideo, currentAudio]);

  // Add a timer to update the filmstrip regularly during playback
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (isAudioSyncedWithVideo && currentVideo && currentAudio && videoRef.current && !videoRef.current.paused) {
      // Update the filmstrip position 5 times per second during playback
      intervalId = setInterval(() => {
        if (videoRef.current) {
          // Dispatch update event
          const updateEvent = new CustomEvent('audioPositionUpdate', {
            detail: {
              videoTime: videoRef.current.currentTime,
              videoTimestamp: currentVideo.timestamp,
              audioTimestamp: currentAudio.timestamp
            }
          });
          window.dispatchEvent(updateEvent);
        }
      }, 200); // 5 times per second
      
      console.log('[VideoSync] Started filmstrip update interval');
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log('[VideoSync] Cleared filmstrip update interval');
      }
    };
  }, [isAudioSyncedWithVideo, currentVideo, currentAudio, playbackTime]);

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
            onVolumeChange={handleVolumeChange}
          />
        </div>
      )}
      {isAudioSyncedWithVideo && currentAudio && (
        <audio
          ref={audioRef}
          src={`http://192.168.1.180:5000/audio/${currentAudio.name}`}
          controls={false}
          hidden
          preload="auto"
          crossOrigin="anonymous"
          onError={(e) => console.error('[AudioSync] Audio error:', e)}
          onEnded={() => {
            console.log('[AudioSync] Audio ended');
            // Restart audio if video is still playing
            if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
              console.log('[AudioSync] Video still playing, attempting to restart audio');
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(e => console.error('[AudioSync] Error restarting audio:', e));
            }
          }}
        />
      )}
    </div>
  );
};