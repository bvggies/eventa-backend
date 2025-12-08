# Cloudinary Setup Guide

## Overview
Cloudinary is used for uploading and managing images and videos in the event gallery feature.

## Setup Steps

### 1. Create Cloudinary Account
1. Go to [https://cloudinary.com](https://cloudinary.com)
2. Sign up for a free account
3. Verify your email

### 2. Get Your Credentials
1. Log in to Cloudinary Dashboard
2. Go to Dashboard (you'll see your credentials)
3. Copy the following:
   - **Cloud Name** (e.g., `dxyz123abc`)
   - **API Key** (e.g., `123456789012345`)
   - **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### 3. Add to Environment Variables

#### For Local Development
Add to your `.env` file in the `backend` directory:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

#### For Vercel/Production
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add the three Cloudinary variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

### 4. Test Upload
Once configured, the gallery upload feature will automatically use Cloudinary.

## Usage

### In Mobile App
When uploading images/videos:
1. User selects image/video from device
2. Image is converted to base64
3. Base64 string is sent to backend API
4. Backend uploads to Cloudinary
5. Cloudinary URL is stored in database

### API Endpoint
```
POST /api/gallery/gallery
Body: {
  eventId: string,
  mediaBase64: string,  // Base64 encoded image/video
  mediaType: 'image' | 'video',
  caption?: string,
  isHighlight?: boolean
}
```

## Free Tier Limits
- **Storage**: 25 GB
- **Bandwidth**: 25 GB/month
- **Transformations**: 25,000/month
- **Uploads**: Unlimited

## Features
- Automatic image optimization
- Automatic format conversion (WebP when supported)
- Responsive image delivery
- Video transcoding
- Secure URLs (HTTPS)

## Troubleshooting

### Error: "Failed to upload media"
- Check that all Cloudinary environment variables are set
- Verify credentials are correct
- Check Cloudinary dashboard for any account issues

### Images not displaying
- Ensure Cloudinary URLs are using HTTPS
- Check if images are in the correct folder structure
- Verify image permissions in Cloudinary

## Support
- Cloudinary Docs: https://cloudinary.com/documentation
- Cloudinary Dashboard: https://cloudinary.com/console

