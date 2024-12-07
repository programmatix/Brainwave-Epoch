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
                    <td className="pr-2">Value:</td>
                    <td>{annotation.value}</td>
                </tr>
                <tr>
                    <td className="pr-2">{annotation.minUsedLabel}:</td>
                    <td>{annotation.minUsed}</td>
                </tr>
                <tr>
                    <td className="pr-2">{annotation.maxUsedLabel}:</td>
                    <td>{annotation.maxUsed}</td>
                </tr>
                <tr>
                    <td className="pr-2">Actual Min:</td>
                    <td>{annotation.actualMin}</td>
                </tr>
                <tr>
                    <td className="pr-2">Actual Max:</td>
                    <td>{annotation.actualMax}</td>
                </tr>
                <tr>
                    <td className="pr-2">% of maxUsed:</td>
                    <td>{((Number(annotation.value) / (annotation.maxUsed || 1)) * 100).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td className="pr-2">% of max:</td>
                    <td>{((Number(annotation.value) / (annotation.actualMax || 1)) * 100).toFixed(1)}%</td>
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
                <td>{annotation.compValue}</td>
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
                <td>{((Number(annotation.compValue) / (annotation.maxUsed || 1)) * 100).toFixed(1)}%</td>
            </tr>
            <tr>
                <td className="pr-2">% of max:</td>
                <td>{((Number(annotation.compValue) / (annotation.actualMax || 1)) * 100).toFixed(1)}%</td>
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

// Extract row rendering into separate component
const MetricRow: React.FC<{ annotation: LabelContent[0] }> = ({ annotation }) => (
    <tr style={{ fontSize: '12px', backgroundColor: 'black', color: 'white' }}>
        <td className="w-1/8">{annotation.key}</td>
        <td className="w-1/8 text-center">
            {Number(annotation.value) < (annotation.minUsed || 0) && '-'}
        </td>
        <td className="w-1/8">
            <Tippy content={<ValueTooltip annotation={annotation} />}>
                <div className="space-y-1">
                    <div className="relative w-24 h-4 bg-gray-200 rounded">
                        <div className="absolute h-full bg-blue-500 rounded"
                            style={{
                                width: `${Math.min(100, Math.max(0, ((Number(annotation.value) - (annotation.minUsed || 0)) /
                                    ((annotation.maxUsed || 1) - (annotation.minUsed || 0))) * 100))}%`,
                                backgroundColor: annotation.color
                            }} />
                    </div>
                </div>
            </Tippy>
        </td>
        <td className="w-1/8 text-center">
            {Number(annotation.value) > (annotation.maxUsed || 1) && '+'}
        </td>
        <td className="w-1/8 text-center">
            {annotation.compValue && Number(annotation.compValue) < (annotation.minUsed || 0) && '-'}
        </td>
        <td className="w-1/8">
            {annotation.compValue && (
                <Tippy content={<CompareTooltip annotation={annotation} />}>
                    <div className="space-y-1">
                        <div className="relative w-24 h-4 bg-gray-200 rounded">
                            <div className="absolute h-full bg-blue-500 rounded"
                                style={{
                                    width: `${Math.min(100, Math.max(0, ((Number(annotation.compValue) - (annotation.minUsed || 0)) /
                                        ((annotation.maxUsed || 1) - (annotation.minUsed || 0))) * 100))}%`,
                                    backgroundColor: annotation.compColor
                                }} />
                        </div>
                    </div>
                </Tippy>
            )}
        </td>
        <td className="w-1/8 text-center">
            {annotation.compValue && Number(annotation.compValue) > (annotation.maxUsed || 1) && '+'}
        </td>
        <td className="w-1/8">
            {<p style={{ color: annotation.diffPercentColor }}>{annotation.diffPercent?.toFixed(0) ?? "-"}%</p>}
        </td>
    </tr>
);

// Extract group rendering into separate component 
const MetricGroup: React.FC<{
    groupName: string,
    annotations: LabelContent,
    isMostUseful?: boolean
}> = ({ groupName, annotations, isMostUseful }) => (
    <React.Fragment>
        <tr>
            <td colSpan={8} className="font-semibold bg-base-200 p-1">{groupName}</td>
        </tr>
        {annotations.map((annotation, i) => (
            <MetricRow key={i} annotation={annotation} />
        ))}
    </React.Fragment>
);

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
        const scaledGroup = curr.scaled ? 'Scaled' : 'Unscaled';
        const group = curr.mostUseful ? 'Most Useful' : (curr.keyGroup || 'Other');
        acc[scaledGroup] = acc[scaledGroup] || {};
        acc[scaledGroup][group] = acc[scaledGroup][group] || [];
        acc[scaledGroup][group].push(curr);
        return acc;
    }, {} as Record<string, Record<string, typeof annotations>>);
};

export const MetricsTable: React.FC<MetricsTableProps> = ({ annotations }) => {
    const [sortType, setSortType] = useState<SortType>('default');
    const [showScaled, setShowScaled] = useState(true);
    const [showUnscaled, setShowUnscaled] = useState(true);

    const sortedAnnotations = sortAnnotations(annotations, sortType);

    const filteredAnnotations = sortedAnnotations.filter(a =>
        (a.scaled && showScaled) || (!a.scaled && showUnscaled)
    );

    const groupOrder = [
        'Relative bandpowers',
        'Power',
        'Complexity',
        'Relative bandpowers derived',
        'Absolute bandpowers',
        'Absolute bandpowers derived',
        'Derived',
        'Other'
    ];

    const groupedAnnotations = groupAnnotations(filteredAnnotations);

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

                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={showScaled}
                        onChange={() => setShowScaled(!showScaled)}
                        className="toggle toggle-primary"
                    />
                    <span>Show Scaled</span>
                </label>

                <label className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        checked={showUnscaled}
                        onChange={() => setShowUnscaled(!showUnscaled)}
                        className="toggle toggle-primary"
                    />
                    <span>Show Unscaled</span>
                </label>
            </div>

            <table className="w-full">
                <tbody>
                    {Object.entries(groupedAnnotations).map(([scaledGroup, groups]) => (
                        <React.Fragment key={scaledGroup}>
                            <tr>
                                <td colSpan={8} className="font-bold bg-base-300 p-2">{scaledGroup}</td>
                            </tr>

                            {/* Most Useful group first */}
                            {groups['Most Useful'] && (
                                <>
                                    <tr>
                                        <td colSpan={8} className="font-semibold bg-base-200 p-1">Most Useful</td>
                                    </tr>
                                    {groups['Most Useful'].map((annotation, i) => (
                                        <MetricRow key={i} annotation={annotation} />
                                    ))}
                                </>
                            )}

                            {/* Other groups */}
                            {groupOrder.map(groupName =>
                                groups[groupName] && (
                                    <MetricGroup key={groupName} groupName={groupName} annotations={groups[groupName]} />
                                )
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}; 