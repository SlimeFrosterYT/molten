# Use official Node image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm install

# Copy all code
COPY . .

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]
