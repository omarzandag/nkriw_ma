#!/bin/sh
# Runs at container start (sourced by the official nginx entrypoint via
# /docker-entrypoint.d/). Generates the active nginx config from the template,
# substituting ONLY ${BACKEND_URL} so nginx's own $host/$uri variables survive.
set -e

: "${BACKEND_URL:?BACKEND_URL must be set (default http://localhost:8000)}"

envsubst '${BACKEND_URL}' /etc/nginx/conf.d/default.conf.tmpl \
  > /etc/nginx/conf.d/default.conf

# Keep the conf.d directory clean (only the rendered .conf remains)
rm -f /etc/nginx/conf.d/default.conf.tmpl
