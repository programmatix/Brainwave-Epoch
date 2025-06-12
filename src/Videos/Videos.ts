import { Temporal } from '@js-temporal/polyfill';

export type VideoFile = {
    name: string;
    // Epoch milliseconds
    // This is the filename timestamp
    timestamp: number;
    // This is the real start timestamp of the video.
    // E.g. it might be the video's filename - durations.pre_motion_seconds
    real_start_timestamp: number;
    // New fields from API
    file_size_in_bytes: number;
    filename: string;
    filename_as_epoch_millis: number;
    // Optional fields that might be present
    event_id?: string;
    durations?: {
        post_motion_seconds: number;
        pre_motion_seconds: number;
        total_seconds: number;
    };
    first_frame_time?: string;
    last_frame_time?: string;
    motion_start_time?: string;
    frame_count?: number;
};

export type VideoFiles = VideoFile[];


export async function loadVideos(startDate: Temporal.ZonedDateTime, duration: number): Promise<VideoFiles> {
    try {
        // Use environment variable or default server URL
        const serverUrl = process.env.REACT_APP_VIDEO_SERVER_URL || 'http://192.168.1.180:5000';
        
        // Skip video loading if server URL is explicitly set to empty
        if (serverUrl === '' || serverUrl === 'disabled') {
            console.log("Video loading disabled via configuration");
            return [];
        }
        
        // Format the date as YYYY-MM-DD for the API parameter
        const dayParam = `${startDate.year}-${String(startDate.month).padStart(2, '0')}-${String(startDate.day).padStart(2, '0')}`;
        const url = `${serverUrl}/api/videos?day=${dayParam}`;
        console.log("Loading videos from: ", url);
        
        const response = await fetch(url, { 
            signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (!response.ok) {
            console.warn(`Video server returned ${response.status}: ${response.statusText}`);
            return [];
        }
        
        const files = await response.json();
        
        // Map the new format to our VideoFile type
        const videoFiles = files.map((file: any) => {
            const real_start_timestamp = file.durations.pre_motion_seconds > 0 ? file.filename_as_epoch_millis - file.durations.pre_motion_seconds * 1000 : file.filename_as_epoch_millis;
            return {
                name: file.filename,
                timestamp: file.filename_as_epoch_millis,
                real_start_timestamp: real_start_timestamp,
                ...file
            }
        });
        
        // Filter videos that overlap with the EEG time range
        const eegEndTime = startDate.add({ seconds: duration });
        return videoFiles.filter(video => 
            video.timestamp >= startDate.epochMilliseconds && 
            video.timestamp <= eegEndTime.epochMilliseconds
        );
    } catch (error) {
        if (error.name === 'TimeoutError') {
            console.warn("Video server timeout - continuing without video data");
        } else if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
            console.warn("Video server not accessible - continuing without video data");
        } else {
            console.error("Error loading videos: ", error);
        }
        return [];
    }
}
