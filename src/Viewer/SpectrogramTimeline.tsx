import React, { useEffect, useRef } from 'react';
import { AllData } from '../Loader/LoaderTypes';
import Plotly from 'plotly.js';

interface SpectrogramTimelineProps {
    allData: AllData;
    channel: string;
    scrollPosition: number;
    totalSamples: number;
    width: number;
    onTimelineClick: (newPosition: number) => void;
}

export const SpectrogramTimeline: React.FC<SpectrogramTimelineProps> = ({
    allData,
    channel,
    scrollPosition,
    totalSamples,
    width,
    onTimelineClick,
}) => {
    const plotRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!plotRef.current) return;

        const eegData = allData.processedEDF.signals[channel];
        const samplingRate = allData.processedEDF.signals[0].samplingRate;

        const trace = {
            z: [eegData],
            type: 'heatmap',
            colorscale: 'Viridis',
        };

        const layout = {
            title: `Spectrogram - ${channel}`,
            xaxis: { title: 'Time' },
            yaxis: { title: 'Frequency' },
            width: width,
            height: 200,
        };

        Plotly.newPlot(plotRef.current, [trace], layout);

        return () => {
            if (plotRef.current) {
                Plotly.purge(plotRef.current);
            }
        };
    }, [allData, channel, width]);

    return <div ref={plotRef} />;
};