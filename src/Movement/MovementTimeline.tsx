import React, { useEffect, useRef, useState } from 'react';
import { ProcessedMovementData } from './Movement';
import * as d3 from 'd3';
import { Temporal } from '@js-temporal/polyfill';

interface MovementTimelineProps {
    movementData: ProcessedMovementData;
    width?: number;
    startTime: number; // Timestamp in milliseconds
    endTime: number; // Timestamp in milliseconds
    onTimeClicked?: (timestamp: number) => void;
}

const MovementTimeline: React.FC<MovementTimelineProps> = ({ 
    movementData, width, startTime, endTime, onTimeClicked 
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [height] = useState(80);
    const [chartWidth, setChartWidth] = useState(width || 0);

    useEffect(() => {
        // Update width if provided as prop
        if (width) {
            setChartWidth(width);
        }
    }, [width]);

    useEffect(() => {
        // Measure container width if width prop not provided
        if (!width && containerRef.current) {
            const resizeObserver = new ResizeObserver(entries => {
                for (let entry of entries) {
                    setChartWidth(entry.contentRect.width);
                }
            });
            
            resizeObserver.observe(containerRef.current);
            
            return () => {
                if (containerRef.current) {
                    resizeObserver.unobserve(containerRef.current);
                }
            };
        }
    }, [width]);

    useEffect(() => {
        if (!movementData || !svgRef.current || chartWidth === 0) return;

        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 10, right: 10, bottom: 20, left: 40 };
        const innerWidth = chartWidth - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const xScale = d3.scaleLinear()
            .domain([startTime, endTime])
            .range([0, innerWidth]);

        const max = d3.max(movementData.values) || 10;
        const yScale = d3.scaleLinear()
            .domain([0, max])
            .range([innerHeight, 0]);

        const line = d3.line<number>()
            .x((_, i) => xScale(movementData.timeLabels[i].timestamp))
            .y(d => yScale(d));

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        // Add X axis
        g.append('g')
            .attr('transform', `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale)
                .tickFormat(d => {
                    const date = new Date(d as number);
                    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
                })
                .ticks(6));

        // Add Y axis
        g.append('g')
            .call(d3.axisLeft(yScale));

        // Add the line
        g.append('path')
            .datum(movementData.values)
            .attr('fill', 'none')
            .attr('stroke', 'steelblue')
            .attr('stroke-width', 1.5)
            .attr('d', line);

        // Add area under the line
        const area = d3.area<number>()
            .x((_, i) => xScale(movementData.timeLabels[i].timestamp))
            .y0(innerHeight)
            .y1(d => yScale(d));

        g.append('path')
            .datum(movementData.values)
            .attr('fill', 'steelblue')
            .attr('fill-opacity', 0.3)
            .attr('d', area);

        // Add grid lines
        g.append('g')
            .attr('class', 'grid')
            .call(
                d3.axisLeft(yScale)
                    .tickSize(-innerWidth)
                    .tickFormat(() => '')
            )
            .attr('stroke-opacity', 0.1);

        // Add labels
        g.append('text')
            .attr('x', -innerHeight / 2)
            .attr('y', -30)
            .attr('transform', 'rotate(-90)')
            .attr('text-anchor', 'middle')
            .text('Movement');

        // Add overlay for mouse events
        g.append('rect')
            .attr('width', innerWidth)
            .attr('height', innerHeight)
            .attr('fill', 'none')
            .attr('pointer-events', 'all')
            .on('click', (event) => {
                if (onTimeClicked) {
                    const xPos = d3.pointer(event)[0];
                    const timestamp = xScale.invert(xPos);
                    onTimeClicked(timestamp as number);
                }
            });

    }, [movementData, chartWidth, height, startTime, endTime, onTimeClicked]);

    return (
        <div className="movement-timeline" ref={containerRef}>
            <h3>Movement Data</h3>
            <svg 
                ref={svgRef}
                width={chartWidth}
                height={height}
                style={{ display: 'block' }}
            />
        </div>
    );
};

export default MovementTimeline; 