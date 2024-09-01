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
            <button onClick={() => handleRandomCompare('W')} className="bg-green-500 text-white p-1 rounded">Random W</button>
            <button onClick={() => handleRandomCompare('N1')} className="bg-yellow-500 text-white p-1 rounded">Random N1</button>
            <button onClick={() => handleRandomCompare('N2')} className="bg-orange-500 text-white p-1 rounded">Random N2</button>
            <button onClick={() => handleRandomCompare('N3')} className="bg-red-500 text-white p-1 rounded">Random N3</button>
            <button onClick={() => handleRandomCompare('R')} className="bg-purple-500 text-white p-1 rounded">Random R</button>
        </div>
    );
};