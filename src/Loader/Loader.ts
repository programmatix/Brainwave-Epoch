import { Temporal } from '@js-temporal/polyfill';
import { parse } from 'csv-parse/sync';
import { promises as fs } from 'fs';
import { EDFData, EDFHeader, EDFSignal, ProcessedSleepStageEntry, ProcessedSleepStages, SleepStages } from './LoaderTypes';

import { processEDFData } from '../Loader/Processor';
import { ProcessedEDFData } from '../Loader/ProcessorTypes';

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

export async function readSleepStages(filePath: string): Promise<ProcessedSleepStages> {
    console.time('readSleepStages');
    const sleepStagesData = await fs.readFile(filePath, 'utf8');
    console.timeLog('readSleepStages', 'File read');

    const parsedSleepStages: SleepStages = parse(sleepStagesData, {
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
            Channels: {
                "Aggregated": {
                    Confidence: parseFloat(stage.Confidence),
                    Stage: stage.Stage,
                    Source: stage.Source
                }
            }
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
}

const parseDateString = (dateStr: string): Temporal.ZonedDateTime => {
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

export async function loadFiles(edfPath: string): Promise<{ raw: EDFData, processedEDF: ProcessedEDFData, processedStages: ProcessedSleepStages }> {
    const start = performance.now();
    loaderEvents.emit('log', `${new Date().toISOString()}: Starting to load files`);

    const sleepStagesPath = edfPath.replace('.edf', '.sleep_stages.csv');
    
    loaderEvents.emit('log', `${new Date().toISOString()}: Reading sleep stages...`);
    const stagesStart = performance.now();
    const processedStages = await readSleepStages(sleepStagesPath);
    const stagesEnd = performance.now();
    loaderEvents.emit('log', `${new Date().toISOString()}: Sleep stages loaded in ${(stagesEnd - stagesStart).toFixed(2)}ms`);

    loaderEvents.emit('log', `${new Date().toISOString()}: Reading EDF file...`);
    const edfStart = performance.now();
    const raw = await readEDFPlus(edfPath);
    const edfEnd = performance.now();
    loaderEvents.emit('log', `EDF file loaded in ${(edfEnd - edfStart).toFixed(2)}ms`);

    loaderEvents.emit('log', `${new Date().toISOString()}: Processing EDF data...`);
    const processStart = performance.now();
    const processedEDF = await processEDFData(raw);
    const processEnd = performance.now();
    loaderEvents.emit('log', `${new Date().toISOString()}: EDF data processed in ${(processEnd - processStart).toFixed(2)}ms`);

    const end = performance.now();
    loaderEvents.emit('log', `${new Date().toISOString()}: All files loaded and processed in ${(end - start).toFixed(2)}ms`);

    return { raw, processedEDF, processedStages };
}