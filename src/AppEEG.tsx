import React, { useEffect, useState } from 'react';
import ErrorBoundary from './Errors/ErrorBoundary';
import { loadFiles, loaderEvents, setupFileMenu } from './Loader/Loader';
import { AllData } from './Loader/LoaderTypes';
import LogContainer from './Logs/LogContainer';
import EEGViewer from './Viewer/EEGViewer';
import { StoreState, useStore } from './Store/Store';
import { create, createStore } from 'zustand';

declare global {
    interface Window {
        nw: any;
    }
}

interface SimpleStoreState {
    bears: number;
}

const simpleStore = create<SimpleStoreState>((set) => ({
    bears: 0,
    increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
    removeAllBears: () => set({ bears: 0 }),
    updateBears: (newBears) => set({ bears: newBears }),
  }))
  
  
export const AppEEG: React.FC = () => {
    const [allData, setAllData] = useState<AllData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const { scorings, updateAllData } = useStore((state: StoreState) => ({
        scorings: state.scorings,
        updateAllData: state.updateAllData
    }));
    const { bears } = simpleStore();

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
                updateAllData(allData);
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
                {scorings == undefined && <div>No scorings</div>}
                {scorings != undefined && <div>Has scorings</div>}
                {bears}
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