import React, { useState, useCallback, useEffect } from 'react';
import { AllData, Scorings, ScoringEntry } from '../Loader/LoaderTypes';
import { StoreState, useStore } from '../Store/Store';


interface ScoringComponentProps {
  scrollPosition: number;
  samplesPerEpoch: number;
  allData: AllData;
  handleNextEpoch: () => void;
}

const SCORING_OPTIONS: ScoringEntry['stage'][] = ["Wake", "Deep", "Non-Deep", "Ambiguous Deep", "Unsure", "Noise"];
const TAG_OPTIONS = [
  // { tag: "Blinks", description: "Epoch contains one or more blinks" },
  // { tag: "No blinks", description: "No blinks" },
  { tag: "Microwaking", description: "Epoch contains the start of a waking that is less than half the epoch" },
  { tag: "MicrowakingEnd", description: "Epoch contains the end of a waking that is less than half the epoch" },
  { tag: "MicrowakingComplete", description: "Epoch contains the start and end of a waking that is less than half the epoch" },
  { tag: "Possible non-wake disturbance", description: "Epoch contains a pattern I don't understand, that doesn't look like a full microwaking" },
  //{ tag: "Fuzzy deep", description: "Contains some hallmarks of deep sleep, but with the fuzziness of wake" },
  { tag: "Uniform", description: "Very regular, a textbook epoch" },
  { tag: "Strong deep", description: "Strong deep sleep signal" },
  { tag: "Weak deep", description: "Deep sleep signal but quite weak" },
  { tag: "Unusual", description: "Something unusual" },
];

export const ScoringComponent: React.FC<ScoringComponentProps> = ({ scrollPosition, samplesPerEpoch, allData, handleNextEpoch }) => {
  const [currentScoring, setCurrentScoring] = useState<ScoringEntry['stage']>(SCORING_OPTIONS[0]);
  const [currentTags, setCurrentTags] = useState<string[]>([]);
  const { scorings, saveScoring, markingMode, setMarkingMode } = useStore((state: StoreState) => ({
    scorings: state.scorings,
    saveScoring: state.saveScoring,
    markingMode: state.markingMode,
    setMarkingMode: state.setMarkingMode
  }));

  const currentEpochIndex = Math.floor(scrollPosition / samplesPerEpoch);
  const currentEpochScoring = scorings.find(s => s.epochIndex === currentEpochIndex);

  const currentEpochData = allData.sleepStages?.[currentEpochIndex] || {};

  useEffect(() => {
    if (currentEpochScoring) {
      console.log("currentEpochScoring", currentEpochScoring)
      setCurrentScoring(currentEpochScoring.stage);
      setCurrentTags(currentEpochScoring.tags.map(t => t.tag));
    } else {
      console.log("no currentEpochScoring")
      // setCurrentScoring(SCORING_OPTIONS[0]);
      setCurrentTags([]);
    }
  }, [currentEpochIndex, scorings]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    console.log("handleKeyDown", e.key)
    if (e.key >= '1' && e.key <= '5') {
      setCurrentScoring(SCORING_OPTIONS[parseInt(e.key) - 1] as ScoringEntry['stage']);
    } else if (e.key === ' ') {
      saveScoringLocal();
      handleNextEpoch();
    }
  }, [scrollPosition, samplesPerEpoch, currentScoring, currentTags]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const saveScoringLocal = () => {
    const newScoring: ScoringEntry = {
      epochIndex: currentEpochIndex,
      scoredAt: new Date().toISOString(),
      stage: currentScoring,
      tags: currentTags.map(tag => ({ tag, addedAt: new Date().toISOString() }))
    };
    saveScoring(newScoring);
  };


  return (
    <div className="table" id="scoring-component">
      <div className="flex flex-col space-y-4 mb-2">
        <div className="flex items-center space-x-4 p-2 border rounded-md bg-gray-50">
          <div className="font-semibold">Stage:</div>
          <p className="mb-2">Stage an epoch.  Used for the YASA-like model.  Saved to  raw.scorings.json.</p>
          <select
            value={currentScoring}
            onChange={(e) => setCurrentScoring(e.target.value as ScoringEntry['stage'])}
            className="select select-bordered w-full max-w-xs"
          >
            {SCORING_OPTIONS.map((option, idx) => (
              <option key={idx} value={option}>{option} (shortcut key: {idx + 1})</option>
            ))}
          </select>
          {currentEpochScoring ? (
            <span className="text-green-500">✓ (epoch is staged)</span>
          ) : (
            <span>Epoch not yet staged</span>
          )}
          <p>Press space to save to file and go to next epoch</p>
        </div>

        <div className="p-2 border rounded-md bg-gray-50">
          <div className="font-semibold mb-2">Tags:</div>
          <p className="mb-2">Tag an epoch.  Also get saved to raw.scorings.json when space pressed.</p>
          <div className="grid grid-cols-2 gap-2">
            {TAG_OPTIONS.map(({ tag, description }) => (
              <label key={tag} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={currentTags.includes(tag)}
                  onChange={() => setCurrentTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                  className="checkbox checkbox-sm"
                />
                <span>{description}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="flex items-center space-x-4 p-2 border rounded-md bg-gray-50">
          <div className="font-semibold">EEG Graph Marking Mode:</div>
          <p className="mb-2">Handle graph clicks.  Also get saved to raw.scorings.json.  Artifacts are used for regression tests so set it safely after the real start.  Microwakings (which were for training a model) are deprecated (a microwaking is just an artifact during sleep).</p>
          <select
            value={markingMode}
            onChange={(e) => setMarkingMode(e.target.value as StoreState['markingMode'])}
            className="select select-bordered"
          >
            <option value="None">None</option>
            <option value="ArtifactStart">Artifact Start</option>
            <option value="ArtifactEnd">Artifact End</option>
            <option value="NotArtifactStart">Not Artifact Start</option>
            <option value="NotArtifactEnd">Not Artifact End</option>
            {/* Removed as microwakings are deprecated */}
            {/* <option value="MicrowakingStart">Microwaking Start</option>
            <option value="MicrowakingEnd">Microwaking End</option> */}
            {/* Removing as I don't recall what these are used for  */}
            {/* <option value="StartExclusion">Start Exclusion</option>
            <option value="EndExclusion">End Exclusion</option> */}
          </select>
        </div>
      </div>

      {/* <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Predictions</h3>
          <ul className="space-y-1">
            {Object.entries(currentEpochData || {})
              .filter(([key]) => key.startsWith('Predictions_'))
              .map(([key, value]: [string, any]) => (
                <li key={key} className="flex justify-between">
                  <span>{key.replace('Predictions_', '').replace(/_/g, ' ')}:</span>
                  <span className="font-mono">{typeof value === 'number' ? value.toFixed(3) : value}</span>
                </li>
              ))}
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Other Data</h3>
          <ul className="space-y-1">
            {['Stage', 'Confidence', 'Source', 'StageInt', 'ManualStage', 'DefinitelyAwake', 'DefinitelySleep', 'ProbablySleep', 'PredictedAwake', 'PredictedAwakeBinary'].map(key => (
              <li key={key} className="flex justify-between">
                <span>{key}:</span>
                <span className="font-mono">{currentEpochData?.[key]?.toString()}</span>
              </li>
            ))}
          </ul>
        </div>
      </div> */}
    </div>
  );
};