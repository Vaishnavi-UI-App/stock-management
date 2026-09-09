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
# bullseye is EOL: deb.debian.org's rolling mirror has started 404ing individual
# package files (e.g. this openssl point-release) even though the Packages index
# still lists them. Switch to the pinned snapshot.debian.org mirror the base image
# already ships (commented out) instead, which serves a frozen, complete archive.
RUN sed -i \
      -e '/^deb http:\/\/deb\.debian\.org/ s/^/# /' \
      -e '/^# deb http:\/\/snapshot\.debian\.org/ s/^# //' \
      /etc/apt/sources.list \
  && apt-get update -o Acquire::Check-Valid-Until=false && apt-get install -y openssl ca-certificates \
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
