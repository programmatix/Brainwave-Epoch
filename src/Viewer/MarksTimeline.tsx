import React from 'react';
import { parseDateString } from '../Loader/Loader';
import { StoreState, useStore } from '../Store/Store';
import { millisecondsToSamples } from './ChartUtils';

const stageColorMap: Record<string, string> = {
    'Wake': '#ef4444',
    'Deep': '#1e3a8a',
    'Non-Deep': '#3b82f6',
    'Ambiguous Deep': '#1e3a8a',
    'Unsure': 'gray',
};

interface MarksTimelineProps {
    scrollPosition: number;
    totalSamples: number;
    samplesPerEpoch: number;
    width: number;
    onTimelineClick: (position: number) => void;
}

export const MarksTimeline: React.FC<MarksTimelineProps> = ({
    scrollPosition,
    totalSamples,
    samplesPerEpoch,
    width,
    onTimelineClick,
}) => {
    const totalEpochs = Math.ceil(totalSamples / samplesPerEpoch);
    const epochWidth = width / totalEpochs;
    const { allData, marks } = useStore((state: StoreState) => ({
        allData: state.allData,
        marks: state.marks,
    }))
    const startDateMillis = allData.processedEDF.startDate.epochMilliseconds;

    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newPosition = Math.floor((x / width) * totalSamples);
        onTimelineClick(newPosition);
    };

    return (
        <svg width={width} height="20" onClick={handleClick}>

            {marks.map((mark, index) => {
                const time = parseDateString(mark.timestamp).toInstant();
                const sample = millisecondsToSamples(time.epochMilliseconds - startDateMillis, allData.processedEDF.signals[0].samplingRate);
                const sampleAsPctOfWidth = sample / totalSamples;
                const x = sampleAsPctOfWidth * width;
                console.log(`timestamp`, mark.timestamp, `sample`, sample, `time.epochMilliseconds`, time.epochMilliseconds, `startDateMillis`, startDateMillis, `samplesPerEpoch`    , samplesPerEpoch, `sampleAsPctOfWidth`, sampleAsPctOfWidth, `x`, x);
                return (
                    <rect
                        key={index}
                        x={x}
                        y={0}
                        width={epochWidth}
                        height={20}
                        fill={'black'}
                    />
                )
            })}
            <rect
                x={(scrollPosition / totalSamples) * width}
                y={0}
                width={2}
                height={20}
                fill="red"
            />
        </svg>
    );
};