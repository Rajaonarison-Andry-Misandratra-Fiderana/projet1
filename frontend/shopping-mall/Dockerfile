FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

WORKDIR /app

COPY server.js ./server.js
COPY --from=build /app/dist ./dist

ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
