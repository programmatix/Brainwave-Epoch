import React, { useState, useEffect, useCallback } from 'react';
import { ProcessedEDFData } from '../../src/Loader/ProcessorTypes';
import { ProcessedSleepStages } from '../Loader/LoaderTypes';
import { EEGCharts } from './EEGCharts';
import { TimelineNavigation } from './Navigation';

interface EEGViewerProps {
  processedData: ProcessedEDFData;
  sleepStages: ProcessedSleepStages;
}

const EEGViewer: React.FC<EEGViewerProps> = ({ processedData, sleepStages }) => {
  const [scrollPosition, setScrollPosition] = useState(0);

  const samplesPerSecond = processedData.signals[0]?.samplingRate || 1;
  const totalSamples = processedData.signals[0]?.samples.length || 0;

  return (
    <div className="flex flex-col gap-4">
      <TimelineNavigation
        sleepStages={sleepStages}
        scrollPosition={scrollPosition}
        setScrollPosition={setScrollPosition}
        totalSamples={totalSamples}
        samplesPerSecond={samplesPerSecond}
      />
      <EEGCharts
        processedData={processedData}
        scrollPosition={scrollPosition}
        sleepStages={sleepStages}
      />
    </div>
  );
};

export default EEGViewer;