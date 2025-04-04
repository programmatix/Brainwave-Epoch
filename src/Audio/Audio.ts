import { Temporal } from '@js-temporal/polyfill';

export type AudioSegment = {
    start_sample: number;
    end_sample: number;
    duration_samples: number;
    start_time: number;
    end_time: number;
    duration_time: number;
    start_timestamp: string;
    end_timestamp: string;
    sample_rate: number;
};

export type AudioFile = {
    name: string;
    // Epoch milliseconds
    timestamp: number;
    // Fields from API
    filename: string;
    file_size_in_bytes: number;
    duration_ms: number;
    filename_as_epoch_millis: number;
    metadata?: {
        audio?: AudioSegment[];
    };
};

export type AudioFiles = AudioFile[];

export async function loadAudio(startDate: Temporal.ZonedDateTime, duration: number): Promise<AudioFiles> {
    try {
        // Format the date as YYYY-MM-DD for the API parameter
        const dayParam = `${startDate.year}-${String(startDate.month).padStart(2, '0')}-${String(startDate.day).padStart(2, '0')}`;
        const url = `http://192.168.1.180:5000/api/audio2?day=${dayParam}`;
        console.log("Loading audio from: ", url);
        const response = await fetch(url);
        const files = await response.json();
        
        // Map the API format to our AudioFile type
        const audioFiles = files.map((file: any) => ({
            name: file.filename,
            timestamp: file.filename_as_epoch_millis,
            ...file
        }));
        
        // Filter audio that overlap with the EEG time range
        const eegEndTime = startDate.add({ seconds: duration });
        return audioFiles.filter(audio => 
            // Check if any part of the audio overlaps with the EEG range
            (audio.timestamp <= eegEndTime.epochMilliseconds && 
             audio.timestamp + audio.duration_ms >= startDate.epochMilliseconds)
        );
    } catch (error) {
        console.error("Error loading audio: ", error);
        return [];
    }
} 