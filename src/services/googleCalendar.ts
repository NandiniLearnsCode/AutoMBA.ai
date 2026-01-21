// Google Calendar API service
// Uses Google Identity Services (GIS) for OAuth 2.0

interface GoogleCalendarCredentials {
  web: {
    client_id: string;
    project_id: string;
    auth_uri: string;
    token_uri: string;
    auth_provider_x509_cert_url: string;
    client_secret?: string; // Not used in frontend OAuth
  };
}

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  description?: string;
}

interface ParsedEvent {
  id: string;
  time: string;
  duration: number;
  title: string;
  type: "class" | "meeting" | "study" | "workout" | "networking" | "recruiting" | "buffer";
  status: "completed" | "current" | "upcoming" | "suggested";
  location?: string;
  priority: "hard-block" | "flexible" | "optional";
}

let credentials: GoogleCalendarCredentials | null = null;
let gapiInitialized = false;
let tokenClient: any = null;
let accessToken: string | null = null;

// Load credentials from environment variables
export async function loadCredentials(): Promise<GoogleCalendarCredentials> {
  if (credentials) return credentials;
  
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
  const projectId = import.meta.env.VITE_GOOGLE_PROJECT_ID || 'gen-lang-client-0874641930';
  
  if (!clientId) {
    throw new Error('Google Calendar credentials not found. Please set VITE_GOOGLE_CLIENT_ID in your .env file.');
  }
  
  credentials = {
    web: {
      client_id: clientId,
      project_id: projectId,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_secret: clientSecret, // Not used in frontend, but kept for structure
    },
  };
  
  return credentials;
}

