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

# Build args for Vite env vars (injected at build time)
ARG VITE_GEMINI_API_KEY=""
ARG VITE_API_BASE_URL=""
ARG VITE_FIREBASE_API_KEY=""
ARG VITE_FIREBASE_AUTH_DOMAIN=""
ARG VITE_FIREBASE_DATABASE_URL=""
ARG VITE_FIREBASE_PROJECT_ID=""
ARG VITE_FIREBASE_STORAGE_BUCKET=""
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=""
ARG VITE_FIREBASE_APP_ID=""
ARG VITE_FIREBASE_MEASUREMENT_ID=""

# Vite needs VITE_ prefixed env vars available during build
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_DATABASE_URL=$VITE_FIREBASE_DATABASE_URL
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID
ENV VITE_FIREBASE_MEASUREMENT_ID=$VITE_FIREBASE_MEASUREMENT_ID

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
