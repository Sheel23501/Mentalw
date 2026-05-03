# ──────────────────────────────────────────────────────────────
# TruCare — Multi-stage Dockerfile
# Stage 1: Build the Vite/React frontend into static files
# Stage 2: Serve everything from a single Node.js container
# ──────────────────────────────────────────────────────────────

# ── Stage 1: Build frontend ──────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first (better layer caching)
COPY package.json package-lock.json ./

# Install ALL dependencies (dev + prod) for the build step
RUN npm ci

# Copy the rest of the source code
COPY . .

# Write .env file for Vite to read during build
# Vite automatically reads .env files and injects VITE_ prefixed vars
RUN echo "VITE_GEMINI_API_KEY=AIzaSyA7xD5D-uHBiOqVZa_0FkV-FreDrKsxEw4" > .env && \
    echo "VITE_API_BASE_URL=" >> .env && \
    echo "VITE_FIREBASE_API_KEY=AIzaSyD3jwJgKyOFc2ypsHkJK9TiUvSx6TPA_xA" >> .env && \
    echo "VITE_FIREBASE_AUTH_DOMAIN=trucare-76365.firebaseapp.com" >> .env && \
    echo "VITE_FIREBASE_DATABASE_URL=https://trucare-76365-default-rtdb.firebaseio.com" >> .env && \
    echo "VITE_FIREBASE_PROJECT_ID=trucare-76365" >> .env && \
    echo "VITE_FIREBASE_STORAGE_BUCKET=trucare-76365.firebasestorage.app" >> .env && \
    echo "VITE_FIREBASE_MESSAGING_SENDER_ID=900286609052" >> .env && \
    echo "VITE_FIREBASE_APP_ID=1:900286609052:web:0e8f8820c7c5645c309f59" >> .env && \
    echo "VITE_FIREBASE_MEASUREMENT_ID=G-ZMC4N9PLZC" >> .env

# Build the React frontend
RUN npm run build


# ── Stage 2: Production runtime ──────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy built frontend from Stage 1
COPY --from=builder /app/dist ./dist

# Copy backend server and supporting files
COPY server.js ./
COPY cv ./cv
COPY public ./public

# Create tmp directory for multer uploads
RUN mkdir -p tmp_uploads

# Environment variables (override at runtime with -e or .env)
ENV NODE_ENV=production
ENV PORT=4000

# Expose both ports
#  4000 = Express backend + Socket.IO + serves static frontend
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:4000/api/twilio/rooms || exit 1

# Start the backend server (which also serves the built frontend)
CMD ["node", "server.js"]
