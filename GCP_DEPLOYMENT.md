# GCP Deployment Guide for AutoMBA.ai

This guide will help you deploy the AutoMBA.ai application to Google Cloud Platform using Cloud Run.

## Prerequisites

1. **Google Cloud Account**: Sign up at [cloud.google.com](https://cloud.google.com)
2. **gcloud CLI**: Install from [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install)
3. **Docker**: Not required (Cloud Build handles this)
4. **Google Cloud Project**: Create a new project in the [GCP Console](https://console.cloud.google.com)

## Quick Start

### 1. Authenticate with Google Cloud

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Run the Deployment Script

```bash
chmod +x deploy.sh
./deploy.sh
```

The script will:
- Enable required GCP APIs
- Build your Docker image
- Deploy to Cloud Run
- Provide you with the service URL

### 3. Set Environment Variables

After deployment, set your environment variables:

```bash
gcloud run services update automba-chatbot \
  --region us-central1 \
  --set-env-vars \
    GOOGLE_CLIENT_ID=your-client-id,\
    GOOGLE_CLIENT_SECRET=your-client-secret,\
    GOOGLE_REDIRECT_URI=https://your-service-url.run.app/oauth2callback,\
    VITE_OPENAI_API_KEY=your-openai-key
```

## Manual Deployment

If you prefer to deploy manually:

### Step 1: Build and Push Docker Image

```bash
# Build the image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/automba-chatbot

# Or build locally first
docker build -t gcr.io/YOUR_PROJECT_ID/automba-chatbot .
docker push gcr.io/YOUR_PROJECT_ID/automba-chatbot
```

### Step 2: Deploy to Cloud Run

```bash
gcloud run deploy automba-chatbot \
  --image gcr.io/YOUR_PROJECT_ID/automba-chatbot \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --cpu 1
```

### Step 3: Configure Environment Variables

```bash
gcloud run services update automba-chatbot \
  --region us-central1 \
  --set-env-vars \
    GOOGLE_CLIENT_ID=your-client-id,\
    GOOGLE_CLIENT_SECRET=your-client-secret,\
    GOOGLE_REDIRECT_URI=https://your-service-url/oauth2callback
```

## Environment Variables

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `123456789.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URI | `https://your-app.run.app/oauth2callback` |
| `VITE_OPENAI_API_KEY` | OpenAI API key (optional) | `sk-...` |

## Setting Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** > **Credentials**
3. Create OAuth 2.0 Client ID
4. Add authorized redirect URI: `https://your-service-url.run.app/oauth2callback`
5. Copy Client ID and Secret

## Continuous Deployment with Cloud Build

To set up automatic deployments on git push:

1. Connect your repository to Cloud Build:
   ```bash
   gcloud builds triggers create github \
     --repo-name=YOUR_REPO \
     --repo-owner=YOUR_GITHUB_USERNAME \
     --branch-pattern="^main$" \
     --build-config=cloudbuild.yaml
   ```

2. Or use the Cloud Console:
   - Go to Cloud Build > Triggers
   - Click "Create Trigger"
   - Connect your repository
   - Set build configuration to `cloudbuild.yaml`

## Updating the Deployment

To update your deployment:

```bash
# Rebuild and redeploy
./deploy.sh

# Or manually
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/automba-chatbot
gcloud run deploy automba-chatbot \
  --image gcr.io/YOUR_PROJECT_ID/automba-chatbot \
  --region us-central1
```

## Monitoring and Logs

View logs:
```bash
gcloud run services logs read automba-chatbot --region us-central1
```

View in console:
- Go to Cloud Run > automba-chatbot > Logs

## Cost Optimization

Cloud Run charges only for:
- Request processing time
- Memory allocated
- CPU allocated

Default settings:
- **Memory**: 512Mi (adjust based on usage)
- **CPU**: 1 (can scale to 0 when idle)
- **Min instances**: 0 (no cost when idle)
- **Max instances**: 10 (prevents runaway costs)

## Troubleshooting

### Build fails
- Check Dockerfile syntax
- Ensure all dependencies are in package.json
- Check Cloud Build logs in console

### Service won't start
- Check environment variables are set
- View logs: `gcloud run services logs read automba-chatbot`
- Verify port 8080 is exposed

### OAuth not working
- Verify redirect URI matches exactly
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
- Ensure redirect URI is added in Google Cloud Console

## Security Best Practices

1. **Use Secret Manager** for sensitive data:
   ```bash
   # Create secret
   echo -n "your-secret" | gcloud secrets create google-client-secret --data-file=-
   
   # Use in Cloud Run
   gcloud run services update automba-chatbot \
     --update-secrets GOOGLE_CLIENT_SECRET=google-client-secret:latest
   ```

2. **Enable IAM** for fine-grained access control
3. **Use HTTPS** (enabled by default on Cloud Run)
4. **Set up monitoring** and alerts

## Support

For issues:
- Check [Cloud Run documentation](https://cloud.google.com/run/docs)
- Review logs in Cloud Console
- Check [Cloud Build status](https://console.cloud.google.com/cloud-build)
