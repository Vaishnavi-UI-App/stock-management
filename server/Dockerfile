# FROM node:18-alpine

# WORKDIR /app

# COPY package*.json ./
# RUN npm install

# COPY . .

# RUN npx prisma generate

# EXPOSE 3001

# CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm start"]
FROM node:20-bullseye-slim

WORKDIR /app

# OpenSSL + certificates for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .

# Generate Prisma client inside the image
RUN npx prisma generate

EXPOSE 3001
CMD ["sh", "-c", "npx prisma db push && npm start"]
