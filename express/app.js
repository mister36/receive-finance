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

app.post("/api/v1/ipfs", userController.getIpfsData);

app.get("/api/v1/receivable/address", nftController.getReceivableAddress);
app.get("/api/v1/receivable/pool", nftController.getPoolAddress);

app.post("/api/v1/pool/deposit", poolController.deposit);
app.post("/api/v1/investors/deposit", userController.getInvestorDeposit);
app.post("/api/v1/investors/offers", nftController.getInvestorOffers);
app.post("/api/v1/investors/offers/remove", nftController.deleteInvestorOffers);

app.get("/api/v1/test", nftController.test);

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
  const investorOffers = client.db().collection("investorOffers");
  try {
    const xrpClient = new xrpl.Client(
      "wss://xls20-sandbox.rippletest.net:51233"
    );
    await xrpClient.connect();

    // used to retrieve nft uri + metadata
    const nfts = (
      await xrpClient.request({
        method: "account_nfts",
        account: seller,
        ledger_index: "validated",
      })
    ).result.account_nfts.filter((nft) => nft.NFTokenID === NFTokenID);

    const cid = xrpl.convertHexToString(nfts[0].URI);

    const metadata = (
      await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`, {
        withCredentials: false,
      })
    ).data;

    // pool balance before pool pays debtor
    const poolBalance = (
      await xrpClient.request({
        command: "account_info",
        account: poolWallet.classicAddress,
        ledger_index: "validated",
      })
    ).result.account_data.Balance;

    // accepts offer: pool gets nft and burns, seller/debtor gets funds
    if (metadata.amount * (1 - RECEIVABLE_FEE) <= offerAmount) {
      const offer = (
        await xrpClient.request({
          method: "nft_sell_offers",
          nft_id: NFTokenID,
        })
      ).result.offers.filter((offer) => offer.amount === offerAmount)[0]; // ensures user can't sell another offer with worse price

      let txBlob = {
        TransactionType: "NFTokenAcceptOffer",
        Account: poolWallet.classicAddress,
        NFTokenSellOffer: offer.nft_offer_index,
      };

      let tx = await xrpClient.submitAndWait(txBlob, { wallet: poolWallet });
      console.log(tx.result.meta.TransactionResult);

      // burns token
      txBlob = {
        TransactionType: "NFTokenBurn",
        Account: poolWallet.classicAddress,
        Owner: poolWallet.classicAddress,
        NFTokenID,
      };

      tx = await xrpClient.submitAndWait(txBlob, { wallet: poolWallet });
      console.log(tx.result.meta.TransactionResult);

      // total value of checks for pool
      const checks = (
        await xrpClient.request({
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

      // SECTION: mint token to every investor
      const investorCollection = client.db().collection("investors");
      const investorsCursor = investorCollection.find({});

      const sequence = (
        await xrpClient.request({
          command: "account_info",
          account: poolWallet.classicAddress,
        })
      ).result.account_data.Sequence;

      const ticketTransaction = await xrpClient.autofill({
        TransactionType: "TicketCreate",
        Account: poolWallet.classicAddress,
        TicketCount: await investorCollection.countDocuments(),
        Sequence: sequence,
      });

      tx = await xrpClient.submitAndWait(ticketTransaction, {
        wallet: poolWallet,
      });
      console.log(tx.result.meta.TransactionResult);

      let tickets = (
        await xrpClient.request({
          command: "account_objects",
          account: poolWallet.classicAddress,
          type: "ticket",
        })
      ).result.account_objects.map((ticket) => ticket.TicketSequence);

      await Promise.all(
        (
          await investorsCursor.toArray()
        ).map(async (investor, index) => {
          // only ones that can be withdrawn at this moment
          const entitledNfts = (
            await xrpClient.request({
              method: "account_nfts",
              account: investor.investor,
              ledger_index: "validated",
            })
          ).result.account_nfts.filter((nft) => {
            const date = JSON.parse(xrpl.convertHexToString(nft.URI)).date;
            return (
              nft.Issuer === poolWallet.classicAddress &&
              date < Math.round(Date.now() / 1000)
            );
          });

          let totalEntitledNow = 0;

          entitledNfts.forEach((nft) => {
            totalEntitledNow += parseFloat(
              JSON.parse(xrpl.convertHexToString(nft.URI)).entitledTo || 0 // TODO: remove. only here for testing
            );
          });

          console.log(
            "variables:",
            investor.amount,
            totalEntitledNow,
            poolBalance,
            totalChecksValue,
            offerAmount
          );

          // formula for ROI
          const entitledTo =
            ((investor.amount + totalEntitledNow) /
              (parseFloat(poolBalance, 10) + totalChecksValue)) *
            parseFloat(offerAmount, 10) *
            RECEIVABLE_FEE;

          console.log("ENTITLED TO:", entitledTo);

          const meta = JSON.stringify({
            entitledTo,
            date: metadata.due,
          });

          let txBlob = {
            TransactionType: "NFTokenMint",
            Account: poolWallet.address,
            URI: xrpl.convertStringToHex(meta),
            NFTokenTaxon: 0,
            Flags: 1,
            Sequence: 0,
            TicketSequence: tickets[index],
            LastLedgerSequence: null,
          };

          tx = await xrpClient.submitAndWait(txBlob, {
            wallet: poolWallet,
            autofill: true,
          });
          console.log(tx.result.meta.TransactionResult);

          const nftForInvestor = (
            await xrpClient.request({
              method: "account_nfts",
              account: poolWallet.classicAddress,
              ledger_index: "validated",
            })
          ).result.account_nfts.filter(
            (nft) => nft.URI === xrpl.convertStringToHex(meta)
          )[0];

          // create offer for investor, save offer in db
          txBlob = {
            TransactionType: "NFTokenCreateOffer",
            Account: poolWallet.classicAddress,
            NFTokenID: nftForInvestor.NFTokenID,
            Amount: "0",
            Destination: investor.investor,
            Flags: 1,
          };

          tx = await xrpClient.submitAndWait(txBlob, {
            wallet: poolWallet,
            autofill: true,
          });
          console.log(tx.result.meta.TransactionResult);

          // retrieves offer index
          const sellOfferIndex = (
            await xrpClient.request({
              method: "nft_sell_offers",
              nft_id: nftForInvestor.NFTokenID,
            })
          ).result.offers[0]["nft_offer_index"];

          await investorOffers.insertOne({
            investor: investor.investor,
            offer: sellOfferIndex,
          });
        })
      );
    } else {
      console.log("Offer amount too high");
      console.log(
        `Metadata says ${
          metadata.amount * (1 - RECEIVABLE_FEE)
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
      const amount = ev.transaction.Amount;
      const investor = ev.transaction.Account;

      handleIncomingPayment(investor, amount);
    } else if (
      ev.transaction.Destination === poolWallet.classicAddress &&
      ev.transaction.TransactionType === "NFTokenCreateOffer" &&
      ev.transaction.Flags === 1
    ) {
      const token = ev.transaction.NFTokenID;
      const seller = ev.transaction.Account;

      const amount = ev.transaction.Amount;
      handleSellOffer(token, seller, amount);
    }
  }
});

socket.on("close", () => {
  console.log("Disconnected from websocket");
});

exports.client = client;
