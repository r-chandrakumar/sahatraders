#!/bin/bash

cd /opt/sahatraders/admin-app || exit 1

export NODE_ENV=production
export PORT=3001

# Load NVM
export NVM_DIR="/root/.nvm"
source "$NVM_DIR/nvm.sh"

# Use correct node version
nvm use 22.22.0

# Start app
npm start
