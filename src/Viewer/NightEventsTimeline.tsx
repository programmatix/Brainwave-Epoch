import React from 'react';
import { AllData } from '../Loader/LoaderTypes';

interface NightEventsTimelineProps {
    allData: AllData;
    scrollPosition: number;
    totalSamples: number;
    width: number;
    onTimelineClick: (position: number) => void;
    onMouseMove: (e: React.MouseEvent<SVGSVGElement>, width: number, duration: number) => void;
}

export const NightEventsTimeline: React.FC<NightEventsTimelineProps> = ({
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
    const totalTimePeriod = allData.processedEDF.duration;

    const convertToScreenSpace = (value: number) => {
        return ((value - allData.processedEDF.startDate.epochMilliseconds / 1000) / totalTimePeriod) * width;
    }

    return (
        <div>
            <svg width={width} height="15" onClick={handleClick} onMouseMove={handleMouseMove}>
                {allData.nightEvents.map((event, eventIndex) => {
                    const durationSecs = event.durationSecs;
                    const startX = convertToScreenSpace(event.timestamp.epochMilliseconds / 1000);
                    const endX = convertToScreenSpace(event.timestamp.epochMilliseconds / 1000 + durationSecs);
                    const w = Math.max(1, endX - startX)
                    //console.log(event.source, startX, endX, event.timestamp.epochMilliseconds / 1000, event.timestamp.epochMilliseconds / 1000 + durationSecs, allData.processedEDF.startDate.epochMilliseconds / 1000, durationSecs, totalTimePeriod, width, w);
                    return (
                        <rect
                            key={`${eventIndex}`}
                            x={startX}
                            y="0"
                            width={w}
                            height="15"
                            fill="red"
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
}