// Load Google Identity Services script
export async function loadGoogleIdentityServices(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve();
      } else {
        reject(new Error('Google Identity Services failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

// Load Google APIs script
export async function loadGoogleAPIs(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.gapi) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      if (window.gapi) {
        resolve();
      } else {
        reject(new Error('Google APIs failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Google APIs'));
    document.head.appendChild(script);
  });
}

// Initialize Google APIs
export async function initializeGoogleAPI(): Promise<void> {
  if (gapiInitialized) return;
  
  await loadGoogleAPIs();
  
  return new Promise((resolve, reject) => {
    window.gapi?.load('client', async () => {
      try {
        const creds = await loadCredentials();
        
        await window.gapi?.client.init({
          apiKey: '', // Not needed for OAuth
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
        });
        
        gapiInitialized = true;
        resolve();
      } catch (error) {
        console.error('Error initializing Google API:', error);
        reject(error);
      }
    });
  });
}

// Initialize token client for OAuth
export async function initializeTokenClient(): Promise<void> {
  await loadGoogleIdentityServices();
  const creds = await loadCredentials();
  
  return new Promise((resolve) => {
    tokenClient = window.google?.accounts.oauth2.initTokenClient({
      client_id: creds.web.client_id,
      scope: 'https://www.googleapis.com/auth/calendar',
      callback: (tokenResponse: any) => {
        if (tokenResponse.access_token) {
          accessToken = tokenResponse.access_token;
          window.gapi?.client.setToken({ access_token: tokenResponse.access_token });
        }
      },
    });
    resolve();
  });
}

// Authenticate user
export async function authenticateUser(): Promise<void> {
  await initializeGoogleAPI();
  await initializeTokenClient();
  
  return new Promise((resolve, reject) => {
    // Check if we already have a valid token
    const token = window.gapi?.client.getToken();
    if (token && token.access_token) {
      accessToken = token.access_token;
      resolve();
      return;
    }
    
    if (!tokenClient) {
      reject(new Error('Token client not initialized'));
      return;
    }
    
    // Request access token
    tokenClient.callback = (response: any) => {
      if (response.error) {
        reject(new Error(response.error));
        return;
      }
      if (response.access_token) {
        accessToken = response.access_token;
        window.gapi?.client.setToken({ access_token: response.access_token });
        resolve();
      } else {
        reject(new Error('No access token received'));
      }
    };
    
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const token = window.gapi?.client.getToken();
  return !!(token && token.access_token);
}

// Parse Google Calendar event to our format
function parseCalendarEvent(event: CalendarEvent): ParsedEvent | null {
  try {
    const startTime = event.start.dateTime || event.start.date;
    if (!startTime) return null;
    
    const start = new Date(startTime);
    const end = new Date(event.end.dateTime || event.end.date || startTime);
    const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
    
    const now = new Date();
    let status: "completed" | "current" | "upcoming" | "suggested" = "upcoming";
    if (end < now) {
      status = "completed";
    } else if (start <= now && end >= now) {
      status = "current";
    }
    
    // Determine event type from summary/title
    const summary = event.summary || '';
    const lowerSummary = summary.toLowerCase();
    let type: "class" | "meeting" | "study" | "workout" | "networking" | "recruiting" | "buffer" = "meeting";
    
    if (lowerSummary.includes('class') || lowerSummary.includes('course') || lowerSummary.includes('lecture')) {
      type = "class";
    } else if (lowerSummary.includes('study') || lowerSummary.includes('homework') || lowerSummary.includes('assignment')) {
      type = "study";
    } else if (lowerSummary.includes('gym') || lowerSummary.includes('workout') || lowerSummary.includes('exercise')) {
      type = "workout";
    } else if (lowerSummary.includes('coffee') || lowerSummary.includes('networking') || lowerSummary.includes('chat')) {
      type = "networking";
    } else if (lowerSummary.includes('recruiting') || lowerSummary.includes('interview') || lowerSummary.includes('info session')) {
      type = "recruiting";
    } else if (lowerSummary.includes('buffer') || lowerSummary.includes('travel')) {
      type = "buffer";
    }
    
    const timeStr = start.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
    
    return {
      id: event.id,
      time: timeStr,
      duration,
      title: summary,
      type,
      status,
      location: event.location,
      priority: "hard-block" as const,
    };
  } catch (error) {
    console.error('Error parsing event:', error);
    return null;
  }
}

// Fetch calendar events for a date range
export async function fetchCalendarEventsRange(startDate: Date, endDate: Date): Promise<ParsedEvent[]> {
  if (!accessToken) {
    throw new Error('Not authenticated');
  }
  
  try {
    const timeMin = startDate.toISOString();
    const timeMax = endDate.toISOString();
    
    const response = await window.gapi?.client.calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      showDeleted: false,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });
    
    if (!response || !response.result.items) {
      return [];
    }
    
    const events = response.result.items
      .map((event: CalendarEvent) => parseCalendarEvent(event))
      .filter((event: ParsedEvent | null): event is ParsedEvent => event !== null);
    
    return events;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

// Fetch calendar events for a specific date
export async function fetchCalendarEvents(date: Date): Promise<ParsedEvent[]> {
  try {
    if (!isAuthenticated()) {
      await authenticateUser();
    }
    
    const timeMin = new Date(date);
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date(date);
    timeMax.setHours(23, 59, 59, 999);
    
    const response = await window.gapi?.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      showDeleted: false,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50,
    });
    
    if (!response || !response.result.items) {
      return [];
    }
    
    const events = response.result.items
      .map(parseCalendarEvent)
      .filter((event): event is ParsedEvent => event !== null);
    
    return events;
  } catch (error: any) {
    console.error('Error fetching calendar events:', error);
    throw new Error(error.message || 'Failed to fetch calendar events');
  }
}

// Create a new calendar event
export async function createCalendarEvent(event: {
  summary: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
}): Promise<string> {
  try {
    if (!isAuthenticated()) {
      await authenticateUser();
    }
    
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const eventData = {
      summary: event.summary,
      start: {
        dateTime: event.start.toISOString(),
        timeZone,
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone,
      },
      description: event.description || '',
      location: event.location || '',
    };
    
    const response = await window.gapi?.client.calendar.events.insert({
      calendarId: 'primary',
      resource: eventData,
    });
    
    if (!response || !response.result.id) {
      throw new Error('Failed to create event');
    }
    
    return response.result.id;
  } catch (error: any) {
    console.error('Error creating calendar event:', error);
    throw new Error(error.message || 'Failed to create calendar event');
  }
}

// Update an existing calendar event
export async function updateCalendarEvent(
  eventId: string,
  updates: {
    summary?: string;
    start?: Date;
    end?: Date;
    description?: string;
    location?: string;
  }
): Promise<void> {
  try {
    if (!isAuthenticated()) {
      await authenticateUser();
    }
    
    // First, get the existing event
    const getResponse = await window.gapi?.client.calendar.events.get({
      calendarId: 'primary',
      eventId,
    });
    
    if (!getResponse || !getResponse.result) {
      throw new Error('Event not found');
    }
    
    const existingEvent = getResponse.result;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const eventData: any = {
      summary: updates.summary || existingEvent.summary,
      description: updates.description !== undefined ? updates.description : existingEvent.description,
      location: updates.location !== undefined ? updates.location : existingEvent.location,
    };
    
    if (updates.start) {
      eventData.start = {
        dateTime: updates.start.toISOString(),
        timeZone,
      };
    } else if (existingEvent.start) {
      eventData.start = existingEvent.start;
    }
    
    if (updates.end) {
      eventData.end = {
        dateTime: updates.end.toISOString(),
        timeZone,
      };
    } else if (existingEvent.end) {
      eventData.end = existingEvent.end;
    }
    
    await window.gapi?.client.calendar.events.update({
      calendarId: 'primary',
      eventId,
      resource: eventData,
    });
  } catch (error: any) {
    console.error('Error updating calendar event:', error);
    throw new Error(error.message || 'Failed to update calendar event');
  }
}

// Delete a calendar event
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  try {
    if (!isAuthenticated()) {
      await authenticateUser();
    }
    
    await window.gapi?.client.calendar.events.delete({
      calendarId: 'primary',
      eventId,
    });
  } catch (error: any) {
    console.error('Error deleting calendar event:', error);
    throw new Error(error.message || 'Failed to delete calendar event');
  }
}

// Move an event to a new time (wrapper around update)
export async function moveCalendarEvent(eventId: string, newStart: Date, newEnd: Date): Promise<void> {
  await updateCalendarEvent(eventId, { start: newStart, end: newEnd });
}

// Export ParsedEvent type for use in other files
export type { ParsedEvent };

// Add type declarations for Google APIs
declare global {
  interface Window {
    gapi?: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: any) => Promise<void>;
        getToken: () => { access_token?: string } | null;
        setToken: (token: { access_token: string }) => void;
        calendar: {
          events: {
            list: (params: any) => Promise<any>;
            get: (params: { calendarId: string; eventId: string }) => Promise<any>;
            insert: (params: { calendarId: string; resource: any }) => Promise<any>;
            update: (params: { calendarId: string; eventId: string; resource: any }) => Promise<any>;
            delete: (params: { calendarId: string; eventId: string }) => Promise<any>;
          };
        };
      };
    };
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: any) => any;
        };
      };
    };
  }
}
