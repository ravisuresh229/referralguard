# ReferralGuard Backend API

FastAPI backend service for ReferralGuard healthcare analytics dashboard.

## Features

- ML model inference for referral risk scoring
- Real Medicare insights data
- RESTful API endpoints
- CORS enabled for frontend communication

## Deployment on Railway

1. **Connect Repository**
   - Go to [Railway.app](https://railway.app)
   - Create new project
   - Connect this backend directory

2. **Environment Variables**
   - Railway will automatically detect Python requirements
   - No additional environment variables needed for basic deployment

3. **Deploy**
   - Railway will automatically build and deploy
   - The service will be available at your Railway URL

4. **Update Frontend**
   - Set `RAILWAY_BACKEND_URL` environment variable in Vercel to your Railway service URL

## Local Development

```bash
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

- `GET /` - Health check
- `GET /health` - Detailed health status
- `POST /score/batch` - Batch ML scoring
- `GET /insights/real` - Real Medicare insights

## File Structure

```
backend/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies
├── Procfile            # Railway deployment config
├── models/             # ML model files (copy from root)
└── data/               # Data files (copy from outputs/)
``` 