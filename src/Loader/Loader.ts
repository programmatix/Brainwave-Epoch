import { Temporal } from '@js-temporal/polyfill';
import { parse } from 'csv-parse/sync';
import { promises as fs } from 'fs';
import { AllData, EDFData, EDFHeader, EDFSignal, FitbitHypnogram, GroupedSlowWaveEvents, GroupedSpindleEvents, NightEvents, ProcessedEDFData, ProcessedSleepStageEntry, ProcessedSleepStages, SignalData, SlowWaveEvents, SpindleEvents, TimeLabel, SleepStageFeatureMinMax, ProcessedSleepStageEntryFeatures, ChannelData, Scorings, ScoringEntry, ScoringTag, Mark, Microwaking, Microwakings } from './LoaderTypes';


import { EventEmitter } from 'events';
import { loadVideos } from '../Videos/Videos';

export const loaderEvents = new EventEmitter();

export async function readEDFPlus(filePath: string): Promise<EDFData> {
    const buffer = await fs.readFile(filePath);
    let offset = 0;

    const header: EDFHeader = {
        version: buffer.toString('ascii', 0, 8).trim(),
        patientID: buffer.toString('ascii', 8, 88).trim(),
        recordID: buffer.toString('ascii', 88, 168).trim(),
        startDate: parseDateString(buffer.toString('ascii', 168, 184).trim()),
        bytesInHeader: parseInt(buffer.toString('ascii', 184, 192)),
        reserved: buffer.toString('ascii', 192, 236),
        numDataRecords: parseInt(buffer.toString('ascii', 236, 244)),
        durationOfDataRecord: parseFloat(buffer.toString('ascii', 244, 252)),
        numSignals: parseInt(buffer.toString('ascii', 252, 256))
    };

    const signals: EDFSignal[] = [];
    const numSignals = header.numSignals;

    // Parse labels
    for (let i = 0; i < numSignals; i++) {
        signals.push({ label: buffer.toString('ascii', 256 + i * 16, 256 + (i + 1) * 16).trim() } as EDFSignal);
    }
    offset = 256 + numSignals * 16;

    // Parse other signal properties
    const properties = ['transducerType', 'physicalDimension', 'physicalMin', 'physicalMax', 'digitalMin', 'digitalMax', 'prefiltering', 'numSamplesPerDataRecord', 'reserved'];
    const lengths = [80, 8, 8, 8, 8, 8, 80, 8, 32];

    for (const [index, prop] of properties.entries()) {
        for (let i = 0; i < numSignals; i++) {
            const value = buffer.toString('ascii', offset, offset + lengths[index]).trim();
            signals[i][prop] = ['physicalMin', 'physicalMax', 'digitalMin', 'digitalMax', 'numSamplesPerDataRecord'].includes(prop)
                ? parseFloat(value)
                : value;
            offset += lengths[index];
        }
    }

    offset = header.bytesInHeader;

    const records: number[][] = Array(header.numSignals).fill(null).map(() => []);
    const dataView = new DataView(buffer.buffer);

    for (let r = 0; r < header.numDataRecords; r++) {
        for (let ns = 0; ns < header.numSignals; ns++) {
            const signalNbSamples = signals[ns].numSamplesPerDataRecord;
            const rawSignal = new Int16Array(signalNbSamples);

            for (let i = 0; i < signalNbSamples; i++) {
                rawSignal[i] = dataView.getInt16(offset, true);
                offset += 2;
            }

            const digitalSignalRange = signals[ns].digitalMax - signals[ns].digitalMin;
            const physicalSignalRange = signals[ns].physicalMax - signals[ns].physicalMin;

            for (let i = 0; i < signalNbSamples; i++) {
                const physicalSample =
                    (((rawSignal[i] - signals[ns].digitalMin) / digitalSignalRange) * physicalSignalRange)
                    + signals[ns].physicalMin;
                records[ns].push(physicalSample);
            }
        }
    }

    return { filePath, header, signals, records };
}

