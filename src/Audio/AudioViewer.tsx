import React, { useState, useRef, useEffect } from 'react';
import { Temporal } from '@js-temporal/polyfill';
import { AudioFilmstrip } from './AudioFilmstrip';
import { AudioFile } from './Audio';
import { AllData } from '../Loader/LoaderTypes';

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
  const [currentAudio, setCurrentAudio] = useState<AudioFile | null>(null);
  const [playbackTime, setPlaybackTime] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleAudioClick = (audio: AudioFile) => {
    setCurrentAudio(audio);
    setPlaybackTime(0);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPlaybackTime(audioRef.current.currentTime);
    }
  };

  useEffect(() => {
    if (audioRef.current) {
    //   audioRef.current.playbackRate = 3;
    }
  }, [currentAudio]);

  return (
    <div className="audio-viewer">
      <AudioFilmstrip
        allData={allData}
        scrollPosition={scrollPosition}
        audioFiles={audioFiles}
        currentTime={currentTime}
        secondsToShow={secondsToShow}
        onAudioClick={handleAudioClick}
        currentAudioTime={currentAudio ? playbackTime : undefined}
        currentAudio={currentAudio}
      />
      {currentAudio && (
        <div className="audio-player">
          <div className="audio-info">
            <div><strong>{currentAudio.name}</strong></div>
            <div>Start: {new Date(currentAudio.timestamp).toLocaleString()}</div>
            <div>Duration: {(currentAudio.duration_ms / 1000).toFixed(1)}s</div>
          </div>
          <audio
            ref={audioRef}
            src={`http://192.168.1.180:5000/audio/${currentAudio.name}`}
            controls
            autoPlay
            onTimeUpdate={handleTimeUpdate}
          />
        </div>
      )}
    </div>
  );
};