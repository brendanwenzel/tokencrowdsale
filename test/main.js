const { expect } = require("chai");
const { ethers } = require("hardhat");

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const IRouter = require("./abi/IUniswapV2Router.json");

describe('Contract Deployments', () => {
  before(async () => {
    await network.provider.request({
      method: "hardhat_reset",
      params: [ 
      {
        forking: {
          jsonRpcUrl: "https://eth-mainnet.alchemyapi.io/v2/N2KFGpsfqgtlZrgUkvFwAr33V9Hgkk3K",
        },
      },
    ],
    });
    signer = await ethers.getSigners();
    Token = await ethers.getContractFactory('Token', signer[0]);
    tokendeploy = await Token.deploy();

    Crowdsale = await ethers.getContractFactory('Crowdsale', signer[0]);
    crowdSale = await Crowdsale.deploy(500000, signer[0].address, tokendeploy.address);

    router = new ethers.Contract(
      routerAddress,
      IRouter,
      signer[0]
    );
    oneUnit = ethers.utils.parseUnits("1")
    provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545/")
    halfUnit = ethers.utils.parseUnits(".5")
  });


describe('Testing Token Functions', () => {

    it('Mint and Transfer to Owner', async () => {
      let totalSupply = await tokendeploy.totalSupply()
      expect(totalSupply).to.be.equal("10000000000000000000000000")
      let ownerBalance = await tokendeploy.balanceOf(signer[0].address)
      expect(ownerBalance).to.be.equal("10000000000000000000000000")
    })
    it('Name, Symbol and Decimals', async () => {
      let name = await tokendeploy.name();
      expect(name).to.be.equal("New Test Token")
      let symbol = await tokendeploy.symbol();
      expect(symbol).to.be.equal("TOKEN")
      let decimals = await tokendeploy.decimals();
      expect(decimals).to.be.equal(18)
    })
    it('Transfer Ownership', async () => {
      
      let owner = await tokendeploy.getOwner();
      expect(owner).to.be.equal(signer[0].address)
      let transferOwnership = await tokendeploy.transferOwner(signer[1].address)
      let newOwner = await tokendeploy.getOwner()
      expect(newOwner).to.be.equal(signer[1].address)
    })
    it('Owner and Renounce', async () => {
      let renounce = await tokendeploy.connect(signer[1]).renounceOwnership();
      let newOwner = await tokendeploy.getOwner();
      expect(newOwner).to.be.equal(ethers.constants.AddressZero)
    })
    it('LP Pair is Set', async () => {
      let lpPair = await tokendeploy.getLpPair()
      expect(lpPair).not.empty
    })
    it('Deployer = Original Owner', async () => {
      
      let deployer = await tokendeploy.deployer()
      expect(deployer).to.be.equal(signer[0].address)
    })
    it('Contract Can Receive ETH', async () => {
      
      const presaleBuy = ethers.utils.parseUnits("1");
      let tx = {
        to: tokendeploy.address,
        value: presaleBuy,
        gasLimit: 1_000_000,
      }
      signer[0].sendTransaction(tx)
      let contractBalance = await provider.getBalance(tokendeploy.address)
      expect(contractBalance).to.be.equal(presaleBuy)
    })
    it("Deployer Can Sweep ETH", async () => {
      
      let preSweepBalance = await provider.getBalance(signer[0].address)
      let sweepETH = await tokendeploy.connect(signer[18]).sweepContingency()
      let postSweepBalance = await provider.getBalance(signer[0].address)
      expect(postSweepBalance).to.be.greaterThan(preSweepBalance)
    })
    it("Deployer Can Sweep Own Token", async () => {
      let totalSupply = await tokendeploy.totalSupply()
      let ownerBalance = await tokendeploy.balanceOf(signer[0].address)
      expect(ownerBalance).to.be.equal(totalSupply)
      let transferToContract = await tokendeploy.connect(signer[0]).transfer(tokendeploy.address, oneUnit)
      let contractBalance = await tokendeploy.balanceOf(tokendeploy.address)
      let ownerBalance0 = await tokendeploy.balanceOf(signer[0].address)
      let difference = totalSupply.sub(oneUnit)
      expect(contractBalance).to.be.equal(oneUnit)
      expect(ownerBalance0).to.be.equal(difference)
      let sweepTokens = await tokendeploy.sweepTokens(tokendeploy.address)
      let ownerBalance1 = await tokendeploy.balanceOf(signer[0].address)
      let contractBalance1 = await tokendeploy.balanceOf(tokendeploy.address)
      expect(ownerBalance1).to.be.equal(totalSupply)
      expect(contractBalance1).to.be.equal(0)
    })
    it("Deployer Can Sweep External Token", async () => {   
      let externalToken = new ethers.Contract(
        "0x993864E43Caa7F7F12953AD6fEb1d1Ca635B875F",
        [
          'function transfer(address dst, uint256 rawAmount) external returns (bool)',
          'function balanceOf(address account) external view returns (uint256)'
        ],
        signer[5]
      )
      let swap = await router.connect(signer[5]).swapExactETHForTokens(0, ['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2','0x993864E43Caa7F7F12953AD6fEb1d1Ca635B875F'], signer[5].address, Date.now() + 1000 * 30, { value: oneUnit })
      let newTokenBalance = await externalToken.balanceOf(signer[5].address)
      expect(newTokenBalance).to.be.greaterThan("0")
      let ownerBalance0 = await externalToken.balanceOf(signer[0].address)
      expect(ownerBalance0).to.be.equal("0")
      let transfer = await externalToken.connect(signer[5]).transfer(tokendeploy.address, oneUnit)
      let contractBalance = await externalToken.balanceOf(tokendeploy.address)
      expect(contractBalance).to.be.equal(oneUnit)
      let sweepExternalTokens = await tokendeploy.connect(signer[13]).sweepTokens("0x993864E43Caa7F7F12953AD6fEb1d1Ca635B875F")
      let ownerBalance1 = await externalToken.balanceOf(signer[0].address)
      let contractBalance1 = await externalToken.balanceOf(tokendeploy.address)
      expect(ownerBalance1).to.be.equal(oneUnit)
      expect(contractBalance1).to.be.equal("0")
    })
    it("Holder Increments Work Properly", async () => {
      let holders0 = await tokendeploy.getHolderCount()
      expect(holders0).to.be.equal("1")
      let transfer1 = await tokendeploy.transfer(signer[1].address, oneUnit)
      let transfer2 = await tokendeploy.transfer(signer[2].address, oneUnit)
      let transfer3 = await tokendeploy.transfer(signer[3].address, oneUnit)
      let holders1 = await tokendeploy.getHolderCount()
      expect(holders1).to.be.equal("4")
      let transfer4 = await tokendeploy.connect(signer[1]).transfer(signer[0].address, oneUnit)
      let holders2 = await tokendeploy.getHolderCount()
      expect(holders2).to.be.equal("3")
    })
    it("Can Add Liquidity", async () => {
      let addLiquidity = await router.addLiquidityETH(tokendeploy.address, oneUnit, 0, 0, signer[0].address, Date.now() + 1000 * 30, {value: oneUnit})
      let lpPair = await tokendeploy.getLpPair()
      const lpContract = new ethers.Contract(
        lpPair,
        ['function balanceOf(address _addr) external view returns (uint256)'],
        signer[0]
      );
      let lpAmount = await lpContract.balanceOf(signer[0].address)
      expect(lpAmount).to.be.greaterThan("0")
    })
    it("Can Swap Both In and Out", async () => {
      let token = tokendeploy.address
      const buyAmount = ethers.utils.parseUnits("1");
      const tx1 = await router.connect(signer[15]).swapExactETHForTokens("0", [WETH,token], signer[15].address, Date.now() + 1000 * 30, { value: buyAmount })
      const tx2 = await router.connect(signer[0]).swapExactETHForTokens(0, [WETH,token], signer[0].address, Date.now() + 1000 * 30, { value: buyAmount })
      const approval = await tokendeploy.connect(signer[15]).approve(routerAddress, "115792089237316195423570985008687907853269984665640564039457584007913129639935")
      await expect(router.connect(signer[15]).swapExactTokensForETH("1", 0, [token,WETH], signer[15].address, Date.now() + 1000 * 30)).to.not.be.reverted
      await expect(tokendeploy.connect(signer[15]).transfer(signer[0].address, "1")).to.not.be.reverted
    })
    it("Stops Same Block Swaps", async () => {
      let token = tokendeploy.address
      const buyAmount = ethers.utils.parseUnits("1");
      await network.provider.send("evm_setAutomine", [false]);
      const approval = await tokendeploy.connect(signer[15]).approve(routerAddress, "115792089237316195423570985008687907853269984665640564039457584007913129639935")
      const tx1 = await router.connect(signer[15]).swapExactETHForTokens("0", [WETH,token], signer[15].address, Date.now() + 1000 * 30, { value: buyAmount })
      await expect(router.connect(signer[15]).swapExactTokensForETH("1", 0, [token,WETH], signer[15].address, Date.now() + 1000 * 30)).to.be.reverted
      await hre.network.provider.send("hardhat_mine")
    })
  })

describe("Testing Crowdsale Contract", () => {

  it("Caps Set Properly", async () => {
    await network.provider.send("evm_setAutomine", [true]);
    let cap = await crowdSale.cap()
    expect(cap).to.be.equal("10000000000000000000")
    let contributionCap = await crowdSale.contributionCap()
    expect(contributionCap).to.be.equal("1000000000000000000")
  })
  it("Funding Presale", async () => {
    let transferToCrowdsale = await tokendeploy.transfer(crowdSale.address, ethers.utils.parseUnits("5000000"))
    let contractBalance = await tokendeploy.balanceOf(crowdSale.address)
    expect(contractBalance).to.be.equal("5000000000000000000000000")
  })
  it("Contributors Updates", async () => {
    for (let i = 1; i < 11; i++) {
      let tx = {
        to: crowdSale.address,
        value: halfUnit,
        gasLimit: 1_000_000,
      }
      await signer[i].sendTransaction(tx)
    }
    for (let i = 1; i < 11; i++) {
      let tx = {
        to: crowdSale.address,
        value: halfUnit,
        gasLimit: 1_000_000,
      }
      await signer[i].sendTransaction(tx)
    }
    let contributors = await crowdSale.getContributors()
    expect(contributors).to.be.equal(10)
  })
  it("State Variables Correct", async () => {
    let weiRaised = await crowdSale.weiRaised()
    let owner = await crowdSale.owner()
    let tokensPerETH = await crowdSale.tokensPerETH()
    let weiToGoal = await crowdSale.weiToGoal()
    expect(weiRaised).to.be.equal("10000000000000000000")
    expect(owner).to.be.equal(signer[0].address)
    expect(tokensPerETH).to.be.equal("500000")
    expect(weiToGoal).to.be.equal("0")
  })
  it("Finalizes Crowdsale", async () => {
    let userBalance = await tokendeploy.balanceOf(signer[1].address)
    let ownerBalance = await provider.getBalance(signer[0].address)
    let finalize = await crowdSale.finalizeCrowdsale()
    let ownerBalance2 = await provider.getBalance(signer[0].address)
    let userBalance2 = await tokendeploy.balanceOf(signer[1].address)
    expect(ownerBalance2).to.be.greaterThan(ownerBalance)
    expect(userBalance2).to.be.greaterThan(userBalance)
  })
})
})
