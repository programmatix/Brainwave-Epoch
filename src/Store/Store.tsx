import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Scorings, AllData, ScoringEntry, Mark } from '../Loader/LoaderTypes'
import fs from 'fs'
import path from 'path'
import { Temporal } from '@js-temporal/polyfill'
import { VideoFile } from '../Videos/Videos'
import { AudioFile } from '../Audio/Audio'

// Declare global window type extension
declare global {
  interface Window {
    storeAPI?: {
      getState: () => StoreState;
    };
  }
}

type DisturbanceValue = 'Unset' | 'No' | 'Yes' | 'Unclear';

interface DisturbanceEntry {
  epochIndex: number;
  scoredAt: string;
  noseMotion: DisturbanceValue;
  mouthFlapping: DisturbanceValue;
  eegWires: DisturbanceValue;
  charlieMoving: DisturbanceValue;
  dog: DisturbanceValue;
  cat: DisturbanceValue;
  noteworthy: boolean;
  note: string;
  duration: 'brief' | 'partOfLonger' | null;
}

function saveToFile(scorings: Scorings, marks: Mark[], disturbances: DisturbanceEntry[], allData: AllData) {
    console.info(allData)
    const filePath = allData.processedEDF.filePathWithoutExtension + '.scorings.json';
    const disturbancesPath = allData.processedEDF.filePathWithoutExtension + '.disturbances.json';
    console.log(`Saving to files ${filePath} and ${disturbancesPath}`, scorings, marks, disturbances)
    const dirPath = path.dirname(filePath);

    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFile(filePath, JSON.stringify({ scorings, marks }, null, 2), (err) => {
        if (err) {
            console.error('Error saving scorings file:', err);
        } else {
            console.log('Scorings saved successfully');
        }
    });

    fs.writeFile(disturbancesPath, JSON.stringify(disturbances, null, 2), (err) => {
        if (err) {
            console.error('Error saving disturbances file:', err);
        } else {
            console.log('Disturbances saved successfully');
        }
    });
}

export interface StoreState {
    allData: AllData | null
    marks: Mark[]
    scorings: Scorings
    disturbances: DisturbanceEntry[]
    markingMode: string
    currentVideo: VideoFile | null
    currentAudio: AudioFile | null
    isAudioSyncedWithVideo: boolean
    saveScoring: (newScoring: ScoringEntry) => void
    saveDisturbance: (newDisturbance: DisturbanceEntry) => void
    updateMarks: (newMarks: Mark[]) => void
    updateScorings: (newScorings: Scorings) => void
    updateDisturbances: (newDisturbances: DisturbanceEntry[]) => void
    updateAllData: (newAllData: AllData) => void
    handleChartClick: (timestamp: Temporal.ZonedDateTime, channel: string) => void
    deleteMark: (timestamp: string, channel: string) => void
    setMarkingMode: (mode: StoreState['markingMode']) => void
    setCurrentVideo: (video: VideoFile | null) => void
    setCurrentAudio: (audio: AudioFile | null) => void
    setAudioSyncedWithVideo: (isSynced: boolean) => void
}

export const useStore = create<StoreState>()(devtools((set) => ({
    allData: null,
    marks: [],
    scorings: [],
    disturbances: [],
    markingMode: 'None',
    currentVideo: null,
    currentAudio: null,
    isAudioSyncedWithVideo: false,
    handleChartClick: (timestamp: Temporal.ZonedDateTime, channel: string) => {
        console.log("handleChartClick", timestamp, channel)
        set((state) => {
            if (state.markingMode.endsWith('Start')) {
                const nextMarkType = state.markingMode.replace('Start', 'End')
                const mark: Mark = {
                    timestamp: timestamp.toInstant().toString(),
                    scoredAt: Temporal.Now.zonedDateTimeISO().toInstant().toString(),
                    channel,
                    type: state.markingMode
                }
                const updatedMarks = state.marks.concat(mark)
                saveToFile(state.scorings, updatedMarks, state.disturbances, state.allData)
                return { marks: updatedMarks, markingMode: nextMarkType }
            }
            else if (state.markingMode.endsWith('End')) {
                const nextMarkType = state.markingMode.replace('End', 'Start')
                const mark: Mark = {
                    timestamp: timestamp.toInstant().toString(),
                    scoredAt: Temporal.Now.zonedDateTimeISO().toInstant().toString(),
                    channel,
                    type: state.markingMode
                }
                const updatedMarks = state.marks.concat(mark)
                saveToFile(state.scorings, updatedMarks, state.disturbances, state.allData)
                return { marks: updatedMarks, markingMode: nextMarkType }
            }
            else {
                throw new Error(`Invalid marking mode: ${state.markingMode}`)
            }
        })
    },
    saveScoring: (newScoring) => {
        set((state) => {
            const updatedScorings = state.scorings
                .filter((s) => s.epochIndex !== newScoring.epochIndex)
                .concat(newScoring)
                .sort((a, b) => a.epochIndex - b.epochIndex)
            saveToFile(updatedScorings, state.marks, state.disturbances, state.allData)
            return { scorings: updatedScorings }
        })
    },
    saveDisturbance: (newDisturbance) => {
        set((state) => {
            const updatedDisturbances = state.disturbances
                .filter((d) => d.epochIndex !== newDisturbance.epochIndex)
                .concat(newDisturbance)
                .sort((a, b) => a.epochIndex - b.epochIndex)
            saveToFile(state.scorings, state.marks, updatedDisturbances, state.allData)
            return { disturbances: updatedDisturbances }
        })
    },
    updateMarks: (newMarks) => {
        set((state) => {
            saveToFile(state.scorings, newMarks, state.disturbances, state.allData)
            return { marks: newMarks }
        })
    },
    updateScorings: (newScorings) => {
        set((state) => {
            saveToFile(newScorings, state.marks, state.disturbances, state.allData)
            return { scorings: newScorings }
        })
    },
    updateDisturbances: (newDisturbances) => {
        set((state) => {
            saveToFile(state.scorings, state.marks, newDisturbances, state.allData)
            return { disturbances: newDisturbances }
        })
    },
    updateAllData: (newAllData) => {
        console.info("Updating all data", newAllData)
        set({ allData: newAllData, marks: newAllData.marks, scorings: newAllData.scorings, disturbances: newAllData.disturbances || [] })
    },
    setMarkingMode: (mode) => {
        set({ markingMode: mode })
    },
    deleteMark: (timestamp: string, channel: string) => {
        set((state) => {
            const foundMark = state.marks.find(
                mark => mark.timestamp === timestamp && mark.channel === channel
            );
            const updatedMarks = state.marks.filter(
                mark => !(mark.timestamp === timestamp && mark.channel === channel)
            );
            saveToFile(state.scorings, updatedMarks, state.disturbances, state.allData);
            return { marks: updatedMarks, markingMode: foundMark.type };
        });
    },
    setCurrentVideo: (video) => {
        set({ currentVideo: video })
    },
    setCurrentAudio: (audio) => {
        set({ currentAudio: audio })
    },
    setAudioSyncedWithVideo: (isSynced) => {
        set({ isAudioSyncedWithVideo: isSynced })
    },
})))

// Make store API accessible globally for components that can't use the hook directly
if (typeof window !== 'undefined') {
    window.storeAPI = {
        getState: useStore.getState
    };
}
