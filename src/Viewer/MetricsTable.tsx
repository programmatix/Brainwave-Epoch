import React, { useState } from 'react';
import { LabelContent, LabelContentItem, NormalizedValue } from './ChartUtils';
import Tippy from '@tippyjs/react';
import 'tippy.js/dist/tippy.css';

type SortType = 'default' | 'extremes';

interface MetricsTableProps {
    annotations: LabelContent; 
}

type ValueSelector = 
  'normalizedAgainst.forLocalFile.All' | 
  'normalizedAgainst.forLocalFile.Sleep' |
  'normalizedAgainst.forLocalFile.NonDeepSleep' |
  'normalizedAgainst.forLocalFile.W' |
  'normalizedAgainst.forLocalFile.N1' |
  'normalizedAgainst.forLocalFile.N2' |
  'normalizedAgainst.forLocalFile.N3' |
  'normalizedAgainst.forLocalFile.R' |
  'normalizedAgainst.forAllStats.All' |
  'normalizedAgainst.forAllStats.Sleep' |
  'normalizedAgainst.forAllStats.NonDeepSleep' |
  'normalizedAgainst.forAllStats.W' |
  'normalizedAgainst.forAllStats.N1' |
  'normalizedAgainst.forAllStats.N2' |
  'normalizedAgainst.forAllStats.N3' |
  'normalizedAgainst.forAllStats.R' |
  'currentStage.forLocalFile' |
  'currentStage.forAllStats' |
  'currentBroadStage.forLocalFile' |
  'currentBroadStage.forAllStats';

