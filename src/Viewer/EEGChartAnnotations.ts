import { AllData, ChannelData, ProcessedSleepStageEntryFeatures } from '../Loader/LoaderTypes';
import { getColorForValue, createLabelCanvas, LabelContent, getColorForValueFromMinMax, KeyGroup } from './ChartUtils';

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
                { key: 'SettlingScorePrediction', value: `${sleepStage?.SettlingScorePrediction?.toFixed(2) || 'N/A'}`, compValue: compareEpoch !== null ? `${allData.sleepStages[compareEpoch]?.SettlingScorePrediction || 'N/A'}` : undefined },
                { key: 'SettlingV4ScorePrediction', value: `${sleepStage?.SettlingV4ScorePrediction?.toFixed(2) || 'N/A'}`, compValue: compareEpoch !== null ? `${allData.sleepStages[compareEpoch]?.SettlingV4ScorePrediction || 'N/A'}` : undefined },
                { key: 'SettlingTiredVsWiredPrediction', value: `${sleepStage?.SettlingTiredVsWiredPrediction?.toFixed(2) || 'N/A'}`, compValue: compareEpoch !== null ? `${allData.sleepStages[compareEpoch]?.SettlingTiredVsWiredPrediction?.toFixed(2) || 'N/A'}` : undefined },
                { key: 'SettlingManualScore', value: `${sleepStage?.SettlingManualScore?.toFixed(2) || 'N/A'}`, compValue: compareEpoch !== null ? `${allData.sleepStages[compareEpoch]?.SettlingManualScore?.toFixed(2) || 'N/A'}` : undefined },  
                { key: 'SettlingEventVersion', value: `${sleepStage?.SettlingEventVersion || 'N/A'}`, compValue: compareEpoch !== null ? `${allData.sleepStages[compareEpoch]?.SettlingEventVersion || 'N/A'}` : undefined },  
            ];

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

export function getOrderedKeys(channelData: any): string[] {
    if (!channelData) {
        return [];
    }

    const orderedKeys = ["eeg_sdelta", "eeg_fdelta", "eeg_theta", "eeg_alpha", "eeg_sigma", "eeg_beta",
        "eeg_sdeltaabs", "eeg_fdeltaabs", "eeg_thetaabs", "eeg_alphaabs", "eeg_betaabs",
        "eeg_sdeltaabs_s", "eeg_fdeltaabs_s", "eeg_thetaabs_s", "eeg_alphaabs_s", "eeg_betaabs_s",
        "eeg_sdelta_s", "eeg_fdelta_s", "eeg_theta_s", "eeg_alpha_s", "eeg_beta_s",
        "eeg_sdelta_s", "eeg_fdelta_s", "eeg_theta_s", "eeg_alpha_s", "eeg_beta_s",
        "eeg_fdeltaab", "eeg_thetaab", "eeg_alphaab", "eeg_betaab", "eeg_fdeltaaa", "eeg_thetaaa", "eeg_alphaaa", "eeg_betaaa",
        "eeg_fdeltaab_s", "eeg_thetaab_s", "eeg_alphaab_s", "eeg_betaab_s", "eeg_fdeltaaa_s", "eeg_thetaaa_s", "eeg_alphaaa_s", "eeg_betaaa_s"
    ];
    const allKeys = new Set([...orderedKeys, ...Object.keys(channelData).filter(key => key.includes('eeg_'))]);

    const out = Array.from(allKeys).filter(key =>
        !key.includes('p2') &&
        !key.includes('c7') &&
        !key.includes('eeg_db') &&
        !key.includes('eeg_ds') &&
        !key.includes('eeg_dt') &&
        !key.includes('eeg_hcomp') &&
        !key.includes('eeg_hmob') &&
        !key.includes('eeg_sigma') &&
        !key.includes('eeg_std')
    );

    return out;
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
        { key: 'Stage', value: `${channelData?.Stage || 'N/A'} (${((channelData?.Confidence || 0) * 100).toFixed(0)}%)`, compValue: compareEpoch !== null ? `${allData.sleepStages[compareEpoch]?.Channels[signal.label]?.Stage || 'N/A'} (${((allData.sleepStages[compareEpoch]?.Channels[signal.label]?.Confidence || 0) * 100).toFixed(0)}%)` : undefined },
    ];

    const orderedKeys = getOrderedKeys(channelData);

    orderedKeys.filter(key => key.includes('eeg_')).forEach(key => {
        const value = channelData[key as keyof ProcessedSleepStageEntryFeatures];
        if (typeof value === 'number') {
            const minMax = allData.sleepStageFeatureMinMax[key as keyof ProcessedSleepStageEntryFeatures];
            const color = getColorForValueFromMinMax(value, minMax);
            const compValue = compareEpoch !== null ? allData.sleepStages[compareEpoch]?.Channels[signal.label][key as keyof ProcessedSleepStageEntryFeatures] : undefined;
            const compColor = compValue !== undefined ? getColorForValueFromMinMax(compValue as number, minMax) : undefined;
            const diffPercent = compValue !== undefined ? (((value - compValue) / compValue) * 100) : undefined;
            const diffPercentColor = diffPercent !== undefined ? getColorForValue(diffPercent, -100, 100) : undefined;
            // const v = key.includes("petrosian") ? value.toFixed(4) : key.includes("nzc") ? value.toFixed(0) : value.toFixed(2);
            const compV = compValue !== undefined ? (key.includes("petrosian") ? (compValue as number).toFixed(4) : key.includes("nzc") ? (compValue as number).toFixed(0) : (compValue as number).toFixed(2)) : undefined;
            const group = groupKey(key);
            content.push({
                key,
                value: value,
                normalizedValue: ((value - minMax.p10) / (minMax.p90 - minMax.p10)),
                color,
                compValue: compV,
                compColor,
                diffPercent,
                diffPercentColor,
                minUsed: minMax.p10,
                minUsedLabel: '10%',
                maxUsed: minMax.p90,
                maxUsedLabel: '90%',
                actualMin: minMax.min,
                actualMax: minMax.max,
                keyGroup: group.keyGroup,
                scaled: group.scaled,
                mostUseful: group.mostUseful
            });
        }
    })

    return content;
    // });
}

