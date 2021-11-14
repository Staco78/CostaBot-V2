# syntax=docker/dockerfile:1
FROM node:16-alpine AS build
WORKDIR /bot
RUN apk add --no-cache build-base g++ cairo-dev jpeg-dev \
    pango-dev giflib-dev libtool autoconf libsodium automake 
COPY package* ./
RUN npm ci
COPY src ./src
COPY typings ./typings
COPY tsconfig.json ./tsconfig.json
RUN npm run build

FROM node:16-alpine AS website-build
WORKDIR /website
COPY website/package* ./
RUN npm ci
COPY website/src ./src
COPY website/typings ./typings
COPY website/webpack.config.js ./
COPY website/tsconfig.json ./
RUN npm run build


FROM node:16-alpine
RUN apk add --no-cache ffmpeg cairo pango giflib-dev
WORKDIR /bot
COPY --from=build /bot/dist /bot/dist
COPY --from=build /bot/node_modules /bot/node_modules
COPY --from=website-build /website/dist ./public
COPY package.json ./package.json
COPY assets ./assets
COPY start.js ./start.js
ENV NODE_ENV production
CMD ["node", "start.js"]