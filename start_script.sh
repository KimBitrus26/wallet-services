#!/bin/sh

# Ensure SQLite folder and file exist
mkdir -p /app/data
if [ ! -f /app/data/wallet.db ]; then
  echo "Creating SQLite database..."
  touch /app/data/wallet.db
fi

# Start NestJS app
echo "Running NestJS..."
exec node dist/main.js
