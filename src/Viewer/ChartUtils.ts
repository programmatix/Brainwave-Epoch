import { Temporal } from "@js-temporal/polyfill";
import { AllData, FeatureMinMax } from "../Loader/LoaderTypes";

export type LabelContentItem = {
    key: string;
    value: string | number;
    color?: string;
    compValue?: string | number;
    compColor?: string;
    diffPercent?: number;
    diffPercentColor?: string;
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

export function createLabelCanvas(content: LabelContent, width: number, height: number): HTMLCanvasElement {
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
    content.forEach(({ key, value, color, compValue, compColor, diffPercent, diffPercentColor }) => {
        ctx.fillStyle = 'black';
        ctx.fillText(key, 5, y);

        ctx.fillStyle = color || 'black';
        ctx.fillText(value.toString(), keyWidth + 10, y);

        if (compValue !== undefined) {
            ctx.fillStyle = compColor || 'black';
            ctx.fillText(`vs ${compValue.toString()}`, keyWidth + 100, y);
        }

        if (diffPercent !== undefined) {
            ctx.fillStyle = diffPercentColor || 'black';
            ctx.fillText(diffPercent.toFixed(0) + '%', keyWidth + 200, y);
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

    console.log(`totalSeconds`, totalSeconds, `minutes`, minutes, `seconds`, seconds, `milliseconds`, milliseconds, `index`, index, `samplingRate`, samplingRate, `startDate`, allData.processedEDF.startDate);

    return allData.processedEDF.startDate.add({ minutes, seconds, milliseconds });
}

