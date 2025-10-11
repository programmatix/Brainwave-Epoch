import React, { useMemo } from 'react';
import { AllData } from '../Loader/LoaderTypes';

type FeatureConfig = {
    id: string;
    label: string;
    fileSuffix?: string;
    available: boolean;
    availableMessage?: string;
    missingMessage?: string;
    usage?: string;
};

type FeatureAvailabilityPanelProps = {
    allData: AllData;
};

export const FeatureAvailabilityPanel: React.FC<FeatureAvailabilityPanelProps> = ({ allData }) => {
    const basePath = allData.processedEDF.filePathWithoutExtension;

    const featureConfigs = useMemo<FeatureConfig[]>(() => {
        const slowWaveEventsAvailable = allData.slowWaveEvents !== undefined;
        const slowWaveEventsChannels = slowWaveEventsAvailable ? Object.keys(allData.slowWaveEvents || {}).length : 0;

        const spindleEventsAvailable = allData.spindleEvents !== undefined;
        const spindleEventsChannels = spindleEventsAvailable ? Object.keys(allData.spindleEvents || {}).length : 0;

        const nightEventsCount = allData.nightEvents?.length ?? 0;
        const fitbitCount = allData.fitbitHypnogram?.length ?? 0;
        const microwakingsCount = allData.microwakings?.length ?? 0;
        const artifactsCount = allData.artifacts?.length ?? 0;
        const rawPhysicalCount = allData.rawPhysicalFeatures?.length ?? 0;
        const videoCount = allData.videos?.length ?? 0;
        const audioCount = allData.audio?.length ?? 0;

        return [
            {
                id: 'features-csv',
                label: 'Features CSV',
                fileSuffix: '.with_features.csv',
                available: allData.sleepStages !== undefined,
                availableMessage: `File ${basePath}.with_features.csv is present`,
                missingMessage: 'Missing features CSV',
                usage: 'metrics table, feature timelines, and annotations',
            },
            {
                id: 'sws',
                label: 'SWS',
                fileSuffix: '.sw_summary.csv',
                available: slowWaveEventsAvailable,
                availableMessage: `File ${basePath}.sw_summary.csv is present (${slowWaveEventsChannels} channels)`,
                missingMessage: `Missing file: ${basePath}.sw_summary.csv`,
                usage: 'slow wave timelines and EEG chart overlays',
            },
            {
                id: 'spindles',
                label: 'Spindles',
                fileSuffix: '.spindle_summary.csv',
                available: spindleEventsAvailable,
                availableMessage: `File ${basePath}.spindle_summary.csv is present (${spindleEventsChannels} channels)`,
                missingMessage: `Missing file: ${basePath}.spindle_summary.csv`,
                usage: 'spindle timelines and combined overlays',
            },
            {
                id: 'night-events',
                label: 'Night Events',
                fileSuffix: '.night_events.csv',
                available: allData.nightEvents !== undefined,
                availableMessage: `File ${basePath}.night_events.csv is present (${nightEventsCount} entries)`,
                missingMessage: `Missing file: ${basePath}.night_events.csv`,
                usage: 'night events timeline and tooltip details',
            },
            {
                id: 'fitbit',
                label: 'Fitbit',
                fileSuffix: '.fitbit_hypnogram.csv',
                available: allData.fitbitHypnogram !== undefined,
                availableMessage: `File ${basePath}.fitbit_hypnogram.csv is present (${fitbitCount} epochs)`,
                missingMessage: `Missing file: ${basePath}.fitbit_hypnogram.csv`,
                usage: 'Fitbit hypnogram chart and timeline',
            },
            {
                id: 'microwakings',
                label: 'Microwakings',
                fileSuffix: '.microwakings.csv',
                available: allData.microwakings !== undefined,
                availableMessage: `File ${basePath}.microwakings.csv is present (${microwakingsCount} entries)`,
                missingMessage: `Missing file: ${basePath}.microwakings.csv`,
                usage: 'microwaking timeline and EEG annotations',
            },
            {
                id: 'raw-phys',
                label: 'Physical 1s',
                fileSuffix: '.physical_features.1s.csv',
                available: allData.rawPhysicalFeatures !== undefined,
                availableMessage: `File ${basePath}.physical_features.1s.csv is present (${rawPhysicalCount} rows)`,
                missingMessage: `Missing file: ${basePath}.physical_features.1s.csv`,
                usage: 'raw physical features chart and table',
            },
            {
                id: 'artifacts',
                label: 'Artifacts',
                fileSuffix: '.artifacts.csv',
                available: allData.artifacts !== undefined,
                availableMessage: `File ${basePath}.artifacts.csv is present (${artifactsCount} entries)`,
                missingMessage: `Missing file: ${basePath}.artifacts.csv`,
                usage: 'artifact timelines, navigation jumps, and EEG highlights',
            },
            {
                id: 'video',
                label: 'Video',
                available: videoCount > 0,
                availableMessage: `Video API returned ${videoCount} files`,
                missingMessage: 'No video files returned from video API',
                usage: 'video filmstrip overlay',
            },
            {
                id: 'audio',
                label: 'Audio',
                available: audioCount > 0,
                availableMessage: `Audio API returned ${audioCount} files`,
                missingMessage: 'No audio files returned from audio API',
                usage: 'audio filmstrip overlay',
            },
        ];
    }, [allData, basePath]);

    if (!featureConfigs.length) {
        return null;
    }

    return (
        <div className="bg-base-200 mb-2 rounded-lg p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
                Feature availability
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
                {featureConfigs.map((feature) => {
                    const indicatorClass = feature.available ? 'bg-green-500' : 'bg-red-500';
                    const filePath = feature.fileSuffix ? `${basePath}${feature.fileSuffix}` : undefined;
                    const baseMessage = feature.available
                        ? feature.availableMessage ?? (filePath ? `File ${filePath} is present` : 'Data available')
                        : feature.missingMessage ?? (filePath ? `Missing file: ${filePath}` : 'Data not available');
                    const usageMessage = feature.usage ? `Used for ${feature.usage}` : undefined;
                    const message = usageMessage ? `${baseMessage}. ${usageMessage}.` : `${baseMessage}.`;

                    return (
                        <div
                            key={feature.id}
                            className="flex items-center gap-2"
                            title={message}
                        >
                            <span
                                className={`inline-flex h-2.5 w-2.5 rounded-full ${indicatorClass}`}
                                aria-hidden="true"
                            />
                            <span>{feature.label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FeatureAvailabilityPanel;
