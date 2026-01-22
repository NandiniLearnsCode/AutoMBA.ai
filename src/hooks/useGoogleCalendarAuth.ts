import { useEffect } from 'react';
import { authenticateUser, isAuthenticated } from '@/services/googleCalendar';

export function useGoogleCalendarAuth() {
  useEffect(() => {
    // Trigger authentication when the app loads
    const initializeAuth = async () => {
      try {
        // Check if already authenticated
        if (isAuthenticated()) {
          return;
        }

        // Small delay to ensure Google scripts have time to load
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Trigger authentication (this will show the popup if needed)
        await authenticateUser();
      } catch (error: any) {
        // Silently handle errors - user can retry from TimelineView if needed
        console.log('Google Calendar authentication initialization:', error.message);
      }
    };

    initializeAuth();
  }, []);

  return {};
}
