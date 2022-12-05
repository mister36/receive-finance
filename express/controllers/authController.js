const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const main = require("../app");

exports.signUp = async (req, res) => {
  try {
    const { business, companyAddress, agentAddress, email, password } =
      req.body;
    const passwordHash = await bcrypt.hash(password, 12);

    const businesses = main.client.db().collection("businesses");
    await businesses.insertOne({
      business,
      companyAddress,
      agentAddress,
      email,
      password: passwordHash,
      xrpAddress: "",
    });

    const token = jwt.sign({ business, email }, process.env.JWT_SECRET, {
      expiresIn: "500d",
    });
    res.cookie("token", token, { httpOnly: true });
    res.json({ token });
    console.log("created");
  } catch (error) {
    console.log(error);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const business = await main.client
      .db()
      .collection("businesses")
      .findOne({ email });

    if (await bcrypt.compare(password, business.password)) {
      const token = jwt.sign(
        { business: business.business, email },
        process.env.JWT_SECRET,
        {
          expiresIn: "500d",
        }
      );

      res.cookie("token", token, { httpOnly: true });

      res.json({ token, hasWallet: business.hasWallet });
    } else {
      res.send("no account found");
    }
  } catch (error) {
    console.log(error);
  }
};

exports.getAddress = async (req, res) => {
  try {
    const user = req.user;

    const business = await main.client
      .db()
      .collection("businesses")
      .findOne({ email: user.email });

    res.json({ xrpAddress: business.xrpAddress });
  } catch (error) {
    console.log(error);
  }
};

exports.updateAddress = async (req, res) => {
  try {
    const user = req.user;
    const { address } = req.body;

    await main.client
      .db()
      .collection("businesses")
      .updateOne({ email: user.email }, { $set: { xrpAddress: address } });
    res.json({ message: "All good" });
  } catch (error) {
    console.log(error);
  }
};

exports.verifyUserToken = (req, res, next) => {
  if (!req.cookies.token) {
    return res.status(401).send("Unauthorized request");
  }
  const token = req.cookies.token;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).send("Invalid token.");
  }
};
