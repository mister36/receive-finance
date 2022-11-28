const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const { expressjwt: jwt } = require("express-jwt");
const cookieParser = require("cookie-parser");
const { MongoClient } = require("mongodb");
const authController = require("./controllers/authController");

dotenv.config({ path: `${__dirname}/../config.env` });

const app = express();
app.use(express.json());
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(morgan("dev"));
app.post("/api/v1/auth/signup", authController.signUp);
app.post("/api/v1/auth/login", authController.login);

app.use(cookieParser());
app.use(authController.verifyUserToken);
app.use(
  jwt({
    secret: process.env.JWT_SECRET,
    getToken: (req) => req.cookies.token,
    algorithms: ["HS256"],
  })
);

app.get("/api/v1/auth/wallet", authController.getWalletStatus);
app.post("/api/v1/auth/wallet/update", authController.updateWalletStatus);

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

exports.client = client;
