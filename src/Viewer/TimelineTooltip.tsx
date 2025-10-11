import React from 'react';
import { AllData, ProcessedSleepStageEntryFeatures, StageFeatureMinMax } from '../Loader/LoaderTypes';
import { sampleIndexToTime, millisecondsToSamples, sampleToEpoch } from './ChartUtils';
import { SECONDS_PER_EPOCH } from './EEGCharts';
import { StoreState, useStore } from '../Store/Store';

// Add tooltip animation styles
const tooltipAnimationStyle = `
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translate(-50%, -90%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -100%);
  }
}
`;

type StageBucket = keyof StageFeatureMinMax['forAllStats'];
const stageBuckets: StageBucket[] = ['All', 'Sleep', 'NonDeepSleep', 'W', 'N1', 'N2', 'N3', 'R'];
const isStageBucket = (value: string | undefined): value is StageBucket =>
    !!value && stageBuckets.includes(value as StageBucket);

const formatNumber = (num?: number): string => {
    if (typeof num !== 'number' || Number.isNaN(num)) {
        return 'N/A';
    }
    return num.toLocaleString('en-GB', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
        useGrouping: false
    });
};

const formatRawNumber = (num?: number): string => {
    if (typeof num !== 'number' || Number.isNaN(num)) {
        return 'N/A';
    }
    return num.toPrecision(8);
};

interface TimelineTooltipProps {
    allData: AllData;
    mousePosition: number;
    type: string;
    channel?: string;
    position: { x: number; y: number };
    feature?: string;
}

