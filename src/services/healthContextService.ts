// Health Context Service
// Provides health data context for AI chatbot

import { HealthRecord, WorkoutRecord, HealthSummary } from '@/types/health';
import { appleHealthParser } from './appleHealthParser';
import { format, subDays } from 'date-fns';

export interface HealthContext {
  hasData: boolean;
  summary?: HealthSummary;
  recentActivity?: string;
  insights?: string[];
  recommendations?: string[];
}

export class HealthContextService {
  /**
   * Get health context for chatbot
   */
  async getHealthContext(days: number = 7): Promise<HealthContext> {
    try {
      // Load health data from localStorage
      const storedRecords = localStorage.getItem('appleHealthRecords');
      const storedWorkouts = localStorage.getItem('appleHealthWorkouts');

      if (!storedRecords) {
        return { hasData: false };
      }

      const records: HealthRecord[] = JSON.parse(storedRecords);
      const workouts: WorkoutRecord[] = storedWorkouts ? JSON.parse(storedWorkouts) : [];

      // Convert date strings back to Date objects
      records.forEach((r: any) => {
        r.startDate = new Date(r.startDate);
        r.endDate = new Date(r.endDate);
        if (r.creationDate) r.creationDate = new Date(r.creationDate);
      });
      workouts.forEach((w: any) => {
        w.startDate = new Date(w.startDate);
        w.endDate = new Date(w.endDate);
      });

      // Generate summary for specified time range
      const endDate = new Date();
      const startDate = subDays(endDate, days);
      const summary = appleHealthParser.generateSummary(records, workouts, startDate, endDate);

      // Generate insights
      const insights = this.generateInsights(summary);
      const recommendations = this.generateRecommendations(summary);
      const recentActivity = this.getRecentActivitySummary(summary);

      return {
        hasData: true,
        summary,
        recentActivity,
        insights,
        recommendations,
      };
    } catch (error) {
      console.error('Error getting health context:', error);
      return { hasData: false };
    }
  }

  /**
   * Generate insights from health summary
   */
  private generateInsights(summary: HealthSummary): string[] {
    const insights: string[] = [];

    // Steps insight
    if (summary.steps.average > 0) {
      if (summary.steps.average >= 10000) {
        insights.push(`You're averaging ${summary.steps.average.toLocaleString()} steps/day - excellent activity level!`);
      } else if (summary.steps.average >= 7000) {
        insights.push(`You're averaging ${summary.steps.average.toLocaleString()} steps/day - good progress!`);
      } else {
        insights.push(`You're averaging ${summary.steps.average.toLocaleString()} steps/day - consider increasing activity.`);
      }
    }

    // Sleep insight
    if (summary.sleep.averageHours > 0) {
      if (summary.sleep.averageHours >= 7 && summary.sleep.averageHours <= 9) {
        insights.push(`Sleep looks good at ${summary.sleep.averageHours}h/night.`);
      } else if (summary.sleep.averageHours < 7) {
        insights.push(`You're averaging only ${summary.sleep.averageHours}h of sleep - aim for 7-9h.`);
      } else {
        insights.push(`You're sleeping ${summary.sleep.averageHours}h/night - may be too much.`);
      }
    }

    // Heart rate insight
    if (summary.heartRate.resting > 0) {
      if (summary.heartRate.resting < 60) {
        insights.push(`Excellent resting heart rate of ${summary.heartRate.resting} bpm.`);
      } else if (summary.heartRate.resting < 70) {
        insights.push(`Good resting heart rate of ${summary.heartRate.resting} bpm.`);
      } else {
        insights.push(`Resting heart rate is ${summary.heartRate.resting} bpm - consider more cardio.`);
      }
    }

    // Workout insight
    if (summary.workouts.length > 0) {
      const totalWorkoutMinutes = summary.workouts.reduce((sum, w) => sum + w.duration, 0);
      const avgPerDay = Math.round(totalWorkoutMinutes / 7);
      insights.push(`You've completed ${summary.workouts.length} workouts, averaging ${avgPerDay} min/day.`);
    }

    return insights;
  }

  /**
   * Generate recommendations from health summary
   */
  private generateRecommendations(summary: HealthSummary): string[] {
    const recommendations: string[] = [];

    // Steps recommendation
    if (summary.steps.average < 7000) {
      recommendations.push('Try to hit 10,000 steps daily - add a 20-minute walk to your routine.');
    }

    // Sleep recommendation
    if (summary.sleep.averageHours < 7) {
      recommendations.push('Prioritize 7-9 hours of sleep for better cognitive performance and recovery.');
    }

    // Workout recommendation
    if (summary.workouts.length < 3) {
      recommendations.push('Aim for at least 3-4 workouts per week to maintain fitness.');
    }

    // Active energy recommendation
    if (summary.activeEnergy.average < 400) {
      recommendations.push('Increase daily active calories to 400+ through exercise or more movement.');
    }

    return recommendations;
  }

  /**
   * Get recent activity summary
   */
  private getRecentActivitySummary(summary: HealthSummary): string {
    const parts: string[] = [];

    if (summary.steps.average > 0) {
      parts.push(`${summary.steps.average.toLocaleString()} avg steps/day`);
    }

    if (summary.sleep.averageHours > 0) {
      parts.push(`${summary.sleep.averageHours}h avg sleep`);
    }

    if (summary.workouts.length > 0) {
      parts.push(`${summary.workouts.length} workouts`);
    }

    if (summary.heartRate.resting > 0) {
      parts.push(`${summary.heartRate.resting} bpm resting HR`);
    }

    return parts.length > 0 ? parts.join(' • ') : 'No recent activity data';
  }

  /**
   * Format health context for chatbot prompt
   */
  async getHealthPromptContext(): Promise<string> {
    const context = await this.getHealthContext(7);

    if (!context.hasData) {
      return '';
    }

    const parts: string[] = ['User Health Data (last 7 days):'];

    if (context.summary) {
      const { steps, sleep, heartRate, activeEnergy, workouts } = context.summary;
      
      parts.push(`- Steps: ${steps.average.toLocaleString()} avg/day (total: ${steps.total.toLocaleString()})`);
      parts.push(`- Sleep: ${sleep.averageHours}h avg/night`);
      
      if (heartRate.resting > 0) {
        parts.push(`- Resting Heart Rate: ${heartRate.resting} bpm`);
      }
      
      parts.push(`- Active Energy: ${activeEnergy.average} cal/day`);
      parts.push(`- Workouts: ${workouts.length} sessions`);
      
      if (workouts.length > 0) {
        const totalWorkoutMinutes = workouts.reduce((sum, w) => sum + w.duration, 0);
        parts.push(`  (${totalWorkoutMinutes} minutes total)`);
      }
    }

    if (context.insights && context.insights.length > 0) {
      parts.push('\nInsights:');
      context.insights.forEach(insight => parts.push(`- ${insight}`));
    }

    return parts.join('\n');
  }

  /**
   * Check if user has health data
   */
  hasHealthData(): boolean {
    return !!localStorage.getItem('appleHealthRecords');
  }

  /**
   * Get last update time
   */
  getLastUpdateTime(): Date | null {
    const lastUpdate = localStorage.getItem('appleHealthLastUpdate');
    return lastUpdate ? new Date(lastUpdate) : null;
  }
}

// Singleton instance
export const healthContextService = new HealthContextService();
