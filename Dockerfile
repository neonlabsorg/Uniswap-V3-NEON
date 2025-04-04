FROM node:18-slim

RUN apt-get update && apt-get install -y \
    python3 make g++ wget git\
    && rm -rf /var/lib/apt/lists/*
WORKDIR /usr/src/app

COPY package*.json ./
RUN mkdir -p ./contacts/external/neon-contracts
RUN git clone --branch "update/erc20forspl-solana-native" "https://github.com/neonevm/neon-contracts.git" ./contacts/external/neon-contracts
RUN npm ci

COPY ./docker/entrypoint.sh /usr/local/bin
ENTRYPOINT ["/bin/sh", "/usr/local/bin/entrypoint.sh"]

COPY . ./


# RUN npm ci --prefix ./contacts/external/neon-contracts --legacy-peer-deps

# Download solc separatly as hardhat implementation is flucky
ENV DOWNLOAD_PATH="/root/.cache/hardhat-nodejs/compilers-v2/linux-amd64" \
    REPOSITORY_PATH="https://binaries.soliditylang.org/linux-amd64" \
    SOLC_BINARY_1="solc-linux-amd64-v0.7.6+commit.7338295f" \
    SOLC_BINARY_2="solc-linux-amd64-v0.8.28+commit.7893614a"
RUN mkdir -p ${DOWNLOAD_PATH} && \
    wget -O ${DOWNLOAD_PATH}/${SOLC_BINARY_1} ${REPOSITORY_PATH}/${SOLC_BINARY_1} && \
    wget -O ${DOWNLOAD_PATH}/${SOLC_BINARY_2} ${REPOSITORY_PATH}/${SOLC_BINARY_2} && \
    wget -O ${DOWNLOAD_PATH}/list.json ${REPOSITORY_PATH}/list.json && \
    chmod -R 755 ${DOWNLOAD_PATH}

# Add env stubs and compile Solidity Artifacts
ENV NEON_PROXY_URL=https://a/ \
    NEON_ACCOUNTS=0x0000000000000000000000000000000000000000000000000000000000000000
RUN ./docker/compile.sh