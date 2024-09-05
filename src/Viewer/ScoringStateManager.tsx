import React, { useState, useCallback } from 'react';
import { AllData, Scorings, ScoringEntry } from '../Loader/LoaderTypes';

interface ScoringStateManagerProps {
  allData: AllData;
  children: (props: ScoringStateProps) => React.ReactNode;
}

export interface Mark {
  time: number;
  scoredAt: string;
  type: 'MicrowakingStart' | 'MicrowakingEnd';
  channel: string;
}

export interface ScoringStateProps {
  scorings: Scorings;
  updateScorings: (newScorings: Scorings) => void;
  marks: Mark[];
  addMark: (mark: Mark) => void;
  markMode: boolean;
  markType: 'MicrowakingStart' | 'MicrowakingEnd';
  toggleMarkMode: (type: 'MicrowakingStart' | 'MicrowakingEnd') => void;
  handleChartClick: (time: number, channel: string) => void;
}

export const ScoringStateManager: React.FC<ScoringStateManagerProps> = ({ allData, children }) => {
  const [scorings, setScorings] = useState<Scorings>(allData.scorings || []);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [markMode, setMarkMode] = useState(false);
  const [markType, setMarkType] = useState<'MicrowakingStart' | 'MicrowakingEnd'>('MicrowakingStart');

  const updateScorings = useCallback((newScorings: Scorings) => {
    setScorings(newScorings);
    allData.scorings = newScorings;
    // You might want to save scorings to file here
  }, [allData]);

  const addMark = useCallback((mark: Mark) => {
    setMarks(prevMarks => [...prevMarks, mark]);
    // You might want to save marks to file here
  }, []);

  const toggleMarkMode = useCallback((type: 'MicrowakingStart' | 'MicrowakingEnd') => {
    setMarkMode(prev => !prev);
    setMarkType(type);
  }, []);

  const handleChartClick = useCallback((time: number, channel: string) => {
    if (!markMode) return;

    const newMark: Mark = {
      time,
      scoredAt: new Date().toISOString(),
      type: markType,
      channel,
    };

    addMark(newMark);
    setMarkType(markType === 'MicrowakingStart' ? 'MicrowakingEnd' : 'MicrowakingStart');
  }, [markMode, markType, addMark]);

  const scoringState: ScoringStateProps = {
    scorings,
    updateScorings,
    marks,
    addMark,
    markMode,
    markType,
    toggleMarkMode,
    handleChartClick,
  };

  return <>{children(scoringState)}</>;
};