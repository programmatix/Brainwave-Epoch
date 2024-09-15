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
      <div className="flex items-center space-x-2 mb-2">
        <select
          value={currentScoring}
          onChange={(e) => setCurrentScoring(e.target.value as ScoringEntry['stage'])}
          className="select select-bordered w-full max-w-xs"
        >
          {SCORING_OPTIONS.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <div className="flex items-center space-x-2">
          {TAG_OPTIONS.map(({ tag, description }) => (
            <label key={tag} className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={currentTags.includes(tag)}
                onChange={() => setCurrentTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
              />
              <span>{description}</span>
            </label>
          ))}
        </div>
        {currentEpochScoring ? (
          <span className="text-green-500">✓</span>
        ) : (
          <span className="text-red-500">✗</span>
        )}
        
        <div className="flex items-center space-x-2">
          <span>Marking Mode:</span>
          <select
            value={markingMode}
            onChange={(e) => setMarkingMode(e.target.value as StoreState['markingMode'])}
            className="select select-bordered"
          >
            <option value="None">None</option>
            <option value="MicrowakingStart">Microwaking Start</option>
            <option value="MicrowakingEnd">Microwaking End</option>
            <option value="StartExclusion">Start Exclusion</option>
            <option value="EndExclusion">End Exclusion</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
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
      </div>
    </div>
  );
};