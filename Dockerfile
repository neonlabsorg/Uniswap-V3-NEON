FROM node:18-slim

RUN apt-get update && apt-get install -y \
    python3 make g++ wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci

COPY ./docker/entrypoint.sh /usr/local/bin
ENTRYPOINT ["/bin/sh", "/usr/local/bin/entrypoint.sh"]

COPY . ./

# Download solc separatly as hardhat implementation is flucky
ENV DOWNLOAD_PATH="/root/.cache/hardhat-nodejs/compilers-v2/linux-amd64" \
    REPOSITORY_PATH="https://binaries.soliditylang.org/linux-amd64" \
    SOLC_BINARY="solc-linux-amd64-v0.7.6+commit.7338295f"
RUN mkdir -p ${DOWNLOAD_PATH} && \
    wget -O ${DOWNLOAD_PATH}/${SOLC_BINARY} ${REPOSITORY_PATH}/${SOLC_BINARY} && \
    wget -O ${DOWNLOAD_PATH}/list.json ${REPOSITORY_PATH}/list.json && \
    chmod -R 755 ${DOWNLOAD_PATH}

# Add env stubs and compile Solana Artifacts
ENV NEON_PROXY_URL=https://a/ \
    NEON_ACCOUNTS=0x0000000000000000000000000000000000000000000000000000000000000000
RUN ./docker/compile.sh