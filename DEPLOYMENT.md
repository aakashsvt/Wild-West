# Frontend Deployment Guide

This project has been configured for **frontend-only deployment**. All server-related dependencies have been removed.

## Quick Start

### Development

```bash
npm install
npm run dev
```

Runs the app on `http://localhost:5173`

### Production Build

```bash
npm run build
```

This creates an optimized build in the `dist/public` folder.

### Preview Production Build

```bash
npm run preview
```

## Deployment Platforms

### Vercel

1. Push code to GitHub
2. Connect repo to Vercel
3. Vercel auto-detects Vite config
4. Set build command: `npm run build`
5. Set output directory: `dist/public`

### Netlify

1. Connect your git repo
2. Build command: `npm run build`
3. Publish directory: `dist/public`

### AWS S3 + CloudFront

```bash
npm run build
aws s3 sync dist/public s3://your-bucket-name
```

### GitHub Pages

1. Update `vite.config.ts` with `base: '/repository-name/'`
2. Push to GitHub
3. Enable Pages in repository settings
4. Select `gh-pages` branch (after first deployment)

### Docker Example

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist/public /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Environment Variables

The app currently doesn't require environment variables since all game logic runs client-side. If you add API calls in the future, use `.env.local` for development.

## Project Structure

- `client/` - React frontend code
- `dist/public/` - Production build output
- `attached_assets/` - Static assets (models, images, etc.)

## Type Checking

```bash
npm run check
```

## Notes

- All game state is managed locally with Zustand
- No backend API calls are made
- The app is fully self-contained and can run anywhere static files are served
