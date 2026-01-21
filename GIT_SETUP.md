# Git Setup Instructions

## Removing node_modules from Git Tracking

If `node_modules` is already being tracked by Git (showing up in GitHub Desktop), you need to remove it from Git's index while keeping the actual folder on your computer.

### Option 1: Using GitHub Desktop

1. Open GitHub Desktop
2. Go to Repository → Open in Command Prompt (or Terminal)
3. Run these commands:

```bash
git rm -r --cached node_modules
git commit -m "Remove node_modules from git tracking"
```

### Option 2: Using PowerShell/Command Prompt

Open PowerShell in your project directory and run:

```powershell
git rm -r --cached node_modules
git commit -m "Remove node_modules from git tracking"
```

### Option 3: If you haven't committed node_modules yet

If you see `node_modules` in the "Changes" tab but haven't committed it yet:
1. In GitHub Desktop, you can simply unstage/discard those changes
2. The `.gitignore` file will now prevent it from being tracked in the future

## Setting Up Your API Key

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Open `.env` and add your OpenAI API key:
   ```
   VITE_OPENAI_API_KEY=sk-proj-your-actual-key-here
   ```

3. The `.env` file is already in `.gitignore` and will NOT be committed to Git.

## Files Now Ignored by Git

The following files/folders are now in `.gitignore` and will NOT be committed:

- `node_modules/` - Dependencies
- `api_key.txt` and `api_key.txt.txt` - API key files
- `.env` and `.env.*` - Environment variable files
- `dist/` and `build/` - Build outputs
- Various editor and system files
