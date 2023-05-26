import { ethers } from "hardhat";
import fs from "fs/promises";
import { BigNumber, BigNumberish } from 'ethers'
import bn from 'bignumber.js'


require('dotenv').config();
export enum FeeAmount {
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}
const overrides = { gasLimit: 1e10 }
const MaxUint256 = ethers.constants.MaxUint256;

let fromEther = ethers.utils.parseEther
let toEther = ethers.utils.formatEther

let SOL_ADDRESS = process.env.SOL_ADDRESS || "";

function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

async function fixture() {
  let [deployer] = await ethers.getSigners();

  const ERC20 = await ethers.getContractFactory("contracts/v3-core/test/TestERC20.sol:TestERC20");

  console.log("Deploy tokenA")
  const tokenA = SOL_ADDRESS ? await ERC20.attach(SOL_ADDRESS) : await ERC20.deploy(fromEther('10000'))
  await tokenA.deployTransaction.wait(1)
  console.log("Token address ", tokenA.address)

  console.log("Deploy tokenB")
  const tokenB = await ERC20.deploy(fromEther('10000'))
  await tokenB.deployTransaction.wait(1)
  console.log("Token address ", tokenB.address)

  console.log("Deploy tokenC")
  const tokenC = await ERC20.deploy(fromEther('10000'))
  await tokenC.deployTransaction.wait(1)
  console.log("Token address ", tokenC.address)

  console.log("Deploy WETH")
  const WETH = await ERC20.deploy(fromEther('10000'))
  await WETH.deployTransaction.wait(1)

  console.log("Deploy factoryV3")
  const UniswapV3Factory = await ethers.getContractFactory("UniswapV3Factory");
  const factoryV3 = await UniswapV3Factory.deploy()
  await factoryV3.deployTransaction.wait(1)
  console.log("FactoryV3 address: ", factoryV3.address)

  console.log("Deploy router")
  const UniswapRouter = await ethers.getContractFactory("SwapRouter");
  const router = await UniswapRouter.deploy(factoryV3.address, WETH.address)
  await router.deployTransaction.wait(1)
  console.log("Router address: ", router.address)

  console.log("Deploy createPool")
  const createdPool = await factoryV3.createPool(tokenA.address, tokenB.address, FeeAmount.LOW)
  await createdPool.wait(1)

  console.log("Deploy createPool2")
  const createdPool2 = await factoryV3.createPool(tokenB.address, tokenC.address, FeeAmount.LOW)
  await createdPool2.wait(1)

  console.log("Get Pool")
  const poolAddress = await factoryV3.getPool(tokenA.address, tokenB.address, FeeAmount.LOW)
  console.log("Pool 1 address ", poolAddress)
  
  console.log("Get Pool")
  const poolAddress2 = await factoryV3.getPool(tokenB.address, tokenC.address, FeeAmount.LOW)
  console.log("Pool 2 address ", poolAddress2)


  console.log("Deploy pool")
  const Pool = await ethers.getContractFactory("UniswapV3Pool");

  console.log("Attach pool: ", poolAddress)
  await delay(5000);
  const pool = await Pool.attach(poolAddress)
  const startingPrice = encodePriceSqrt(1, 2)

  const tx = await pool.connect(deployer).initialize(startingPrice);
  tx.wait(1)

  console.log("Attach pool: ", poolAddress2)
  const pool2 = await Pool.attach(poolAddress2)
  pool2.connect(deployer).initialize(startingPrice);

  return {router: router, pool: pool, pool2: pool2};
}

type ReportItem = {[key: string]: string|number}

bn.config({ EXPONENTIAL_AT: 999999, DECIMAL_PLACES: 40 })

export function encodePriceSqrt(reserve1: BigNumberish, reserve0: BigNumberish): BigNumber {
  return BigNumber.from(
    new bn(reserve1.toString())
      .div(reserve0.toString())
      .sqrt()
      .multipliedBy(new bn(2).pow(96))
      .integerValue(3)
      .toString()
  )
}

