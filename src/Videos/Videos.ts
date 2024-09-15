import { Temporal } from '@js-temporal/polyfill';

export type VideoFile = {
    name: string;
    timestamp: Temporal.ZonedDateTime;
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
                const timestampMatch = filename.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
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
                    return { name: filename, timestamp };
                }
            } catch (e) {
                console.log("Error parsing video file timestamp: ", filename, e);
                return null;
            }
        })
        .filter(video => video !== null && video.timestamp.epochSeconds >= eegStartTime.epochSeconds && video.timestamp.epochSeconds <= eegEndTime.epochSeconds);

    console.log("Videos filtered: ", out);
    return out;
}

export async function loadVideos(startDate: Temporal.ZonedDateTime, duration: number): Promise<VideoFiles> {
    const response = await fetch('http://192.168.1.72:5000/api/files');
    const files = await response.json();
    return filterOverlappingVideoFiles(files, startDate, startDate.add({ seconds: duration }));
}