export async function readSleepStages(filePath: string): Promise<ProcessedSleepStages | undefined> {
    try {
        console.time('readSleepStages');
        const sleepStagesData = await fs.readFile(filePath, 'utf8');
        console.timeLog('readSleepStages', 'File read');

        const parsedSleepStages: any[] = parse(sleepStagesData, {
            columns: true,
            skip_empty_lines: true
        });
        console.timeLog('readSleepStages', 'CSV parsed');

        const getChannelNames = (stage: any): string[] => {
            return [...new Set(Object.keys(stage)
                .filter(key => key.includes('-M1_'))
                .map(key => key.split('_')[0]))];
        };

        const getChannelData = (stage: any, channel: string): ChannelData => {
            return Object.keys(stage)
                .filter(key => key.startsWith(channel))
                .reduce((data, key) => {
                    const feature = key.replace(`${channel}_`, '');
                    if (feature === 'Stage') {
                        data[feature] = stage[key];
                    } else {
                        data[feature] = parseFloat(stage[key]);
                    }
                    return data;
                }, {} as ChannelData);
        };

        const result = parsedSleepStages.map(stage => {
            const [datePart, timePart] = stage.Timestamp.split(' ');
            const [timeWithNanos, offset] = timePart.split('+');
            const [time, nanos] = timeWithNanos.split('.');
            const [year, month, day] = datePart.split('-');
            const [hour, minute, second] = time.split(':');

            const timestamp = Temporal.ZonedDateTime.from({
                year: parseInt(year),
                month: parseInt(month),
                day: parseInt(day),
                hour: parseInt(hour),
                minute: parseInt(minute),
                second: parseInt(second),
                nanosecond: parseInt(nanos || '0'),
                timeZone: Temporal.TimeZone.from(`+${offset}`)
            });

            const channels = {
                "Aggregated": {
                    Confidence: parseFloat(stage.Confidence),
                    Stage: stage.Stage,
                    Source: stage.Source
                },
                ...getChannelNames(stage).reduce((acc, channel) => {
                    acc[channel] = getChannelData(stage, channel);
                    return acc;
                }, {} as { [key: string]: ChannelData })
            };

            const processed: ProcessedSleepStageEntry = {
                Epoch: parseInt(stage.Epoch),
                Timestamp: timestamp,
                Stage: stage.Stage,
                Confidence: parseFloat(stage.Confidence),
                Source: stage.Source,
                StageInt: parseInt(stage.StageInt),
                Channels: channels,
                ManualStage: stage.ManualStage,
                DefinitelyAwake: stage.DefinitelyAwake === 'True',
                DefinitelySleep: stage.DefinitelySleep === 'True',
                ProbablySleep: stage.ProbablySleep === 'True',
                PredictedAwake: parseFloat(stage.PredictedAwake),
                PredictedAwakeBinary: parseInt(stage.PredictedAwakeBinary),
                Predictions_has_microwaking_start: parseFloat(stage.Predictions_has_microwaking_start),
                Predictions_has_microwaking_end: parseFloat(stage.Predictions_has_microwaking_end),
                Predictions_Ambiguous_Deep: parseFloat(stage["Predictions_Ambiguous Deep"]),
                Predictions_Deep: parseFloat(stage.Predictions_Deep),
                Predictions_Non_Deep: parseFloat(stage["Predictions_Non-Deep"]),
                Predictions_Unsure: parseFloat(stage.Predictions_Unsure),
                Predictions_Wake: parseFloat(stage.Predictions_Wake),
                Predictions_AnyDeep: parseFloat(stage.Predictions_AnyDeep),
                Predictions_Noise: parseFloat(stage.Predictions_Noise)
            };

            return processed;
        });

        console.timeEnd('readSleepStages');
        return result;
    } catch (error) {
        console.error(`Error reading SleepStages file: ${error.message}`);
        return undefined;
    }
}


