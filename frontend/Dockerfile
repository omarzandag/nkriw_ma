# syntax=docker/dockerfile:1.10
#
# NKRIW.MA — frontend (React + Vite)
# Multi-stage build:
#   1) builder  -> npm ci + vite build, baked with VITE_API_URL=/api (same-origin)
#   2) runtime  -> nginx:alpine serving the static SPA + reverse-proxying /api
#                  and /uploads to the FastAPI backend (BACKEND_URL)
# The nginx config is generated at container start from a template using
# envsubst (with an explicit variable filter so nginx's own $host/$uri vars
# are preserved). BACKEND_URL defaults to http://localhost:8000 and is
# overridden per-environment in docker-compose.yml.

# --- Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# --- Runtime ---
FROM nginx:1.27-alpine AS runtime
# envsubst is used at startup to inject ${BACKEND_URL} into the nginx config
RUN apk add --no-cache gettext

ENV BACKEND_URL=http://localhost:8000

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx/default.conf.tmpl /etc/nginx/conf.d/default.conf.tmpl
COPY nginx/00-substitute.sh /docker-entrypoint.d/00-substitute.sh
RUN chmod +x /docker-entrypoint.d/00-substitute.sh

EXPOSE 80
