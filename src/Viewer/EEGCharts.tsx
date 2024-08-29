import React, { useRef, useEffect } from 'react';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { ProcessedEDFData } from '../Loader/ProcessorTypes';
import { ProcessedSleepStages } from '../Loader/LoaderTypes';


Chart.register(...registerables, annotationPlugin);

interface EEGChartsProps {
  processedData: ProcessedEDFData;
  scrollPosition: number;
  epochIndex: number;
  sleepStages: ProcessedSleepStages;
}

export const EEGCharts: React.FC<EEGChartsProps> = ({ processedData, scrollPosition, epochIndex, sleepStages }) => {
  const chartRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const charts = useRef<(Chart | null)[]>([]);

  useEffect(() => {
    const samplesPerSecond = processedData.signals[0].samplingRate;
    const samplesToShow = samplesPerSecond * 30;
    const signalsToShow = processedData.signals.filter(signal => signal.label !== 'EDF Annotations');

    charts.current.forEach((chart, index) => chart?.destroy());

    signalsToShow.forEach((signal, index) => {
      const ctx = chartRefs.current[index]?.getContext('2d');
      if (ctx) {
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
            }]
          },
          options: {
            responsive: true,
            scales: {
              x: {
                display: index === 0 || index === signalsToShow.length - 1,
                position: index === 0 ? 'top' : 'bottom',
                title: { display: true, text: 'Time' },
                ticks: {
                  maxTicksLimit: 10,
                  callback: (value, index, ticks) => {
                    const seconds = Math.round(epochIndex * 30 + index * 30 * (ticks.length - 1) / (ticks.length));
                    const time = processedData.signals[0].timeLabels[scrollPosition + seconds * samplesPerSecond];
                    return time ? time.formatted : '';
                  }
                }
              },
              y: {
                title: { display: true, text: `${signal.label} (${signal.physicalDimension})` },
                min: -200,
                max: 200
              },
            },
            animation: false,
            plugins: {
              legend: { display: false },
              annotation: {
                annotations: {
                  epochStart: {
                    type: 'line',
                    xMin: 0,
                    xMax: 0,
                    borderColor: 'rgba(128, 128, 128, 0.5)',
                    borderWidth: 1,
                  },
                  epochEnd: {
                    type: 'line',
                    xMin: samplesToShow - 1,
                    xMax: samplesToShow - 1,
                    borderColor: 'rgba(128, 128, 128, 0.5)',
                    borderWidth: 1,
                  },
                  epochInfo: {
                    type: 'label',
                    xValue: 10,
                    yValue: 'top',
                    content: `Epoch: ${epochIndex}, Stage: ${JSON.stringify(sleepStages[epochIndex])}`,
                    font: {
                      size: 12,
                    },
                  },
                },
              },
            },
          }
        };

        charts.current[index] = new Chart(ctx, config);
      }
    });

    return () => {
      charts.current.forEach(chart => chart?.destroy());
    };
  }, [processedData, scrollPosition, epochIndex, sleepStages]);

  return (
    <>
      {processedData.signals.filter(signal => signal.label !== 'EDF Annotations').map((_, index) => (
        <canvas key={index} ref={el => chartRefs.current[index] = el} className="w-full h-32" />
      ))}
    </>
  );
};