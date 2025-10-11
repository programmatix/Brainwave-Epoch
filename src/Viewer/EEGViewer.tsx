import React, { useState } from 'react';
import { AllData } from '../Loader/LoaderTypes';
import { EEGCharts, SECONDS_PER_EPOCH } from './EEGCharts';
import { TimelineNavigation } from './Navigation';
import { ScoringComponent } from './ScoringComponent';
import { DisturbancesComponent } from '../Disturbances/Disturbances';
import { FeatureAvailabilityPanel } from './FeatureAvailabilityPanel';

interface EEGViewerProps {
  allData: AllData;
}

const EEGViewer: React.FC<EEGViewerProps> = ({ allData }) => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [showScoring, setShowScoring] = useState(false);
  const [showDisturbances, setShowDisturbances] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showAudio, setShowAudio] = useState(false);

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

      <FeatureAvailabilityPanel allData={allData} />

      <div className="bg-base-200 mb-2">
        <button
          className="text-xl font-medium flex items-center gap-2 w-full"
          onClick={() => setShowScoring(!showScoring)}
        >
          <span className="text-2xl">{showScoring ? '▼' : '▶'}</span>
          Scoring, Marking & Tagging
        </button>
        {showScoring && (
        <div className="collapse-content">
          <ScoringComponent
            scrollPosition={scrollPosition}
            samplesPerEpoch={samplesPerEpoch}
            allData={allData}
            handleNextEpoch={() => {
              const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
              setScrollPosition(Math.min(totalSamples - 1, (currentEpoch + 1) * samplesPerEpoch));
            }}
          />
        </div>
        )}
      </div>

      <div className="bg-base-200 mb-2">
        <button
          className="text-xl font-medium flex items-center gap-2 w-full"
          onClick={() => setShowDisturbances(!showDisturbances)}
        >
          <span className="text-2xl">{showDisturbances ? '▼' : '▶'}</span>
          Disturbances
        </button>
        {showDisturbances && (
        <div className="collapse-content">
          <DisturbancesComponent
            scrollPosition={scrollPosition}
            samplesPerEpoch={samplesPerEpoch}
            allData={allData}
            handleNextEpoch={() => {
              const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
              setScrollPosition(Math.min(totalSamples - 1, (currentEpoch + 1) * samplesPerEpoch));
            }}
          />
        </div>
        )}
      </div>

      <div className="bg-base-200 mb-2 flex gap-4 p-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showVideo}
            onChange={(e) => setShowVideo(e.target.checked)}
            className="checkbox"
          />
          <span>Show Video</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showAudio}
            onChange={(e) => setShowAudio(e.target.checked)}
            className="checkbox"
          />
          <span>Show Audio</span>
        </label>
      </div>

      <EEGCharts
        allData={allData}
        scrollPosition={scrollPosition}
        showVideo={showVideo}
        showAudio={showAudio}
      />
    </div>
  );
};

export default EEGViewer;
