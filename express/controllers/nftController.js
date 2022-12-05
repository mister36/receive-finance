const xrpl = require("xrpl");
const main = require("../app");

exports.createReceivable = async (req, res) => {
  const { email } = req.user;
  const { business, amount, date } = req.body;
  try {
    const client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233");
    await client.connect();

    const wallet = xrpl.Wallet.fromMnemonic(process.env.MNEMONIC);

    const sender = (
      await main.client.db().collection("businesses").findOne({ email })
    ).xrpAddress;
    if (!sender) {
      return res.status(400).json({
        message: "You don't exist",
      });
    }
    const recipient = business;

    const transactionBlob = {
      TransactionType: "NFTokenMint",
      Account: wallet.classicAddress,
      Issuer: recipient,
      URI: xrpl.convertStringToHex("Ur mom"),
      NFTokenTaxon: 0,
    };

    const tx = await client.submitAndWait(transactionBlob, { wallet });
    console.log(tx.result.meta.TransactionResult);

    // TODO: delete
    const nfts = await client.request({
      method: "account_nfts",
      account: recipient,
    });
    console.log(nfts);
    ///

    res.status(200).json("All good");
  } catch (error) {
    console.log(error);
  }
};

exports.getReceivableAddress = async (req, res) => {
  const wallet = xrpl.Wallet.fromMnemonic(process.env.MNEMONIC);

  res.status(200).json({
    address: wallet.classicAddress,
  });
};