export const TimelineTooltip: React.FC<TimelineTooltipProps> = ({ allData, mousePosition, type, channel, position, feature }) => {
    const time = sampleIndexToTime(allData, mousePosition);
    const sample = mousePosition
    const epoch = sampleToEpoch(allData, mousePosition);
    const { marks } = useStore((state: StoreState) => ({
        marks: state.marks,
    }));

    // console.log('[TimelineTooltip] mousePosition', { mousePosition, time, epoch, sample, allData });

    let content = (
        <div>
            <div className="font-bold text-gray-800 text-sm">Time: {time.withTimeZone('Europe/London').toLocaleString('en-GB')}</div>
            <div className="text-gray-600 mt-1">Epoch: {epoch}</div>
            <div className="text-gray-600 mt-1">Sample: {Math.floor(sample)}</div>
        </div>
    );

    try {
        switch (type) {
            case 'video':
                const video = allData.videos.find(v => {
                    const videoStartSample = millisecondsToSamples(v.timestamp - allData.processedEDF.startDate.epochMilliseconds, allData.processedEDF.signals[0].samplingRate);
                    return videoStartSample <= mousePosition && videoStartSample + SECONDS_PER_EPOCH >= mousePosition;
                });

                if (video) {
                    content = (
                        <div>
                            <div className="font-bold text-gray-800 text-sm">Time: {time.withTimeZone('Europe/London').toLocaleString('en-GB')}</div>
                            <div className="text-gray-600 mt-1">Epoch: {epoch}</div>
                            <div className="text-blue-600 font-semibold mt-1">Video: {video.name}</div>
                        </div>
                    );
                }
                break;

            case 'sleepStage':
                const sleepStage = allData.sleepStages?.[epoch];
                if (sleepStage) {
                    content = (
                        <div>
                            <div className="font-bold text-gray-800 text-sm">Time: {time.withTimeZone('Europe/London').toLocaleString('en-GB')}</div>
                            <div className="text-gray-600 mt-1">Epoch: {epoch}</div>
                            <div className="text-purple-600 font-semibold mt-1">Stage: {sleepStage.Stage}</div>
                        </div>
                    );
                }
                break;

            case 'fitbit':
                const fitbitStage = allData.fitbitHypnogram?.[epoch];
                if (fitbitStage) {
                    content = (
                        <div>
                            <div className="font-bold text-gray-800 text-sm">Time: {time.withTimeZone('Europe/London').toLocaleString('en-GB')}</div>
                            <div className="text-gray-600 mt-1">Epoch: {epoch}</div>
                            <div className="text-green-600 font-semibold mt-1">Fitbit Stage: {fitbitStage.state}</div>
                        </div>
                    );
                }
                break;

            case 'artifact':
                const artifact = allData.artifacts?.find(a => {
                    return a.start <= mousePosition && a.end >= mousePosition;
                });
                if (artifact) {
                    content = (
                        <div>
                            <div className="font-bold text-gray-800 text-sm">Time: {time.withTimeZone('Europe/London').toLocaleString('en-GB')}</div>
                            <div className="text-gray-600 mt-1">Epoch: {epoch}</div>
                            <div className="text-red-600 font-semibold mt-1">Artifact detected</div>
                        </div>
                    );
                }
                break;

            case 'mark':
                // const mark = marks?.find(m => {
                //     const markSample = millisecondsToSamples(m..Start.epochMilliseconds - allData.processedEDF.startDate.epochMilliseconds, allData.processedEDF.signals[0].samplingRate);
                //     return markSample <= mousePosition && markSample + SECONDS_PER_EPOCH >= mousePosition;
                // });
                // if (mark) {
                //     content = (
                //         <div className="p-2">
                //             <div className="font-medium">Time: {time.toLocaleString()}</div>
                //             <div>Epoch: {epoch}</div>
                //             <div>Mark: {mark.text}</div>
                //         </div>
                //     );
                // }
                break;

            // case 'movement':
            //     const movement = allData.rawPhysicalFeatures?.find(m => {
            //         const movementSample = millisecondsToSamples(m.timestamp - allData.processedEDF.startDate.epochMilliseconds, allData.processedEDF.signals[0].samplingRate);
            //         return movementSample <= mousePosition && movementSample + SECONDS_PER_EPOCH >= mousePosition;
            //     });
            //     if (movement) {
            //         content = (
            //             <div>
            //                 <div className="font-bold text-gray-800 text-sm">Time: {time.toLocaleString()}</div>
            //                 <div className="text-gray-600 mt-1">Epoch: {epoch}</div>
            //                 <div className="text-orange-600 font-semibold mt-1">Movement: {movement.movement.toFixed(2)}</div>
            //             </div>
            //         );
            //     }
            //     break;

            case 'microwaking':
                const microwaking = allData.microwakings?.find(m => {
                    const microwakingSample = millisecondsToSamples(m.Start.epochMilliseconds - allData.processedEDF.startDate.epochMilliseconds, allData.processedEDF.signals[0].samplingRate);
                    return microwakingSample <= mousePosition && microwakingSample + SECONDS_PER_EPOCH >= mousePosition;
                });
                if (microwaking) {
                    content = (
                        <div>
                            <div className="font-bold text-gray-800 text-sm">Time: {time.withTimeZone('Europe/London').toLocaleString('en-GB')}</div>
                            <div className="text-gray-600 mt-1">Epoch: {epoch}</div>
                            <div className="text-amber-600 font-semibold mt-1">Microwaking Duration: {(microwaking.End.epochMilliseconds - microwaking.Start.epochMilliseconds) / 1000}s</div>
                        </div>
                    );
                }
                break;

            case 'feature':
                if (channel && feature) {
                    const featureKey = feature as keyof ProcessedSleepStageEntryFeatures;
                    const sleepStageEntry = allData.sleepStages?.[epoch];
                    const channelData = sleepStageEntry?.Channels?.[channel];
                    const featureValue = channelData?.[featureKey];
                    const stageLabel = sleepStageEntry?.Stage;
                    const featureMinMax = allData.sleepStageFeatureMinMax?.[channel]?.[featureKey];
                    const stageSpecificMinMax = featureMinMax && isStageBucket(stageLabel)
                        ? featureMinMax.forAllStats[stageLabel]
                        : undefined;
                    const colorMinMax = stageSpecificMinMax && stageSpecificMinMax.p90 !== stageSpecificMinMax.p10
                        ? stageSpecificMinMax
                        : featureMinMax?.forAllStats.All;
                    const allStagesMinMax = featureMinMax?.forAllStats.All;
                    const normalized = colorMinMax && typeof featureValue === 'number' && colorMinMax.p90 !== colorMinMax.p10
                        ? (featureValue - colorMinMax.p10) / (colorMinMax.p90 - colorMinMax.p10)
                        : undefined;

                    content = (
                        <div>
                            <div className="font-bold text-gray-800 text-sm">Time: {time.withTimeZone('Europe/London').toLocaleString('en-GB')}</div>
                            <div className="text-gray-600 mt-1">Epoch: {epoch}</div>
                            <div className="text-indigo-600 mt-1">Channel: {channel}</div>
                            <div className="text-gray-600 mt-1">Stage: {stageLabel ?? 'N/A'}</div>
                            <div className="text-gray-700 mt-1">Feature: {feature}</div>
                            <div className="text-gray-600 mt-1">Value: {formatNumber(typeof featureValue === 'number' ? featureValue : undefined)}</div>
                            <div className="text-gray-500 text-xs">Actual: {formatRawNumber(typeof featureValue === 'number' ? featureValue : undefined)}</div>
                            {colorMinMax && (
                                <div className="text-gray-600 mt-2 text-xs">
                                    <div className="font-semibold uppercase tracking-wide text-gray-500 mb-1">
                                        Colour range (all files {stageSpecificMinMax && isStageBucket(stageLabel) && stageLabel !== 'All' ? `stage ${stageLabel}` : 'all stages'})
                                    </div>
                                    <div>P10: {formatNumber(colorMinMax.p10)}</div>
                                    <div>P90: {formatNumber(colorMinMax.p90)}</div>
                                    {typeof normalized === 'number' && isFinite(normalized) && (
                                        <div>Normalized position: {(normalized * 100).toFixed(1)}%</div>
                                    )}
                                </div>
                            )}
                            {allStagesMinMax && stageSpecificMinMax && isStageBucket(stageLabel) && stageLabel !== 'All' && (
                                <div className="text-gray-500 mt-2 text-xs">
                                    <div className="font-semibold uppercase tracking-wide text-gray-500 mb-1">
                                        All files (all stages) reference
                                    </div>
                                    <div>P10: {formatNumber(allStagesMinMax.p10)}</div>
                                    <div>P90: {formatNumber(allStagesMinMax.p90)}</div>
                                </div>
                            )}
                        </div>
                    );
                }
                break;

            case 'combined':
                if (channel) {
                    const slowWave = allData.slowWaveEvents?.[channel]?.find(s => s.Start <= mousePosition && s.End >= mousePosition);
                    const spindle = allData.spindleEvents?.[channel]?.find(s => s.Start <= mousePosition && s.End >= mousePosition);
                    content = (
                        <div>
                            <div className="font-bold text-gray-800 text-sm">Time: {time.withTimeZone('Europe/London').toLocaleString('en-GB')}</div>
                            <div className="text-gray-600 mt-1">Epoch: {epoch}</div>
                            <div className="text-indigo-600 mt-1">Channel: {channel}</div>
                            {slowWave && <div className="text-blue-600 font-semibold mt-1">Slow Wave Present</div>}
                            {spindle && <div className="text-purple-600 font-semibold mt-1">Spindle Present</div>}
                        </div>
                    );
                }
                break;
        }
    } catch (error) {
        console.error("Error in TimelineTooltip", error);
    }
    //console.timeEnd('TimelineTooltip');

    return (
        <>
            <style>{tooltipAnimationStyle}</style>
            <div 
                className="fixed bg-white shadow-lg rounded-md border border-gray-200 z-50"
                style={{
                    left: position.x,
                    top: position.y - 20,
                    transform: 'translate(-50%, -100%)',
                    pointerEvents: 'none',
                    padding: '8px',
                    minWidth: '180px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08)',
                    animation: 'fadeIn 0.1s ease-in-out'
                }}
            >
                {content}
            </div>
        </>
    );
}; 
