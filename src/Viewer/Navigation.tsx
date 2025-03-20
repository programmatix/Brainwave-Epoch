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
import { StageTimeline } from './StageTimeline';
import { PhysicalFeatureTimeline } from './PhysicalFeatureTimeline';
import { FinalWakeModelFeatureTimeline } from './FinalWakeModelFeatureTimeline';
import { ArtifactsTimeline } from './ArtifactsTimeline';
import { RawPhysicalFeaturesTimeline } from './RawPhysicalFeaturesTimeline';

interface TimelineNavigationProps {
    allData: AllData;
    scrollPosition: number;
    setScrollPosition: any;
    totalSamples: number;
    samplesPerSecond: number;
    samplesPerEpoch: number;
}

const TIMELINE_WIDTH = 1000;

export const TimelineNavigation: React.FC<TimelineNavigationProps> = React.memo(({
    allData,
    scrollPosition,
    setScrollPosition,
    totalSamples,
    samplesPerSecond,
    samplesPerEpoch,
}) => {
    console.info("TimelineNavigation", allData, scrollPosition, setScrollPosition, totalSamples, samplesPerSecond, samplesPerEpoch)

    const [epochInput, setEpochInput] = useState('');
    const [selectedFeature, setSelectedFeature] = useState<string>('');
    const [selectedPhysicalFeature, setSelectedPhysicalFeature] = useState<string>('');
    const [selectedFinalWakeModelFeature, setSelectedFinalWakeModelFeature] = useState<string>('');
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

    const handleTimelineClick = useCallback((newPosition: number) => {
        const newScrollPosition = Math.min(totalSamples - 1, Math.max(0, newPosition))
        console.info("handleTimelineClick", newPosition, newScrollPosition)
        setScrollPosition(newScrollPosition);
    }, []);

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
        <div className="timeline-navigation bg-gray-100 p-4 rounded-lg shadow-md">
            <div className="navigation-controls bg-white p-3 rounded-md shadow mb-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                    <div className="flex items-center">
                        <input
                            type="text"
                            value={epochInput}
                            onChange={(e) => setEpochInput(e.target.value)}
                            placeholder="Epoch #"
                            className="border border-gray-300 rounded-l px-3 py-2 w-20 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                        <button 
                            onClick={handleSetEpoch} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-r transition-colors"
                        >
                            Go
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-1">
                        <button onClick={handlePrevEpoch} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-l transition-colors">
                            ← Prev (q)
                        </button>
                        <button onClick={handleNextEpoch} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-r transition-colors">
                            Next (e) →
                        </button>
                    </div>
                    
                    {/* <button 
                        onClick={handleRandomEpoch} 
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded transition-colors"
                    >
                        Random (r)
                    </button> */}
                    
                    <button
                        onClick={() => setIsAutoScrolling(prev => !prev)}
                        className={`${isAutoScrolling ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white px-3 py-2 rounded transition-colors`}
                    >
                        {isAutoScrolling ? 'Stop Auto (a)' : 'Auto (a)'}
                    </button>
                </div>
                
                {/* <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                        <button onClick={handleFirstUnscoredEpoch} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-l transition-colors">
                            First Unscored
                        </button>
                        <button onClick={handlePrevUnscoredEpoch} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 transition-colors">
                            ← Prev
                        </button>
                        <button onClick={handleNextUnscoredEpoch} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-r transition-colors">
                            Next →
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-1">
                        <button onClick={handlePrevScoredMicrowake} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-l transition-colors">
                            ← Prev Microwake
                        </button>
                        <button onClick={handleNextScoredMicrowake} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-r transition-colors">
                            Next Microwake →
                        </button>
                    </div>
                </div> */}
            </div>
            
            <div className="timeline-container">
                <table className="w-full">
                    <tbody>
                        {allData.slowWaveEvents && allData.spindleEvents && Object.keys(allData.slowWaveEvents).map(channel => (
                            <tr key={`combined-${channel}`} className="timeline-row">
                                <td className="timeline-label w-40 font-medium text-gray-700 pr-4 py-2">Slow Waves & Spindles {channel}</td>
                                <td className="timeline-data bg-white rounded-md shadow p-1">
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
                        
                        {allData.nightEvents && (
                            <tr className="timeline-row">
                                <td className="timeline-label w-40 font-medium text-gray-700 pr-4 py-2">Night Events</td>
                                <td className="timeline-data bg-white rounded-md shadow p-1">
                                    <NightEventsTimeline
                                        allData={allData}
                                        scrollPosition={scrollPosition}
                                        totalSamples={totalSamples}
                                        width={TIMELINE_WIDTH}
                                        onTimelineClick={handleTimelineClick}
                                    /> 
                                </td>
                            </tr>
                        )}
                        
                        {Object.keys(allData.sleepStages?.[0]?.Channels || {}).filter(channel => channel !== 'Aggregated').map((channel, index) => (
                            <tr key={`feature-${channel}`} className="timeline-row">
                                <td className="timeline-label w-40 pr-4 py-2">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-700">Feature {channel}</span>
                                        {index == 0 && (
                                            <select
                                                value={selectedFeature}
                                                onChange={(e) => setSelectedFeature(e.target.value)}
                                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                            >
                                                <option value="">Select Feature</option>
                                                {getOrderedKeys(getFirstNonAggregatedChannel(allData)).map((feature) => (
                                                    <option key={feature} value={feature}>
                                                        {feature}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </td>
                                <td className="timeline-data bg-white rounded-md shadow p-1">
                                    {selectedFeature && (
                                        <FeatureTimeline
                                            allData={allData}
                                            scrollPosition={scrollPosition}
                                            totalSamples={totalSamples}
                                            width={TIMELINE_WIDTH}
                                            onTimelineClick={handleTimelineClick}
                                            selectedFeature={selectedFeature}
                                            channel={channel}
                                        />
                                    )}
                                </td>
                            </tr>
                        ))}
                        
                        {allData.sleepStages && (
                            <tr className="timeline-row">
                                <td className="timeline-label w-40 font-medium text-gray-700 pr-4 py-2">YASA Hypnogram</td>
                                <td className="timeline-data bg-white rounded-md shadow p-1">
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
                        )}
                        
                        {allData.fitbitHypnogram && (
                            <tr className="timeline-row">
                                <td className="timeline-label w-40 font-medium text-gray-700 pr-4 py-2">Fitbit Hypnogram</td>
                                <td className="timeline-data bg-white rounded-md shadow p-1">
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
                        
                        {allData.artifacts && (
                            <tr className="timeline-row">
                                <td className="timeline-label w-40 font-medium text-gray-700 pr-4 py-2">Artifacts</td>
                                <td className="timeline-data bg-white rounded-md shadow p-1">
                                    <ArtifactsTimeline
                                        allData={allData}
                                        scrollPosition={scrollPosition}
                                        totalSamples={totalSamples}
                                        width={TIMELINE_WIDTH}
                                        onTimelineClick={handleTimelineClick}
                                    />
                                </td>
                            </tr>
                        )}
                        
                        {allData.rawPhysicalFeatures && (
                            <tr className="timeline-row">
                                <td className="timeline-label w-40 font-medium text-gray-700 pr-4 py-2">Movement</td>
                                <td className="timeline-data bg-white rounded-md shadow p-1">
                                    <RawPhysicalFeaturesTimeline
                                        allData={allData}
                                        scrollPosition={scrollPosition}
                                        totalSamples={totalSamples}
                                        width={TIMELINE_WIDTH}
                                        onTimelineClick={handleTimelineClick}
                                    />
                                </td>
                            </tr>
                        )}
                        
                        <tr className="timeline-row">
                            <td className="timeline-label w-40 font-medium text-gray-700 pr-4 py-2">SettlingManualScore</td>
                            <td className="timeline-data bg-white rounded-md shadow p-1">
                                <StageTimeline
                                    sleepStages={allData.sleepStages}
                                    scrollPosition={scrollPosition}
                                    totalSamples={totalSamples}
                                    width={TIMELINE_WIDTH}
                                    onTimelineClick={handleTimelineClick}
                                    field="SettlingManualScore"
                                    color="red"
                                />
                            </td>
                        </tr>
                        
                        {allData.microwakings && (
                            <tr className="timeline-row">
                                <td className="timeline-label w-40 font-medium text-gray-700 pr-4 py-2">Microwakings</td>
                                <td className="timeline-data bg-white rounded-md shadow p-1">
                                    <MicrowakingsTimeline
                                        allData={allData}
                                        scrollPosition={scrollPosition}
                                        totalSamples={totalSamples}
                                        width={TIMELINE_WIDTH}
                                        onTimelineClick={handleTimelineClick}
                                    />
                                </td>
                            </tr>
                        )}
                        
                        <tr className="timeline-row">
                            <td className="timeline-label w-40 font-medium text-gray-700 pr-4 py-2">Videos</td>
                            <td className="timeline-data bg-white rounded-md shadow p-1">
                                <VideoTimeline
                                    allData={allData}
                                    videoFiles={allData.videos}
                                    startTime={allData.processedEDF.startDate}
                                    duration={allData.processedEDF.duration}
                                    width={TIMELINE_WIDTH}
                                    onTimelineClick={handleTimelineClick}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
});