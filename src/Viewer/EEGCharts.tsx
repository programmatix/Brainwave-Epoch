import React, { useRef, useEffect, useState } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { AllData, ProcessedEDFData } from '../Loader/ProcessorTypes';
import { ProcessedSleepStages } from '../Loader/LoaderTypes';

Chart.register(...registerables, annotationPlugin);

export const SECONDS_PER_EPOCH = 30;
export const SECONDS_TO_SHOW = 30;

interface EEGChartsProps {
    allData: AllData;
    scrollPosition: number;
}   

export const EEGCharts: React.FC<EEGChartsProps> = ({ allData, scrollPosition }) => {
  const chartRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [charts, setCharts] = useState<(Chart | null)[]>([]);

  useEffect(() => {
    console.time('EEGCharts useEffect');
    
    const samplesPerSecond = allData.processedEDF.signals[0].samplingRate;
    const samplesToShow = samplesPerSecond * SECONDS_TO_SHOW;
    const signalsToShow = allData.processedEDF.signals.filter(signal => signal.label !== 'EDF Annotations');

    charts.forEach(chart => chart?.destroy());
    setCharts([]);

    const startEpochIndex = Math.floor(scrollPosition / (samplesPerSecond * SECONDS_PER_EPOCH));
    const endEpochIndex = Math.ceil((scrollPosition + samplesToShow) / (samplesPerSecond * SECONDS_PER_EPOCH));

    const yMax = 200;
    const yMin = -200;

    console.time('Creating new charts');
    const newCharts = signalsToShow.map((signal, index) => {
      const ctx = chartRefs.current[index]?.getContext('2d');
      if (!ctx) return null;

      const data = signal.samples.slice(scrollPosition, scrollPosition + samplesToShow);
      const config: ChartConfiguration = {
        type: 'line',
        data: {
          labels: Array(samplesToShow).fill(''),
          datasets: [{
            label: signal.label,
            data: data,
            borderColor: `hsl(${index * 360 / signalsToShow.length}, 100%, 50%)`,
            pointRadius: 0,
            borderWidth: 1.5,
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              display: index === 0 || index === signalsToShow.length - 1,
              position: index === 0 ? 'top' : 'bottom',
              title: { display: true, text: 'Time' },
              ticks: {
                maxTicksLimit: 10,
                callback: (value, index, ticks) => {
                    return allData.processedEDF.signals[0].timeLabels[scrollPosition + index]?.formatted
                }
              }
            },
            y: {
              title: { display: true, text: `${signal.label} (${signal.physicalDimension})` },
              min: yMin,
              max: yMax
            },
          },
          animation: false,
          plugins: {
            legend: { display: false },
            annotation: {
              annotations: Object.fromEntries(
                Array.from({ length: endEpochIndex - startEpochIndex }, (_, i) => {
                  const epochIndex = startEpochIndex + i;
                  const epochStartSample = epochIndex * SECONDS_PER_EPOCH * samplesPerSecond - scrollPosition;
                  const sleepStage = allData.sleepStages[epochIndex];
                  const channelData = sleepStage?.Channels[signal.label];
                  return [
                    [`epoch${epochIndex}`, {
                      type: 'line',
                      xMin: epochStartSample,
                      xMax: epochStartSample,
                      borderColor: 'rgba(128, 128, 128, 0.5)',
                      borderWidth: 1,
                    }],
                    [`epochInfo${epochIndex}`, {
                      type: 'label',
                      position: 'start',
                      xValue: epochStartSample + 1,
                      yValue: yMax,
                      content: [
                        `${sleepStage?.Timestamp}`,
                        `Epoch: ${epochIndex}`,
                        `Stage: ${channelData?.Stage || 'N/A'}`,
                        `Confidence: ${channelData?.Confidence?.toFixed(2) || 'N/A'}`
                      ],
                      font: { size: 10 },
                      textAlign: 'left',
                      padding: { top: 5, left: 5 }
                    }]
                  ];
                }).flat()
              ),
            }
          },
        }
      };

      return new Chart(ctx, config);
    });
    console.timeEnd('Creating new charts');

    setCharts(newCharts);

    console.timeEnd('EEGCharts useEffect');

    return () => {
      console.time('Cleanup charts');
      newCharts.forEach(chart => chart?.destroy());
      console.timeEnd('Cleanup charts');
    };
  }, [allData, scrollPosition]);

  const signalsToShow = allData.processedEDF.signals.filter(signal => signal.label !== 'EDF Annotations');
  const chartCount = signalsToShow.length;

  return (
    // <div className="flex-grow flex-col flex  gap-1" style={{ gridTemplateRows: `repeat(${chartCount}, 1fr)` }}>
    <div className="flex-col flex h-full">
      {signalsToShow.map((_, index) => (
        // overflow-hidden	part of the magic needed for Chart.js CSS
        <div key={index} className="w-full flex-grow" style={{ width: '100%', height: '300px' }}>
            {/* <div>Hello world</div> */}
          <canvas ref={el => chartRefs.current[index] = el} style={{ width: '100%', height: '100%' }} />
        </div>
      ))}
    </div>
  );
};