import { AllData, ProcessedSleepStageEntryFeatures } from '../Loader/LoaderTypes';
import { getColorForValue, createLabelCanvas, LabelContent } from './ChartUtils';

export function generateAnnotations(
    allData: AllData,
    startEpochIndex: number,
    endEpochIndex: number,
    scrollPosition: number,
    samplesPerSecond: number,
    compareEpoch: number | null,
    signal: { label: string }
) {
    if (!allData.sleepStages) {
        return [];
    }

    return Object.fromEntries(
        Array.from({ length: endEpochIndex - startEpochIndex }, (_, i) => {
            const epochIndex = startEpochIndex + i;
            const epochStartSample = epochIndex * 30 * samplesPerSecond - scrollPosition;
            const sleepStage = allData.sleepStages[epochIndex];
            const channelData = sleepStage?.Channels[signal.label];

            const content: LabelContent = [
                { key: 'Epoch', value: `${epochIndex} (${sleepStage?.Timestamp.toString()})` },
                { key: 'Stage', value: `${channelData?.Stage || 'N/A'} (${((channelData?.Confidence || 0) * 100).toFixed(0)}%)`, compValue: compareEpoch !== null ? `${allData.sleepStages[compareEpoch]?.Channels[signal.label]?.Stage || 'N/A'} (${((allData.sleepStages[compareEpoch]?.Channels[signal.label]?.Confidence || 0) * 100).toFixed(0)}%)` : undefined },
            ];

            // const orderedKeys = [
            //     "eeg_sdelta", "eeg_fdelta", "eeg_theta", "eeg_alpha", "eeg_beta"
            // ];

            // const allKeys = new Set([...orderedKeys, ...Object.keys(sleepStage).filter(key => key.startsWith('eeg_'))]);

            // allKeys.forEach(key => {
            //     if (orderedKeys.includes(key) || !key.includes('p2') && !key.includes('c7') && !key.includes('eeg_at') && !key.includes('eeg_db') && !key.includes('eeg_ds') && !key.includes('eeg_dt') && !key.includes('eeg_hcomp') && !key.includes('eeg_hmob') && !key.includes('eeg_sigma') && !key.includes('eeg_std')) {
            //         const value = sleepStage[key as keyof ProcessedSleepStageEntryFeatures];
            //         if (typeof value === 'number') {
            //             const minMax = allData.sleepStageFeatureMinMax[key as keyof ProcessedSleepStageEntryFeatures];
            //             const color = getColorForValue(value, minMax.min, minMax.max);
            //             const compValue = compareEpoch !== null ? allData.sleepStages[compareEpoch][key as keyof ProcessedSleepStageEntryFeatures] : undefined;
            //             const compColor = compValue !== undefined ? getColorForValue(compValue as number, minMax.min, minMax.max) : undefined;
            //             const diffPercent = compValue !== undefined ? (((value - compValue) / compValue) * 100) : undefined;
            //             const v = key.includes("petrosian") ? value.toFixed(4) : key.includes("nzc") ? value.toFixed(0) : value.toFixed(2);
            //             const compV = compValue !== undefined ? (key.includes("petrosian") ? (compValue as number).toFixed(4) : key.includes("nzc") ? (compValue as number).toFixed(0) : (compValue as number).toFixed(2)) : undefined;
            //             content.push([key, v, color, compV, compColor, diffPercent]);
            //         }
            //     }
            // });

            const labelCanvas = createLabelCanvas(content, 400, (content.length + 1) * 15);

            return [
                [`epochInfo${epochIndex}`, {
                    type: 'label',
                    position: 'start',
                    xValue: epochStartSample + 1,
                    yValue: 100,
                    content: labelCanvas,
                    backgroundColor: 'rgba(255, 255, 255, 0)',
                    padding: { top: 5, left: 5 }
                }]
            ];
        }).flat()
    );
}

export function generateAnnotationsForLeft(
    allData: AllData,
    startEpochIndex: number,
    endEpochIndex: number,
    scrollPosition: number,
    samplesPerSecond: number,
    compareEpoch: number | null,
    signal: { label: string }
): LabelContent {
    if (!allData.sleepStages) {
        return [];
    }

    // return Array.from({ length: endEpochIndex - startEpochIndex }, (_, i) => {
    const epochIndex = startEpochIndex;
    const sleepStage = allData.sleepStages[epochIndex];
    const channelData = sleepStage?.Channels[signal.label];

    const content: LabelContent = [
        // { key: 'Epoch', value: `${epochIndex}`, compValue: compareEpoch !== null ? `${compareEpoch}` : undefined },
        // { key: 'Stage', value: `${channelData?.Stage || 'N/A'} (${((channelData?.Confidence || 0) * 100).toFixed(0)}%)`, compValue: compareEpoch !== null ? `${allData.sleepStages[compareEpoch]?.Channels[signal.label]?.Stage || 'N/A'} (${((allData.sleepStages[compareEpoch]?.Channels[signal.label]?.Confidence || 0) * 100).toFixed(0)}%)` : undefined },
    ];

    const orderedKeys = ["eeg_sdelta", "eeg_fdelta", "eeg_theta", "eeg_alpha", "eeg_beta"];
    const allKeys = new Set([...orderedKeys, ...Object.keys(channelData).filter(key => key.startsWith('eeg_'))]);

    allKeys.forEach(key => {
        if (orderedKeys.includes(key) || !key.includes('p2') && !key.includes('c7') && !key.includes('eeg_db') && !key.includes('eeg_ds') && !key.includes('eeg_dt') && !key.includes('eeg_hcomp') && !key.includes('eeg_hmob') && !key.includes('eeg_sigma') && !key.includes('eeg_std')) {
            const value = channelData[key as keyof ProcessedSleepStageEntryFeatures];
            console.log(signal.label, channelData, key, value);
            if (typeof value === 'number') {
                const minMax = allData.sleepStageFeatureMinMax[key as keyof ProcessedSleepStageEntryFeatures];
                const color = getColorForValue(value, minMax.min, minMax.max);
                const compValue = compareEpoch !== null ? allData.sleepStages[compareEpoch]?.Channels[signal.label][key as keyof ProcessedSleepStageEntryFeatures] : undefined;
                const compColor = compValue !== undefined ? getColorForValue(compValue as number, minMax.min, minMax.max) : undefined;
                console.log(key, minMax, value, allData.sleepStageFeatureMinMax, compValue, compColor);
                const diffPercent = compValue !== undefined ? (((value - compValue) / compValue) * 100) : undefined;
                const diffPercentColor = diffPercent !== undefined ? getColorForValue(diffPercent, -100, 100) : undefined;
                const v = key.includes("petrosian") ? value.toFixed(4) : key.includes("nzc") ? value.toFixed(0) : value.toFixed(2);
                const compV = compValue !== undefined ? (key.includes("petrosian") ? (compValue as number).toFixed(4) : key.includes("nzc") ? (compValue as number).toFixed(0) : (compValue as number).toFixed(2)) : undefined;
                content.push({ key, value: v, color, compValue: compV, compColor, diffPercent, diffPercentColor });
            }
        }
    });

    return content;
    // });
}