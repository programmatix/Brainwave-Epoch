import { Temporal } from '@js-temporal/polyfill';

export type VideoFile = {
    name: string;
    // Epoch milliseconds
    timestamp: number;
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

export function filterOverlappingVideoFiles(
    videoFiles: string[],
    eegStartTime: Temporal.ZonedDateTime,
    eegEndTime: Temporal.ZonedDateTime
): VideoFile[] {
    console.log("Videos raw: ", videoFiles);

    const out = videoFiles
        .map(filename => {
            try {
                const timestampMatch = filename.match(/(\d{4})(\d{2})(\d{2})_?(\d{2})(\d{2})(\d{2})/);
                if (timestampMatch) {
                    const [, year, month, day, hour, minute, second] = timestampMatch;
                    const timestamp = Temporal.ZonedDateTime.from({
                        year: parseInt(year),
                        month: parseInt(month),
                        day: parseInt(day),
                        hour: parseInt(hour),
                        minute: parseInt(minute),
                        second: parseInt(second),
                        timeZone: 'Europe/London'
                    });
                    return { 
                        name: filename, 
                        timestamp: timestamp.toInstant().epochMilliseconds,
                        file_size_in_bytes: 0,
                        filename: filename,
                        filename_as_epoch_millis: timestamp.toInstant().epochMilliseconds
                    };
                }
            } catch (e) {
                console.log("Error parsing video file timestamp: ", filename, e);
                return null;
            }
        })
        .filter(video => video && video.timestamp && video.timestamp >= eegStartTime.epochMilliseconds && video.timestamp <= eegEndTime.epochMilliseconds);

    console.log("Videos filtered: ", out);
    return out;
}

export async function loadVideos(startDate: Temporal.ZonedDateTime, duration: number): Promise<VideoFiles> {
    try {
        // Format the date as YYYY-MM-DD for the API parameter
        const dayParam = `${startDate.year}-${String(startDate.month).padStart(2, '0')}-${String(startDate.day).padStart(2, '0')}`;
        const response = await fetch(`http://192.168.1.180:5000/api/videos?day=${dayParam}`);
        const files = await response.json();
        
        // Map the new format to our VideoFile type
        const videoFiles = files.map((file: any) => ({
            name: file.filename,
            timestamp: file.filename_as_epoch_millis,
            ...file
        }));
        
        // Filter videos that overlap with the EEG time range
        const eegEndTime = startDate.add({ seconds: duration });
        return videoFiles.filter(video => 
            video.timestamp >= startDate.epochMilliseconds && 
            video.timestamp <= eegEndTime.epochMilliseconds
        );
    } catch (error) {
        console.error("Error loading videos: ", error);
        return [];
    }
}
