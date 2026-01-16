FROM node:20-slim

WORKDIR /app

# Install build dependencies for native modules (bcrypt, sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (rebuild native modules)
RUN npm ci

# Copy source code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "src/index.js"]
