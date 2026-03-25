FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_BACKEND_URL
ARG VITE_LIVEKIT_URL
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_LIVEKIT_URL=${VITE_LIVEKIT_URL}

RUN npm run build

FROM node:20-alpine AS runner

RUN npm install -g serve

COPY --from=builder /app/dist /app/dist

ENV APP_PORT=3000

EXPOSE ${APP_PORT}

CMD serve -s /app/dist -l ${APP_PORT}
