import React, { useState } from 'react';
import { LabelContent } from './ChartUtils';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

type SortType = 'default' | 'extremes';

interface MetricsTableProps {
    annotations: LabelContent;
}

// Extract tooltip tables into separate components
const ValueTooltip: React.FC<{ annotation: LabelContent[0] }> = ({ annotation }) => (
    <>
        <div>
            <p>The main table progress bar is showing values scaled between 10% and 90% of the value range, for that key, for this EEG file.</p>
            <p>The progress bar in this tooltip shows the value against the real min and max for that key, for this EEG file.</p>
            <p>Reminder that any _s keys are already scaled against the value range of all nights, for that key.</p>
        </div>
        <table className="table-auto border-collapse">
            <tbody className="text-xs">
                <tr>
                    <td className="pr-2">Key:</td>
                    <td>{annotation.key}</td>
                </tr>
                <tr>
                    <td className="pr-2">Raw Value:</td>
                    <td>{formatNumber(Number(annotation.value))}</td>
                </tr>
                <tr>
                    <td className="pr-2">Normalized Value:</td>
                    <td>{formatNumber(Number(annotation.normalizedValue))}</td>
                </tr>
                <tr>
                    <td className="pr-2">{annotation.minUsedLabel}:</td>
                    <td>{formatNumber(annotation.minUsed)}</td>
                </tr>
                <tr>
                    <td className="pr-2">{annotation.maxUsedLabel}:</td>
                    <td>{formatNumber(annotation.maxUsed)}</td>
                </tr>
                <tr>
                    <td className="pr-2">Actual Min:</td>
                    <td>{formatNumber(annotation.actualMin)}</td>
                </tr>
                <tr>
                    <td className="pr-2">Actual Max:</td>
                    <td>{annotation.actualMax}</td>
                </tr>
                <tr>
                    <td className="pr-2">% of maxUsed:</td>
                    <td>{formatNumber(((Number(annotation.value) / (annotation.maxUsed || 1)) * 100))}%</td>
                </tr>
                <tr>
                    <td className="pr-2">% of max:</td>
                    <td>{formatNumber(((Number(annotation.value) / (annotation.actualMax || 1)) * 100))}%</td>
                </tr>
                <tr>
                    <td colSpan={2} className="pt-2">
                        <div className="relative w-full h-4 bg-gray-200 rounded">
                            <div className="absolute h-full bg-gray-400 rounded" style={{
                                zIndex: 100,
                                left: `${Math.min(100, Math.max(0, ((Number(annotation.minUsed) - (annotation.actualMin || 0)) /
                                    ((annotation.actualMax || 1) - (annotation.actualMin || 0))) * 100))}%`,
                                width: '1px'
                            }} />
                            <div className="absolute h-full bg-gray-400 rounded" style={{
                                zIndex: 100,
                                left: `${Math.min(100, Math.max(0, ((Number(annotation.maxUsed) - (annotation.actualMin || 0)) /
                                    ((annotation.actualMax || 1) - (annotation.actualMin || 0))) * 100))}%`, 
                                width: '1px'
                            }} />
                            <div className="absolute h-full bg-blue-500 rounded" style={{
                                width: `${Math.min(100, Math.max(0, ((Number(annotation.value) - (annotation.actualMin || 0)) /
                                    ((annotation.actualMax || 1) - (annotation.actualMin || 0))) * 100))}%`,
                                backgroundColor: annotation.color
                            }} />
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </>
);

const CompareTooltip: React.FC<{ annotation: LabelContent[0] }> = ({ annotation }) => (
    <table className="table-auto border-collapse">
        <tbody className="text-xs">
            <tr>
                <td className="pr-2">Compare Value:</td>
                <td>{formatNumber(Number(annotation.compValue))}</td>
            </tr>
            <tr>
                <td className="pr-2">Min:</td>
                <td>{annotation.minUsed} ({annotation.minUsedLabel})</td>
            </tr>
            <tr>
                <td className="pr-2">Max:</td>
                <td>{annotation.maxUsed} ({annotation.maxUsedLabel})</td>
            </tr>
            <tr>
                <td className="pr-2">Diff:</td>
                <td>{annotation.diffPercent}%</td>
            </tr>
            <tr>
                <td className="pr-2">% of maxUsed:</td>
                <td>{formatNumber(((Number(annotation.compValue) / (annotation.maxUsed || 1)) * 100))}%</td>
            </tr>
            <tr>
                <td className="pr-2">% of max:</td>
                <td>{formatNumber(((Number(annotation.compValue) / (annotation.actualMax || 1)) * 100))}%</td>
            </tr>
            <tr>
                <td colSpan={2} className="pt-2">
                    <div className="relative w-full h-4 bg-gray-200 rounded">
                        <div className="absolute h-full bg-gray-400 rounded" style={{
                            left: '10%',
                            width: '1px'
                        }} />
                        <div className="absolute h-full bg-gray-400 rounded" style={{
                            left: '90%',
                            width: '1px'
                        }} />
                        <div className="absolute h-full bg-blue-500 rounded" style={{
                            width: `${Math.min(100, Math.max(0, ((Number(annotation.compValue) - (annotation.minUsed || 0)) /
                                ((annotation.maxUsed || 1) - (annotation.minUsed || 0))) * 100))}%`,
                            backgroundColor: annotation.compColor
                        }} />
                    </div>
                </td>
            </tr>
        </tbody>
    </table>
);

