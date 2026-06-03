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

# Generate the Prisma client from the locally-installed CLI directly, which
# avoids the npx registry lookup that fails behind a TLS-inspecting proxy.
# INSECURE_TLS=1 relaxes TLS verification for THIS build step only (pass it when
# building on a network whose proxy cert Node does not trust). It is NOT baked
# into the runtime image, and defaults to secure for clean networks (e.g. VPS).
ARG INSECURE_TLS=
RUN if [ -n "$INSECURE_TLS" ]; then export NODE_TLS_REJECT_UNAUTHORIZED=0; fi; \
    ./node_modules/.bin/prisma generate

EXPOSE 3001
CMD ["sh", "-c", "./node_modules/.bin/prisma db push && npm start"]
