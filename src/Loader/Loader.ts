import { Temporal } from '@js-temporal/polyfill';
import { parse } from 'csv-parse/sync';
import { promises as fs } from 'fs';
import { AllData, EDFData, EDFHeader, EDFSignal, FitbitHypnogram, GroupedSlowWaveEvents, GroupedSpindleEvents, NightEvents, ProcessedEDFData, ProcessedSleepStageEntry, ProcessedSleepStages, SignalData, SlowWaveEvents, SpindleEvents, TimeLabel, SleepStageFeatureMinMax, ProcessedSleepStageEntryFeatures } from './LoaderTypes';


import { EventEmitter } from 'events';

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

    return { header, signals, records };
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

            const processed: ProcessedSleepStageEntry = {
                Epoch: parseInt(stage.Epoch),
                Timestamp: timestamp,
                Stage: stage.Stage,
                Confidence: parseFloat(stage.Confidence),
                Source: stage.Source,
                StageInt: parseInt(stage.StageInt),
                Channels: {
                    "Aggregated": {
                        Confidence: parseFloat(stage.Confidence),
                        Stage: stage.Stage,
                        Source: stage.Source
                    }
                },
                eeg_abspow: parseFloat(stage.eeg_abspow),
                eeg_abspow_c7min_norm: parseFloat(stage.eeg_abspow_c7min_norm),
                eeg_abspow_p2min_norm: parseFloat(stage.eeg_abspow_p2min_norm),
                eeg_alpha: parseFloat(stage.eeg_alpha),
                eeg_alpha_c7min_norm: parseFloat(stage.eeg_alpha_c7min_norm),
                eeg_alpha_p2min_norm: parseFloat(stage.eeg_alpha_p2min_norm),
                eeg_at: parseFloat(stage.eeg_at),
                eeg_at_c7min_norm: parseFloat(stage.eeg_at_c7min_norm),
                eeg_at_p2min_norm: parseFloat(stage.eeg_at_p2min_norm),
                eeg_beta: parseFloat(stage.eeg_beta),
                eeg_beta_c7min_norm: parseFloat(stage.eeg_beta_c7min_norm),
                eeg_beta_p2min_norm: parseFloat(stage.eeg_beta_p2min_norm),
                eeg_db: parseFloat(stage.eeg_db),
                eeg_db_c7min_norm: parseFloat(stage.eeg_db_c7min_norm),
                eeg_db_p2min_norm: parseFloat(stage.eeg_db_p2min_norm),
                eeg_ds: parseFloat(stage.eeg_ds),
                eeg_ds_c7min_norm: parseFloat(stage.eeg_ds_c7min_norm),
                eeg_ds_p2min_norm: parseFloat(stage.eeg_ds_p2min_norm),
                eeg_dt: parseFloat(stage.eeg_dt),
                eeg_dt_c7min_norm: parseFloat(stage.eeg_dt_c7min_norm),
                eeg_dt_p2min_norm: parseFloat(stage.eeg_dt_p2min_norm),
                eeg_fdelta: parseFloat(stage.eeg_fdelta),
                eeg_fdelta_c7min_norm: parseFloat(stage.eeg_fdelta_c7min_norm),
                eeg_fdelta_p2min_norm: parseFloat(stage.eeg_fdelta_p2min_norm),
                eeg_hcomp: parseFloat(stage.eeg_hcomp),
                eeg_hcomp_c7min_norm: parseFloat(stage.eeg_hcomp_c7min_norm),
                eeg_hcomp_p2min_norm: parseFloat(stage.eeg_hcomp_p2min_norm),
                eeg_higuchi: parseFloat(stage.eeg_higuchi),
                eeg_higuchi_c7min_norm: parseFloat(stage.eeg_higuchi_c7min_norm),
                eeg_higuchi_p2min_norm: parseFloat(stage.eeg_higuchi_p2min_norm),
                eeg_hmob: parseFloat(stage.eeg_hmob),
                eeg_hmob_c7min_norm: parseFloat(stage.eeg_hmob_c7min_norm),
                eeg_hmob_p2min_norm: parseFloat(stage.eeg_hmob_p2min_norm),
                eeg_iqr: parseFloat(stage.eeg_iqr),
                eeg_iqr_c7min_norm: parseFloat(stage.eeg_iqr_c7min_norm),
                eeg_iqr_p2min_norm: parseFloat(stage.eeg_iqr_p2min_norm),
                eeg_kurt: parseFloat(stage.eeg_kurt),
                eeg_kurt_c7min_norm: parseFloat(stage.eeg_kurt_c7min_norm),
                eeg_kurt_p2min_norm: parseFloat(stage.eeg_kurt_p2min_norm),
                eeg_nzc: parseFloat(stage.eeg_nzc),
                eeg_nzc_c7min_norm: parseFloat(stage.eeg_nzc_c7min_norm),
                eeg_nzc_p2min_norm: parseFloat(stage.eeg_nzc_p2min_norm),
                eeg_perm: parseFloat(stage.eeg_perm),
                eeg_perm_c7min_norm: parseFloat(stage.eeg_perm_c7min_norm),
                eeg_perm_p2min_norm: parseFloat(stage.eeg_perm_p2min_norm),
                eeg_petrosian: parseFloat(stage.eeg_petrosian),
                eeg_petrosian_c7min_norm: parseFloat(stage.eeg_petrosian_c7min_norm),
                eeg_petrosian_p2min_norm: parseFloat(stage.eeg_petrosian_p2min_norm),
                eeg_sdelta: parseFloat(stage.eeg_sdelta),
                eeg_sdelta_c7min_norm: parseFloat(stage.eeg_sdelta_c7min_norm),
                eeg_sdelta_p2min_norm: parseFloat(stage.eeg_sdelta_p2min_norm),
                eeg_sigma: parseFloat(stage.eeg_sigma),
                eeg_sigma_c7min_norm: parseFloat(stage.eeg_sigma_c7min_norm),
                eeg_sigma_p2min_norm: parseFloat(stage.eeg_sigma_p2min_norm),
                eeg_skew: parseFloat(stage.eeg_skew),
                eeg_skew_c7min_norm: parseFloat(stage.eeg_skew_c7min_norm),
                eeg_skew_p2min_norm: parseFloat(stage.eeg_skew_p2min_norm),
                eeg_std: parseFloat(stage.eeg_std),
                eeg_std_c7min_norm: parseFloat(stage.eeg_std_c7min_norm),
                eeg_std_p2min_norm: parseFloat(stage.eeg_std_p2min_norm),
                eeg_theta: parseFloat(stage.eeg_theta),
                eeg_theta_c7min_norm: parseFloat(stage.eeg_theta_c7min_norm),
                eeg_theta_p2min_norm: parseFloat(stage.eeg_theta_p2min_norm),
                ManualStage: stage.ManualStage,
                DefinitelyAwake: stage.DefinitelyAwake === 'True',
                DefinitelySleep: stage.DefinitelySleep === 'True',
                PredictedAwake: parseFloat(stage.PredictedAwake),
                PredictedAwakeBinary: parseInt(stage.PredictedAwakeBinary)
            };


            Object.keys(stage).forEach(key => {
                if (key.endsWith('_Confidence') || key.endsWith('_Stage')) {
                    const channel = key.split('_')[0];
                    if (!processed.Channels[channel]) {
                        processed.Channels[channel] = {
                            Confidence: parseFloat(stage[`${channel}_Confidence`]),
                            Stage: stage[`${channel}_Stage`]
                        };
                    }
                }
            });

            return processed;
        });

        console.timeEnd('readSleepStages');
        return result;
    } catch (error) {
        console.error(`Error reading SleepStages file: ${error.message}`);
        return undefined;
    }
}


