FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY vite.config.js ./
COPY index.html ./
COPY .env.production ./
COPY src ./src

RUN npm install
RUN npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx/ssl /etc/nginx/ssl
COPY --from=builder /app/dist /usr/share/nginx/html
