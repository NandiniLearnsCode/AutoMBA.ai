// Health Dashboard Component
// Displays Apple Health data insights and visualizations

import { useState, useEffect, useMemo } from 'react';
import { Activity, Heart, Moon, Zap, TrendingUp, Calendar } from 'lucide-react';
import { HealthRecord, WorkoutRecord, HealthSummary } from '@/types/health';
import { appleHealthParser } from '@/services/appleHealthParser';
import { HealthDataUpload } from './HealthDataUpload';
import { format, subDays } from 'date-fns';

export function HealthDashboard() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(7);

  // Load health data from localStorage
  useEffect(() => {
    const loadHealthData = () => {
      try {
        const storedRecords = localStorage.getItem('appleHealthRecords');
        const storedWorkouts = localStorage.getItem('appleHealthWorkouts');

        if (storedRecords) {
          const parsedRecords = JSON.parse(storedRecords);
          // Convert date strings back to Date objects
          parsedRecords.forEach((r: any) => {
            r.startDate = new Date(r.startDate);
            r.endDate = new Date(r.endDate);
            if (r.creationDate) r.creationDate = new Date(r.creationDate);
          });
          setRecords(parsedRecords);
        }

        if (storedWorkouts) {
          const parsedWorkouts = JSON.parse(storedWorkouts);
          parsedWorkouts.forEach((w: any) => {
            w.startDate = new Date(w.startDate);
            w.endDate = new Date(w.endDate);
          });
          setWorkouts(parsedWorkouts);
        }
      } catch (error) {
        console.error('Error loading health data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHealthData();
  }, []);

  // Generate summary for selected time range
  const summary: HealthSummary | null = useMemo(() => {
    if (records.length === 0) return null;

    const endDate = new Date();
    const startDate = subDays(endDate, timeRange);

    return appleHealthParser.generateSummary(records, workouts, startDate, endDate);
  }, [records, workouts, timeRange]);

  const handleDataUploaded = (newRecords: HealthRecord[], newWorkouts: WorkoutRecord[]) => {
    setRecords(newRecords);
    setWorkouts(newWorkouts);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading health data...</div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Health Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Import your Apple Health data to see personalized insights and track your wellness.
          </p>
        </div>
        <HealthDataUpload onDataUploaded={handleDataUploaded} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Health Dashboard
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Last updated: {format(new Date(localStorage.getItem('appleHealthLastUpdate') || ''), 'MMM d, yyyy h:mm a')}
          </p>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTimeRange(7)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              timeRange === 7
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            7 days
          </button>
          <button
            onClick={() => setTimeRange(30)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              timeRange === 30
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            30 days
          </button>
          <button
            onClick={() => setTimeRange(90)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              timeRange === 90
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            90 days
          </button>
        </div>
      </div>

      {/* Health Metrics Grid */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Steps */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5 opacity-60" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-90 mb-1">Average Steps</p>
              <p className="text-3xl font-bold">{summary.steps.average.toLocaleString()}</p>
              <p className="text-xs opacity-75 mt-2">
                Total: {summary.steps.total.toLocaleString()} steps
              </p>
            </div>
          </div>

          {/* Heart Rate */}
          <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Heart className="w-8 h-8 opacity-80" />
              <Calendar className="w-5 h-5 opacity-60" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-90 mb-1">Heart Rate</p>
              <p className="text-3xl font-bold">{summary.heartRate.average} bpm</p>
              <p className="text-xs opacity-75 mt-2">
                Resting: {summary.heartRate.resting} bpm • Max: {summary.heartRate.max} bpm
              </p>
            </div>
          </div>

          {/* Sleep */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Moon className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5 opacity-60" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-90 mb-1">Average Sleep</p>
              <p className="text-3xl font-bold">{summary.sleep.averageHours}h</p>
              <p className="text-xs opacity-75 mt-2">
                Total: {summary.sleep.totalHours}h over {timeRange} days
              </p>
            </div>
          </div>

          {/* Active Energy */}
          <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Zap className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5 opacity-60" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-90 mb-1">Active Energy</p>
              <p className="text-3xl font-bold">{summary.activeEnergy.average}</p>
              <p className="text-xs opacity-75 mt-2">
                Total: {summary.activeEnergy.total.toLocaleString()} cal
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Workouts Section */}
      {summary && summary.workouts.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Workouts ({summary.workouts.length})
          </h3>
          <div className="space-y-3">
            {summary.workouts.slice(0, 5).map((workout, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {workout.workoutActivityType.replace('HKWorkoutActivityType', '')}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {format(workout.startDate, 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {workout.duration} min
                  </p>
                  {workout.totalEnergyBurned && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {Math.round(workout.totalEnergyBurned)} cal
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Re-upload option */}
      <details className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
          Update Health Data
        </summary>
        <div className="mt-4">
          <HealthDataUpload onDataUploaded={handleDataUploaded} />
        </div>
      </details>
    </div>
  );
}
