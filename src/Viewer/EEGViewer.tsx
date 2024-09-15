import React, { useState, useEffect } from 'react';
import { AllData } from '../Loader/LoaderTypes';
import { EEGCharts, SECONDS_PER_EPOCH } from './EEGCharts';
import { TimelineNavigation } from './Navigation';
import { ScoringComponent } from './ScoringComponent';
import { VideoViewer } from '../Videos/VideoViewer';
import { Temporal } from '@js-temporal/polyfill';

interface EEGViewerProps {
  allData: AllData;
}

const EEGViewer: React.FC<EEGViewerProps> = ({ allData }) => {
  const [scrollPosition, setScrollPosition] = useState(0);

  const samplesPerSecond = allData.processedEDF.signals[0]?.samplingRate || 1;
  const totalSamples = allData.processedEDF.signals[0]?.samples.length || 0;
  const samplesPerEpoch = samplesPerSecond * SECONDS_PER_EPOCH;

  const currentTime = allData.processedEDF.startDate.add({ seconds: Math.floor(scrollPosition / samplesPerSecond) });

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
        handleNextEpoch={() => {
          const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
          setScrollPosition(Math.min(totalSamples - 1, (currentEpoch + 1) * samplesPerEpoch));
        }}
      />
      <VideoViewer
        videoFiles={allData.videos}
        startTime={allData.processedEDF.startDate}
        duration={allData.processedEDF.duration}
        currentTime={currentTime}
        secondsToShow={SECONDS_PER_EPOCH}
      />
      <EEGCharts
        allData={allData}
        scrollPosition={scrollPosition}
      />
    </div>
  );
};

export default EEGViewer;