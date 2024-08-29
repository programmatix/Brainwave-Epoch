import { Temporal } from "@js-temporal/polyfill";

export type EDFHeader = {
    version: string;
    patientID: string;
    recordID: string;
    startDate: Temporal.ZonedDateTime;
    bytesInHeader: number;
    reserved: string;
    numDataRecords: number;
    durationOfDataRecord: number;
    numSignals: number;
};

export type EDFSignal = {
    label: string;
    transducerType: string;
    physicalDimension: string;
    physicalMin: number;
    physicalMax: number;
    digitalMin: number;
    digitalMax: number;
    prefiltering: string;
    numSamplesPerDataRecord: number;
    reserved: string;
};

export type EDFData = {
    header: EDFHeader;
    signals: EDFSignal[];
    records: number[][];
};

export type SleepStageEntry = {
    Confidence: string;
    Epoch: string;
    Source: string;
    Stage: string;
    StageInt: string;
    Timestamp: string;
    [key: `${string}_Confidence`]: string;
    [key: `${string}_Stage`]: string;
};

export type SleepStages = SleepStageEntry[];

export type ChannelData = {
    Confidence: number;
    Stage: string;
    Source?: string;
};

export type ProcessedSleepStageEntry = {
    Epoch: number;
    Timestamp: Temporal.ZonedDateTime;
    Channels: { [key: string]: ChannelData };
};

export type ProcessedSleepStages = ProcessedSleepStageEntry[];
