import { ProcessedSleepStages } from "../Loader/LoaderTypes";

interface StageTimelineProps {
    sleepStages: ProcessedSleepStages;
    scrollPosition: number;
    totalSamples: number;
    width: number;
    onTimelineClick: (position: number) => void;
    field: string;
    color: string;
}

export const StageTimeline: React.FC<StageTimelineProps> = ({
    sleepStages,
    scrollPosition,
    totalSamples,
    width,
    onTimelineClick,
    field,
    color
}) => {
    const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const newPosition = Math.floor((x / width) * totalSamples);
        onTimelineClick(newPosition);
    };

    const scrollIndicatorPosition = (scrollPosition / totalSamples) * width;

    return (
        <div>
            <svg width={width} height="15" onClick={handleClick}>
                {sleepStages.map((stage, index) => (
                    <rect
                        key={index}
                        x={(index / sleepStages.length) * width}
                        y="0"
                        width={(1 / sleepStages.length) * width}
                        height="30"
                        fill={isNaN(stage[field] as number) ? 'transparent' : `rgb(${255 - (255 * stage[field] as number / 100)}, ${255 * stage[field] as number / 100}, 0)`}
                        opacity={isNaN(stage[field] as number) ? 0 : 1}
                    />
                ))}
                <line
                    x1={scrollIndicatorPosition}
                    y1={0}
                    x2={scrollIndicatorPosition}
                    y2={30}
                    stroke="red"
                    strokeWidth={2}
                />
            </svg>
        </div>
    );
}; 