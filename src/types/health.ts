// Apple Health Data Types

export interface HealthRecord {
  type: string;
  sourceName: string;
  sourceVersion?: string;
  unit?: string;
  value: string | number;
  startDate: Date;
  endDate: Date;
  creationDate?: Date;
  device?: string;
}

export interface WorkoutRecord {
  workoutActivityType: string;
  duration: number; // in minutes
  totalDistance?: number;
  totalEnergyBurned?: number;
  sourceName: string;
  startDate: Date;
  endDate: Date;
  metadata?: Record<string, any>;
}

export interface HealthSummary {
  steps: {
    total: number;
    average: number;
    records: HealthRecord[];
  };
  heartRate: {
    average: number;
    resting: number;
    max: number;
    records: HealthRecord[];
  };
  sleep: {
    totalHours: number;
    averageHours: number;
    records: HealthRecord[];
  };
  activeEnergy: {
    total: number;
    average: number;
    records: HealthRecord[];
  };
  workouts: WorkoutRecord[];
  weight?: {
    current: number;
    unit: string;
    records: HealthRecord[];
  };
}

export interface HealthDataFilter {
  startDate?: Date;
  endDate?: Date;
  types?: string[];
}

// Common Apple Health data types
export const HealthDataType = {
  STEPS: 'HKQuantityTypeIdentifierStepCount',
  HEART_RATE: 'HKQuantityTypeIdentifierHeartRate',
  RESTING_HEART_RATE: 'HKQuantityTypeIdentifierRestingHeartRate',
  WALKING_HEART_RATE: 'HKQuantityTypeIdentifierWalkingHeartRateAverage',
  SLEEP_ANALYSIS: 'HKCategoryTypeIdentifierSleepAnalysis',
  ACTIVE_ENERGY: 'HKQuantityTypeIdentifierActiveEnergyBurned',
  BASAL_ENERGY: 'HKQuantityTypeIdentifierBasalEnergyBurned',
  DISTANCE_WALKING: 'HKQuantityTypeIdentifierDistanceWalkingRunning',
  BODY_MASS: 'HKQuantityTypeIdentifierBodyMass',
  HEIGHT: 'HKQuantityTypeIdentifierHeight',
  WORKOUT: 'HKWorkoutTypeIdentifier',
  STAND_HOUR: 'HKCategoryTypeIdentifierAppleStandHour',
  EXERCISE_TIME: 'HKQuantityTypeIdentifierAppleExerciseTime',
} as const;

export type HealthDataTypeValue = typeof HealthDataType[keyof typeof HealthDataType];
