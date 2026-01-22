# Quick Setup Guide

## ⚠️ Important: API Key Setup

**Your API key has been removed from the source code for security.** 

To use the chatbot, you need to:

1. **Create a `.env` file** in the root directory (same folder as `package.json`)
2. **Add your OpenAI API key** to the `.env` file:

```
VITE_OPENAI_API_KEY=sk-proj-your-actual-key-here
```

3. **Restart your development server** after creating the `.env` file

The `.env` file is automatically ignored by Git and will NOT be committed to your repository.

## Running the App

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`
