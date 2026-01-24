// Apple Health XML Parser Service
// Parses exported Apple Health data from XML format

import { HealthRecord, WorkoutRecord, HealthSummary, HealthDataType } from '@/types/health';
import { startOfDay, endOfDay, differenceInMinutes, differenceInHours } from 'date-fns';

export class AppleHealthParser {
  /**
   * Parse Apple Health XML export file
   */
  async parseXMLFile(file: File): Promise<HealthRecord[]> {
    const text = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error('Invalid XML file');
    }

    const records: HealthRecord[] = [];
    const recordElements = doc.querySelectorAll('Record');

    recordElements.forEach((element) => {
      try {
        const record = this.parseRecordElement(element);
        if (record) {
          records.push(record);
        }
      } catch (error) {
        console.warn('Failed to parse record:', error);
      }
    });

    return records;
  }

  /**
   * Parse a single Record XML element
   */
  private parseRecordElement(element: Element): HealthRecord | null {
    const type = element.getAttribute('type');
    if (!type) return null;

    const record: HealthRecord = {
      type,
      sourceName: element.getAttribute('sourceName') || 'Unknown',
      sourceVersion: element.getAttribute('sourceVersion') || undefined,
      unit: element.getAttribute('unit') || undefined,
      value: element.getAttribute('value') || '',
      startDate: new Date(element.getAttribute('startDate') || ''),
      endDate: new Date(element.getAttribute('endDate') || ''),
      creationDate: element.getAttribute('creationDate') 
        ? new Date(element.getAttribute('creationDate')!)
        : undefined,
      device: element.getAttribute('device') || undefined,
    };

    // Convert value to number if possible
    const numValue = parseFloat(record.value as string);
    if (!isNaN(numValue)) {
      record.value = numValue;
    }

    return record;
  }

  /**
   * Parse workout records from XML
   */
  async parseWorkouts(file: File): Promise<WorkoutRecord[]> {
    const text = await file.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');

    const workouts: WorkoutRecord[] = [];
    const workoutElements = doc.querySelectorAll('Workout');

    workoutElements.forEach((element) => {
      try {
        const workout = this.parseWorkoutElement(element);
        if (workout) {
          workouts.push(workout);
        }
      } catch (error) {
        console.warn('Failed to parse workout:', error);
      }
    });

    return workouts;
  }

  /**
   * Parse a single Workout XML element
   */
  private parseWorkoutElement(element: Element): WorkoutRecord | null {
    const workoutActivityType = element.getAttribute('workoutActivityType');
    if (!workoutActivityType) return null;

    const startDate = new Date(element.getAttribute('startDate') || '');
    const endDate = new Date(element.getAttribute('endDate') || '');
    const duration = differenceInMinutes(endDate, startDate);

    const workout: WorkoutRecord = {
      workoutActivityType,
      duration,
      totalDistance: parseFloat(element.getAttribute('totalDistance') || '0') || undefined,
      totalEnergyBurned: parseFloat(element.getAttribute('totalEnergyBurned') || '0') || undefined,
      sourceName: element.getAttribute('sourceName') || 'Unknown',
      startDate,
      endDate,
      metadata: {},
    };

    // Parse metadata
    const metadataElements = element.querySelectorAll('MetadataEntry');
    metadataElements.forEach((meta) => {
      const key = meta.getAttribute('key');
      const value = meta.getAttribute('value');
      if (key && value) {
        workout.metadata![key] = value;
      }
    });

    return workout;
  }

  /**
   * Generate health summary from records
   */
  generateSummary(
    records: HealthRecord[],
    workouts: WorkoutRecord[],
    startDate?: Date,
    endDate?: Date
  ): HealthSummary {
    // Filter records by date range
    let filteredRecords = records;
    if (startDate || endDate) {
      filteredRecords = records.filter((r) => {
        const recordDate = r.startDate;
        if (startDate && recordDate < startDate) return false;
        if (endDate && recordDate > endDate) return false;
        return true;
      });
    }

    // Calculate steps
    const stepRecords = filteredRecords.filter((r) => r.type === HealthDataType.STEPS);
    const totalSteps = stepRecords.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
    const uniqueDays = new Set(stepRecords.map((r) => startOfDay(r.startDate).getTime())).size;
    const averageSteps = uniqueDays > 0 ? totalSteps / uniqueDays : 0;

    // Calculate heart rate
    const heartRateRecords = filteredRecords.filter((r) => r.type === HealthDataType.HEART_RATE);
    const restingHeartRateRecords = filteredRecords.filter((r) => r.type === HealthDataType.RESTING_HEART_RATE);
    const avgHeartRate = heartRateRecords.length > 0
      ? heartRateRecords.reduce((sum, r) => sum + (Number(r.value) || 0), 0) / heartRateRecords.length
      : 0;
    const restingHeartRate = restingHeartRateRecords.length > 0
      ? restingHeartRateRecords[restingHeartRateRecords.length - 1].value as number
      : 0;
    const maxHeartRate = heartRateRecords.length > 0
      ? Math.max(...heartRateRecords.map((r) => Number(r.value) || 0))
      : 0;

    // Calculate sleep
    const sleepRecords = filteredRecords.filter((r) => r.type === HealthDataType.SLEEP_ANALYSIS);
    const totalSleepMinutes = sleepRecords.reduce((sum, r) => {
      return sum + differenceInMinutes(r.endDate, r.startDate);
    }, 0);
    const totalSleepHours = totalSleepMinutes / 60;
    const uniqueSleepDays = new Set(sleepRecords.map((r) => startOfDay(r.startDate).getTime())).size;
    const averageSleepHours = uniqueSleepDays > 0 ? totalSleepHours / uniqueSleepDays : 0;

    // Calculate active energy
    const activeEnergyRecords = filteredRecords.filter((r) => r.type === HealthDataType.ACTIVE_ENERGY);
    const totalActiveEnergy = activeEnergyRecords.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
    const uniqueEnergyDays = new Set(activeEnergyRecords.map((r) => startOfDay(r.startDate).getTime())).size;
    const averageActiveEnergy = uniqueEnergyDays > 0 ? totalActiveEnergy / uniqueEnergyDays : 0;

    // Get weight
    const weightRecords = filteredRecords.filter((r) => r.type === HealthDataType.BODY_MASS);
    const latestWeight = weightRecords.length > 0 ? weightRecords[weightRecords.length - 1] : null;

    return {
      steps: {
        total: Math.round(totalSteps),
        average: Math.round(averageSteps),
        records: stepRecords,
      },
      heartRate: {
        average: Math.round(avgHeartRate),
        resting: Math.round(restingHeartRate),
        max: Math.round(maxHeartRate),
        records: heartRateRecords,
      },
      sleep: {
        totalHours: Math.round(totalSleepHours * 10) / 10,
        averageHours: Math.round(averageSleepHours * 10) / 10,
        records: sleepRecords,
      },
      activeEnergy: {
        total: Math.round(totalActiveEnergy),
        average: Math.round(averageActiveEnergy),
        records: activeEnergyRecords,
      },
      workouts,
      weight: latestWeight
        ? {
            current: Number(latestWeight.value),
            unit: latestWeight.unit || 'lb',
            records: weightRecords,
          }
        : undefined,
    };
  }

  /**
   * Get recent records (last N days)
   */
  getRecentRecords(records: HealthRecord[], days: number = 7): HealthRecord[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return records.filter((r) => r.startDate >= cutoffDate);
  }

  /**
   * Filter records by type
   */
  filterByType(records: HealthRecord[], types: string[]): HealthRecord[] {
    return records.filter((r) => types.includes(r.type));
  }
}

// Singleton instance
export const appleHealthParser = new AppleHealthParser();
