import { Temporal } from '@js-temporal/polyfill';
import { formatTimestampFast } from '../Viewer/ChartUtils';

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
    // Pre-computed formatted timestamp for performance
    formattedTime?: string;
};

export type AudioFiles = AudioFile[];

export async function loadAudio(startDate: Temporal.ZonedDateTime, duration: number): Promise<AudioFiles> {
    try {
        // Use environment variable or default server URL
        const serverUrl = process.env.REACT_APP_AUDIO_SERVER_URL || process.env.REACT_APP_VIDEO_SERVER_URL || 'http://192.168.1.180:5000';
        
        // Skip audio loading if server URL is explicitly set to empty
        if (serverUrl === '' || serverUrl === 'disabled') {
            console.log("Audio loading disabled via configuration");
            return [];
        }
        
        // Format the date as YYYY-MM-DD for the API parameter
        const dayParam = `${startDate.year}-${String(startDate.month).padStart(2, '0')}-${String(startDate.day).padStart(2, '0')}`;
        const url = `${serverUrl}/api/audio2?day=${dayParam}`;
        console.log("Loading audio from: ", url);
        
        const response = await fetch(url, { 
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (!response.ok) {
            console.warn(`Audio server returned ${response.status}: ${response.statusText}`);
            return [];
        }
        
        const files = await response.json();
        
        // Map the API format to our AudioFile type
        const audioFiles = files.map((file: any) => ({
            name: file.filename,
            timestamp: file.filename_as_epoch_millis,
            formattedTime: formatTimestampFast(file.filename_as_epoch_millis),
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
        if (error.name === 'TimeoutError') {
            console.warn("Audio server timeout - continuing without audio data");
        } else if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
            console.warn("Audio server not accessible - continuing without audio data");
        } else {
            console.error("Error loading audio: ", error);
        }
        return [];
    }
} 