FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG GEMINI_API_KEY
ENV GEMINI_API_KEY=$GEMINI_API_KEY

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY --from=builder /app/dist ./dist
COPY server.ts ./
COPY tsconfig.json ./

EXPOSE 3000
ENV NODE_ENV=production

CMD ["node_modules/.bin/tsx", "server.ts"]
