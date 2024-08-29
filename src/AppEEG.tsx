import React, { useEffect, useState } from 'react';
import { ProcessedEDFData } from './Loader/ProcessorTypes';
import EEGViewer from './Viewer/EEGViewer';
import { ProcessedSleepStages } from './Loader/LoaderTypes';
import { setupFileMenu, loadFiles } from './Loader/Loader';

declare global {
    interface Window {
        nw: any;
    }
}

export const AppEEG: React.FC = () => {
    const [edfData, setEdfData] = useState<ProcessedEDFData | null>(null);
    const [sleepStages, setSleepStages] = useState<ProcessedSleepStages | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setupFileMenu(async (filePath: string) => {
            setIsLoading(true);
            try {
                const { raw, processedEDF, processedStages } = await loadFiles(filePath);
                console.log('Raw:', raw);
                console.log('Processed EDF:', processedEDF);
                console.log('Processed Stages:', processedStages);
                setEdfData(processedEDF);
                setSleepStages(processedStages);
            } catch (error) {
                console.error('Error loading files:', error);
            } finally {
                setIsLoading(false);
            }
        });
    }, []);

    return (
        <div className="container mx-auto p-4">
            {isLoading ? (
                <div className="flex justify-center items-center h-screen">
                    <div className="loading loading-spinner loading-lg"></div>
                </div>
            ) : edfData && (
                <EEGViewer
                    processedData={edfData}
                    sleepStages={sleepStages}
                />
            )}
        </div>
    );
};