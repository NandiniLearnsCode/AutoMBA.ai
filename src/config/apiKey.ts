// API Key configuration
// IMPORTANT: Never commit API keys to the repository!
// Priority order:
// 1. localStorage (set via Settings UI)
// 2. Environment variable (VITE_OPENAI_API_KEY from .env file)

const API_KEY_STORAGE_KEY = "nexus_openai_api_key";

export function getOpenAIApiKey(): string | null {
  // First, check localStorage (set via Settings UI)
  if (typeof window !== "undefined") {
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey && storedKey.trim()) {
      return storedKey.trim();
    }
  }

  // Second, check environment variable (Vite)
  const envKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (envKey) {
    return envKey;
  }
  
  // No key found
  return null;
}
