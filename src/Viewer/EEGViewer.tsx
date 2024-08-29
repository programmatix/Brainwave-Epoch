import React, { useState, useEffect, useCallback } from 'react';
import { AllData, ProcessedEDFData } from '../../src/Loader/ProcessorTypes';
import { ProcessedSleepStages } from '../Loader/LoaderTypes';
import { EEGCharts } from './EEGCharts';
import { TimelineNavigation } from './Navigation';
import { SECONDS_PER_EPOCH } from './EEGCharts';

interface EEGViewerProps {
  allData: AllData;
}

const EEGViewer: React.FC<EEGViewerProps> = ({ allData }) => {
  const [scrollPosition, setScrollPosition] = useState(0);

    const samplesPerSecond = allData.processedEDF.signals[0]?.samplingRate || 1;
  const totalSamples = allData.processedEDF.signals[0]?.samples.length || 0;
  const samplesPerEpoch = samplesPerSecond * SECONDS_PER_EPOCH;
  return (
    <div className="h-full overflow-hidden">
      <TimelineNavigation
        samplesPerEpoch={samplesPerEpoch}
        allData={allData}
        scrollPosition={scrollPosition}
        setScrollPosition={setScrollPosition}
        totalSamples={totalSamples}
        samplesPerSecond={samplesPerSecond}
      />
      <EEGCharts
        allData={allData}
        scrollPosition={scrollPosition}
      />
    </div>
  );
};

export default EEGViewer;