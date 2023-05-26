FROM node:18-alpine

COPY . /usr/src/app

WORKDIR /usr/src/app

RUN npm ci

COPY ./docker/entrypoint.sh /usr/local/bin

ENTRYPOINT ["/bin/sh", "/usr/local/bin/entrypoint.sh"]