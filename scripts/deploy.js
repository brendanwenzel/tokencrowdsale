const { ethers } = require("hardhat");
const hre = require("hardhat");

async function main() {
  let signer = await ethers.getSigners();

  Token = await ethers.getContractFactory('Token', signer[0]);
  token = await Token.deploy();

  console.log(
    `Token Contract: ${token.address}`
  );

  Crowdsale = await ethers.getContractFactory('Crowdsale', signer[0]);
  crowdsale = await Crowdsale.deploy(500000, signer[0].address, token.address);

  console.log(
    `Crowdsale Contract: ${crowdsale.address}`
  );

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
