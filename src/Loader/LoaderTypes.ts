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

export type AllData = {
    processedEDF: ProcessedEDFData;
    sleepStages?: ProcessedSleepStages;
    slowWaveEvents?: GroupedSlowWaveEvents;
    nightEvents?: NightEvents;
    fitbitHypnogram?: FitbitHypnogram;
    spindleEvents?: GroupedSpindleEvents;
    predictedAwakeTimeline?: ProcessedSleepStages;
    definiteAwakeSleepTimeline?: ProcessedSleepStages;
};

export type ProcessedSleepStageEntry = {
    Epoch: number;
    Timestamp: Temporal.ZonedDateTime;
    Channels: { [key: string]: ChannelData };
    Stage: string;
    Confidence: number;
    Source: string;
    StageInt: number;
    eeg_abspow: number;
    eeg_abspow_c7min_norm: number;
    eeg_abspow_p2min_norm: number;
    eeg_alpha: number;
    eeg_alpha_c7min_norm: number;
    eeg_alpha_p2min_norm: number;
    eeg_at: number;
    eeg_at_c7min_norm: number;
    eeg_at_p2min_norm: number;
    eeg_beta: number;
    eeg_beta_c7min_norm: number;
    eeg_beta_p2min_norm: number;
    eeg_db: number;
    eeg_db_c7min_norm: number;
    eeg_db_p2min_norm: number;
    eeg_ds: number;
    eeg_ds_c7min_norm: number;
    eeg_ds_p2min_norm: number;
    eeg_dt: number;
    eeg_dt_c7min_norm: number;
    eeg_dt_p2min_norm: number;
    eeg_fdelta: number;
    eeg_fdelta_c7min_norm: number;
    eeg_fdelta_p2min_norm: number;
    eeg_hcomp: number;
    eeg_hcomp_c7min_norm: number;
    eeg_hcomp_p2min_norm: number;
    eeg_higuchi: number;
    eeg_higuchi_c7min_norm: number;
    eeg_higuchi_p2min_norm: number;
    eeg_hmob: number;
    eeg_hmob_c7min_norm: number;
    eeg_hmob_p2min_norm: number;
    eeg_iqr: number;
    eeg_iqr_c7min_norm: number;
    eeg_iqr_p2min_norm: number;
    eeg_kurt: number;
    eeg_kurt_c7min_norm: number;
    eeg_kurt_p2min_norm: number;
    eeg_nzc: number;
    eeg_nzc_c7min_norm: number;
    eeg_nzc_p2min_norm: number;
    eeg_perm: number;
    eeg_perm_c7min_norm: number;
    eeg_perm_p2min_norm: number;
    eeg_petrosian: number;
    eeg_petrosian_c7min_norm: number;
    eeg_petrosian_p2min_norm: number;
    eeg_sdelta: number;
    eeg_sdelta_c7min_norm: number;
    eeg_sdelta_p2min_norm: number;
    eeg_sigma: number;
    eeg_sigma_c7min_norm: number;
    eeg_sigma_p2min_norm: number;
    eeg_skew: number;
    eeg_skew_c7min_norm: number;
    eeg_skew_p2min_norm: number;
    eeg_std: number;
    eeg_std_c7min_norm: number;
    eeg_std_p2min_norm: number;
    eeg_theta: number;
    eeg_theta_c7min_norm: number;
    eeg_theta_p2min_norm: number;
    ManualStage: string;
    DefinitelyAwake: boolean;
    DefinitelySleep: boolean;
    PredictedAwake: number;
    PredictedAwakeBinary: number;
};


export type ProcessedSleepStages = ProcessedSleepStageEntry[];