function groupKey(key: string): { keyGroup: KeyGroup, scaled: boolean, mostUseful: boolean } {
    const scaled = key.endsWith("_s");

    if (key.includes('eeg_sdeltaabs') || key.includes('eeg_fdeltaabs') || key.includes('eeg_thetaabs') || key.includes('eeg_alphaabs') || key.includes('eeg_betaabs')) {
        if (key.includes('absab') || key.includes('absaa')) {
            return { keyGroup: 'Absolute bandpowers derived', scaled, mostUseful: false };
        }
        return { keyGroup: 'Absolute bandpowers', scaled, mostUseful: false };
    }
    if (key.includes('eeg_sdelta') || key.includes('eeg_fdelta') || key.includes('eeg_theta') || key.includes('eeg_alpha') || key.includes('eeg_beta')) {
        if (key.includes('ab') || key.includes('aa')) {
            return { keyGroup: 'Relative bandpowers derived', scaled, mostUseful: false };
        }
        return { keyGroup: 'Relative bandpowers', scaled, mostUseful: true };
    }
    if (key.includes('petrosian') || key.includes('nzc') || key.includes('perm') || key.includes('perment') || key.includes('specent') || key.includes('svdent') || key.includes('higuchi')) {
        const mostUseful = key.includes("petrosian")
        return { keyGroup: 'Complexity', scaled, mostUseful };
    }
    if ( key.includes('skew')) {
        return { keyGroup: 'Symmetry', scaled, mostUseful: false };
    }
    if (key.includes('iqr') || key.includes('auc') || key.includes('abspow')) {
        const mostUseful = key.includes("iqr")
        return { keyGroup: 'Power', scaled, mostUseful };
    }
    if (key.includes('at')) {
        return { keyGroup: 'Derived', scaled, mostUseful: false };
    }

    return { keyGroup: 'Other', scaled, mostUseful: false };
}

export function getFirstNonAggregatedChannel(allData: AllData): ChannelData {
    const channels = Object.keys(allData.sleepStages?.[0]?.Channels || {});
    const firstChannel = channels.find(channel => !channel.includes('Aggregated'))
    return allData.sleepStages?.[0]?.Channels[firstChannel];
}
