import React, { useCallback, useEffect, useState } from 'react';
import { AllData, Scorings } from '../Loader/LoaderTypes';
import { SleepStageTimeline } from './SleepStageTimeline';
import { SlowWaveTimeline } from './SlowWaveTimeline';
import { NightEventsTimeline } from './NightEventsTimeline';
import { FitbitHypnogramTimeline } from './FitbitHypnogramTimeline';
import { SpindleTimeline } from './SpindleTimeline';
import { PredictedAwakeTimeline } from './PredictedAwakeTimeline';
import { DefiniteAwakeSleepTimeline } from './DefiniteAwakeSleepTimeline';
import { CombinedSlowWaveSpindleTimeline } from './CombinedSlowWaveSpindleTimeline';
import { FeatureTimeline } from './FeatureTimeline';
import { getFirstNonAggregatedChannel, getOrderedKeys } from './EEGChartAnnotations';
import { SpectrogramTimeline } from './SpectrogramTimeline'; // Add import
import { ScoredEpochsTimeline } from './ScoredEpochsTimeline';
import { PredictedSleepStageTimeline } from './PredictedSleepStageTimeline';
import { StoreState, useStore } from '../Store/Store';
import { MarksTimeline } from './MarksTimeline';
import { MicrowakingsTimeline } from './MicrowakingsTimeline';
import { VideoTimeline } from '../Videos/VideoTimeline';

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
    const [selectedFeature, setSelectedFeature] = useState<string>('');
    const { scorings, marks } = useStore((state: StoreState) => ({
        scorings: state.scorings,
        marks: state.marks,
    }))
    console.info("scorings", scorings)
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            setScrollPosition((prev) => Math.max(0, prev - 200));
        } else if (e.key === 'ArrowRight') {
            setScrollPosition((prev) => Math.min(totalSamples - 1, prev + 200));
        } else if (e.key === 'q') {
            handlePrevEpoch()
        } else if (e.key === 'e') {
            handleNextEpoch()
        } else if (e.key === 'r') {
            handleRandomEpoch()
        } else if (e.key === 'a') {
            setIsAutoScrolling(prev => !prev);
        }
    }, [setScrollPosition, totalSamples, scrollPosition, samplesPerEpoch]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    useEffect(() => {
        let intervalId: number;
        if (isAutoScrolling) {
            intervalId = window.setInterval(() => {
                setScrollPosition(prev => {
                    const nextPosition = prev + samplesPerEpoch;
                    return nextPosition < totalSamples ? nextPosition : prev;
                });
            }, 600);
        }
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
        };
    }, [isAutoScrolling, setScrollPosition, samplesPerEpoch, totalSamples]);

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

    const handleFirstUnscoredEpoch = () => {
        const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
        for (let i = 0; i < currentEpoch; i++) {
            if (!scorings.some(s => s.epochIndex === i)) {
                setScrollPosition(i * samplesPerEpoch);
                return;
            }
        }
    };

    const handlePrevUnscoredEpoch = () => {
        const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
        for (let i = currentEpoch - 1; i >= 0; i--) {
            if (!scorings.some(s => s.epochIndex === i)) {
                setScrollPosition(i * samplesPerEpoch);
                return;
            }
        }
    };

    const handleNextUnscoredEpoch = () => {
        const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
        const totalEpochs = Math.floor(totalSamples / samplesPerEpoch);
        for (let i = currentEpoch + 1; i < totalEpochs; i++) {
            if (!scorings.some(s => s.epochIndex === i)) {
                setScrollPosition(i * samplesPerEpoch);
                return;
            }
        }
    };

    const handlePrevScoredMicrowake = () => {
        const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
        for (let i = currentEpoch - 1; i >= 0; i--) {
            if (scorings.some(s => s.epochIndex === i && s.tags.some(tag => tag.tag.startsWith("Microwake")))) {
                setScrollPosition(i * samplesPerEpoch);
                return;
            }
        }
    };

    const handleNextScoredMicrowake = () => {
        const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
        const totalEpochs = Math.floor(totalSamples / samplesPerEpoch);
        for (let i = currentEpoch + 1; i < totalEpochs; i++) {
            if (scorings.some(s => s.epochIndex === i && s.tags.some(tag => tag.tag.startsWith("Microwake")))) {
                setScrollPosition(i * samplesPerEpoch);
                return;
            }
        }
    };

    const startDate = allData.processedEDF.startDate.epochSeconds;

    return (
        <div className="table" id="timeline-navigation">
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
                <button onClick={handleFirstUnscoredEpoch} className="bg-purple-500 text-white p-1 rounded">First Unscored</button>
                <button onClick={handlePrevUnscoredEpoch} className="bg-purple-500 text-white p-1 rounded">Prev Unscored</button>
                <button onClick={handleNextUnscoredEpoch} className="bg-purple-500 text-white p-1 rounded">Next Unscored</button>
                <button onClick={handlePrevScoredMicrowake} className="bg-purple-500 text-white p-1 rounded">Prev Scored Microwake</button>
                <button onClick={handleNextScoredMicrowake} className="bg-purple-500 text-white p-1 rounded">Next Scored Microwake</button>
                <button
                    onClick={() => setIsAutoScrolling(prev => !prev)}
                    className={`${isAutoScrolling ? 'bg-red-500' : 'bg-green-500'} text-white p-1 rounded`}
                >
                    {isAutoScrolling ? 'Stop AutoScroll' : 'Start AutoScroll (a)'}
                </button>
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
            {allData.nightEvents && <tr>
                <td>Night Events</td>
                <td>
                    <NightEventsTimeline
                        allData={allData}
                        scrollPosition={scrollPosition}
                        totalSamples={totalSamples}
                        width={TIMELINE_WIDTH}
                        onTimelineClick={handleTimelineClick}
                    />
                </td>
            </tr>}
            {Object.keys(allData.sleepStages?.[0]?.Channels || {}).map((channel, index) => (
                <tr key={`feature-${channel}`}>
                    <td>Feature Timeline {channel}

                        {index == 0 && <div className="flex items-center space-x-2 mb-2">
                            <select
                                value={selectedFeature}
                                onChange={(e) => setSelectedFeature(e.target.value)}
                                className="select select-bordered w-full max-w-xs"
                            >
                                {getOrderedKeys(getFirstNonAggregatedChannel(allData)).map((feature) => (
                                    <option key={feature} value={feature}>
                                        {feature}
                                    </option>
                                ))}
                            </select>
                        </div>}

                    </td>
                    <td>
                        <FeatureTimeline
                            allData={allData}
                            scrollPosition={scrollPosition}
                            totalSamples={totalSamples}
                            width={TIMELINE_WIDTH}
                            onTimelineClick={handleTimelineClick}
                            selectedFeature={selectedFeature}
                            channel={channel}
                        />
                    </td>
                </tr>
            ))}
            {allData.sleepStages && <tr>
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
            </tr>}
            {allData.sleepStages && <tr>
                <td>Predicted Sleep Stages</td>
                <td>
                    <PredictedSleepStageTimeline
                        sleepStages={allData.sleepStages}
                        scrollPosition={scrollPosition}
                        totalSamples={totalSamples}
                        width={TIMELINE_WIDTH}
                        onTimelineClick={handleTimelineClick}
                    />
                </td>
            </tr>}
            {scorings && <tr>
                <td>Scored Epochs</td>
                <td>
                    <ScoredEpochsTimeline
                        scorings={scorings}
                        scrollPosition={scrollPosition}
                        totalSamples={totalSamples}
                        samplesPerEpoch={samplesPerEpoch}
                        width={TIMELINE_WIDTH}
                        onTimelineClick={handleTimelineClick}
                    />
                </td>
            </tr>}
            {marks && <tr>
                <td>Marked Epochs</td>
                <td>
                    <MarksTimeline
                        scrollPosition={scrollPosition}
                        totalSamples={totalSamples}
                        samplesPerEpoch={samplesPerEpoch}
                        width={TIMELINE_WIDTH}
                        onTimelineClick={handleTimelineClick}
                    />
                </td>
            </tr>}
            {allData.fitbitHypnogram && <tr>
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
            </tr>}
            {allData.predictedAwakeTimeline && <tr>
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
            </tr>}
            {allData.definiteAwakeSleepTimeline && <tr>
                <td>Definite Awake/Probably Sleep</td>
                <td>
                    <DefiniteAwakeSleepTimeline
                        sleepStages={allData.definiteAwakeSleepTimeline}
                        scrollPosition={scrollPosition}
                        totalSamples={totalSamples}
                        width={TIMELINE_WIDTH}
                        onTimelineClick={handleTimelineClick}
                    />
                </td>
            </tr>}
            {allData.microwakings && <tr>
                <td>Microwakings</td>
                <td>
                    <MicrowakingsTimeline
                        allData={allData}
                        scrollPosition={scrollPosition}
                        totalSamples={totalSamples}
                        width={TIMELINE_WIDTH}
                        onTimelineClick={handleTimelineClick}
                    />
                </td>
            </tr>}
            <tr>
                <td>Videos</td>
                <td>
                    <VideoTimeline
                        videoFiles={allData.videos}
                        startTime={allData.processedEDF.startDate}
                        duration={allData.processedEDF.duration}
                        width={1000}
                        onTimelineClick={handleTimelineClick}
                    />
                </td>
            </tr>
        </div>
    );
};