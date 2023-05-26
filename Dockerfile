FROM node:18-alpine

COPY . /usr/src/app

WORKDIR /usr/src/app

RUN apk add --no-cache \
        python3 \
        make \
        g++ 

RUN npm ci

COPY ./docker/entrypoint.sh /usr/local/bin

ENTRYPOINT ["/bin/sh", "/usr/local/bin/entrypoint.sh"]