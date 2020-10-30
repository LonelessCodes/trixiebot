FROM node:12.19.0-alpine AS builder

RUN apk add --update \
        python \
        make \
        g++ \
        gcc \
        gnupg \
        libgcc \
        linux-headers \
        git

RUN mkdir -p /app
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json .
COPY src/ src/
RUN npm run build || true

FROM node:12.19.0-alpine

LABEL maintainer="Christian Schäfer <lone@loneless.art> (@lonelesscodes)"

RUN apk add --update \
        ffmpeg \
        graphicsmagick \
    && rm /var/cache/apk/* \
    && mkdir -p /app \
    && chown -R node:node /app

USER node
WORKDIR /app

COPY --from=builder --chown=node:node app/ .
COPY --chown=node:node config/ config/
COPY --chown=node:node assets/ assets/
COPY --chown=node:node CHANGELOG.md .

EXPOSE 6969
ENV NODE_ENV=production
ENV NODE_ICU_DATA=/app/node_modules/full-icu
CMD [ "node", "--unhandled-rejections=strict", "dist/index.js" ]
