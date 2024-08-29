import React, { useState, useEffect, useCallback } from 'react';
import { ProcessedEDFData } from '../../src/Loader/ProcessorTypes';
import { ProcessedSleepStages } from '../Loader/LoaderTypes';
import { EEGCharts } from './EEGCharts';

interface EEGViewerProps {
  processedData: ProcessedEDFData;
  sleepStages: ProcessedSleepStages;
}

const EEGViewer: React.FC<EEGViewerProps> = ({ processedData, sleepStages }) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [epochIndex, setEpochIndex] = useState(0);

  const samplesPerSecond = processedData.signals[0]?.samplingRate || 1;
  const totalSamples = processedData.signals[0]?.samples.length || 0;

  const handleScroll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = Number(e.target.value);
    setScrollPosition(newPosition);
    setEpochIndex(Math.floor(newPosition / (samplesPerSecond * 30)));
  };

  const handleSampleIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = Number(e.target.value);
    setScrollPosition(newPosition);
    setEpochIndex(Math.floor(newPosition / (samplesPerSecond * 30)));
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setScrollPosition(prev => Math.max(0, prev - 50));
    } else if (e.key === 'ArrowRight') {
      setScrollPosition(prev => Math.min(totalSamples - 1, prev + 50));
    }
  }, [totalSamples]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    setEpochIndex(Math.floor(scrollPosition / (samplesPerSecond * 30)));
  }, [scrollPosition, samplesPerSecond]);

  const currentSleepStage = sleepStages[epochIndex] || 'Unknown';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center w-full">
        <input
          type="range"
          min="0"
          max={totalSamples - 1}
          value={scrollPosition}
          onChange={handleScroll}
          className="w-full"
        />
        <div className="ml-4 flex items-center">
          Sample Index:
          <input
            type="number"
            value={scrollPosition}
            onChange={handleSampleIndexChange}
            className="w-24 ml-2 input input-bordered input-sm"
          />
        </div>
      </div>
      <EEGCharts
        processedData={processedData}
        scrollPosition={scrollPosition}
        sleepStages={sleepStages}
      />
    </div>
  );
};

export default EEGViewer;