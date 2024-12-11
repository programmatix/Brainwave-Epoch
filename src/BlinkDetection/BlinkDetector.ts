export interface BlinkPeak {
    peakIdx: number;
    peakValue: number; 
    blinkLength: number;
}

function groupCrossings(crossings: number[], fs: number, maxDuration: number = 0.1): number[][] {
    if (crossings.length === 0) return [];
    
    const events: number[][] = [];
    let currentEvent = [crossings[0]];
    const maxGap = Math.floor(fs * maxDuration);

    for (let i = 1; i < crossings.length; i++) {
        if (crossings[i] - crossings[i-1] <= maxGap) {
            currentEvent.push(crossings[i]);
        } else {
            events.push([...currentEvent]);
            currentEvent = [crossings[i]];
        }
    }

    if (currentEvent.length > 0) {
        events.push(currentEvent);
    }

    return events;
}

function extractBlinkPeaks(eegData: number[], blinks: number[][]): BlinkPeak[] {
    return blinks.map(blink => {
        const blinkData = blink.map(idx => eegData[idx]);
        const minValue = Math.min(...blinkData);
        const minIndex = blinkData.indexOf(minValue);
        
        return {
            peakIdx: blink[minIndex],
            peakValue: minValue,
            blinkLength: blink.length
        };
    });
}

export function detectBlinks(
    eegData: number[], 
    fs: number,
    threshold: number = -75,
    maxDuration: number = 0.3
): BlinkPeak[] {
    const crossings = eegData
        .map((val, idx) => val < threshold ? idx : -1)
        .filter(idx => idx !== -1);

    const blinksRaw = groupCrossings(crossings, fs, maxDuration);
    return extractBlinkPeaks(eegData, blinksRaw);
}