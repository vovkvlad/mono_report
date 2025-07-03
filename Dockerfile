# Use official Node.js LTS image
FROM node:22-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy the rest of the application code
COPY . .

# Create data directory (if not exist)
RUN mkdir -p data

# Expose the data directory as a volume for persistence
VOLUME ["/usr/src/app/data"]

# Set environment variables (can be overridden at runtime)
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"] 