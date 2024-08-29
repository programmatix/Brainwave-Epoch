import React, { useState } from 'react';
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

  const handleScroll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPosition = Number(e.target.value);
    setScrollPosition(newPosition);
    setEpochIndex(Math.floor(newPosition / (processedData.signals[0]?.samplingRate * 30)));
  };

  const handleEpochChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEpoch = Number(e.target.value);
    setEpochIndex(newEpoch);
    setScrollPosition(newEpoch * processedData.signals[0]?.samplingRate * 30);
  };

  const currentSleepStage = sleepStages[epochIndex] || 'Unknown';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center w-full">
        <input
          type="range"
          min="0"
          max={processedData.signals[0]?.samples.length - processedData.signals[0]?.samplingRate * 30 || 0}
          value={scrollPosition}
          onChange={handleScroll}
          className="w-full"
        />
        <div className="ml-4 flex items-center">
          Epoch:
          <input
            type="number"
            value={epochIndex}
            onChange={handleEpochChange}
            className="w-16 ml-2 input input-bordered input-sm"
          />
        </div>
        <div className="ml-4">
          Sleep Stage: {JSON.stringify(currentSleepStage)}
        </div>
      </div>
      <EEGCharts
        processedData={processedData}
        scrollPosition={scrollPosition}
        epochIndex={epochIndex}
        sleepStages={sleepStages}
      />
    </div>
  );
};

export default EEGViewer;