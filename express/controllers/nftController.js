const xrpl = require("xrpl");
const IPFS = require("ipfs-http-client");
const { BigNumber } = require("bignumber.js");
const main = require("../app");

exports.createReceivable = async (req, res) => {
  const { email } = req.user;
  const { businessAddress, amount, date } = req.body;
  try {
    const client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233");
    await client.connect();

    const wallet = xrpl.Wallet.fromMnemonic(process.env.MNEMONIC);

    const sender = await main.client
      .db()
      .collection("businesses")
      .findOne({ email });
    const recipient = await main.client
      .db()
      .collection("businesses")
      .findOne({ xrpAddress: businessAddress });
    if (!sender) {
      return res.status(400).json({
        message: "You don't exist",
      });
    }

    const metadata = JSON.stringify({
      creditor: recipient.business,
      debtor: sender.business,
      creditorAddress: recipient.xrpAddress,
      debtorAddress: sender.xrpAddress,
      amount,
      type: "unsold",
      due: date,
    });

    const { INFURA_PROJECT_ID, INFURA_SECRET } = process.env;

    const ipfs = IPFS.create({
      host: "ipfs.infura.io",
      port: 5001,
      protocol: "https",
      headers: {
        authorization: `Basic ${Buffer.from(
          INFURA_PROJECT_ID + ":" + INFURA_SECRET
        ).toString("base64")}`,
      },
    });

    const { cid } = await ipfs.add(metadata);

    console.log("CID:", cid.toString());

    const transactionBlob = {
      TransactionType: "NFTokenMint",
      Account: wallet.classicAddress,
      URI: xrpl.convertStringToHex(cid.toString()),
      NFTokenTaxon: 0,
      Flags: 1 | 8,
    };

    let tx = await client.submitAndWait(transactionBlob, { wallet });
    console.log("result;", tx.result);
    console.log(tx.result.meta.TransactionResult);

    res.status(200).json("All good");

    const nftResponse = await client.request({
      method: "account_nfts",
      account: wallet.classicAddress,
      ledger_index: "validated",
    });

    const nfts = nftResponse.result.account_nfts;

    // creates sell offer to recipient (creditor), saves in db
    await Promise.all(
      nfts.map(async (nft) => {
        try {
          await client.request({
            method: "nft_sell_offers",
            nft_id: nft.NFTokenID,
          });
        } catch (error) {
          console.log(error.message);
          if (error.message === "The requested object was not found.") {
            const txBlob = {
              TransactionType: "NFTokenCreateOffer",
              Account: wallet.classicAddress,
              NFTokenID: nft.NFTokenID,
              Amount: "0",
              Destination: recipient.xrpAddress, // NOTE: may set the wrong recipient if tx not immediately after nft mint
              Flags: 1,
            };

            const tx = await client.submitAndWait(txBlob, { wallet });
            console.log(tx.result);

            // retrieves offer index
            const sellOfferIndex = (
              await client.request({
                method: "nft_sell_offers",
                nft_id: nft.NFTokenID,
              })
            ).result.offers[0]["nft_offer_index"];

            await main.client.db().collection("sellOffers").insertOne({
              business: recipient.xrpAddress,
              offer: sellOfferIndex,
            });
          }
        }
      })
    );
  } catch (error) {
    console.log(error);
  }
};

exports.getSellOffers = async (req, res) => {
  const user = req.user;
  const db = main.client.db();

  try {
    const business = await db
      .collection("businesses")
      .findOne({ email: user.email });

    const sellOffers = await db
      .collection("sellOffers")
      .find({ business: business.xrpAddress })
      .map((doc) => doc.offer)
      .toArray();

    res.status(200).json({
      sellOffers,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error,
    });
  }
};

exports.getInvestorOffers = async (req, res) => {
  const { investor } = req.body;
  const db = main.client.db();

  try {
    const offers = await db
      .collection("investorOffers")
      .find({ investor })
      .map((doc) => doc.offer)
      .toArray();

    res.status(200).json({
      offers,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error,
    });
  }
};

exports.deleteSellOffers = async (req, res) => {
  const user = req.user;
  const db = main.client.db();

  try {
    const business = await db
      .collection("businesses")
      .findOne({ email: user.email });

    await db
      .collection("sellOffers")
      .deleteMany({ business: business.xrpAddress });

    res.status(200).json("Deleted sell offers");
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error,
    });
  }
};

