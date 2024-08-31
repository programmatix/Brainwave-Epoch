import React, { useCallback, useEffect } from 'react';
import { AllData } from '../Loader/LoaderTypes';
import { SleepStageTimeline } from './SleepStageTimeline';
import { SlowWaveTimeline } from './SlowWaveTimeline';
import { NightEventsTimeline } from './NightEventsTimeline';
import { FitbitHypnogramTimeline } from './FitbitHypnogramTimeline';
import { SpindleTimeline } from './SpindleTimeline';
import { PredictedAwakeTimeline } from './PredictedAwakeTimeline';
import { DefiniteAwakeSleepTimeline } from './DefiniteAwakeSleepTimeline';

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
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
            setScrollPosition((prev) => Math.max(0, prev - 50));
        } else if (e.key === 'ArrowRight') {
            setScrollPosition((prev) => Math.min(totalSamples - 1, prev + 50));
        } else if (e.key === 'q') {
            const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
            setScrollPosition(Math.max(0, (currentEpoch - 1) * samplesPerEpoch));
        } else if (e.key === 'e') {
            const currentEpoch = Math.floor(scrollPosition / samplesPerEpoch);
            setScrollPosition(Math.min(totalSamples - 1, (currentEpoch + 1) * samplesPerEpoch));
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

    const startDate = allData.processedEDF.startDate.epochSeconds;

    return (
        <div className="table gap-4">
            <tr>
                <td>Aggregated EEG Hypnogram</td>
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
            {allData.slowWaveEvents && Object.entries(allData.slowWaveEvents).map(([channel, events]) => (
                <tr key={`slow-${channel}`}>
                    <td>Slow Waves {channel}</td>
                    <td>
                        <SlowWaveTimeline
                            key={channel}
                            scrollPosition={scrollPosition}
                            channel={channel}
                            events={events}
                            totalSamples={totalSamples}
                            width={TIMELINE_WIDTH}
                            onTimelineClick={handleTimelineClick}
                            allData={allData}
                        />
                    </td>
                </tr>
            ))}
            {allData.spindleEvents && Object.entries(allData.spindleEvents).map(([channel, events]) => (
                <tr key={`spindle-${channel}`}>
                    <td>Spindles {channel}</td>
                    <td>
                        <SpindleTimeline
                            key={channel}
                            scrollPosition={scrollPosition}
                            channel={channel}
                            events={events}
                            totalSamples={totalSamples}
                            width={TIMELINE_WIDTH}
                            onTimelineClick={handleTimelineClick}
                            allData={allData}
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
        </div>
    );
};