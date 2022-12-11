const xrpl = require("xrpl");
const main = require("../app");

exports.deposit = async (req, res) => {
  const { tx } = req.body;
  const wallet = xrpl.Wallet.fromMnemonic(process.env.MNEMONIC);

  try {
    const client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233");
    await client.connect();

    // console.log(tx);
    const decoded = xrpl.decode(tx.tx_blob);
    console.log(decoded);
    console.log("=================");

    const response = await client.request({
      command: "sign_for",
      account: wallet.classicAddress,
      secret: wallet.privateKey,
      tx_json: decoded,
    });

    console.log(response);

    // const signedTx = wallet.sign(decoded, true);
    // const txResponse = await client.submitAndWait(signedTx, {
    //   wallet,
    // });
    // console.log(txResponse.result);

    res.status(200).json("All good");
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error,
    });
  }
};