// Add utility function to pair regular and scaled metrics
const pairMetrics = (annotations: LabelContent) => {
    const pairs: Record<string, { regular: LabelContent[0], scaled?: LabelContent[0] }> = {};
    
    annotations.forEach(annotation => {
        const baseKey = annotation.key.endsWith('_s') 
            ? annotation.key.slice(0, -2) 
            : annotation.key;
            
        if (!pairs[baseKey]) {
            pairs[baseKey] = { regular: annotation };
        } else if (annotation.key.endsWith('_s')) {
            pairs[baseKey].scaled = annotation;
        } else {
            pairs[baseKey].regular = annotation;
        }
    });
    
    return pairs;
};

const MetricRow: React.FC<{ 
    regular: LabelContent[0], 
    scaled?: LabelContent[0] 
}> = ({ regular, scaled }) => (
    <tr style={{ fontSize: '12px', backgroundColor: 'black', color: 'white' }}>
        <td className="w-1/8">{regular.key}</td>
        <td className="w-1/8 text-center">
            {Number(regular.value) < (regular.minUsed || 0) && '-'}
        </td>
        <td className="w-1/8">
            <div className="flex space-x-1">
                <Tippy content={<ValueTooltip annotation={regular} />}>
                    <div className="relative w-24 h-4 bg-gray-200 rounded">
                        <div className="absolute h-full bg-blue-500 rounded"
                            style={{
                                width: `${Math.min(100, Math.max(0, ((Number(regular.value) - (regular.minUsed || 0)) /
                                    ((regular.maxUsed || 1) - (regular.minUsed || 0))) * 100))}%`,
                                backgroundColor: regular.color
                            }} />
                    </div>
                </Tippy>
                {scaled && (
                    <Tippy content={<ValueTooltip annotation={scaled} />}>
                        <div className="relative w-24 h-4 bg-gray-200 rounded">
                            <div className="absolute h-full bg-blue-500 rounded"
                                style={{
                                    width: `${Math.min(100, Math.max(0, ((Number(scaled.value) - (scaled.minUsed || 0)) /
                                        ((scaled.maxUsed || 1) - (scaled.minUsed || 0))) * 100))}%`,
                                    backgroundColor: scaled.color,
                                    opacity: 0.5
                                }} />
                        </div>
                    </Tippy>
                )}
            </div>
        </td>
        <td className="w-1/8 text-center">
            {Number(regular.value) > (regular.maxUsed || 1) && '+'}
        </td>
        <td className="w-1/8 text-center">
            {regular.compValue && Number(regular.compValue) < (regular.minUsed || 0) && '-'}
        </td>
        <td className="w-1/8">
            <div className="flex space-x-1">
                {regular.compValue && (
                    <Tippy content={<CompareTooltip annotation={regular} />}>
                        <div className="relative w-24 h-4 bg-gray-200 rounded">
                            <div className="absolute h-full bg-blue-500 rounded"
                                style={{
                                    width: `${Math.min(100, Math.max(0, ((Number(regular.compValue) - (regular.minUsed || 0)) /
                                        ((regular.maxUsed || 1) - (regular.minUsed || 0))) * 100))}%`,
                                    backgroundColor: regular.compColor
                                }} />
                        </div>
                    </Tippy>
                )}
                {scaled && scaled.compValue && (
                    <Tippy content={<CompareTooltip annotation={scaled} />}>
                        <div className="relative w-24 h-4 bg-gray-200 rounded">
                            <div className="absolute h-full bg-blue-500 rounded"
                                style={{
                                    width: `${Math.min(100, Math.max(0, ((Number(scaled.compValue) - (scaled.minUsed || 0)) /
                                        ((scaled.maxUsed || 1) - (scaled.minUsed || 0))) * 100))}%`,
                                    backgroundColor: scaled.compColor,
                                    opacity: 0.5
                                }} />
                        </div>
                    </Tippy>
                )}
            </div>
        </td>
        <td className="w-1/8 text-center">
            {regular.compValue && Number(regular.compValue) > (regular.maxUsed || 1) && '+'}
        </td>
        <td className="w-1/8">
            {regular.diffPercent && <p style={{ color: regular.diffPercentColor }}>{formatNumber(regular.diffPercent)}%</p>}
        </td>
    </tr>
);