const ValueTooltip: React.FC<{ 
    annotation: LabelContentItem, 
    selector: ValueSelector,
}> = ({ annotation }) => {
    const allSelectors: ValueSelector[] = [
        'currentStage.forAllStats',
        'currentBroadStage.forAllStats',
        'normalizedAgainst.forAllStats.All',
        'normalizedAgainst.forAllStats.Sleep', 
        'normalizedAgainst.forAllStats.NonDeepSleep',
        'normalizedAgainst.forAllStats.W',
        'normalizedAgainst.forAllStats.N1',
        'normalizedAgainst.forAllStats.N2',
        'normalizedAgainst.forAllStats.N3',
        'normalizedAgainst.forAllStats.R',
        'currentStage.forLocalFile',
        'currentBroadStage.forLocalFile',
        'normalizedAgainst.forLocalFile.All',
        'normalizedAgainst.forLocalFile.Sleep',
        'normalizedAgainst.forLocalFile.NonDeepSleep', 
        'normalizedAgainst.forLocalFile.W',
        'normalizedAgainst.forLocalFile.N1',
        'normalizedAgainst.forLocalFile.N2',
        'normalizedAgainst.forLocalFile.N3',
        'normalizedAgainst.forLocalFile.R'
    ];

    const formatLabel = (selector: ValueSelector): string => {
        if (selector.startsWith('currentStage')) {
            return `Current Stage (${annotation.currentEpochStage})`;
        }
        if (selector.startsWith('currentBroadStage')) {
            return `Current Broad Stage (${annotation.currentEpochStage})`;
        }
        const [, , stage] = selector.split('.');
        return stage;
    };

    return (
        <div className="p-2" style={{ minWidth: '800px' }}>
            <div className="mb-4">
                <p>Key: {annotation.key}</p>
                <p>Value: {formatNumber(annotation.value)}</p>
                <p>Channel: {annotation.channel}</p>
                <p>Current Epoch: {annotation.currentEpoch}</p>
                <p>Current Epoch Stage: {annotation.currentEpochStage}</p>
                <p>Current Broad Epoch Stage: {stageToBroadStage(annotation.currentEpochStage)}</p>
            </div>
            <table className="table table-xs table-zebra w-full">
                <thead>
                    <tr>
                        <th className="whitespace-nowrap"></th>
                        <th style={{ width: '100px' }}>p10</th>
                        <th style={{ width: '100px' }}>p90</th>
                        <th style={{ width: '100px' }}>p10 - a set amount</th>
                        <th style={{ width: '100px' }}>p90 + a set amount</th>
                        <th className="w-96">Distribution (lines are p10 and p90)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colSpan={6} className="font-bold bg-base-200">All Files</td>
                    </tr>
                    {allSelectors.filter(s => s.includes('forAllStats')).map(selector => {
                        const normalizedData = selectNormalizedValue(annotation, selector, annotation.currentEpochStage);
                        return (
                            <tr key={selector}>
                                <td className="whitespace-nowrap">{formatLabel(selector)}</td>
                                <td>{formatNumber(normalizedData.minUsed)}</td>
                                <td>{formatNumber(normalizedData.maxUsed)}</td>
                                <td>{formatNumber(normalizedData.usefulMin)}</td>
                                <td>{formatNumber(normalizedData.usefulMax)}</td>
                                <td>
                                    <div className="relative w-full h-2 bg-gray-200 rounded">
                                        <div className="absolute h-full rounded" style={{
                                            width: `${Math.min(100, Math.max(0, ((annotation.value - normalizedData.usefulMin) /
                                                (normalizedData.usefulMax - normalizedData.usefulMin)) * 100))}%`,
                                            backgroundColor: normalizedData.color
                                        }} />
                                        <div className="absolute h-full border-l border-black" style={{
                                            left: `${((normalizedData.minUsed - normalizedData.usefulMin) /
                                                (normalizedData.usefulMax - normalizedData.usefulMin)) * 100}%`
                                        }} />
                                        <div className="absolute h-full border-l border-black" style={{
                                            left: `${((normalizedData.maxUsed - normalizedData.usefulMin) /
                                                (normalizedData.usefulMax - normalizedData.usefulMin)) * 100}%`
                                        }} />
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    <tr>
                        <td colSpan={6} className="font-bold bg-base-200">This File</td>
                    </tr>
                    {allSelectors.filter(s => s.includes('forLocalFile')).map(selector => {
                        const normalizedData = selectNormalizedValue(annotation, selector, annotation.currentEpochStage);
                        return (
                            <tr key={selector}>
                                <td className="whitespace-nowrap">{formatLabel(selector)}</td>
                                <td>{formatNumber(normalizedData.minUsed)}</td>
                                <td>{formatNumber(normalizedData.maxUsed)}</td>
                                <td>{formatNumber(normalizedData.usefulMin)}</td>
                                <td>{formatNumber(normalizedData.usefulMax)}</td>
                                <td>
                                    <div className="relative w-full h-2 bg-gray-200 rounded">
                                        <div className="absolute h-full rounded" style={{
                                            width: `${Math.min(100, Math.max(0, ((annotation.value - normalizedData.usefulMin) /
                                                (normalizedData.usefulMax - normalizedData.usefulMin)) * 100))}%`,
                                            backgroundColor: normalizedData.color
                                        }} />
                                        <div className="absolute h-full border-l border-black" style={{
                                            left: `${((normalizedData.minUsed - normalizedData.usefulMin) /
                                                (normalizedData.usefulMax - normalizedData.usefulMin)) * 100}%`
                                        }} />
                                        <div className="absolute h-full border-l border-black" style={{
                                            left: `${((normalizedData.maxUsed - normalizedData.usefulMin) /
                                                (normalizedData.usefulMax - normalizedData.usefulMin)) * 100}%`
                                        }} />
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const CompareTooltip: React.FC<{ annotation: LabelContent[0] }> = ({ annotation }) => (
    <table className="table-auto border-collapse">
        <tbody className="text-xs">
            <tr>
                <td className="pr-2">Compare Value:</td>
                <td>{formatNumber(Number(annotation.compValue))}</td>
            </tr>
            <tr>
                <td className="pr-2">Min:</td>
                <td>{annotation.normalizedAgainst.forAllStats.All.minUsed} ({annotation.normalizedAgainst.forAllStats.All.minUsedLabel})</td>
            </tr>
            <tr>
                <td className="pr-2">Max:</td>
                <td>{annotation.normalizedAgainst.forAllStats.All.maxUsed} ({annotation.normalizedAgainst.forAllStats.All.maxUsedLabel})</td>
            </tr>
            <tr>
                <td className="pr-2">Diff:</td>
                <td>{annotation.diffPercent}%</td>
            </tr>
            <tr>
                <td colSpan={2} className="pt-2">
                    <div className="relative w-full h-4 bg-gray-200 rounded">
                        <div className="absolute h-full bg-blue-500 rounded" style={{
                            width: `${Math.min(100, Math.max(0, ((Number(annotation.compValue) - annotation.normalizedAgainst.forAllStats.All.minUsed) /
                                (annotation.normalizedAgainst.forAllStats.All.maxUsed - annotation.normalizedAgainst.forAllStats.All.minUsed)) * 100))}%`,
                            backgroundColor: annotation.compColor
                        }} />
                    </div>
                </td>
            </tr>
        </tbody>
    </table>
);

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

const stageToBroadStage = (stage: string): string => {
    const broadStageMap: Record<string, string> = {
        'W': 'W',
        'N1': 'NonDeepSleep',
        'N2': 'NonDeepSleep',
        'N3': 'Sleep',
        'R': 'NonDeepSleep'
    } as const;
    return broadStageMap[stage] || 'All' as string;
};

const stageToSelector = (stage: string, source: 'forLocalFile' | 'forAllStats', isBroad: boolean = false): ValueSelector => {
    if (isBroad) {
        const broadStage = stageToBroadStage(stage);
        return `normalizedAgainst.${source}.${broadStage}` as ValueSelector;
    }

    const stageMap: Record<string, ValueSelector> = {
        'W': `normalizedAgainst.${source}.W`,
        'N1': `normalizedAgainst.${source}.N1`,
        'N2': `normalizedAgainst.${source}.N2`,
        'N3': `normalizedAgainst.${source}.N3`,
        'R': `normalizedAgainst.${source}.R`
    } as const;
    
    return stageMap[stage] || `normalizedAgainst.${source}.All` as ValueSelector;
};

const selectNormalizedValue = (item: LabelContentItem, selector: ValueSelector, currentStage: string): NormalizedValue => {
    if (selector.startsWith('currentStage.') || selector.startsWith('currentBroadStage.')) {
        const source = selector.split('.')[1] as 'forLocalFile' | 'forAllStats';
        const isBroad = selector.startsWith('currentBroadStage.');
        selector = stageToSelector(currentStage, source, isBroad);
    }
    
    const [base, source, stage] = selector.split('.');
    return item[base][source][stage];
};

const MetricRow: React.FC<{ 
    regular: LabelContent[0],  
    scaled?: LabelContent[0],
    leftSelector: ValueSelector,
    rightSelector: ValueSelector 
}> = ({ regular, scaled, leftSelector, rightSelector }) => {
    const currentStage = regular.currentEpochStage;
    
    const getProgressValue = (annotation: LabelContentItem, selector: ValueSelector) => {
        const normalizedData = selectNormalizedValue(annotation, selector, currentStage);
        return normalizedData.normalizedValue * 100;
    };

    return (
        <tr style={{ fontSize: '12px', backgroundColor: 'black', color: 'white' }}>
            <td className="w-1/8">{regular.key}</td>
            <td className="w-1/8">
                <div className="flex space-x-1">
                    <Tippy content={<ValueTooltip annotation={regular} selector={leftSelector} />}
                           maxWidth={1000}
                           interactive={true}>
                        <div className="relative w-24 h-4 bg-gray-200 rounded">
                            <div className="absolute h-full bg-blue-500 rounded"
                                style={{
                                    width: `${Math.min(100, Math.max(0, getProgressValue(regular, leftSelector)))}%`,
                                    backgroundColor: selectNormalizedValue(regular, leftSelector, currentStage).color
                                }} />
                        </div>
                    </Tippy>

                    <Tippy content={<ValueTooltip annotation={regular} selector={rightSelector} />}
                           maxWidth={1000}
                           interactive={true}>
                        <div className="relative w-24 h-4 bg-gray-200 rounded">
                            <div className="absolute h-full bg-blue-500 rounded"
                                style={{
                                    width: `${Math.min(100, Math.max(0, getProgressValue(regular, rightSelector)))}%`,
                                    backgroundColor: selectNormalizedValue(regular, rightSelector, currentStage).color
                                }} />
                        </div>
                    </Tippy>
                </div>
            </td>
            <td className="w-1/8 text-center">
                {regular.value < regular.normalizedAgainst.forAllStats.All.minUsed && '-'}
            </td>
            <td className="w-1/8">
                <div className="flex space-x-1">
                    {regular.compValue && (
                        <Tippy content={<CompareTooltip annotation={regular} />}>
                            <div className="relative w-24 h-4 bg-gray-200 rounded">
                                <div className="absolute h-full bg-blue-500 rounded"
                                    style={{
                                        width: `${Math.min(100, Math.max(0, ((Number(regular.compValue) - regular.normalizedAgainst.forAllStats.All.minUsed) /
                                            (regular.normalizedAgainst.forAllStats.All.maxUsed - regular.normalizedAgainst.forAllStats.All.minUsed)) * 100))}%`,
                                        backgroundColor: regular.compColor
                                    }} />
                            </div>
                        </Tippy>
                    )}
                </div>
            </td>
            <td className="w-1/8 text-center">
                {regular.compValue && Number(regular.compValue) > regular.normalizedAgainst.forAllStats.All.maxUsed && '+'}
            </td>
            <td className="w-1/8">
                {regular.diffPercent && <p style={{ color: regular.diffPercentColor }}>{formatNumber(regular.diffPercent)}%</p>}
            </td>
        </tr>
    );
};

const MetricGroup: React.FC<{
    groupName: string,
    annotations: LabelContent,
    isMostUseful?: boolean,
    leftSelector: ValueSelector,
    rightSelector: ValueSelector
}> = ({ groupName, annotations, isMostUseful, leftSelector, rightSelector }) => {
    const pairs = pairMetrics(annotations);
    
    return (
        <React.Fragment>
            <tr>
                <td colSpan={8} className="font-semibold bg-base-200 p-1">{groupName}</td>
            </tr>
            {Object.entries(pairs).map(([key, pair]) => (
                <MetricRow 
                    key={key} 
                    regular={pair.regular} 
                    scaled={pair.scaled}
                    leftSelector={leftSelector}
                    rightSelector={rightSelector}
                />
            ))}
        </React.Fragment>
    );
};

const sortAnnotations = (annotations: LabelContent, sortType: SortType) => {
    if (sortType === 'extremes') {
        return [...annotations].sort((a, b) => {
            const aDistance = Math.max(
                Math.abs(a.normalizedAgainst.forAllStats.All.normalizedValue - 0.5),
                Math.abs((Number(a.compValue || 0) - a.normalizedAgainst.forAllStats.All.minUsed) / 
                    (a.normalizedAgainst.forAllStats.All.maxUsed - a.normalizedAgainst.forAllStats.All.minUsed) - 0.5)
            );
            const bDistance = Math.max(
                Math.abs(b.normalizedAgainst.forAllStats.All.normalizedValue - 0.5),
                Math.abs((Number(b.compValue || 0) - b.normalizedAgainst.forAllStats.All.minUsed) /
                    (b.normalizedAgainst.forAllStats.All.maxUsed - b.normalizedAgainst.forAllStats.All.minUsed) - 0.5)
            );
            return bDistance - aDistance;
        });
    }
    return [...annotations];
};

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
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
        useGrouping: false
    });
};

const ValueSelectorDropdown: React.FC<{
    value: ValueSelector,
    onChange: (value: ValueSelector) => void
}> = ({ value, onChange }) => (
    <select 
        className="select select-bordered w-64"
        value={value}
        onChange={e => onChange(e.target.value as ValueSelector)}
    >
        <option value="currentStage.forLocalFile">This file: Current Stage</option>
        <option value="currentStage.forAllStats">All files: Current Stage</option>
        <option value="currentBroadStage.forLocalFile">This file: Current Broad Stage</option>
        <option value="currentBroadStage.forAllStats">All files: Current Broad Stage</option>
        <optgroup label="This File">
            <option value="normalizedAgainst.forLocalFile.All">This file: All Stages</option>
            <option value="normalizedAgainst.forLocalFile.Sleep">This file: Sleep</option>
            <option value="normalizedAgainst.forLocalFile.NonDeepSleep">This file: Non Deep Sleep</option>
            <option value="normalizedAgainst.forLocalFile.W">This file: Wake</option>
            <option value="normalizedAgainst.forLocalFile.N1">This file: N1</option>
            <option value="normalizedAgainst.forLocalFile.N2">This file: N2</option>
            <option value="normalizedAgainst.forLocalFile.N3">This file: N3</option>
            <option value="normalizedAgainst.forLocalFile.R">This file: REM</option>
        </optgroup>
        <optgroup label="All Files">
            <option value="normalizedAgainst.forAllStats.All">All files: All Stages</option>
            <option value="normalizedAgainst.forAllStats.Sleep">All files: Sleep</option>
            <option value="normalizedAgainst.forAllStats.NonDeepSleep">All files: Non Deep Sleep</option>
            <option value="normalizedAgainst.forAllStats.W">All files: Wake</option>
            <option value="normalizedAgainst.forAllStats.N1">All files: N1</option>
            <option value="normalizedAgainst.forAllStats.N2">All files: N2</option>
            <option value="normalizedAgainst.forAllStats.N3">All files: N3</option>
            <option value="normalizedAgainst.forAllStats.R">All files: REM</option>
        </optgroup>
    </select>
);

export const MetricsTable: React.FC<MetricsTableProps> = ({ annotations }) => {
    const [sortType, setSortType] = useState<SortType>('default');
    const [leftSelector, setLeftSelector] = useState<ValueSelector>('currentStage.forAllStats');
    const [rightSelector, setRightSelector] = useState<ValueSelector>('currentBroadStage.forAllStats');

    const sortedAnnotations = sortAnnotations(annotations, sortType);
    const groupedAnnotations = groupAnnotations(sortedAnnotations);

    return (
        <div className="overflow-auto h-full">
            <div className="flex flex-col space-y-4 mb-4">
                <div className="flex justify-between items-center">
                    <select
                        className="select select-bordered w-48"
                        value={sortType}
                        onChange={(e) => setSortType(e.target.value as SortType)}
                    >
                        <option value="default">Default Sort</option>
                        <option value="extremes">Sort by Extremes</option>
                    </select>
                </div>
                <div className="flex justify-between">
                    <ValueSelectorDropdown value={leftSelector} onChange={setLeftSelector} />
                    <ValueSelectorDropdown value={rightSelector} onChange={setRightSelector} />
                </div>
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
                    {groupedAnnotations['Most Useful'] && (
                        <MetricGroup 
                            groupName="Most Useful" 
                            annotations={groupedAnnotations['Most Useful']} 
                            isMostUseful={true}
                            leftSelector={leftSelector}
                            rightSelector={rightSelector}
                        />
                    )}

                    {Object.entries(groupedAnnotations)
                        .filter(([groupName]) => groupName !== 'Most Useful')
                        .map(([groupName, groupAnnotations]) => (
                            <MetricGroup 
                                key={groupName} 
                                groupName={groupName} 
                                annotations={groupAnnotations}
                                leftSelector={leftSelector}
                                rightSelector={rightSelector}
                            />
                        ))}
                </tbody>
            </table>
        </div>
    );
};