async function main() {
  let report = {
    "name": "Uniswap V3",
    "actions": [] as ReportItem[]
  }

  console.log("Run main")
  const gasPrice = await ethers.provider.getGasPrice()
  let tx;
  const ERC20 = await ethers.getContractFactory("contracts/v3-core/test/TestERC20.sol:TestERC20");
  console.log("Get ERC20")
  console.log("GET LP, user and beneficiary")
  let [LP, user, beneficiary] = await ethers.getSigners();
  let {router, pool, pool2} = await fixture();
  console.log("Get router ", router.address, pool.address)
  console.log("Token 0 ", await pool.token0())
  console.log("Attach token 0")
  const token0 = await ERC20.attach(await pool.token0());
  console.log("Attach token 1")
  await delay(10000);

  const token1 = await ERC20.attach(await pool.token1());
  console.log(`Pair 1 token addresses: ${token0.address} ${token1.address}`)

  let token2;

  await delay(5000);
  const token2_0 = await ERC20.attach(await pool2.token0());
  await delay(5000);
  const token2_1 = await ERC20.attach(await pool2.token1());

  if (token2_0.address === token0.address || token2_0.address === token1.address){
    token2 = token2_1;
  } else {
    token2 = token2_0;
  }
  console.log("Pair token 0: ", token0.address);
  console.log("Pair token 1: ", token1.address);
  console.log("Pair token 2: ", token2.address);

  console.log(`Pair 2 token addresses: ${token2_0.address} ${token2_1.address}`)

  tx = await token0.transfer(LP.address, fromEther('100'))
  await tx.wait(1)
  tx = await token1.transfer(LP.address, fromEther('100'))
  await tx.wait(1)
  tx = await token2.transfer(LP.address, fromEther('100'))
  await tx.wait(1)

  console.log("LP initial balances    token0:", toEther(await token0.balanceOf(LP.address)), "   token1:", toEther(await token1.balanceOf(LP.address)), "   token2:", toEther(await token2.balanceOf(LP.address)))

  console.log("Approve all tokens for LP user");
  tx = await token0.connect(LP).approve(router.address, MaxUint256)
  await tx.wait(1)
  tx = await token1.connect(LP).approve(router.address, MaxUint256)
  await tx.wait(1)
  tx = await token2.connect(LP).approve(router.address, MaxUint256)
  await tx.wait(1)



  console.log("Add liquidity")
  const getMinTick = (tickSpacing: number) => Math.ceil(-887272 / tickSpacing) * tickSpacing
  const getMaxTick = (tickSpacing: number) => Math.floor(887272 / tickSpacing) * tickSpacing
  const TICK_SPACINGS: { [amount in FeeAmount]: number } = {
    [FeeAmount.LOW]: 10,
    [FeeAmount.MEDIUM]: 60,
    [FeeAmount.HIGH]: 200,
  }
  const calleeFactory = await ethers.getContractFactory('contracts/v3-core/test/TestUniswapV3Callee.sol:TestUniswapV3Callee')
  const callee = await calleeFactory.deploy()
  await callee.deployed()
  tx = await token0.approve(callee.address, MaxUint256)
  await tx.wait(1)
  tx = await token1.approve(callee.address, MaxUint256)
  await tx.wait(1)

  tx = await callee.mint(pool.address, LP.address, getMinTick(TICK_SPACINGS[FeeAmount.LOW]), getMaxTick(TICK_SPACINGS[FeeAmount.LOW]),  fromEther('100'))
  await tx.wait(1)

  console.log("LP current balances    token0:", toEther(await token0.balanceOf(LP.address)), "   token1:", toEther(await token1.balanceOf(LP.address)))

  tx = await token0.transfer(user.address, fromEther('10'))
  console.log(`Transfer 1 ${tx.hash}`);
  await tx.wait(1)
  tx = await token1.transfer(user.address, fromEther('10'))
  console.log(`Transfer 2 ${tx.hash}`);
  await tx.wait(1)
  tx = await token2.transfer(user.address, fromEther('10'))
  console.log(`Transfer 3 ${tx.hash}`);
  await tx.wait(1)

  console.log("Approve all tokens for user");
  tx = await token0.connect(user).approve(router.address, MaxUint256)
  await tx.wait(1)
  tx = await token1.connect(user).approve(router.address, MaxUint256)
  await tx.wait(1)
  tx = await token2.connect(user).approve(router.address, MaxUint256)
  const approveReceipt = await tx.wait(5)

  report["actions"].push({
    "name": "Token approve",
    "usedGas": approveReceipt["gasUsed"].toString(),
    "gasPrice": gasPrice.toString(),
    "tx": approveReceipt["transactionHash"]
  });

  let swapAmount = fromEther('1')
  let outputAmount = fromEther('1')
  console.log("\nUser performs swaps token0 -> token1 in the pool with swap amount 1 ether using router.swapExactTokensForTokens()\n");

  const params = {
    tokenIn: token1.address,
    tokenOut: token0.address,
    fee: FeeAmount.LOW,
    sqrtPriceLimitX96: BigNumber.from('1461446703485210103287273052203988822378723970341'),
    recipient: user.address,
    deadline: MaxUint256,
    amountIn: swapAmount,
    amountOutMinimum: 1,
  };

  tx = await router.connect(user).exactInputSingle(params)
 
  await tx.wait(1)
  console.log("\nSwap 1");
  console.log("User balance    token0:", toEther(await token0.balanceOf(user.address)), "   token1:", toEther(await token1.balanceOf(user.address)))
  console.log("Pool balance    token0:", toEther(await token0.balanceOf(pool.address)), "   token1:", toEther(await token1.balanceOf(pool.address)))
  tx = await router.connect(user).exactInputSingle(params)
  const swapReceipt = await tx.wait(1)
  console.log("Swap tx hash:", tx.hash)

  report["actions"].push({
    "name": "Direct swap",
    "usedGas": swapReceipt["gasUsed"].toString(),
    "gasPrice": gasPrice.toString(),
    "tx": swapReceipt["transactionHash"]
  });

  console.log("\nSwap 2");
  console.log("User balance    token0:", toEther(await token0.balanceOf(user.address)), "   token1:", toEther(await token1.balanceOf(user.address)))
  console.log("Pool balance    token0:", toEther(await token0.balanceOf(pool.address)), "   token1:", toEther(await token1.balanceOf(pool.address)))
  tx = await router.connect(user).exactInputSingle(params)
  await tx.wait(1)
  console.log("Swap tx hash:", tx.hash)

  console.log("\nSwap 3");
  console.log("User balance    token0:", toEther(await token0.balanceOf(user.address)), "   token1:", toEther(await token1.balanceOf(user.address)))
  console.log("Pool balance    token0:", toEther(await token0.balanceOf(pool.address)), "   token1:", toEther(await token1.balanceOf(pool.address)))
  tx = await router.connect(user).exactInputSingle(params)
  await tx.wait(1)
  console.log("Swap tx hash:", tx.hash)

  console.log("\nSwap 4");
  console.log("User balance    token0:", toEther(await token0.balanceOf(user.address)), "   token1:", toEther(await token1.balanceOf(user.address)))
  console.log("Pool balance    token0:", toEther(await token0.balanceOf(pool.address)), "   token1:", toEther(await token1.balanceOf(pool.address)))
  tx = await router.connect(user).exactInputSingle(params)
  await tx.wait(1)
  console.log("\nSwap 5");
  console.log("User balance    token0:", toEther(await token0.balanceOf(user.address)), "   token1:", toEther(await token1.balanceOf(user.address)))
  console.log("Pool balance    token0:", toEther(await token0.balanceOf(pool.address)), "   token1:", toEther(await token1.balanceOf(pool.address)))


  console.log("\nUser performs swaps token1 -> token0 in the pool with output amount 1 ether using router.exactOutputSingle()")


   const params_output = {
    tokenIn: token1.address,
    tokenOut: token0.address,
    fee: FeeAmount.LOW,
    sqrtPriceLimitX96: BigNumber.from('1461446703485210103287273052203988822378723970341'),
    recipient: user.address,
    deadline: MaxUint256,
    amountOut: outputAmount,
    amountInMaximum: MaxUint256,
  };
  tx = await router.connect(user).exactOutputSingle(params_output)
  await tx.wait(1)
  console.log("\nSwap 1");
  console.log("User balance    token0:", toEther(await token0.balanceOf(user.address)), "   token1:", toEther(await token1.balanceOf(user.address)))
  console.log("Pool balance    token0:", toEther(await token0.balanceOf(pool.address)), "   token1:", toEther(await token1.balanceOf(pool.address)))
  tx = await router.connect(user).exactOutputSingle(params_output)
  await tx.wait(1)
  console.log("\nSwap 2");
  console.log("User balance    token0:", toEther(await token0.balanceOf(user.address)), "   token1:", toEther(await token1.balanceOf(user.address)))
  console.log("Pool balance    token0:", toEther(await token0.balanceOf(pool.address)), "   token1:", toEther(await token1.balanceOf(pool.address)))
  tx = await router.connect(user).exactOutputSingle(params_output)
  await tx.wait(1)
  console.log("\nSwap 3");
  console.log("User balance    token0:", toEther(await token0.balanceOf(user.address)), "   token1:", toEther(await token1.balanceOf(user.address)))
  console.log("Pool balance    token0:", toEther(await token0.balanceOf(pool.address)), "   token1:", toEther(await token1.balanceOf(pool.address)))
  tx = await router.connect(user).exactOutputSingle(params_output)
  await tx.wait(1)
  console.log("\nSwap 4");
  console.log("User balance    token0:", toEther(await token0.balanceOf(user.address)), "   token1:", toEther(await token1.balanceOf(user.address)))
  console.log("Pool balance    token0:", toEther(await token0.balanceOf(pool.address)), "   token1:", toEther(await token1.balanceOf(pool.address)))
  tx = await router.connect(user).exactOutputSingle(params_output)
  await tx.wait(1)
  console.log("\nSwap 5");
  console.log("User balance    token0:", toEther(await token0.balanceOf(user.address)), "   token1:", toEther(await token1.balanceOf(user.address)))
  console.log("Pool balance    token0:", toEther(await token0.balanceOf(pool.address)), "   token1:", toEther(await token1.balanceOf(pool.address)))
  
  console.log("\n\nLP transfers LP tokens to beneficiary");

  tx = await token0.approve(callee.address, MaxUint256)
  await tx.wait(1)
  tx = await token1.approve(callee.address, MaxUint256)
  await tx.wait(1)

  console.log("Beneficiary collecting rewards");
  console.log("BEFORE COLLECT")
  console.log("Liquidity in pool: ", toEther(await pool.liquidity()))
  console.log("LP current balances          token0:", toEther(await token0.balanceOf(LP.address)), "   token1:", toEther(await token1.balanceOf(LP.address)))
  console.log("Beneficiary current balances token0:", toEther(await token0.balanceOf(beneficiary.address)), "   token1:", toEther(await token1.balanceOf(beneficiary.address)))

  await pool.connect(LP).burn(getMinTick(TICK_SPACINGS[FeeAmount.LOW]), getMaxTick(TICK_SPACINGS[FeeAmount.LOW]), 0)
  tx = await pool.connect(LP).collect(beneficiary.address, getMinTick(TICK_SPACINGS[FeeAmount.LOW]), getMaxTick(TICK_SPACINGS[FeeAmount.LOW]), await token0.balanceOf(pool.address),await token1.balanceOf(pool.address))
  const collectTx = await tx.wait(1)

  console.log("AFTER COLLECT")
  console.log("Liquidity in pool: ", toEther(await pool.liquidity()))
  console.log("LP balances          token0:", toEther(await token0.balanceOf(LP.address)), "   token1:", toEther(await token1.balanceOf(LP.address)))
  console.log("Beneficiary balances token0:", toEther(await token0.balanceOf(beneficiary.address)), "   token1:", toEther(await token1.balanceOf(beneficiary.address)))

  report["actions"].push({
    "name": "After collect",
    "usedGas": collectTx["gasUsed"].toString(),
    "gasPrice": gasPrice.toString(),
    "tx": collectTx["transactionHash"]
  });

  await fs.writeFile("report.json", JSON.stringify(report));
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
