# ── Stage 1: Build ──
FROM node:22-alpine AS build

WORKDIR /app

# ← 이 부분 추가
ARG VITE_KAKAO_APP_KEY
ARG VITE_API_BASE_URL
ARG VITE_BACKEND_URL
ENV VITE_KAKAO_APP_KEY=$VITE_KAKAO_APP_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_BACKEND_URL=$VITE_BACKEND_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Production ──
FROM node:22-alpine

WORKDIR /app

COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json

RUN npm ci --omit=dev


EXPOSE 3006

CMD ["node", "server/index.cjs"]
