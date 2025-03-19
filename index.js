const {
  LyncLootBox,
  ChainIdentifier,
  LootBoxRngRouter__factory,
} = require("@lyncworld/lootbox-evm-sdk");
const { ethers } = require("ethers");
const { Interface } = require("ethers/lib/utils");

(async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://ronin.lgns.net/rpc",
  );

  const txnHash =
    "0x1de976d89708ea1e9fffe1200857175a730f128bfdbd0a6788f8e83c1e970b3e"; // change accordingly

  // get events from this tx
  const receipt = await provider.getTransactionReceipt(txnHash);
  const rewardee = receipt.from;
  const abiLootboxOpenedEvent = [
    "event LootBoxOpened(address indexed requester, uint256 requestId, uint8 rngCount)",
  ];
  const interfaceLootboxOpenedEvent = new Interface(abiLootboxOpenedEvent);

  let requestIds = [];

  receipt.logs.forEach((logItem) => {
    try {
      const lootboxOpenedParsedLog =
        interfaceLootboxOpenedEvent.parseLog(logItem);
      let requestId = lootboxOpenedParsedLog.args.requestId.toString();
      requestIds.push(requestId);
    } catch (err) {}
  });
  console.log("Rng request Ids (processed by LYNC rng router):", requestIds);
  if (requestIds.length == 0) {
    console.log("No rewards to claim");
    return;
  }

  const rngRouter = LootBoxRngRouter__factory.connect(
    "0x61542174CA54DD20A6aFBfa11be84Aa492d6B844", // Don't touch this
    provider,
  );

  for (let i = 0; i < requestIds.length; i++) {
    const reqI = await rngRouter.getRngRequestInfo(requestIds[i]);
    if (reqI.status === 1) {
      console.log(
        "RNG request ",
        reqI.requestId.toString(),
        " is pending...please wait and try again after 10 minutes",
      );
    } else if (reqI.status === 3) {
      console.log(
        "RNG request ",
        reqI.requestId.toString(),
        " is timed out...open lootbox ",
        reqI.lootBox,
        " again",
      );
    } else if (reqI.status === 2) {
      const lbb = new LyncLootBox();
      await lbb.initialize(
        ChainIdentifier.RONIN_MAINNET,
        provider,
        reqI.lootBox,
      );

      console.log(await lbb.getRewardsForAddress(rewardee));
    } else {
      console.log(
        "Weird behaviour for RNG request ",
        reqI.requestId.toString(),
        " contact LYNC team",
      );
    }
  }
})();
