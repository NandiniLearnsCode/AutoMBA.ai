// API Key configuration
// IMPORTANT: Never commit API keys to the repository!
// Use environment variables: import.meta.env.VITE_OPENAI_API_KEY
// Create a .env file in the root directory with: VITE_OPENAI_API_KEY=your_key_here

export function getOpenAIApiKey(): string | null {
  // Get from environment variable (Vite)
  const envKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (envKey) {
    return envKey;
  }
  
  // No fallback - user must set environment variable
  console.warn("OpenAI API key not found. Please set VITE_OPENAI_API_KEY in your .env file.");
  return null;
}
