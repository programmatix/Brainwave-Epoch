import React, { useState } from 'react';
import { LabelContent } from './ChartUtils';
import Tippy from '@tippyjs/react';

type SortType = 'default' | 'extremes';

interface MetricsTableProps {
    annotations: LabelContent;
}

export const MetricsTable: React.FC<MetricsTableProps> = ({ annotations }) => {
    const [sortType, setSortType] = useState<SortType>('default');
    const [showScaled, setShowScaled] = useState(true);
    const [showUnscaled, setShowUnscaled] = useState(true);

    const sortedAnnotations = [...annotations].sort((a, b) => {
        if (sortType === 'extremes') {
            const aDistance = Math.max(
                Math.abs((Number(a.value) - (a.minUsed || 0)) / ((a.maxUsed || 1) - (a.minUsed || 0)) - 0.5),
                Math.abs((Number(a.compValue || 0) - (a.minUsed || 0)) / ((a.maxUsed || 1) - (a.minUsed || 0)) - 0.5)
            );
            const bDistance = Math.max(
                Math.abs((Number(b.value) - (b.minUsed || 0)) / ((b.maxUsed || 1) - (b.minUsed || 0)) - 0.5),
                Math.abs((Number(b.compValue || 0) - (b.minUsed || 0)) / ((b.maxUsed || 1) - (b.minUsed || 0)) - 0.5)
            );
            return bDistance - aDistance;
        }
        return 0;
    });

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

    const groupedAnnotations = filteredAnnotations.reduce((acc, curr) => {
        const scaledGroup = curr.scaled ? 'Scaled' : 'Unscaled';
        const group = curr.mostUseful ? 'Most Useful' : (curr.keyGroup || 'Other');
        acc[scaledGroup] = acc[scaledGroup] || {};
        acc[scaledGroup][group] = acc[scaledGroup][group] || [];
        acc[scaledGroup][group].push(curr);
        return acc;
    }, {} as Record<string, Record<string, typeof annotations>>);

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
                                        <tr key={i} style={{ fontSize: '12px', backgroundColor: 'black', color: 'white' }}>
                                            <td className="w-1/8">{annotation.key}</td>
                                            <td className="w-1/8 text-center">
                                                {Number(annotation.value) < (annotation.minUsed || 0) && '-'}
                                            </td>
                                            <td className="w-1/8">
                                                <Tippy content={`Value: ${annotation.value}
Min: ${annotation.minUsed} (${annotation.minUsedLabel})
Max: ${annotation.maxUsed} (${annotation.maxUsedLabel}) 
Actual Min: ${annotation.actualMin}
Actual Max: ${annotation.actualMax}`}>
                                                    <div className="relative w-24 h-4 bg-gray-200 rounded">
                                                        <div className="absolute h-full bg-blue-500 rounded" 
                                                             style={{
                                                                 width: `${Math.min(100, Math.max(0, ((Number(annotation.value) - (annotation.minUsed || 0)) / 
                                                                      ((annotation.maxUsed || 1) - (annotation.minUsed || 0))) * 100))}%`,
                                                                 backgroundColor: annotation.color
                                                             }}/>
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
                                                    <Tippy content={`Compare Value: ${annotation.compValue}
Min: ${annotation.minUsed} (${annotation.minUsedLabel})
Max: ${annotation.maxUsed} (${annotation.maxUsedLabel})
Diff: ${annotation.diffPercent}%`}>
                                                        <div className="relative w-24 h-4 bg-gray-200 rounded">
                                                            <div className="absolute h-full bg-blue-500 rounded"
                                                                 style={{
                                                                     width: `${Math.min(100, Math.max(0, ((Number(annotation.compValue) - (annotation.minUsed || 0)) /
                                                                              ((annotation.maxUsed || 1) - (annotation.minUsed || 0))) * 100))}%`,
                                                                     backgroundColor: annotation.compColor
                                                                 }}/>
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
                                    ))}
                                </>
                            )}

                            {/* Other groups */}
                            {groupOrder.map(groupName => 
                                groups[groupName] && (
                                    <React.Fragment key={groupName}>
                                        <tr>
                                            <td colSpan={8} className="font-semibold bg-base-200 p-1">{groupName}</td>
                                        </tr>
                                        {groups[groupName].map((annotation, i) => (
                                            <tr key={i} style={{ fontSize: '12px', backgroundColor: 'black', color: 'white' }}>
                                                <td className="w-1/8">{annotation.key}</td>
                                                <td className="w-1/8 text-center">
                                                    {Number(annotation.value) < (annotation.minUsed || 0) && '-'}
                                                </td>
                                                <td className="w-1/8">
                                                    <Tippy content={`Value: ${annotation.value}
Min: ${annotation.minUsed} (${annotation.minUsedLabel})
Max: ${annotation.maxUsed} (${annotation.maxUsedLabel}) 
Actual Min: ${annotation.actualMin}
Actual Max: ${annotation.actualMax}`}>
                                                        <div className="relative w-24 h-4 bg-gray-200 rounded">
                                                            <div className="absolute h-full bg-blue-500 rounded" 
                                                                 style={{
                                                                     width: `${Math.min(100, Math.max(0, ((Number(annotation.value) - (annotation.minUsed || 0)) / 
                                                                      ((annotation.maxUsed || 1) - (annotation.minUsed || 0))) * 100))}%`,
                                                                     backgroundColor: annotation.color
                                                                 }}/>
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
                                                        <Tippy content={`Compare Value: ${annotation.compValue}
Min: ${annotation.minUsed} (${annotation.minUsedLabel})
Max: ${annotation.maxUsed} (${annotation.maxUsedLabel})
Diff: ${annotation.diffPercent}%`}>
                                                            <div className="relative w-24 h-4 bg-gray-200 rounded">
                                                                <div className="absolute h-full bg-blue-500 rounded"
                                                                     style={{
                                                                         width: `${Math.min(100, Math.max(0, ((Number(annotation.compValue) - (annotation.minUsed || 0)) /
                                                                                  ((annotation.maxUsed || 1) - (annotation.minUsed || 0))) * 100))}%`,
                                                                         backgroundColor: annotation.compColor
                                                                     }}/>
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
                                        ))}
                                    </React.Fragment>
                                )
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}; 