import React from 'react';
import { AllData, RawPhysicalFeatures } from '../Loader/LoaderTypes';

interface RawPhysicalFeaturesTimelineProps {
    allData: AllData;
    scrollPosition: number;
    totalSamples: number;
    width: number;
    onTimelineClick: (position: number) => void;
}

export const RawPhysicalFeaturesTimeline: React.FC<RawPhysicalFeaturesTimelineProps> = React.memo(({
    allData,
    scrollPosition,
    totalSamples,
    width,
    onTimelineClick
}) => {

    const samplesPerSecond = allData.processedEDF.signals[0].samplingRate;
    const startTime = allData.processedEDF.startDate.epochMilliseconds;
    const duration = allData.processedEDF.duration * 1000;
    const endTime = startTime + duration;

    const canvasRef = React.useRef<HTMLCanvasElement>(null);

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = 100 * dpr;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, width, 100);

        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(0, 0, width, 100);

        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const y = (i * 100) / 10;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        const features = allData.rawPhysicalFeatures;
        const visibleFeatures = features.filter(f => {
            const time = f.timestamp;
            return time >= startTime && time <= endTime;
        });

        if (visibleFeatures.length === 0) return;

        ctx.fillStyle = '#8b5cf6';
        visibleFeatures.forEach(f => {
            if (f.movement === 1) {
                const x = ((f.timestamp - startTime) / duration) * width;
                ctx.fillRect(x, 0, 2, 100);
            }
        });

        const currentTime = startTime + (scrollPosition / samplesPerSecond) * 1000;
        const currentX = ((currentTime - startTime) / duration) * width;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currentX, 0);
        ctx.lineTo(currentX, 100);
        ctx.stroke();

    }, [allData, scrollPosition, totalSamples, width]);

    if (!allData.rawPhysicalFeatures) return null;

    return (
        <div className="relative" >
            <canvas
            style={{ width: width, height: 20 }}
                ref={canvasRef}
                className="cursor-pointer"
                onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const position = (x / width) * totalSamples;
                    onTimelineClick(position);
                }}
            />
        </div>
    );
});
