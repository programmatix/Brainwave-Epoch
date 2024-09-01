import React, { useCallback, useEffect, useState } from 'react';
import { AllData } from '../Loader/LoaderTypes';
import { SleepStageTimeline } from './SleepStageTimeline';
import { SlowWaveTimeline } from './SlowWaveTimeline';
import { NightEventsTimeline } from './NightEventsTimeline';
import { FitbitHypnogramTimeline } from './FitbitHypnogramTimeline';
import { SpindleTimeline } from './SpindleTimeline';
import { PredictedAwakeTimeline } from './PredictedAwakeTimeline';
import { DefiniteAwakeSleepTimeline } from './DefiniteAwakeSleepTimeline';
import { CombinedSlowWaveSpindleTimeline } from './CombinedSlowWaveSpindleTimeline';

interface TimelineNavigationProps {
    allData: AllData;
    scrollPosition: number;
    setScrollPosition: any;
    totalSamples: number;
    samplesPerSecond: number;
    samplesPerEpoch: number;
}

const TIMELINE_WIDTH = 1000;

export const TimelineNavigation: React.FC<TimelineNavigationProps> = ({
    allData,
    scrollPosition,
    setScrollPosition,
    totalSamples,
    samplesPerSecond,
    samplesPerEpoch,
}) => {
    const [epochInput, setEpochInput] = useState('');

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            setScrollPosition((prev) => Math.max(0, prev - 50));
        } else if (e.key === 'ArrowRight') {
            setScrollPosition((prev) => Math.min(totalSamples - 1, prev + 50));
        } else if (e.key === 'q') {
            handlePrevEpoch()
        } else if (e.key === 'e') {
            handleNextEpoch()
        } else if (e.key === 'r') {
            handleRandomEpoch()
        }
    }, [setScrollPosition, totalSamples, scrollPosition, samplesPerEpoch]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    const handleTimelineClick = (newPosition: number) => {
        setScrollPosition(Math.min(totalSamples - 1, Math.max(0, newPosition)));
    };

    const handlePrevEpoch = () => {
        const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
        setScrollPosition(Math.max(0, (currentEpoch - 1) * samplesPerEpoch));
    };

    const handleNextEpoch = () => {
        const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
        setScrollPosition(Math.min(totalSamples - 1, (currentEpoch + 1) * samplesPerEpoch));
    };

    const handleSetEpoch = () => {
        const epochIndex = parseInt(epochInput);
        if (!isNaN(epochIndex) && epochIndex >= 0 && epochIndex < Math.floor(totalSamples / samplesPerEpoch)) {
            setScrollPosition(epochIndex * samplesPerEpoch);
        }
    };

    const handleRandomEpoch = () => {
        const randomEpoch = Math.floor(Math.random() * Math.floor(totalSamples / samplesPerEpoch));
        setScrollPosition(randomEpoch * samplesPerEpoch);
    };

    const startDate = allData.processedEDF.startDate.epochSeconds;

    return (
        <div className="table">
            <div className="flex items-center space-x-2 mb-2">
                <input
                    type="text"
                    value={epochInput}
                    onChange={(e) => setEpochInput(e.target.value)}
                    placeholder="Enter epoch index"
                    className="border p-1"
                />
                <button onClick={handleSetEpoch} className="bg-blue-500 text-white p-1 rounded">Set Epoch</button>
                <button onClick={handlePrevEpoch} className="bg-blue-500 text-white p-1 rounded">Prev Epoch (q)</button>
                <button onClick={handleNextEpoch} className="bg-blue-500 text-white p-1 rounded">Next Epoch (e)</button>
                <button onClick={handleRandomEpoch} className="bg-green-500 text-white p-1 rounded">Random Epoch (r)</button>
            </div>
            {allData.slowWaveEvents && allData.spindleEvents && Object.keys(allData.slowWaveEvents).map(channel => (
                <tr key={`combined-${channel}`}>
                    <td>Slow Waves & Spindles {channel}</td>
                    <td>
                        <CombinedSlowWaveSpindleTimeline
                            key={channel}
                            allData={allData}
                            channel={channel}
                            scrollPosition={scrollPosition}
                            totalSamples={totalSamples}
                            width={TIMELINE_WIDTH}
                            onTimelineClick={handleTimelineClick}
                        />
                    </td>
                </tr>
            ))}            
            <tr>
                <td>Night Events</td>
                <td>
                    {allData.nightEvents && (
                        <NightEventsTimeline
                            allData={allData}
                            scrollPosition={scrollPosition}
                            totalSamples={totalSamples}
                            width={TIMELINE_WIDTH}
                            onTimelineClick={handleTimelineClick}
                        />
                    )}
                </td>
            </tr>
            <tr>
                <td>Aggregated YASA Hypnogram</td>
                <td>
                    <SleepStageTimeline
                        sleepStages={allData.sleepStages}
                        scrollPosition={scrollPosition}
                        totalSamples={totalSamples}
                        samplesPerSecond={samplesPerSecond}
                        samplesPerEpoch={samplesPerEpoch}
                        width={TIMELINE_WIDTH}
                        onTimelineClick={handleTimelineClick}
                    />
                </td>
            </tr>
            {allData.fitbitHypnogram && (
                <tr>
                    <td>Fitbit Hypnogram</td>
                    <td>
                        <FitbitHypnogramTimeline
                            fitbitHypnogram={allData.fitbitHypnogram}
                            scrollPosition={scrollPosition}
                            totalSamples={totalSamples}
                            width={TIMELINE_WIDTH}
                            onTimelineClick={handleTimelineClick}
                            allData={allData}
                        />
                    </td>
                </tr>
            )}
            {allData.predictedAwakeTimeline && (
                <tr>
                    <td>Predicted Awake</td>
                    <td>
                    <PredictedAwakeTimeline
                        sleepStages={allData.predictedAwakeTimeline}
                        scrollPosition={scrollPosition}
                        totalSamples={totalSamples}
                        width={TIMELINE_WIDTH}
                        onTimelineClick={handleTimelineClick}
                    />
                </td>
            </tr>
            )}
            {allData.definiteAwakeSleepTimeline && (
            <tr>
                <td>Definite Awake/Sleep</td>
                <td>
                    <DefiniteAwakeSleepTimeline
                        sleepStages={allData.definiteAwakeSleepTimeline}
                        scrollPosition={scrollPosition}
                        totalSamples={totalSamples}
                        width={TIMELINE_WIDTH}
                        onTimelineClick={handleTimelineClick}
                    />
                </td>
            </tr>
            )}
        </div>
    );
};