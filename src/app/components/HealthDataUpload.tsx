// Apple Health Data Upload Component

import { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { appleHealthParser } from '@/services/appleHealthParser';
import { HealthRecord, WorkoutRecord } from '@/types/health';

interface HealthDataUploadProps {
  onDataUploaded?: (records: HealthRecord[], workouts: WorkoutRecord[]) => void;
}

export function HealthDataUpload({ onDataUploaded }: HealthDataUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordCount, setRecordCount] = useState(0);
  const [workoutCount, setWorkoutCount] = useState(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      // Parse health records
      const records = await appleHealthParser.parseXMLFile(file);
      const workouts = await appleHealthParser.parseWorkouts(file);

      setRecordCount(records.length);
      setWorkoutCount(workouts.length);

      // Store in localStorage for now (you can replace with a proper backend)
      localStorage.setItem('appleHealthRecords', JSON.stringify(records));
      localStorage.setItem('appleHealthWorkouts', JSON.stringify(workouts));
      localStorage.setItem('appleHealthLastUpdate', new Date().toISOString());

      setSuccess(true);
      setUploading(false);

      // Notify parent component
      if (onDataUploaded) {
        onDataUploaded(records, workouts);
      }
    } catch (err) {
      console.error('Error parsing health data:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse health data');
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Import Apple Health Data
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Export your health data from the Health app on your iPhone and upload it here.
        </p>

        {/* Instructions */}
        <div className="bg-white dark:bg-gray-800 rounded-md p-4 mb-4 text-sm space-y-2">
          <p className="font-medium text-gray-900 dark:text-white">How to export:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Open the Health app on your iPhone</li>
            <li>Tap your profile picture in the top right</li>
            <li>Scroll down and tap "Export All Health Data"</li>
            <li>Save the export.zip file</li>
            <li>Extract the export.xml file from the zip</li>
            <li>Upload the export.xml file here</li>
          </ol>
        </div>

        {/* Upload button */}
        <label className="block">
          <input
            type="file"
            accept=".xml"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-colors bg-white dark:bg-gray-800/50">
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Parsing health data...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Click to upload export.xml
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  or drag and drop
                </span>
              </div>
            )}
          </div>
        </label>

        {/* Success message */}
        {success && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Successfully imported health data!
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  {recordCount.toLocaleString()} health records and {workoutCount.toLocaleString()} workouts imported.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                  Failed to import health data
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
