import React from 'react';

interface ComparisonControlsProps {
    compareEpochInput: string;
    setCompareEpochInput: (value: string) => void;
    handleCompare: () => void;
    handleRandomCompare: (stage: string) => void;
    clearCompare: () => void;
}

export const ComparisonControls: React.FC<ComparisonControlsProps> = ({
    compareEpochInput,
    setCompareEpochInput,
    handleCompare,
    handleRandomCompare,
    clearCompare
}) => {
    return (
        <div className="flex items-center space-x-2 mb-2">
            <input
                type="text"
                value={compareEpochInput}
                onChange={(e) => setCompareEpochInput(e.target.value)}
                placeholder="Enter epoch to compare"
                className="border p-1"
            />
            <button onClick={handleCompare} className="bg-blue-500 text-white p-1 rounded">Compare</button>
            <button onClick={clearCompare} className="bg-gray-500 text-white p-1 rounded">Clear Compare</button>
        </div>
    );
};