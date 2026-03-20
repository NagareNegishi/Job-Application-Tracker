# Stage 1: Build
# node:lts-alpine is smaller than node:lts — fine for a build step
FROM node:lts-alpine AS build
WORKDIR /app

# Copy package files before source for layer caching.
# If package.json/lock don't change, npm ci is skipped on rebuild.
COPY package.json package-lock.json ./
# npm ci installs exactly what's in package-lock.json — faster and reproducible vs npm install
RUN npm ci

# Copy source and build (tsc + vite → dist/)
COPY . .
RUN npm run build

# Stage 2: Serve
# nginx:alpine is ~40MB — just a web server, no Node runtime needed at runtime
FROM nginx:alpine AS runtime
# Copy Vite's output into Nginx's default serve directory
COPY --from=build /app/dist /usr/share/nginx/html
# Replace Nginx's default config with ours (adds SPA routing + API proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
