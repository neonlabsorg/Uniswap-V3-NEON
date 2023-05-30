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

COPY . ./

# Add env stubs and compile Solana Artifacts
ENV NEON_PROXY_URL=https://a/
ENV NEON_ACCOUNTS=0x0000000000000000000000000000000000000000000000000000000000000000
RUN ./docker/compile.sh