// 2024-08-26 21:10:07.764000+01:00
const parseDateString = (dateStr: string): Temporal.ZonedDateTime => {
    if (dateStr.includes('-')) {
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
            millisecond: parseInt(millisecond || '0'),
            timeZone: Temporal.TimeZone.from(`+${offset}`)
        });
    }

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

export async function loadFiles(edfPath: string): Promise<AllData> {
    const start = performance.now();
    loaderEvents.emit('log', `${new Date().toISOString()}: Starting to load files`);

    const sleepStagesPath = edfPath.replace('.edf', '.with_features.csv');
    const slowWaveEventsPath = edfPath.replace('.edf', '.sw_summary.csv');
    const nightEventsPath = edfPath.replace('.edf', '.night_events.csv');
    const fitbitHypnogramPath = edfPath.replace('.edf', '.fitbit_hypnogram.csv');
    const spindleEventsPath = edfPath.replace('.edf', '.spindle_summary.csv');

    const [processedStages, raw, slowWaveEvents, nightEvents, fitbitHypnogram, spindleEvents] = await Promise.all([
        readSleepStages(sleepStagesPath),
        readEDFPlus(edfPath),
        readSlowWaveEvents(slowWaveEventsPath),
        readNightEvents(nightEventsPath),
        readFitbitHypnogram(fitbitHypnogramPath),
        readSpindleEvents(spindleEventsPath)
    ]);

    loaderEvents.emit('log', `${new Date().toISOString()}: Processing EDF data...`);
    const processStart = performance.now();
    const processedEDF = await processEDFData(raw);
    const processEnd = performance.now();
    loaderEvents.emit('log', `${new Date().toISOString()}: EDF data processed in ${(processEnd - processStart).toFixed(2)}ms`);

    const end = performance.now();
    loaderEvents.emit('log', `${new Date().toISOString()}: All files loaded and processed in ${(end - start).toFixed(2)}ms`);

    const sleepStageFeatureMinMax = calculateSleepStageFeatureMinMax(processedStages);

    const allData: AllData = {
        processedEDF,
        sleepStages: processedStages,
        slowWaveEvents,
        nightEvents,
        fitbitHypnogram,
        spindleEvents,
        predictedAwakeTimeline: processedStages,
        definiteAwakeSleepTimeline: processedStages,
        sleepStageFeatureMinMax
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

export function processEDFData(edfData: EDFData): ProcessedEDFData {
    const { header, signals, records } = edfData;

    const processedSignals: SignalData[] = signals.map(signal => {
        const samplingRate = signal.numSamplesPerDataRecord / header.durationOfDataRecord;
        const totalSamples = signal.numSamplesPerDataRecord * header.numDataRecords;
        const timeLabels: TimeLabel[] = [];

        const padZero = (num: number) => num.toString().padStart(2, '0');
        const startTime = new Date(header.startDate.year, header.startDate.month - 1, header.startDate.day,
            header.startDate.hour, header.startDate.minute, header.startDate.second,
            header.startDate.millisecond).getTime();

        for (let i = 0; i < totalSamples; i++) {
            const milliseconds = Math.round(i / samplingRate * 1000);
            const currentTime = new Date(startTime + milliseconds);

            // const formatter = new Intl.DateTimeFormat('en-GB', {
            //   timeZone: 'Europe/London',
            //   hour: "2-digit",
            //   minute: "2-digit",
            //   second: "2-digit",
            // });
            // const formattedDate = formatter.format(currentTime);

            const formattedTime = `${padZero(currentTime.getHours())}:${padZero(currentTime.getMinutes())}:${padZero(currentTime.getSeconds())}`;

            timeLabels.push({
                timestamp: startTime + milliseconds,
                formatted: formattedTime
            });
        }

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
    const featureKeys = Object.keys(sleepStages[0]).filter(key =>
        key.startsWith('eeg_') && typeof sleepStages[0][key] === 'number'
    ) as (keyof ProcessedSleepStageEntryFeatures)[];

    const initialMinMax: SleepStageFeatureMinMax = {} as SleepStageFeatureMinMax;
    featureKeys.forEach(key => {
        initialMinMax[key] = { min: Infinity, max: -Infinity };
    });

    return sleepStages.reduce((minMax, stage) => {
        featureKeys.forEach(key => {
            const value = stage[key];
            if (value < minMax[key].min) minMax[key].min = value;
            if (value > minMax[key].max) minMax[key].max = value;
        });
        return minMax;
    }, initialMinMax);
}