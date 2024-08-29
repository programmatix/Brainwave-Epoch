import { Temporal } from "@js-temporal/polyfill";

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