const MetricGroup: React.FC<{
    groupName: string,
    annotations: LabelContent,
    isMostUseful?: boolean
}> = ({ groupName, annotations, isMostUseful }) => {
    const pairs = pairMetrics(annotations);
    
    return (
        <React.Fragment>
            <tr>
                <td colSpan={8} className="font-semibold bg-base-200 p-1">{groupName}</td>
            </tr>
            {Object.entries(pairs).map(([key, pair]) => (
                <MetricRow key={key} regular={pair.regular} scaled={pair.scaled} />
            ))}
        </React.Fragment>
    );
};

// Extract sorting logic into utility function
const sortAnnotations = (annotations: LabelContent, sortType: SortType) => {
    if (sortType === 'extremes') {
        return [...annotations].sort((a, b) => {
            const aDistance = Math.max(
                Math.abs((Number(a.value) - (a.minUsed || 0)) / ((a.maxUsed || 1) - (a.minUsed || 0)) - 0.5),
                Math.abs((Number(a.compValue || 0) - (a.minUsed || 0)) / ((a.maxUsed || 1) - (a.minUsed || 0)) - 0.5)
            );
            const bDistance = Math.max(
                Math.abs((Number(b.value) - (b.minUsed || 0)) / ((b.maxUsed || 1) - (b.minUsed || 0)) - 0.5),
                Math.abs((Number(b.compValue || 0) - (b.minUsed || 0)) / ((b.maxUsed || 1) - (b.minUsed || 0)) - 0.5)
            );
            return bDistance - aDistance;
        });
    }
    return [...annotations];
};

// Extract grouping logic into utility function
const groupAnnotations = (annotations: LabelContent) => {
    return annotations.reduce((acc, curr) => {
        const group = curr.mostUseful ? 'Most Useful' : (curr.keyGroup || 'Other');
        acc[group] = acc[group] || [];
        acc[group].push(curr);
        return acc;
    }, {} as Record<string, typeof annotations>);
};

const formatNumber = (num: number): string => {
    if (isNaN(num) || num === undefined) return '-';
    if (Math.abs(num) < 0.000001) return '0';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 20,
        useGrouping: false
    });
};

export const MetricsTable: React.FC<MetricsTableProps> = ({ annotations }) => {
    const [sortType, setSortType] = useState<SortType>('default');

    const sortedAnnotations = sortAnnotations(annotations, sortType);
    const groupedAnnotations = groupAnnotations(sortedAnnotations);

    return (
        <div className="overflow-auto h-full">
            <div className="flex space-x-4 mb-4">
                <select
                    className="select select-bordered w-full max-w-xs"
                    value={sortType}
                    onChange={(e) => setSortType(e.target.value as SortType)}
                >
                    <option value="default">Default Sort</option>
                    <option value="extremes">Sort by Extremes</option>
                </select>
            </div>

            <table className="w-full">
                <thead>
                    <tr className="text-xs">
                        <th className="w-1/8">Key</th>
                        <th className="w-1/8">Min</th>
                        <th className="w-1/8">
                            <div className="flex space-x-1">
                                <div className="w-24 text-center">Value</div>
                                <div className="w-24 text-center">Scaled</div>
                            </div>
                        </th>
                        <th className="w-1/8">Max</th>
                        <th className="w-1/8">Min</th>
                        <th className="w-1/8">
                            <div className="flex space-x-1">
                                <div className="w-24 text-center">Compare</div>
                                <div className="w-24 text-center">Scaled</div>
                            </div>
                        </th>
                        <th className="w-1/8">Max</th>
                        <th className="w-1/8">Diff%</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Most Useful group first */}
                    {groupedAnnotations['Most Useful'] && (
                        <MetricGroup 
                            groupName="Most Useful" 
                            annotations={groupedAnnotations['Most Useful']} 
                            isMostUseful={true}
                        />
                    )}

                    {/* Other groups */}
                    {Object.entries(groupedAnnotations)
                        .filter(([groupName]) => groupName !== 'Most Useful')
                        .map(([groupName, groupAnnotations]) => (
                            <MetricGroup 
                                key={groupName} 
                                groupName={groupName} 
                                annotations={groupAnnotations}
                            />
                        ))}
                </tbody>
            </table>
        </div>
    );
}; 