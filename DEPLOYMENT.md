# Backend Deployment Guide

This guide will help you deploy the Eventa Backend API to various platforms.

## Prerequisites

- Your backend code pushed to GitHub
- Environment variables ready (DATABASE_URL, JWT_SECRET, PORT)
- Neon PostgreSQL database (already configured)

## Option 1: Deploy to Vercel (Recommended - Same as Admin Dashboard)

### Step 1: Create `vercel.json` in backend directory

Create a `vercel.json` file in the `backend/` directory:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/dist/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Step 2: Update `package.json` scripts

Make sure your `package.json` has:
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### Step 3: Deploy via Vercel Dashboard

1. **Go to Vercel**: https://vercel.com
2. **Sign in** with your GitHub account
3. **Click "Add New Project"**
4. **Import Repository**:
   - Select your backend repository (or create one if needed)
   - Click "Import"

5. **Configure Project**:
   - **Framework Preset**: Other (or Node.js)
   - **Root Directory**: `backend` (if in monorepo) or leave blank
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

6. **Add Environment Variables**:
   Click "Environment Variables" and add:
   - **Key**: `DATABASE_URL`
     **Value**: Your Neon database connection string
     ```
     postgresql://neondb_owner:npg_vemRUch04xiY@ep-holy-scene-ahmoef41-pooler.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
     ```
   
   - **Key**: `JWT_SECRET`
     **Value**: A strong secret key (e.g., generate one: `openssl rand -base64 32`)
   
   - **Key**: `PORT`
     **Value**: `5000` (or leave blank, Vercel will set it automatically)
   
   - **Key**: `NODE_ENV`
     **Value**: `production`

7. **Click "Deploy"**

### Step 4: Get Your Backend URL

After deployment, Vercel will give you a URL like:
```
https://your-backend-name.vercel.app
```

Your API will be available at:
```
https://your-backend-name.vercel.app/api
```

### Step 5: Update CORS Settings

Update `backend/src/index.ts` to allow your Vercel admin dashboard domain:

```typescript
app.use(cors({
  origin: [
    'http://localhost:3000', // Local admin dashboard
    'https://your-admin-dashboard.vercel.app', // Production admin dashboard
    '*', // Or allow all in production (less secure)
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

---

## Option 2: Deploy to Railway

### Step 1: Create Railway Account

1. Go to https://railway.app
2. Sign up with GitHub

### Step 2: Create New Project

1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your backend repository

### Step 3: Configure Environment Variables

In Railway dashboard, go to Variables tab and add:
- `DATABASE_URL`: Your Neon database connection string
- `JWT_SECRET`: Your JWT secret
- `NODE_ENV`: `production`
- `PORT`: Railway will set this automatically

### Step 4: Configure Build Settings

Railway should auto-detect Node.js. If not:
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

### Step 5: Deploy

Railway will automatically deploy. Get your URL from the dashboard.

---

## Option 3: Deploy to Render

### Step 1: Create Render Account

1. Go to https://render.com
2. Sign up with GitHub

### Step 2: Create New Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select your backend repository

### Step 3: Configure Service

- **Name**: `eventa-backend` (or your choice)
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Free or Paid

### Step 4: Add Environment Variables

In the Environment tab, add:
- `DATABASE_URL`
- `JWT_SECRET`
- `NODE_ENV`: `production`

### Step 5: Deploy

Click "Create Web Service" and Render will deploy.

---

## Option 4: Deploy to Heroku

### Step 1: Install Heroku CLI

```bash
npm install -g heroku
```

### Step 2: Login to Heroku

```bash
heroku login
```

### Step 3: Create Heroku App

```bash
cd backend
heroku create your-app-name
```

### Step 4: Set Environment Variables

```bash
heroku config:set DATABASE_URL="your-database-url"
heroku config:set JWT_SECRET="your-jwt-secret"
heroku config:set NODE_ENV="production"
```

### Step 5: Deploy

```bash
git push heroku main
```

---

## After Deployment

### 1. Test Your API

Visit your deployed backend URL:
```
https://your-backend-url.com/api/health
```

You should see:
```json
{
  "status": "ok",
  "message": "Eventa API is running"
}
```

### 2. Update Admin Dashboard

Update the `REACT_APP_API_URL` in your Vercel admin dashboard:
```
https://your-backend-url.com/api
```

### 3. Update Mobile App

Update the API URL in `mobile/src/constants/index.ts`:
```typescript
export const API_BASE_URL = __DEV__ 
  ? 'http://192.168.0.100:5000/api'  // Local development
  : 'https://your-backend-url.com/api'; // Production
```

### 4. Seed Admin Account (Optional)

If you need to seed admin accounts on production:

```bash
# On your local machine, set production DATABASE_URL
export DATABASE_URL="your-production-database-url"
npm run seed:admin
```

Or create a script that runs on deployment.

---

## Troubleshooting

### Build Fails

- Check that TypeScript compiles: `npm run build`
- Verify all dependencies are in `package.json`
- Check build logs in your platform's dashboard

### Database Connection Issues

- Verify `DATABASE_URL` is set correctly
- Check that Neon database allows connections from your platform
- Ensure SSL is enabled in connection string

### CORS Errors

- Update CORS settings in `backend/src/index.ts`
- Add your frontend domain to allowed origins
- Redeploy after changes

### Environment Variables Not Working

- Verify variable names match exactly (case-sensitive)
- Redeploy after adding/changing variables
- Check platform-specific variable format requirements

---

## Recommended: Vercel

Since you're already using Vercel for the admin dashboard, deploying the backend to Vercel makes sense:
- ✅ Same platform for frontend and backend
- ✅ Easy environment variable management
- ✅ Automatic deployments from GitHub
- ✅ Free tier available
- ✅ Fast global CDN

---

## Security Checklist

- [ ] Use strong `JWT_SECRET` (generate with: `openssl rand -base64 32`)
- [ ] Update CORS to only allow your domains
- [ ] Use environment variables (never commit secrets)
- [ ] Enable HTTPS (automatic on most platforms)
- [ ] Regularly update dependencies
- [ ] Monitor logs for errors

---

## Next Steps

1. Deploy backend to your chosen platform
2. Get your production backend URL
3. Update `REACT_APP_API_URL` in admin dashboard Vercel settings
4. Update mobile app API URL for production builds
5. Test all endpoints
6. Monitor logs and errors

