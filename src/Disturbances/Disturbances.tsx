import React, { useState, useEffect } from 'react';
import { AllData, DisturbanceEntry, DisturbanceValue } from "../Loader/LoaderTypes";
import { StoreState, useStore } from '../Store/Store';

interface DisturbancesComponentProps {
    scrollPosition: number;
    samplesPerEpoch: number;
    allData: AllData;
    handleNextEpoch: () => void;
}

const DISTURBANCE_OPTIONS: DisturbanceValue[] = ['Unset', 'No', 'Yes', 'Unclear'];

export const DisturbancesComponent: React.FC<DisturbancesComponentProps> = ({ scrollPosition, samplesPerEpoch, allData, handleNextEpoch }) => {
    const [currentDisturbance, setCurrentDisturbance] = useState<DisturbanceEntry>({
        epochIndex: Math.floor(scrollPosition / samplesPerEpoch),
        scoredAt: new Date().toISOString(),
        noseMotion: 'Unset',
        mouthFlapping: 'Unset',
        eegWires: 'Unset',
        charlieMoving: 'Unset',
        dog: 'Unset',
        cat: 'Unset',
        noteworthy: false,
        note: '',
        duration: null
    });

    const { disturbances, saveDisturbance } = useStore((state: StoreState) => ({
        disturbances: state.disturbances,
        saveDisturbance: state.saveDisturbance
    }));

    const currentEpochIndex = Math.floor(scrollPosition / samplesPerEpoch);
    const currentEpochDisturbance = disturbances.find(d => d.epochIndex === currentEpochIndex);

    useEffect(() => {
        if (currentEpochDisturbance) {
            setCurrentDisturbance(currentEpochDisturbance);
        } else {
            setCurrentDisturbance({
                epochIndex: currentEpochIndex,
                scoredAt: new Date().toISOString(),
                noseMotion: 'Unset',
                mouthFlapping: 'Unset',
                eegWires: 'Unset',
                charlieMoving: 'Unset',
                dog: 'Unset',
                cat: 'Unset',
                noteworthy: false,
                note: '',
                duration: null
            });
        }
    }, [currentEpochIndex, disturbances]);

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === ' ') {
            saveDisturbance(currentDisturbance);
            handleNextEpoch();
        }
    };

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [currentDisturbance]);

    const updateDisturbance = (field: keyof DisturbanceEntry, value: any) => {
        setCurrentDisturbance(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className="table" id="disturbances-component">
            <div className="flex flex-col space-y-4 mb-2">
                <div className="p-2 border rounded-md bg-gray-50">
                    <div className="font-semibold mb-2">Disturbances:</div>
                    <p className="mb-2">Record any disturbances during this epoch. Press space to save and go to next epoch.</p>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block mb-2">Nose Motion:</label>
                            <select
                                value={currentDisturbance.noseMotion}
                                onChange={(e) => updateDisturbance('noseMotion', e.target.value as DisturbanceValue)}
                                className="select select-bordered w-full"
                            >
                                {DISTURBANCE_OPTIONS.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2">Mouth Flapping:</label>
                            <select
                                value={currentDisturbance.mouthFlapping}
                                onChange={(e) => updateDisturbance('mouthFlapping', e.target.value as DisturbanceValue)}
                                className="select select-bordered w-full"
                            >
                                {DISTURBANCE_OPTIONS.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2">EEG Wires:</label>
                            <select
                                value={currentDisturbance.eegWires}
                                onChange={(e) => updateDisturbance('eegWires', e.target.value as DisturbanceValue)}
                                className="select select-bordered w-full"
                            >
                                {DISTURBANCE_OPTIONS.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2">Charlie Moving:</label>
                            <select
                                value={currentDisturbance.charlieMoving}
                                onChange={(e) => updateDisturbance('charlieMoving', e.target.value as DisturbanceValue)}
                                className="select select-bordered w-full"
                            >
                                {DISTURBANCE_OPTIONS.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2">Dog:</label>
                            <select
                                value={currentDisturbance.dog}
                                onChange={(e) => updateDisturbance('dog', e.target.value as DisturbanceValue)}
                                className="select select-bordered w-full"
                            >
                                {DISTURBANCE_OPTIONS.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2">Cat:</label>
                            <select
                                value={currentDisturbance.cat}
                                onChange={(e) => updateDisturbance('cat', e.target.value as DisturbanceValue)}
                                className="select select-bordered w-full"
                            >
                                {DISTURBANCE_OPTIONS.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2">Duration:</label>
                            <select
                                value={currentDisturbance.duration || ''}
                                onChange={(e) => updateDisturbance('duration', e.target.value || null)}
                                className="select select-bordered w-full"
                            >
                                <option value="">Unset</option>
                                <option value="brief">Brief (60s or less)</option>
                                <option value="partOfLonger">Part of longer awakening</option>
                            </select>
                        </div>

                        <div>
                            <label className="block mb-2">Noteworthy:</label>
                            <input
                                type="checkbox"
                                checked={currentDisturbance.noteworthy}
                                onChange={(e) => updateDisturbance('noteworthy', e.target.checked)}
                                className="checkbox"
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="block mb-2">Note:</label>
                        <textarea
                            value={currentDisturbance.note}
                            onChange={(e) => updateDisturbance('note', e.target.value)}
                            className="textarea textarea-bordered w-full"
                            rows={3}
                            placeholder="Add any additional notes about disturbances..."
                        />
                    </div>

                    {currentEpochDisturbance ? (
                        <span className="text-green-500 mt-2 block">✓ (epoch has disturbances recorded)</span>
                    ) : (
                        <span className="mt-2 block">Epoch not yet recorded</span>
                    )}
                </div>
            </div>
        </div>
    );
};

