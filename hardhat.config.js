require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 5,
      },
    },
  },
  networks: {
    localhost: {
      forking: {
        jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/N2KFGpsfqgtlZrgUkvFwAr33V9Hgkk3K",
      },
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 25,
      },
    },
  },
  paths: {
    artifacts: "./client/src/artifacts"
  }
};
