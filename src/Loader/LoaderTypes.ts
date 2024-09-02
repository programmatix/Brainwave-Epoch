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
} & ProcessedSleepStageEntryFeatures;


export type SlowWaveEvent = {
    Start: number;
    NegPeak: number;
    MidCrossing: number;
    PosPeak: number;
    End: number;
    Duration: number;
    ValNegPeak: number;
    ValPosPeak: number;
    PTP: number;
    Slope: number;
    Frequency: number;
    Channel: string;
    IdxChannel: number;
};

export type NightEvent = {
    event: string;
    timestamp: Temporal.ZonedDateTime;
    source: string;
    durationSecs: number;
};

export type SlowWaveEvents = SlowWaveEvent[];
export type NightEvents = NightEvent[];

export type FitbitHypnogramEntry = {
    startTime: Temporal.ZonedDateTime;
    state: string;
    endTime: Temporal.ZonedDateTime;
};

export type FitbitHypnogram = FitbitHypnogramEntry[];

export type SpindleEvent = {
    Start: number;
    End: number;
    Duration: number;
    Frequency: number;
    Power: number;
    Channel: string;
};

export type SpindleEvents = SpindleEvent[];


export type TimeLabel = {
    timestamp: number;
    formatted: string;
  };

  
export type SignalData = {
    label: string;
    transducerType: string;
    physicalDimension: string;
    physicalMin: number;
    physicalMax: number;
    digitalMin: number;
    digitalMax: number;
    prefiltering: string;
    samplingRate: number;
    samples: number[];
    timeLabels: TimeLabel[];
};

export type ProcessedEDFData = {
    startDate: Temporal.ZonedDateTime;
    duration: number;
    signals: SignalData[];
};

export type GroupedSlowWaveEvents = {
    [channel: string]: SlowWaveEvent[];
};

export type GroupedSpindleEvents = {
    [channel: string]: SpindleEvent[];
};

export type FeatureMinMax = {
    min: number;
    max: number;
    stdDev: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
};

export type ProcessedSleepStageEntryFeatures = {
    [key: string]: number;
};

export type ProcessedSleepStageEntry = {
    Epoch: number;
    Timestamp: Temporal.ZonedDateTime;
    Channels: { [key: string]: ChannelData };
    Stage: string;
    Confidence: number;
    Source: string;
    StageInt?: number;
    ManualStage?: string;
    DefinitelyAwake?: boolean;
    DefinitelySleep?: boolean;
    ProbablySleep?: boolean;
    PredictedAwake?: number;
    PredictedAwakeBinary?: number;
};

export type ProcessedSleepStages = ProcessedSleepStageEntry[];

export type SleepStageFeatureMinMax = {
    [K in keyof ProcessedSleepStageEntryFeatures]: FeatureMinMax;
};

export type AllData = {
    processedEDF: ProcessedEDFData;
    sleepStages?: ProcessedSleepStages;
    slowWaveEvents?: GroupedSlowWaveEvents;
    nightEvents?: NightEvents;
    fitbitHypnogram?: FitbitHypnogram;
    spindleEvents?: GroupedSpindleEvents;
    predictedAwakeTimeline?: ProcessedSleepStages;
    definiteAwakeSleepTimeline?: ProcessedSleepStages;
    sleepStageFeatureMinMax?: SleepStageFeatureMinMax;
};
