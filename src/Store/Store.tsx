import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { Scorings, AllData, ScoringEntry, Mark } from '../Loader/LoaderTypes'
import fs from 'fs'
import path from 'path'
import { Temporal } from '@js-temporal/polyfill'


function saveToFile(scorings: Scorings, marks: Mark[], allData: AllData) {
    console.info(allData)
    const filePath = allData.processedEDF.filePathWithoutExtension + '.scorings.json';
    console.log(`Saving to file ${filePath}`, scorings, marks)
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
}

export interface StoreState {
    allData: AllData | null
    marks: Mark[]
    scorings: Scorings
    markingMode: 'None' | 'MicrowakingStart' | 'MicrowakingEnd' | 'StartExclusion' | 'EndExclusion'
    saveScoring: (newScoring: ScoringEntry) => void
    updateMarks: (newMarks: Mark[]) => void
    updateScorings: (newScorings: Scorings) => void
    updateAllData: (newAllData: AllData) => void
    handleChartClick: (timestamp: Temporal.ZonedDateTime, channel: string) => void
    deleteMark: (timestamp: string, channel: string) => void
    setMarkingMode: (mode: StoreState['markingMode']) => void
}

export const useStore = create<StoreState>()(devtools((set) => ({
    allData: null,
    marks: [],
    scorings: [],
    markingMode: 'None',
    handleChartClick: (timestamp: Temporal.ZonedDateTime, channel: string) => {
        console.log("handleChartClick", timestamp, channel)
        set((state) => {
            if (state.markingMode === 'MicrowakingEnd') {
                const mark: Mark = {
                    timestamp: timestamp.toInstant().toString(),
                    scoredAt: Temporal.Now.zonedDateTimeISO().toInstant().toString(),
                    channel,
                    type: 'MicrowakingEnd'
                }
                const updatedMarks = state.marks.concat(mark)
                saveToFile(state.scorings, updatedMarks, state.allData)
                return { marks: updatedMarks, markingMode: 'MicrowakingStart' }
            } else {
                const mark: Mark = {
                    timestamp: timestamp.toInstant().toString(),
                    scoredAt: Temporal.Now.zonedDateTimeISO().toInstant().toString(),
                    channel,
                    type: 'MicrowakingStart'
                }
                const updatedMarks = state.marks.concat(mark)
                saveToFile(state.scorings, updatedMarks, state.allData)
                return { marks: updatedMarks, markingMode: 'MicrowakingEnd' }
            }
        })
    },
    saveScoring: (newScoring) => {
        set((state) => {
            const updatedScorings = state.scorings
                .filter((s) => s.epochIndex !== newScoring.epochIndex)
                .concat(newScoring)
                .sort((a, b) => a.epochIndex - b.epochIndex)
            saveToFile(updatedScorings, state.marks, state.allData)
            return { scorings: updatedScorings }
        })
    },
    updateMarks: (newMarks) => {
        set((state) => {
            saveToFile(state.scorings, newMarks, state.allData)
            return { marks: newMarks }
        })
    },
    updateScorings: (newScorings) => {
        set((state) => {
            saveToFile(newScorings, state.marks, state.allData)
            return { scorings: newScorings }
        })
    },
    updateAllData: (newAllData) => {
        console.info("Updating all data", newAllData)
        set({ allData: newAllData, marks: newAllData.marks, scorings: newAllData.scorings })
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
            saveToFile(state.scorings, updatedMarks, state.allData);
            return { marks: updatedMarks, markingMode: foundMark.type };
        });
    },
})))
