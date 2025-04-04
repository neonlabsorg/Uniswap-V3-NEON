import 'hardhat-typechain'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-etherscan'
require('dotenv').config();
const proxyUrl = process.env.NEON_PROXY_URL;
// @ts-ignore
const accounts = process.env.NEON_ACCOUNTS.split(",");
// @ts-ignore
const chainId = parseInt(process.env.NEON_CHAIN_ID) || 111;

export default {
  defaultNetwork: 'neonlabs',
  networks: {
    neonlabs: {
      url: proxyUrl,
      // @ts-ignore
      accounts: accounts,
      // @ts-ignore
      chainId: chainId,
      allowUnlimitedContractSize: false,
      timeout: 100000000,
    }
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  solidity: {
    compilers: [
      {
        version: '0.7.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 800,
          },
          metadata: {
            // do not include the metadata hash, since this is machine dependent
            // and we want all generated code to be deterministic
            // https://docs.soliditylang.org/en/v0.7.6/metadata.html
            bytecodeHash: 'none',
          },
        },
      },
      {
        version: '0.8.28',
        settings: {
          optimizer: {
            enabled: true,
            runs: 800,
          },
          metadata: {
            // do not include the metadata hash, since this is machine dependent
            // and we want all generated code to be deterministic
            // https://docs.soliditylang.org/en/v0.7.6/metadata.html
            bytecodeHash: 'none',
          },
        },
      },
    ]
  },
}
