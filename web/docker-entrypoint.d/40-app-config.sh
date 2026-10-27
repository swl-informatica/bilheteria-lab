#!/bin/sh
# Writes the runtime configuration read by the browser.
set -eu

if [ -z "${API_URL:-}" ]; then
  echo "API_URL environment variable is not set" >&2
  exit 1
fi

escaped=$(printf '%s' "$API_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf 'window.APP_CONFIG = { apiUrl: "%s" };\n' "$escaped" > /usr/share/nginx/html/config.js