export const parseDateString = (dateStr: string): Temporal.ZonedDateTime => {
    if (dateStr.includes('-')) {
        if (dateStr.includes('T')) {
            // Handle 2024-08-26T19:56:15.123Z format
            const [datePart, timePart] = dateStr.split('T');
            const [year, month, day] = datePart.split('-');
            const [time, offset] = timePart.split('Z');
            const [hourMinuteSecond, millisecond] = time.split('.');
            const [hour, minute, second] = hourMinuteSecond.split(':');

            return Temporal.ZonedDateTime.from({
                year: parseInt(year),
                month: parseInt(month),
                day: parseInt(day),
                hour: parseInt(hour),
                minute: parseInt(minute),
                second: parseInt(second),
                millisecond: parseInt(millisecond || '0'),
                timeZone: "UTC"
            });
        } else {
            // Handle existing 2024-08-26 21:10:07.764000+01:00 format
            const [datePart, timePart] = dateStr.split(' ');
            const [year, month, day] = datePart.split('-');
            const [time, offset] = timePart.split('+');
            const [hour, minute, second] = time.split(':');
            const [secondPart, millisecond] = second.split('.');

            return Temporal.ZonedDateTime.from({
                year: parseInt(year),
                month: parseInt(month),
                day: parseInt(day),
                hour: parseInt(hour),
                minute: parseInt(minute),
                second: parseInt(secondPart),
                millisecond: parseInt(millisecond?.slice(0, 3) || '0'),
                timeZone: Temporal.TimeZone.from(`+${offset}`)
            });
        }
    }

    // Handle existing DD.MM.YYHH.MM.SS format
    const [day, month, yearAndHour, minute, second] = dateStr.split('.');
    const year = yearAndHour.slice(0, 2);
    const hour = yearAndHour.slice(2);
    return Temporal.ZonedDateTime.from({
        year: 2000 + parseInt(year),
        month: parseInt(month),
        day: parseInt(day),
        hour: parseInt(hour),
        minute: parseInt(minute),
        second: parseInt(second),
        timeZone: "UTC"
    });
};

export function setupFileMenu(onFileLoad: (filePath: string) => Promise<void>) {
    const menu = new window.nw.Menu({ type: 'menubar' });
    const fileMenu = new window.nw.Menu();

    fileMenu.append(new window.nw.MenuItem({
        label: 'Open EDF File',
        click: () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.edf';
            fileInput.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                console.log('File:', file);
                if (file) {
                    await onFileLoad((file as any).path);
                }
            };
            fileInput.click();
        }
    }));

    menu.append(new window.nw.MenuItem({
        label: 'File',
        submenu: fileMenu
    }));

    window.nw.Window.get().menu = menu;
}

export async function readScorings(filePath: string): Promise<{scorings: Scorings, marks: Mark[]} | undefined> {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        const json = JSON.parse(data);
        return {
            scorings: json.scorings || [],
            marks: json.marks || []
        }
    } catch (error) {
        console.error(`Error reading Scorings file: ${error.message}`);
        return {scorings: [], marks: []};
    }
}

export async function loadFiles(edfPath: string): Promise<AllData> {
    const start = performance.now();
    loaderEvents.emit('log', `${new Date().toISOString()}: Starting to load files`);

    const sleepStagesPath = edfPath.replace('.edf', '.with_features.csv');
    const slowWaveEventsPath = edfPath.replace('.edf', '.sw_summary.csv');
    const nightEventsPath = edfPath.replace('.edf', '.night_events.csv');
    const fitbitHypnogramPath = edfPath.replace('.edf', '.fitbit_hypnogram.csv');
    const spindleEventsPath = edfPath.replace('.edf', '.spindle_summary.csv');
    const scoringsPath = edfPath.replace('.edf', '.scorings.json');
    const microwakingsPath = edfPath.replace('.edf', '.microwakings.csv');

    const [processedStages, raw, slowWaveEvents, nightEvents, fitbitHypnogram, spindleEvents, scorings, microwakings] = await Promise.all([
        readSleepStages(sleepStagesPath),
        readEDFPlus(edfPath),
        readSlowWaveEvents(slowWaveEventsPath),
        readNightEvents(nightEventsPath),
        readFitbitHypnogram(fitbitHypnogramPath),
        readSpindleEvents(spindleEventsPath),
        readScorings(scoringsPath),
        readMicrowakings(microwakingsPath)
    ]);

    loaderEvents.emit('log', `${new Date().toISOString()}: Processing EDF data...`);
    const processStart = performance.now();
    const processedEDF = await processEDFData(raw);
    const processEnd = performance.now();
    loaderEvents.emit('log', `${new Date().toISOString()}: EDF data processed in ${(processEnd - processStart).toFixed(2)}ms`);

    const end = performance.now();
    loaderEvents.emit('log', `${new Date().toISOString()}: All files loaded and processed in ${(end - start).toFixed(2)}ms`);

    const sleepStageFeatureMinMax = calculateSleepStageFeatureMinMax(processedStages);

    const videos = await loadVideos(processedEDF.startDate, processedEDF.duration);

    const allData: AllData = {
        processedEDF,
        sleepStages: processedStages,
        slowWaveEvents,
        nightEvents,
        fitbitHypnogram,
        spindleEvents,
        predictedAwakeTimeline: processedStages,
        definiteAwakeSleepTimeline: processedStages,
        sleepStageFeatureMinMax,
        scorings: scorings.scorings,
        marks: scorings.marks,
        microwakings,
        videos
    };

    return allData;
}

