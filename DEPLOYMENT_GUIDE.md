# ReferralGuard Deployment Guide

## Architecture Overview

- **Frontend**: Next.js app deployed on Vercel
- **Backend**: FastAPI service deployed on Railway
- **Communication**: Frontend calls Railway backend via environment variables

## Step 1: Deploy Backend to Railway

### 1.1 Prepare Backend Directory
The backend is already set up in the `backend/` directory with:
- FastAPI application (`main.py`)
- Python dependencies (`requirements.txt`)
- Railway configuration (`Procfile`)
- ML models and data files

### 1.2 Deploy to Railway
1. Go to [Railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Set the source directory to `backend/`
5. Deploy the service

### 1.3 Get Railway URL
After deployment, Railway will provide a URL like:
```
https://your-app-name.railway.app
```

## Step 2: Deploy Frontend to Vercel

### 2.1 Prepare Frontend
The frontend is ready in `referralguard-dashboard/` with:
- Next.js 14.2.5
- Updated API calls to use Railway backend
- Environment variable configuration

### 2.2 Deploy to Vercel
1. Go to [Vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set the root directory to `referralguard-dashboard/`
4. Add environment variable:
   - **Name**: `RAILWAY_BACKEND_URL`
   - **Value**: Your Railway service URL (e.g., `https://your-app-name.railway.app`)

### 2.3 Configure Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

## Step 3: Test Deployment

### 3.1 Test Backend
Visit your Railway URL to test the backend:
```
https://your-app-name.railway.app/health
```

Should return:
```json
{
  "status": "healthy",
  "models_loaded": 2
}
```

### 3.2 Test Frontend
Visit your Vercel URL and test the dashboard functionality.

## Environment Variables

### Vercel (Frontend)
- `RAILWAY_BACKEND_URL`: Your Railway service URL

### Railway (Backend)
- No additional environment variables needed for basic deployment

## File Structure After Deployment

```
ReferralGuard/
├── backend/                    # Railway deployment
│   ├── main.py                # FastAPI app
│   ├── requirements.txt       # Python deps
│   ├── Procfile              # Railway config
│   ├── models/               # ML models
│   └── data/                 # Data files
├── referralguard-dashboard/   # Vercel deployment
│   ├── app/                  # Next.js app
│   ├── components/           # React components
│   ├── package.json          # Node.js deps
│   └── next.config.js        # Next.js config
└── DEPLOYMENT_GUIDE.md       # This file
```

## Troubleshooting

### Backend Issues
1. Check Railway logs for Python errors
2. Verify ML model files are in `backend/models/`
3. Ensure `requirements.txt` has all dependencies

### Frontend Issues
1. Check Vercel logs for build errors
2. Verify `RAILWAY_BACKEND_URL` environment variable is set
3. Test API calls in browser dev tools

### CORS Issues
If you get CORS errors, update the backend CORS configuration in `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-vercel-app.vercel.app"],  # Your Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Cost Considerations

### Vercel
- Free tier: 100GB bandwidth, 100GB storage
- Pro: $20/month for unlimited bandwidth

### Railway
- Free tier: $5 credit/month
- Paid: Pay-as-you-use pricing

## Security Notes

1. **CORS**: Configure specific origins in production
2. **Environment Variables**: Keep sensitive data in environment variables
3. **API Keys**: Store any API keys securely in Railway environment variables

## Next Steps

1. Set up custom domains (optional)
2. Configure monitoring and logging
3. Set up CI/CD pipelines
4. Add authentication if needed 