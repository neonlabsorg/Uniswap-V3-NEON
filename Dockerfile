FROM node:18-alpine

RUN apk add --no-cache \
        python3 \
        make \
        g++

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY ./docker/entrypoint.sh /usr/local/bin
ENTRYPOINT ["/bin/sh", "/usr/local/bin/entrypoint.sh"]

COPY . .