export async function readSlowWaveEvents(filePath: string): Promise<GroupedSlowWaveEvents | undefined> {
    try {
        console.time('readSlowWaveEvents');
        const data = await fs.readFile(filePath, 'utf8');
        const parsedData: SlowWaveEvents = parse(data, {
            columns: true,
            skip_empty_lines: true,
            cast: true
        });
        const groupedEvents = parsedData.reduce((acc, event) => {
            if (!acc[event.Channel]) {
                acc[event.Channel] = [];
            }
            acc[event.Channel].push(event);
            return acc;
        }, {} as GroupedSlowWaveEvents);
        console.timeEnd('readSlowWaveEvents');
        return groupedEvents;
    } catch (error) {
        console.error(`Error reading SlowWaveEvents file: ${error.message}`);
        return undefined;
    }
}

export async function readNightEvents(filePath: string): Promise<NightEvents | undefined> {
    try {
        console.time('readNightEvents');
        const data = await fs.readFile(filePath, 'utf8');
        const parsedData = parse(data, {
            columns: true,
            skip_empty_lines: true
        });
        const nightEvents: NightEvents = parsedData.map(event => ({
            ...event,
            timestamp: parseDateString(event.timestamp_uk),
            source: event.source,
            durationSecs: parseFloat(event.duration_secs)
        }));
        console.timeEnd('readNightEvents');
        return nightEvents;
    } catch (error) {
        console.error(`Error reading NightEvents file: ${error.message}`);
        return undefined;
    }
}

export async function readFitbitHypnogram(filePath: string): Promise<FitbitHypnogram | undefined> {
    try {
        console.time('readFitbitHypnogram');
        const data = await fs.readFile(filePath, 'utf8');
        const parsedData = parse(data, {
            columns: true,
            skip_empty_lines: true
        });

        const fitbitHypnogram: FitbitHypnogram = parsedData.map((entry: any) => ({
            startTime: parseDateString(entry.startTime),
            state: entry.state,
            endTime: parseDateString(entry.endTime)
        }));
        console.timeEnd('readFitbitHypnogram');
        return fitbitHypnogram;
    } catch (error) {
        console.error(`Error reading FitbitHypnogram file: ${error.message}`);
        return undefined;
    }
}

export async function readSpindleEvents(filePath: string): Promise<GroupedSpindleEvents | undefined> {
    try {
        console.time('readSpindleEvents');
        const data = await fs.readFile(filePath, 'utf8');
        const parsedData: SpindleEvents = parse(data, {
            columns: true,
            skip_empty_lines: true,
            cast: true
        });
        const groupedEvents = parsedData.reduce((acc, event) => {
            if (!acc[event.Channel]) {
                acc[event.Channel] = [];
            }
            acc[event.Channel].push(event);
            return acc;
        }, {} as GroupedSpindleEvents);
        console.timeEnd('readSpindleEvents');
        return groupedEvents;
    } catch (error) {
        console.error(`Error reading SpindleEvents file: ${error.message}`);
        return undefined;
    }
}

export async function readMicrowakings(filePath: string): Promise<Microwakings | undefined> {
    try {
        console.time('readMicrowakings');
        const data = await fs.readFile(filePath, 'utf8');
        const parsedData = parse(data, {
            columns: true,
            skip_empty_lines: true
        });

        const microwakings: Microwakings = parsedData.map((entry: any) => ({
            Start: parseDateString(entry.Start),
            End: parseDateString(entry.End)
        }));
        console.timeEnd('readMicrowakings');
        return microwakings;
    } catch (error) {
        console.error(`Error reading Microwakings file: ${error.message}`);
        return undefined;
    }
}

