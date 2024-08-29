import { Temporal } from "@js-temporal/polyfill";
import { readEDFPlus } from "./Loader";
import { EDFHeader, EDFSignal, EDFData as EDFDataTypes, EDFData } from "./LoaderTypes";
import { ProcessedEDFData, SignalData, TimeLabel } from "./ProcessorTypes";

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