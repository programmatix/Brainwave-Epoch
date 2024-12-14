import { Temporal } from "@js-temporal/polyfill";
import { VideoFile } from "../Videos/Videos";

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
    filePath: string;
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
    filePath: string;
    filePathWithoutExtension: string;
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
    Predictions_has_microwaking_start?: number;
    Predictions_has_microwaking_end?: number;
    Predictions_Ambiguous_Deep?: number;
    Predictions_Deep?: number;
    Predictions_Non_Deep?: number;
    Predictions_Unsure?: number;
    Predictions_Wake?: number;
    Predictions_AnyDeep?: number;
    Predictions_Noise?: number;
    SettlingScorePrediction?: number;
    SettlingV4ScorePrediction?: number;
    SettlingTiredVsWiredPrediction?: number;
    SettlingManualScore?: number;
    SettlingEventVersion?: string;
};

export type ProcessedSleepStages = ProcessedSleepStageEntry[];

export type StageFeatureMinMax = {
    // Looking at min-max values just in the current file
    forLocalFile: {
        All: FeatureMinMax;
        Sleep: FeatureMinMax; 
        NonDeepSleep: FeatureMinMax;
        W: FeatureMinMax;
        N1: FeatureMinMax;
        N2: FeatureMinMax; 
        N3: FeatureMinMax;
        R: FeatureMinMax;
    };
    // Looking at min-max values from stats.csv e.g. all files
    forAllStats: {
        All: FeatureMinMax;
        Sleep: FeatureMinMax;
        NonDeepSleep: FeatureMinMax; 
        W: FeatureMinMax;
        N1: FeatureMinMax;
        N2: FeatureMinMax;
        N3: FeatureMinMax;
        R: FeatureMinMax;
    };
};

export type SleepStageFeatureMinMax = {
    [channel: string]: {
        [K in keyof ProcessedSleepStageEntryFeatures]: StageFeatureMinMax;
    };
};

export type StatsCSVRow = {
    Column: string;
    Mean: number;
    P10: number;
    P90: number;
    Min: number;
    Max: number;
    StdDev: number;
    W_Mean: number;
    W_P10: number;
    W_P90: number;
    W_Min: number;
    W_Max: number;
    W_StdDev: number;
    N1_Mean: number;
    N1_P10: number;
    N1_P90: number;
    N1_Min: number;
    N1_Max: number;
    N1_StdDev: number;
    N2_Mean: number;
    N2_P10: number;
    N2_P90: number;
    N2_Min: number;
    N2_Max: number;
    N2_StdDev: number;
    N3_Mean: number;
    N3_P10: number;
    N3_P90: number;
    N3_Min: number;
    N3_Max: number;
    N3_StdDev: number;
    R_Mean: number;
    R_P10: number;
    R_P90: number;
    R_Min: number;
    R_Max: number;
    R_StdDev: number;
    Sleep_Mean: number;
    Sleep_P10: number;
    Sleep_P90: number;
    Sleep_Min: number;
    Sleep_Max: number;
    Sleep_StdDev: number;
    NonDeepSleep_Mean: number;
    NonDeepSleep_P10: number;
    NonDeepSleep_P90: number;
    NonDeepSleep_Min: number;
    NonDeepSleep_Max: number;
    NonDeepSleep_StdDev: number;
};

export type ScoringTag = {
    tag: string;
    addedAt: string;
  };
  
  export type Mark = {
    channel: string
    scoredAt: string
    timestamp: string
    type: 'MicrowakingStart' | 'MicrowakingEnd'
  }
  
  export type ScoringEntry = {
    epochIndex: number;
    scoredAt: string;
    stage: "Wake" | "Deep" | "Non-Deep" | "Ambiguous Deep" | "Unsure" | "Noise";
    tags: ScoringTag[];
  };
  
  export type Scorings = ScoringEntry[];
  

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
    // These are the originally loaded values - they are not modified
    scorings?: Scorings;
    marks?: Mark[];
    microwakings?: Microwakings;
    videos?: VideoFile[];
};

// Add this new type
export type Microwaking = {
    Start: Temporal.ZonedDateTime;
    End: Temporal.ZonedDateTime;
};

export type Microwakings = Microwaking[];
