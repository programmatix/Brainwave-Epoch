import { Temporal } from "@js-temporal/polyfill";
import { AllData, FeatureMinMax } from "../Loader/LoaderTypes";
import { EpochAnnotation } from "./EEGChartAnnotations";

export type KeyGroup = 'Relative bandpowers' | 'Relative bandpowers derived' | 'Absolute bandpowers' | 'Absolute bandpowers derived' | 'Power' | 'Derived' | 'Complexity' | 'Other' | 'Symmetry' | 'Frequency';

export type NormalizedValue = {
    // The normalized value, between minUsed and maxUsed
    normalizedValue?: number;

    // Usually P10 and P90
    minUsed?: number;
    minUsedLabel?: string;
    maxUsed?: number;
    maxUsedLabel?: string;

    actualMax?: number;
    actualMin?: number;

    color?: string;
}

export type LabelContentItem = {
    channel: string,
    currentEpoch: number,
    currentEpochStage: string,

    key: string;
    // The actual value, not normalized
    value: number;
    // The _s values, e.g. eeg_sdelta_s
    scaledValue?: number;

    normalizedAgainst: {
        forLocalFile: {
            All: NormalizedValue;
            Sleep: NormalizedValue;
            NonDeepSleep: NormalizedValue;
            W: NormalizedValue;
            N1: NormalizedValue;
            N2: NormalizedValue;
            N3: NormalizedValue;
            R: NormalizedValue;
        };
        // Looking at min-max values from stats.csv e.g. all files
        forAllStats: {
            All: NormalizedValue;
            Sleep: NormalizedValue;
            NonDeepSleep: NormalizedValue;
            W: NormalizedValue;
            N1: NormalizedValue;
            N2: NormalizedValue;
            N3: NormalizedValue;
            R: NormalizedValue;
        };
    }

    compValue?: string | number;
    compColor?: string;
    diffPercent?: number;
    diffPercentColor?: string;
    keyGroup?: KeyGroup;
    scaled?: boolean;
    mostUseful?: boolean;
};

export type LabelContent = LabelContentItem[];

export function getColorForValue(value: number, min: number, max: number): string {
    const normalizedValue = (value - min) / (max - min);
    const hue = normalizedValue * 120; // 0 (red) to 120 (green)
    return `hsl(${hue}, 100%, 50%)`;
}

export function getColorForValueFromMinMax(value: number, minMax: FeatureMinMax): string {
    return getColorForValue(value, minMax.p10, minMax.p90);
}

export function createLabelCanvas(content: EpochAnnotation[], width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    ctx.clearRect(0, 0, width, height);
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Find the maximum width of the keys for alignment
    const keyWidth = Math.max(...content.map(({ key }) => ctx.measureText(key + ':').width));

    let y = 5;
    content.forEach(({ key, value, compValue }) => {
        ctx.fillStyle = 'black';
        ctx.fillText(key, 5, y);

        ctx.fillStyle = 'black';
        ctx.fillText(value.toString(), keyWidth + 10, y);

        if (compValue !== undefined) {
            ctx.fillStyle = 'black';
            ctx.fillText(`vs ${compValue.toString()}`, keyWidth + 100, y);
        }

        y += 15;
    });

    return canvas;
}

export function sampleIndexToTime(allData: AllData, index: number): Temporal.ZonedDateTime {
    const samplingRate = allData.processedEDF.signals[0].samplingRate;
    const totalSeconds = index / samplingRate;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((totalSeconds % 1) * 1000);

    //console.log(`totalSeconds`, totalSeconds, `minutes`, minutes, `seconds`, seconds, `milliseconds`, milliseconds, `index`, index, `samplingRate`, samplingRate, `startDate`, allData.processedEDF.startDate);

    return allData.processedEDF.startDate.add({ minutes, seconds, milliseconds });
}

export const millisecondsToSamples = (milliseconds: number, samplesPerSecond: number) => {
    //console.log(`milliseconds`, milliseconds, `samplesPerSecond`, samplesPerSecond, `samples`, Math.floor(milliseconds * samplesPerSecond / 1000))
    return Math.floor(milliseconds * samplesPerSecond / 1000);
};

export function eegChartOptions(title: string, allData: AllData, scrollPosition: number) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                title: { display: false },
                ticks: {
                    maxTicksLimit: 10,
                    callback: (value, index, ticks) => {
                        return allData.processedEDF.signals[0].timeLabels[scrollPosition + index]?.formatted
                    }
                },
                grid: {
                    display: true
                }
            },
            y: {
                title: { display: true, text: title },
                position: 'left',
                // grid: {
                //     color: 'rgba(0, 0, 0, 0.1)'
                // }
            }
        },
        layout: {
            padding: {
                left: 37,
                right: 10
            }
        },
        animation: false,
        plugins: {
            legend: { display: false },
        }
    }
}