export function processEDFData(edfData: EDFData): ProcessedEDFData {
    const { header, signals, records } = edfData;

    const processedSignals: SignalData[] = signals.map(signal => {
        const samplingRate = signal.numSamplesPerDataRecord / header.durationOfDataRecord;
        const totalSamples = signal.numSamplesPerDataRecord * header.numDataRecords;

        console.time('processEDFData for ' + signal.label);

        const timeLabels: TimeLabel[] = [];

        const padZero = (num: number) => num.toString().padStart(2, '0');
        const startTime = new Date(Date.UTC(header.startDate.year, header.startDate.month - 1, header.startDate.day,
            header.startDate.hour, header.startDate.minute, header.startDate.second,
            header.startDate.millisecond)).getTime();
        
        // Pre-calculate the offset once
        const offsetMilliseconds = new Date().getTimezoneOffset() * 60000;
        
        for (let i = 0; i < totalSamples; i++) {
            const milliseconds = Math.round(i / samplingRate * 1000);
            const currentTime = new Date(startTime + milliseconds - offsetMilliseconds);
        
            const formattedTime = `${padZero(currentTime.getUTCHours())}:${padZero(currentTime.getUTCMinutes())}:${padZero(currentTime.getUTCSeconds())}`;
        
            timeLabels.push({
                timestamp: startTime + milliseconds,
                formatted: formattedTime
            });
        }
        console.timeEnd('processEDFData for ' + signal.label);

        return {
            label: signal.label,
            transducerType: signal.transducerType,
            physicalDimension: signal.physicalDimension,
            physicalMin: signal.physicalMin,
            physicalMax: signal.physicalMax,
            digitalMin: signal.digitalMin,
            digitalMax: signal.digitalMax,
            prefiltering: signal.prefiltering,
            samplingRate,
            samples: [],
            timeLabels
        };
    });

    let sampleIndex = 0;
    for (let i = 0; i < signals.length; i++) {
        const totalSamples = signals[i].numSamplesPerDataRecord * header.numDataRecords;
        processedSignals[i].samples = records.flat().slice(sampleIndex, sampleIndex + totalSamples);
        sampleIndex += totalSamples;
    }

    return {
        filePath: edfData.filePath,
        filePathWithoutExtension: edfData.filePath.replace(/\.edf$/, ''),
        startDate: header.startDate,
        duration: header.numDataRecords * header.durationOfDataRecord,
        signals: processedSignals
    };
}

export async function readAndProcessEDF(filePath: string): Promise<ProcessedEDFData> {
    const edfData = await readEDFPlus(filePath);
    return processEDFData(edfData);
}

function calculateSleepStageFeatureMinMax(sleepStages: ProcessedSleepStages): SleepStageFeatureMinMax | undefined {
    if (!sleepStages || sleepStages.length === 0) {
        return undefined;
    }
    const channels = Object.keys(sleepStages[0].Channels);
    const lastChannel = channels[channels.length - 1];
    const featureKeys = Object.keys(sleepStages[0].Channels[lastChannel]).filter(key =>
        key.startsWith('eeg_') && typeof sleepStages[0].Channels[lastChannel][key] === 'number'
    ) as (keyof ProcessedSleepStageEntryFeatures)[];

    const initialMinMax: SleepStageFeatureMinMax = {} as SleepStageFeatureMinMax;
    featureKeys.forEach(key => {
        initialMinMax[key] = { min: Infinity, max: -Infinity, stdDev: 0, p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 };
    });

    const values: { [key: string]: number[] } = {};
    featureKeys.forEach(key => {
        values[key] = [];
    });

    sleepStages.forEach(stage => {
        featureKeys.forEach(key => {
            Object.keys(stage.Channels).forEach(channel => {
                const value = stage.Channels[channel][key];
                if (value !== undefined) {
                    values[key].push(value);
                    if (value < initialMinMax[key].min) initialMinMax[key].min = value;
                    if (value > initialMinMax[key].max) initialMinMax[key].max = value;
                }
            });
        });
    });

    featureKeys.forEach(key => {
        const sortedValues = values[key].sort((a, b) => a - b);
        const len = sortedValues.length;
        initialMinMax[key].p10 = sortedValues[Math.floor(len * 0.1)];
        initialMinMax[key].p25 = sortedValues[Math.floor(len * 0.25)];
        initialMinMax[key].p50 = sortedValues[Math.floor(len * 0.5)];
        initialMinMax[key].p75 = sortedValues[Math.floor(len * 0.75)];
        initialMinMax[key].p90 = sortedValues[Math.floor(len * 0.9)];
        const mean = sortedValues.reduce((sum, val) => sum + val, 0) / len;
        initialMinMax[key].stdDev = Math.sqrt(sortedValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / len);
    });

    console.log(channels, lastChannel, featureKeys, initialMinMax);

    return initialMinMax;
}