
# BrillPrime Render Deployment Guide

## Prerequisites
- GitHub repository with your code
- Render account (free tier available)
- Domain name (optional)

## Step 1: Repository Preparation

1. Ensure your code is pushed to GitHub
2. Verify `render.yaml` is in your root directory
3. Run the deployment preparation script:
   ```bash
   chmod +x scripts/render-deploy.sh
   ./scripts/render-deploy.sh
   ```

## Step 2: Render Service Setup

### Backend Web Service
1. Go to Render Dashboard → New → Web Service
2. Connect your GitHub repository
3. Configure service:
   - **Name**: `brillprime-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or Starter for production)

### Database Setup
1. Create new PostgreSQL database:
   - **Name**: `brillprime-db`
   - **Plan**: Free (or Starter for production)
2. Copy the connection string from database dashboard

### Redis Setup (Optional)
1. Create new Redis service:
   - **Name**: `brillprime-redis`
   - **Plan**: Free (or Starter for production)

## Step 3: Environment Variables

Configure in Render Web Service settings:

### Required Variables
```env
NODE_ENV=production
DATABASE_URL=[Auto-filled from PostgreSQL service]
JWT_SECRET=[Generate 32+ character random string]
SESSION_SECRET=[Generate 32+ character random string]
PORT=[Auto-configured by Render]
```

### Optional Variables
```env
REDIS_URL=[Auto-filled from Redis service]
PAYSTACK_SECRET_KEY=[Your Paystack secret key]
PAYSTACK_PUBLIC_KEY=[Your Paystack public key]
VITE_GOOGLE_CLIENT_ID=[Your Google OAuth client ID]
GOOGLE_CLIENT_SECRET=[Your Google OAuth secret]
FRONTEND_URL=https://your-frontend.onrender.com
```

## Step 4: Deploy

1. Click "Manual Deploy" or push to trigger auto-deploy
2. Monitor build logs for any issues
3. Check health endpoint: `https://your-service.onrender.com/api/health`

## Step 5: Custom Domain (Optional)

1. Go to service settings → Custom Domains
2. Add your domain name
3. Configure DNS records as instructed by Render

## Step 6: Frontend Deployment

Deploy your client on Render as a static site:
1. New → Static Site
2. Build Command: `cd client && npm run build`
3. Publish Directory: `client/dist`

## Monitoring & Maintenance

- **Logs**: Available in Render dashboard
- **Metrics**: Monitor CPU, memory usage
- **Health Checks**: Automatic via `/api/health`
- **SSL**: Automatically provided by Render
- **Auto-Deploy**: Triggered by GitHub pushes

## Production Checklist

- [ ] Database connected and migrations run
- [ ] All environment variables configured
- [ ] Payment integration tested (Paystack)
- [ ] SSL certificate active
- [ ] Custom domain configured (if needed)
- [ ] Frontend pointing to backend URL
- [ ] Health checks passing
- [ ] CORS configured for frontend domain

## Scaling

Render automatically handles:
- SSL certificates
- CDN for static assets
- Load balancing (on paid plans)
- Automatic deployments

For high traffic, upgrade to:
- Starter or Pro plans
- Multiple regions
- Dedicated databases
