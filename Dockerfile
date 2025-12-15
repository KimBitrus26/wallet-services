# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

# Install dependencies
RUN npm install --frozen-lockfile

COPY . .

RUN npm run build

# Stage 2: Production Image
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --production --frozen-lockfile

# Copy built files
COPY --from=builder /app/dist ./dist

# Copy start script
COPY start_script.sh ./start_script.sh
RUN chmod +x ./start_script.sh

# Expose port
EXPOSE 3000

# Start the app
CMD ["./start_script.sh"]
