# Multi-stage build for React frontend + Express backend
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install nginx and supervisor for process management
RUN apk add --no-cache nginx supervisor

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built frontend from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy server files
COPY server ./server

# Create nginx configuration
RUN mkdir -p /etc/nginx/http.d && \
    echo 'server {' > /etc/nginx/http.d/default.conf && \
    echo '    listen 8080;' >> /etc/nginx/http.d/default.conf && \
    echo '    server_name _;' >> /etc/nginx/http.d/default.conf && \
    echo '    root /usr/share/nginx/html;' >> /etc/nginx/http.d/default.conf && \
    echo '    index index.html;' >> /etc/nginx/http.d/default.conf && \
    echo '    location / {' >> /etc/nginx/http.d/default.conf && \
    echo '        try_files $uri $uri/ /index.html;' >> /etc/nginx/http.d/default.conf && \
    echo '    }' >> /etc/nginx/http.d/default.conf && \
    echo '    location /api/mcp-calendar {' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_pass http://localhost:3000;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_http_version 1.1;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Upgrade $http_upgrade;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Connection "upgrade";' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Host $host;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Forwarded-Proto $scheme;' >> /etc/nginx/http.d/default.conf && \
    echo '    }' >> /etc/nginx/http.d/default.conf && \
    echo '    location /oauth2callback {' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_pass http://localhost:3000;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_http_version 1.1;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Host $host;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Forwarded-Proto $scheme;' >> /etc/nginx/http.d/default.conf && \
    echo '    }' >> /etc/nginx/http.d/default.conf && \
    echo '    location /auth {' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_pass http://localhost:3000;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_http_version 1.1;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Host $host;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Real-IP $remote_addr;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header X-Forwarded-Proto $scheme;' >> /etc/nginx/http.d/default.conf && \
    echo '    }' >> /etc/nginx/http.d/default.conf && \
    echo '    location /health {' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_pass http://localhost:3000;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_http_version 1.1;' >> /etc/nginx/http.d/default.conf && \
    echo '        proxy_set_header Host $host;' >> /etc/nginx/http.d/default.conf && \
    echo '    }' >> /etc/nginx/http.d/default.conf && \
    echo '}' >> /etc/nginx/http.d/default.conf

# Create supervisor configuration
RUN mkdir -p /etc/supervisor.d && \
    echo '[supervisord]' > /etc/supervisor.d/supervisord.ini && \
    echo 'nodaemon=true' >> /etc/supervisor.d/supervisord.ini && \
    echo '' >> /etc/supervisor.d/supervisord.ini && \
    echo '[program:nginx]' >> /etc/supervisor.d/supervisord.ini && \
    echo 'command=nginx -g "daemon off;"' >> /etc/supervisor.d/supervisord.ini && \
    echo 'autostart=true' >> /etc/supervisor.d/supervisord.ini && \
    echo 'autorestart=true' >> /etc/supervisor.d/supervisord.ini && \
    echo 'stdout_logfile=/dev/stdout' >> /etc/supervisor.d/supervisord.ini && \
    echo 'stdout_logfile_maxbytes=0' >> /etc/supervisor.d/supervisord.ini && \
    echo 'stderr_logfile=/dev/stderr' >> /etc/supervisor.d/supervisord.ini && \
    echo 'stderr_logfile_maxbytes=0' >> /etc/supervisor.d/supervisord.ini && \
    echo '' >> /etc/supervisor.d/supervisord.ini && \
    echo '[program:node]' >> /etc/supervisor.d/supervisord.ini && \
    echo 'command=node server/mcp-calendar-server.js' >> /etc/supervisor.d/supervisord.ini && \
    echo 'directory=/app' >> /etc/supervisor.d/supervisord.ini && \
    echo 'autostart=true' >> /etc/supervisor.d/supervisord.ini && \
    echo 'autorestart=true' >> /etc/supervisor.d/supervisord.ini && \
    echo 'stdout_logfile=/dev/stdout' >> /etc/supervisor.d/supervisord.ini && \
    echo 'stdout_logfile_maxbytes=0' >> /etc/supervisor.d/supervisord.ini && \
    echo 'stderr_logfile=/dev/stderr' >> /etc/supervisor.d/supervisord.ini && \
    echo 'stderr_logfile_maxbytes=0' >> /etc/supervisor.d/supervisord.ini

# Expose port (Cloud Run uses PORT env var, but we'll use 8080)
EXPOSE 8080

# Create main supervisor config
RUN echo '[supervisord]' > /etc/supervisord.conf && \
    echo 'nodaemon=true' >> /etc/supervisord.conf && \
    echo '' >> /etc/supervisord.conf && \
    echo '[include]' >> /etc/supervisord.conf && \
    echo 'files = /etc/supervisor.d/*.ini' >> /etc/supervisord.conf

# Start supervisor which manages both nginx and node
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
