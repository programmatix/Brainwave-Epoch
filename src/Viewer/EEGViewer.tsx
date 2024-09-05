import React, { useState } from 'react';
import { AllData, Scorings } from '../../src/Loader/LoaderTypes';
import { EEGCharts, SECONDS_PER_EPOCH } from './EEGCharts';
import { TimelineNavigation } from './Navigation';
import { ScoringComponent } from './ScoringComponent';

interface EEGViewerProps {
  allData: AllData;
}

const EEGViewer: React.FC<EEGViewerProps> = ({ allData }) => {
  const [scrollPosition, setScrollPosition] = useState(0);

  const samplesPerSecond = allData.processedEDF.signals[0]?.samplingRate || 1;
  const totalSamples = allData.processedEDF.signals[0]?.samples.length || 0;
  const samplesPerEpoch = samplesPerSecond * SECONDS_PER_EPOCH;

  const handleNextEpoch = () => {
    const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
    setScrollPosition(Math.min(totalSamples - 1, (currentEpoch + 1) * samplesPerEpoch));
  };

  return (
    <div className="h-full overflow-hidden" id="eeg-viewer">
      <TimelineNavigation
        samplesPerEpoch={samplesPerEpoch}
        allData={allData}
        scrollPosition={scrollPosition}
        setScrollPosition={setScrollPosition}
        totalSamples={totalSamples}
        samplesPerSecond={samplesPerSecond}
      />
      <ScoringComponent
        scrollPosition={scrollPosition}
        samplesPerEpoch={samplesPerEpoch}
        allData={allData}
        handleNextEpoch={handleNextEpoch}
      />
      <EEGCharts
        allData={allData}
        scrollPosition={scrollPosition}
      />
    </div>
  );
};

export default EEGViewer;