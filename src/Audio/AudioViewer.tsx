import React, { useState, useRef, useEffect } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { AudioFilmstrip } from './AudioFilmstrip';
import { AudioFile } from './Audio';
import { AllData } from '../Loader/LoaderTypes';
import { useStore, StoreState } from '../Store/Store';

interface AudioViewerProps {
  allData: AllData;
  scrollPosition: number;
  audioFiles: AudioFile[];
  startTime: Temporal.ZonedDateTime;
  duration: number;
  currentTime: Temporal.ZonedDateTime;
  secondsToShow: number;
}

export const AudioViewer: React.FC<AudioViewerProps> = ({
  allData,
  scrollPosition,
  audioFiles,
  startTime,
  duration,
  currentTime,
  secondsToShow,
}) => {
  const { 
    currentAudio, 
    setCurrentAudio, 
    currentVideo, 
    isAudioSyncedWithVideo, 
    setAudioSyncedWithVideo 
  } = useStore((state: StoreState) => ({
    currentAudio: state.currentAudio,
    setCurrentAudio: state.setCurrentAudio,
    currentVideo: state.currentVideo,
    isAudioSyncedWithVideo: state.isAudioSyncedWithVideo,
    setAudioSyncedWithVideo: state.setAudioSyncedWithVideo
  }));
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const [gain, setGain] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (audioRef.current && !audioContextRef.current) {
      audioContextRef.current = new AudioContext();
      gainNodeRef.current = audioContextRef.current.createGain();
      sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceNodeRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContextRef.current.destination);
    }
  }, []);

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = gain;
    }
  }, [gain]);

  const handleAudioClick = (audio: AudioFile) => {
    console.log('[AudioClick]', {
      clickedAudio: audio.name,
      currentAudio: currentAudio?.name,
      inSyncMode: isAudioSyncedWithVideo,
      currentVideo: currentVideo?.name
    });
    
    // If we're currently in sync mode, clear it and play the clicked audio independently
    if (isAudioSyncedWithVideo) {
      console.log('[AudioClick] Exiting sync mode and playing selected audio');
      // Clear sync state
      setAudioSyncedWithVideo(false);
      
      // Set new audio and play it
      setCurrentAudio(audio);
      setPlaybackTime(0);
      
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (audioRef.current) {
          console.log('[AudioClick] Starting playback of:', audio.name);
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(e => console.error('[AudioClick] Error playing audio:', e));
        }
      }, 50);
      
      return;
    }
    
    if (currentAudio && audio.name === currentAudio.name) {
      console.log('[AudioClick] Same audio clicked, restarting from beginning');
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error('[AudioClick] Error playing audio:', e));
      }
      setPlaybackTime(0);
    } else {
      console.log('[AudioClick] New audio selected:', audio.name);
      setCurrentAudio(audio);
      setPlaybackTime(0);
    }
  };

  // useEffect(() => {
  //   const intervalHandler = setInterval(() => {
  //     // if (currentAudio && audioRef.current) {
  //     //   console.trace('[Audio]', {
  //     //     'currentAudio': currentAudio.name,
  //     //     'isAudioSyncedWithVideo': isAudioSyncedWithVideo,
  //     //     'currentAudioTime': audioRef.current.currentTime,
  //     //     'currentAudioTimestamp': new Date(currentAudio.timestamp + audioRef.current.currentTime * 1000).toLocaleString(),
  //     //     'audioStartTimestamp': currentAudio.timestamp,
  //     //     'audioDuration': audioRef.current.duration
  //     //   });
  //     // }
  //     // else {
  //     //     console.trace('[Audio] No audio selected', currentAudio, audioRef.current);
  //     // }
  //   }, 1000);
  //   return () => {
  //     if (intervalHandler) {
  //       clearInterval(intervalHandler);
  //     }
  //   };
  // }, [currentAudio, isAudioSyncedWithVideo]);
  

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPlaybackTime(audioRef.current.currentTime);
    }
  };

  // Add useEffect to handle audio playback when currentAudio changes
  useEffect(() => {
    if (currentAudio && !isAudioSyncedWithVideo && audioRef.current) {
      console.log('[AudioEffect] Setting up audio for independent playback:', currentAudio.name);
      audioRef.current.currentTime = 0;
      
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (audioRef.current) {
          console.log('[AudioEffect] Starting playback of audio:', currentAudio.name);
          audioRef.current.play()
            .catch(e => console.error('[AudioEffect] Error playing audio:', e));
        }
      }, 50);
    }
  }, [currentAudio, isAudioSyncedWithVideo]);

  useEffect(() => {
    const handleSeekAudio = (event: CustomEvent) => {
      const { audioFile, time } = event.detail;
      
      // Only handle if we're not in sync mode and the audio file matches
      if (!isAudioSyncedWithVideo && currentAudio && audioFile.name === currentAudio.name) {
        console.log('[AudioViewer] Seeking to time:', time);
        if (audioRef.current) {
          audioRef.current.currentTime = time;
          audioRef.current.play().catch(e => console.error('[AudioViewer] Error playing audio after seek:', e));
        }
      }
    };

    window.addEventListener('seekAudio', handleSeekAudio as EventListener);
    
    return () => {
      window.removeEventListener('seekAudio', handleSeekAudio as EventListener);
    };
  }, [currentAudio, isAudioSyncedWithVideo]);

  return (
    <div className="audio-viewer">
      <AudioFilmstrip
        allData={allData}
        scrollPosition={scrollPosition}
        audioFiles={audioFiles}
        currentTime={currentTime}
        secondsToShow={secondsToShow}
        onAudioClick={handleAudioClick}
        currentAudioTime={currentAudio && !isAudioSyncedWithVideo ? playbackTime : undefined}
        currentAudio={currentAudio}
      />
      {currentAudio && !isAudioSyncedWithVideo && (
        <div className="audio-player">
          <div className="audio-info">
            <div><strong>{currentAudio.name}</strong></div>
            <div>Start: {new Date(currentAudio.timestamp).toLocaleString()}</div>
            <div>Duration: {(currentAudio.duration_ms / 1000).toFixed(1)}s</div>
            <div className="text-sm text-gray-600">Independent playback mode</div>
            <div className="gain-control">
              <label>
                Gain: {gain.toFixed(1)}x
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={gain}
                  onChange={(e) => setGain(parseFloat(e.target.value))}
                />
              </label>
            </div>
          </div>
          <audio
            ref={audioRef}
            src={`http://192.168.1.180:5000/audio/${currentAudio.name}`}
            controls
            autoPlay
            onPlay={() => console.log('[Audio] Playback started:', currentAudio.name)}
            onPause={() => console.log('[Audio] Playback paused:', currentAudio.name)}
            onError={(e) => console.error('[Audio] Playback error:', e)}
            onTimeUpdate={handleTimeUpdate}
          />
        </div>
      )}
      {isAudioSyncedWithVideo && currentAudio && (
        <div className="audio-player">
          <div className="audio-info">
            <div className="text-blue-600 italic">
              <strong>Synced with video: {currentAudio.name}</strong>
            </div>
            <div>Audio playback is currently controlled by video.</div>
            <div className="text-sm text-gray-600">Click any audio to exit sync mode</div>
          </div>
        </div>
      )}
    </div>
  );
};