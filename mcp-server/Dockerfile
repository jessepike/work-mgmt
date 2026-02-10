FROM node:18-alpine

WORKDIR /app

# Copy package.json and pnpm-lock.yaml (if exists)
COPY package.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (default 3002)
EXPOSE 3002

# Start in HTTP mode by default
CMD ["npm", "run", "start:http"]
