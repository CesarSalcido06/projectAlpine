# Project Alpine - Production Deployment Guide

## Overview
Deploy Project Alpine using Docker and a reverse proxy (nginx-proxy-manager or similar).

## Prerequisites
- Docker and Docker Compose installed
- Reverse proxy (nginx-proxy-manager, Traefik, or nginx)
- Domain DNS configured

---

## Step 1: Configure Environment

### Generate a Secure JWT Secret

```bash
# Generate a secure random secret
openssl rand -base64 48
```

Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Edit `.env` and set the JWT_SECRET:
```
JWT_SECRET=<paste-your-generated-secret-here>
```

### Update Production Configuration

Edit `src/backend/.env.production` and set your domain:
```
FRONTEND_URL=https://your-domain.com
```

Edit `docker-compose.yml` and update the FRONTEND_URL environment variable.

---

## Step 2: Build and Start the Containers

```bash
# Build and start the containers
docker compose up -d --build

# Check status
docker compose ps

# View logs
docker compose logs -f
```

This will start:
- `alpine-backend` on port 3001
- `alpine-frontend` on port 3002

---

## Step 3: Configure DNS

Add an A record for your domain pointing to your server's public IP:

| Type | Name   | Value           |
|------|--------|-----------------|
| A    | alpine | <your-public-ip> |

If using Cloudflare, you can enable the proxy (orange cloud) for DDoS protection.

---

## Step 4: Configure Reverse Proxy

### Using nginx-proxy-manager

1. Add a Proxy Host with:
   - Domain: `your-domain.com`
   - Scheme: `http`
   - Forward Hostname: `alpine-frontend`
   - Forward Port: `3000`
   - Enable "Websockets Support"

2. SSL Tab:
   - Request a new SSL Certificate
   - Enable "Force SSL"

3. Advanced Tab - Add this to proxy /api to the backend:
   ```nginx
   location /api/ {
       proxy_pass http://alpine-backend:3001/api/;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_cache_bypass $http_upgrade;
   }
   ```

### Using nginx directly

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Step 5: Verify Deployment

1. **Test the API:**
   ```bash
   curl https://your-domain.com/api/health
   ```

   Expected response:
   ```json
   {"status":"ok","service":"project-alpine-api","version":"1.0.0",...}
   ```

2. **Test the Frontend:**
   Open https://your-domain.com in your browser.

---

## Troubleshooting

### Check Container Status
```bash
docker compose ps
docker compose logs alpine-backend
docker compose logs alpine-frontend
```

### Rebuild After Changes
```bash
docker compose down
docker compose up -d --build
```

### Common Issues

1. **502 Bad Gateway**: Container not running or wrong hostname
   - Verify containers are on the same Docker network as your proxy
   - Check `docker compose ps`

2. **SSL Certificate Error**: DNS not propagated yet
   - Wait for DNS propagation
   - Verify with: `dig your-domain.com`

3. **API Not Working**: Proxy config not applied
   - Double-check the nginx config
   - Ensure backend container is accessible

---

## Managing the Application

### Stop Services
```bash
docker compose down
```

### View Logs
```bash
docker compose logs -f
```

### Backup Data
The database is stored in the Docker volume `alpine-data`.

```bash
# Backup
docker run --rm -v projectalpine_alpine-data:/data -v $(pwd):/backup alpine tar cvf /backup/alpine-backup.tar /data

# Restore
docker run --rm -v projectalpine_alpine-data:/data -v $(pwd):/backup alpine tar xvf /backup/alpine-backup.tar -C /
```

### Update Application
```bash
git pull
docker compose down
docker compose up -d --build
```
