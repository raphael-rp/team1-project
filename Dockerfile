# Use a lightweight Node.js 22 image
FROM node:22-bookworm-slim

# Create and use the application folder
WORKDIR /app

# Copy dependency files first
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy the application files
COPY . .

# The Express application uses port 3000
EXPOSE 3000

# Start app.js
CMD ["npm", "start"]
