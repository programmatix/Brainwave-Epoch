import { InfluxDB } from '@influxdata/influxdb-client';
import { TimeLabel } from '../Loader/LoaderTypes';
import { Temporal } from '@js-temporal/polyfill';

export interface MovementData {
    time: string;
    value: number;
}

export interface ProcessedMovementData {
    timeLabels: TimeLabel[];
    values: number[];
    rawData: MovementData[];
}

export async function queryMovementData(startTime: Temporal.ZonedDateTime, endTime: Temporal.ZonedDateTime): Promise<MovementData[]> {
    const url = process.env.INFLUXDB_URL || 'https://examined-life.co.uk:8086';
    const username = process.env.INFLUXDB_USERNAME || 'graham';
    const password = process.env.INFLUXDB_PASSWORD || 'gr8breem';
    const token = `${username}:${password}`;
    const org = 'XL';
    
    const queryApi = new InfluxDB({ url, token }).getQueryApi(org);
    
    // Format to ISO string for InfluxDB query
    const startTimeStr = startTime.toString().split('[')[0];
    const endTimeStr = endTime.toString().split('[')[0];
    
    const query = `
        SELECT max("movement") AS value 
        FROM "XL"."autogen"."android_o2" 
        WHERE time >= '${startTimeStr}' AND time <= '${endTimeStr}' 
        AND movement != 1 and movement != 2 
        GROUP BY time(1m) 
        ORDER BY time
    `;
    
    try {
        const result: MovementData[] = [];
        
        const rows = await queryApi.collectRows(query);
        
        rows.forEach((row: any) => {
            if (row._time && row._value !== undefined) {
                result.push({
                    time: row._time,
                    value: row._value
                });
            }
        });
        
        return result;
    } catch (error) {
        console.error('Error querying InfluxDB:', error);
        return [];
    }
}

export function processMovementData(data: MovementData[], startTime: Temporal.ZonedDateTime): ProcessedMovementData {
    const timeLabels: TimeLabel[] = [];
    const values: number[] = [];
    
    data.forEach(point => {
        const timestamp = new Date(point.time).getTime();
        
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        const formattedTime = `${hours}:${minutes}:${seconds}`;
        
        timeLabels.push({
            timestamp,
            formatted: formattedTime
        });
        
        values.push(point.value);
    });
    
    return {
        timeLabels,
        values,
        rawData: data
    };
}
