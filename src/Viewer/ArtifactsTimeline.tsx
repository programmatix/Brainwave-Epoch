import React from 'react';
import { AllData, Artifact, Microwaking } from '../Loader/LoaderTypes';
import { sampleIndexToTime } from './ChartUtils';

interface ArtifactsTimelineProps {
    allData: AllData;
    scrollPosition: number;
    totalSamples: number;
    width: number;
    onTimelineClick: (position: number) => void;
    onMouseMove: (e: React.MouseEvent<SVGSVGElement>, width: number, duration: number) => void;
}

export const ArtifactsTimeline: React.FC<ArtifactsTimelineProps> = ({
    allData,
    scrollPosition,
    totalSamples,
    width,
    onTimelineClick,
    onMouseMove,
}) => {
    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newPosition = Math.floor((x / width) * totalSamples);
        onTimelineClick(newPosition);
    };

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        onMouseMove(e, width, allData.processedEDF.duration);
    };

    const scrollIndicatorPosition = (scrollPosition / totalSamples) * width;
    const startDate = allData.processedEDF.startDate.epochMilliseconds / 1000;
    const duration = allData.processedEDF.duration;

    return (
        <div>
            <svg width={width} height="15" onClick={handleClick} onMouseMove={handleMouseMove}>
                {allData.artifacts?.map((artifact: Artifact, index: number) => {
                    const artifactStartDate = sampleIndexToTime(allData, artifact.start);   
                    const artifactEndDate = sampleIndexToTime(allData, artifact.end);
                    const startX = ((artifactStartDate.epochMilliseconds / 1000 - startDate) / duration) * width;
                    const endX = ((artifactEndDate.epochMilliseconds / 1000 - startDate) / duration) * width;
                    return (
                        <rect
                            key={index}
                            x={startX}
                            y="0"
                            width={endX - startX}
                            height="15"
                            fill="rgba(255, 0, 0, 1)"
                        />
                    );
                })}
                <line
                    x1={scrollIndicatorPosition}
                    y1={0}
                    x2={scrollIndicatorPosition}
                    y2={15}
                    stroke="black"
                    strokeWidth={2}
                />
            </svg>
        </div>
    );
};