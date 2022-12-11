const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const { expressjwt: jwt } = require("express-jwt");
const cookieParser = require("cookie-parser");
const { MongoClient } = require("mongodb");
const xrpl = require("xrpl");
const WebSocket = require("ws");
const axios = require("axios");
const authController = require("./controllers/authController");
const userController = require("./controllers/userController");
const nftController = require("./controllers/nftController");
const poolController = require("./controllers/poolController");

const RECEIVABLE_FEE = 0.02;

dotenv.config({ path: `${__dirname}/../config.env` });

const app = express();
app.use(express.json());
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(morgan("dev"));

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Credentials", true);
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.post("/api/v1/auth/signup", authController.signUp);
app.post("/api/v1/auth/login", authController.login);

app.get("/api/v1/receivable/address", nftController.getReceivableAddress);
app.get("/api/v1/receivable/pool", nftController.getPoolAddress);

app.post("/api/v1/pool/deposit", poolController.deposit);

app.use(cookieParser());
app.use(authController.verifyUserToken);
app.use(
  jwt({
    secret: process.env.JWT_SECRET,
    getToken: (req) => req.cookies.token,
    algorithms: ["HS256"],
  })
);

app.get("/api/v1/auth/name", authController.getBusinessName);
app.get("/api/v1/auth/wallet", authController.getAddress);
app.post("/api/v1/auth/wallet/update", authController.updateAddress);
app.get("/api/v1/businesses", userController.getUsers);
app.post("/api/v1/receivable/new", nftController.createReceivable);
app.get("/api/v1/receivable/sellOffers", nftController.getSellOffers);
app.delete("/api/v1/receivable/sellOffers", nftController.deleteSellOffers);

app.all("*", (_, res) => {
  res.send("Invalid route");
});

const mongoUri = process.env.MONGO_URI;
const client = new MongoClient(mongoUri);

const setupDB = async () => {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("Connected successfully to database");
  } catch (error) {
    console.log(error);
  }
};

setupDB();

app.listen(4000, () => {
  console.log("server running on port 4000");
});

const mainWallet = xrpl.Wallet.fromMnemonic(process.env.MNEMONIC);
const poolWallet = xrpl.Wallet.fromMnemonic(process.env.POOL_MNEMONIC);

const subscribe = async (socket) => {
  const client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233");
  await client.connect();

  socket.send(
    JSON.stringify({
      id: "Pool Address Sub",
      command: "subscribe",
      accounts: [poolWallet.classicAddress],
    })
  );
};

const handleIncomingPayment = async (investor, amount) => {
  const investorCollection = client.db().collection("investors");

  let investorDoc = await investorCollection.findOne({ investor });

  if (investorDoc) {
    const pastAmount = investorDoc.amount;
    await investorCollection.updateOne(
      { investor },
      { $set: { amount: parseFloat(amount, 10) + pastAmount } }
    );
  } else {
    await investorCollection.insertOne({
      investor,
      amount: parseFloat(amount, 10),
    });
  }
};

const handleSellOffer = async (NFTokenID, seller, offerAmount) => {
  try {
    const client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233");
    await client.connect();

    // used to retrieve nft uri + metadata
    const nfts = (
      await client.request({
        method: "account_nfts",
        account: seller,
        ledger_index: "validated",
      })
    ).result.account_nfts.filter((nft) => nft.NFTokenID === NFTokenID);

    const cid = xrpl.convertHexToString(nfts[0].URI);

    const metadata = (
      await axios.get(`https://ipfs.io/ipfs/${cid}`, {
        withCredentials: false,
      })
    ).data;

    // accepts offer: pool gets nft and burns, seller/debtor gets funds
    if (metadata.amount * (1 - RECEIVABLE_FEE) <= offerAmount) {
      const offer = (
        await client.request({
          method: "nft_sell_offers",
          nft_id: NFTokenID,
        })
      ).result.offers.filter((offer) => offer.amount === offerAmount)[0]; // ensures user can't sell another offer with worse price

      let txBlob = {
        TransactionType: "NFTokenAcceptOffer",
        Account: poolWallet.classicAddress,
        NFTokenSellOffer: offer.nft_offer_index,
      };

      let tx = await client.submitAndWait(txBlob, { wallet: poolWallet });
      console.log(tx.result.meta.TransactionResult);

      // burns token
      txBlob = {
        TransactionType: "NFTokenBurn",
        Account: poolWallet.classicAddress,
        Owner: poolWallet.classicAddress,
        NFTokenID,
      };

      tx = await client.submitAndWait(txBlob, { wallet: poolWallet });
      console.log(tx.result.meta.TransactionResult);

      // TODO: mint token to every investor
    } else {
      console.log("Offer amount too high");
      console.log(
        `Metadata says ${
          metadata.amount * (100 - RECEIVABLE_FEE)
        }, offer says ${offerAmount}`
      );
    }
  } catch (error) {
    console.log(error);
  }
};

// websocket for incoming txs to receivable pool
const socket = new WebSocket("wss://xls20-sandbox.rippletest.net:51233");
socket.on("open", (event) => {
  console.log("Websocket connection established");
  const command = {
    id: "on_open_ping_1",
    command: "ping",
  };
  socket.send(JSON.stringify(command));

  // subscribe to pool
  subscribe(socket);
});

socket.on("message", (data) => {
  const ev = JSON.parse(data);
  console.log(ev);

  if (ev.transaction) {
    if (
      ev.transaction.Destination === poolWallet.classicAddress &&
      ev.transaction.TransactionType === "Payment"
    ) {
      const amount = xrpl.dropsToXrp(ev.transaction.Amount); // db stores xrp, not drops
      const investor = ev.transaction.Account;

      handleIncomingPayment(investor, amount);
    } else if (
      ev.transaction.Destination === poolWallet.classicAddress &&
      ev.transaction.TransactionType === "NFTokenCreateOffer" &&
      ev.transaction.Flags === 1
    ) {
      const token = ev.transaction.NFTokenID;
      const seller = ev.transaction.Account;
      // check whether offer amount is correct
      const amount = ev.transaction.Amount;
      handleSellOffer(token, seller, amount);
    }
  }
});

socket.on("close", () => {
  console.log("Disconnected from websocket");
});

exports.client = client;
