import { Temporal } from "@js-temporal/polyfill";
import { AllData, FeatureMinMax } from "../Loader/LoaderTypes";
import { EpochAnnotation } from "./EEGChartAnnotations";
import { SECONDS_PER_EPOCH } from "./EEGCharts";

export type KeyGroup = 'Relative bandpowers' | 'Relative bandpowers derived' | 'Absolute bandpowers' | 'Absolute bandpowers derived' | 'Power' | 'Derived' | 'Complexity' | 'Other' | 'Symmetry' | 'Frequency';

export type NormalizedValue = {
    // The normalized value, between minUsed and maxUsed
    normalizedValue?: number;

    // Usually P10 and P90
    minUsed?: number;
    minUsedLabel?: string;
    maxUsed?: number;
    maxUsedLabel?: string;

    // The real min and max values
    actualMax?: number;
    actualMin?: number;

    // The useful min and max values, which are the p10 and p90 values +/- a set amount
    usefulMax?: number;
    usefulMin?: number;
    
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
    // Handle edge cases to avoid division by zero or NaN
    if (min === max || isNaN(value) || isNaN(min) || isNaN(max)) {
        return `rgb(68, 1, 84)`;  // Return the first color of viridis
    }
    
    // Clamp the normalized value between 0 and 1
    let normalizedValue = (value - min) / (max - min);
    
    // Check for NaN or invalid values and provide a default
    if (isNaN(normalizedValue) || !isFinite(normalizedValue)) {
        normalizedValue = 0;
    } else {
        normalizedValue = Math.max(0, Math.min(1, normalizedValue));
    }
    
    // Viridis palette RGB values at different positions
    const viridisColors = [
        [68, 1, 84],     // Position 0.0
        [72, 33, 115],   // Position 0.1
        [64, 67, 135],   // Position 0.2
        [52, 94, 141],   // Position 0.3
        [41, 120, 142],  // Position 0.4
        [32, 144, 140],  // Position 0.5
        [34, 167, 132],  // Position 0.6
        [68, 190, 112],  // Position 0.7
        [121, 209, 81],  // Position 0.8
        [189, 222, 38],  // Position 0.9
        [253, 231, 36]   // Position 1.0
    ];
    
    // Calculate the position in the color array
    const position = normalizedValue * (viridisColors.length - 1);
    const index = Math.floor(position);
    
    // Safety check to ensure index is valid and within bounds
    let safeIndex = 0;
    if (!isNaN(index) && isFinite(index)) {
        safeIndex = Math.max(0, Math.min(viridisColors.length - 1, index));
    }
    
    // If we're at the last color or beyond, return the last color
    if (safeIndex >= viridisColors.length - 1) {
        const [r, g, b] = viridisColors[viridisColors.length - 1];
        return `rgb(${r}, ${g}, ${b})`;
    }
    
    // Get the two colors to interpolate between
    const [r1, g1, b1] = viridisColors[safeIndex];
    const [r2, g2, b2] = viridisColors[safeIndex + 1];
    
    // Calculate the interpolation fraction
    const fraction = !isNaN(position) && isFinite(position) ? position - safeIndex : 0;
    
    // Interpolate between the two closest colors
    const r = Math.round(r1 + fraction * (r2 - r1));
    const g = Math.round(g1 + fraction * (g2 - g1));
    const b = Math.round(b1 + fraction * (b2 - b1));
    
    return `rgb(${r}, ${g}, ${b})`;
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

export function sampleToEpoch(allData: AllData, index: number): number {
    const samplingRate = allData.processedEDF.signals[0].samplingRate;
    return Math.floor(index / (SECONDS_PER_EPOCH * samplingRate));
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
                    count: 10,
                    maxTicksLimit: 10,
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

// Fast timestamp formatter - avoids expensive toLocaleString()
const timestampCache = new Map<number, string>();

export function formatTimestampFast(timestamp: number): string {
    // Check cache first
    const cached = timestampCache.get(timestamp);
    if (cached) return cached;
    
    // Create date and format quickly
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const result = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    
    // Cache the result
    timestampCache.set(timestamp, result);
    
    // Limit cache size to prevent memory issues
    if (timestampCache.size > 10000) {
        // Remove oldest entries
        const entriesToRemove = Array.from(timestampCache.keys()).slice(0, 5000);
        entriesToRemove.forEach(key => timestampCache.delete(key));
    }
    
    return result;
}

// Pre-compute formatted strings for video/audio files
export function precomputeFormattedTimestamps<T extends { timestamp: number; formattedTime?: string }>(
    items: T[]
): T[] {
    return items.map(item => ({
        ...item,
        formattedTime: formatTimestampFast(item.timestamp)
    }));
}

