import React, { useEffect, useState } from 'react';
import ErrorBoundary from './Errors/ErrorBoundary';
import { loadFiles, loaderEvents, setupFileMenu } from './Loader/Loader';
import { AllData } from './Loader/LoaderTypes';
import LogContainer from './Logs/LogContainer';
import EEGViewer from './Viewer/EEGViewer';

declare global {
    interface Window {
        nw: any;
    }
}

export const AppEEG: React.FC = () => {
    const [allData, setAllData] = useState<AllData | null>(null);
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
                const allData = await loadFiles(filePath);
                console.log('Processed EDF:', allData);
                console.log('MinMax:', allData.sleepStageFeatureMinMax);
                setAllData(allData);
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
        <div className="h-full">
            <div className="flex flex-col h-full">
                <div className="h-full">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="loading loading-spinner loading-lg"></div>
                        </div>
                    ) : allData && (
                        <ErrorBoundary>
                            <EEGViewer
                                allData={allData}
                            />
                        </ErrorBoundary>
                    )}
                </div>
                <LogContainer logs={logs} />
            </div>
        </div>
    );
};