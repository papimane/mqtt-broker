FROM node:20-alpine AS base

WORKDIR /app

# Récupération du codec officiel Milesight (TS601) au build
# Source: Milesight-IoT/SensorDecoders (GPL-3.0)
RUN apk add --no-cache curl
RUN mkdir -p /app/vendor/milesight/ts601
RUN curl -fsSL "https://raw.githubusercontent.com/Milesight-IoT/SensorDecoders/main/ts-series/ts601/ts601-decoder.js" -o /app/vendor/milesight/ts601/ts601-decoder.js
RUN curl -fsSL "https://raw.githubusercontent.com/Milesight-IoT/SensorDecoders/main/ts-series/ts601/ts601-encoder.js" -o /app/vendor/milesight/ts601/ts601-encoder.js
RUN curl -fsSL "https://raw.githubusercontent.com/Milesight-IoT/SensorDecoders/main/LICENSE.md" -o /app/vendor/milesight/LICENSE.md

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
CMD ["node", "src/index.js"]