exports.deleteInvestorOffers = async (req, res) => {
  const { investor } = req.body;
  const db = main.client.db();

  try {
    await db.collection("investorOffers").deleteMany({ investor });

    res.status(200).json("Deleted investor offers");
  } catch (error) {
    console.log(error);
  }
};

exports.getReceivableAddress = async (req, res) => {
  const wallet = xrpl.Wallet.fromMnemonic(process.env.MNEMONIC);
  let client;

  try {
    client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233");
    await client.connect();

    await client.request({
      command: "account_info",
      account: wallet.address,
      ledger_index: "validated",
    });

    res.status(200).json({
      address: wallet.classicAddress,
    });
  } catch (error) {
    console.log(error.message);
    if (error.message === "Account not found.") {
      // TODO: Can remove in production
      await client.fundWallet(wallet, {
        faucetHost: null,
        amount: "30000",
      });

      res.status(200).json({
        address: wallet.classicAddress,
      });
    } else {
      res.status(400).json({
        error,
      });
    }
  }
};

exports.getPoolAddress = async (_, res) => {
  const wallet = xrpl.Wallet.fromMnemonic(process.env.POOL_MNEMONIC);

  try {
    const client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233");
    await client.connect();

    // await client.fundWallet(wallet, {
    //   faucetHost: null,
    //   amount: "50000",
    // });

    res.status(200).json({
      address: wallet.classicAddress,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.test = async (req, res) => {
  try {
    const client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233");
    await client.connect();

    const poolWallet = xrpl.Wallet.fromMnemonic(process.env.POOL_MNEMONIC);

    const checks = (
      await client.request({
        command: "account_objects",
        account: poolWallet.classicAddress,
        ledger_index: "validated",
        type: "check",
      })
    ).result.account_objects.filter(
      (check) => check.Destination === poolWallet.classicAddress
    );

    let totalChecksValue = 0;

    checks.forEach((check) => {
      totalChecksValue += parseFloat(check.SendMax, 10);
    });

    console.log(checks);
    console.log(totalChecksValue);

    res.status(200).json({});
  } catch (error) {
    console.log(error);
    res.status(400);
  }
};

exports.withdraw = async (req, res) => {
  const { investor } = req.body;
  const poolWallet = xrpl.Wallet.fromMnemonic(process.env.POOL_MNEMONIC);

  try {
    const client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233");
    await client.connect();

    const investorCollection = main.client.db().collection("investors");
    const investorDoc = await investorCollection.findOne({ investor });
    const amount = investorDoc ? investorDoc.amount : 0;

    // deletes deposit entry
    await investorCollection.findOneAndDelete({ investor });

    // gets entitled nfts
    const nfts = (
      await client.request({
        command: "account_nfts",
        account: investor,
        ledger_index: "validated",
      })
    ).result.account_nfts;

    console.log("entitled nfts:", nfts);

    let totalWithdrawable = 0;

    await Promise.all(
      nfts.map(async (nft) => {
        const meta = JSON.parse(xrpl.convertHexToString(nft.URI));
        console.log(meta);

        if (meta.date < Math.round(Date.now() / 1000)) {
          totalWithdrawable += meta.entitledTo;

          // console.log("RUNNING HERE");
          // console.log(poolWallet.classicAddress, investor, nft.NFTokenID);

          // burns token
          const txBlob = {
            TransactionType: "NFTokenBurn",
            Account: poolWallet.classicAddress,
            Owner: investor,
            NFTokenID: nft.NFTokenID,
          };

          // console.log("MY CODE:", txBlob);

          const tx = await client.submitAndWait(txBlob, { wallet: poolWallet });
          console.log(tx.result.meta.TransactionResult);
        }
      })
    );

    // pays investor original deposit + entitled money with date < now
    const txBlob = {
      TransactionType: "Payment",
      Account: poolWallet.classicAddress,
      Amount: Math.round(amount + totalWithdrawable).toString(),
      Destination: investor,
    };

    let tx = await client.submitAndWait(txBlob, { wallet: poolWallet });
    console.log(tx.result.meta.TransactionResult);
  } catch (error) {
    console.log(error);
  }
};
