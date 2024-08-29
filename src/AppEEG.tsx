import React, { useEffect, useState } from 'react';
import { ProcessedEDFData } from './Loader/ProcessorTypes';
import EEGViewer from './Viewer/EEGViewer';
import { ProcessedSleepStages } from './Loader/LoaderTypes';
import { setupFileMenu, loadFiles, loaderEvents } from './Loader/Loader';
import LogContainer from './Logs/LogContainer';
import ErrorBoundary from './Errors/ErrorBoundary';

declare global {
    interface Window {
        nw: any;
    }
}

export const AppEEG: React.FC = () => {
    const [edfData, setEdfData] = useState<ProcessedEDFData | null>(null);
    const [sleepStages, setSleepStages] = useState<ProcessedSleepStages | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    useEffect(() => {
        loaderEvents.on('log', (message: string) => {
            setLogs(prevLogs => [...prevLogs, message]);
        });

        setupFileMenu(async (filePath: string) => {
            setIsLoading(true);
            setLogs([]);
            try {
                const { raw, processedEDF, processedStages } = await loadFiles(filePath);
                console.log('Raw:', raw);
                console.log('Processed EDF:', processedEDF);
                console.log('Processed Stages:', processedStages);
                setEdfData(processedEDF);
                setSleepStages(processedStages);
            } catch (error) {
                console.error('Error loading files:', error);
                setLogs(prevLogs => [...prevLogs, `Error: ${error.message}`]);
            } finally {
                setIsLoading(false);
            }
        });

        return () => {
            loaderEvents.removeAllListeners('log');
        };
    }, []);

    return (
        <div className="container mx-auto p-4 flex flex-col h-screen">
            <div className="flex-grow">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="loading loading-spinner loading-lg"></div>
                    </div>
                ) : edfData && (
                    <ErrorBoundary>
                        <EEGViewer
                            processedData={edfData}
                            sleepStages={sleepStages}
                        />
                    </ErrorBoundary>
                )}
            </div>
            <LogContainer logs={logs} />
        </div>
    );
};