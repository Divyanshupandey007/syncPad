# ============================================
# Stage 1: Build the Angular app
# ============================================
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files first (Docker caches this layer if deps don't change)
COPY package.json package-lock.json ./
RUN npm ci

# Copy the rest of the source and build for production
COPY . .
RUN npx ng build --configuration=production

# ============================================
# Stage 2: Serve with Nginx
# ============================================
FROM nginx:alpine

# Remove the default Nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our custom Nginx config (with WebSocket proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built Angular app from Stage 1
# Angular outputs to dist/<project-name>/browser/ in newer versions
COPY --from=build /app/dist/syncpad-app/browser /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
