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
      res.json({ token });
    } else {
      res.send("no account found");
    }
  } catch (error) {
    console.log(error);
  }
};

const verifyUserToken = (req, res, next) => {
  if (!req.headers.authorization) {
    return res.status(401).send("Unauthorized request");
  }
  const token = req.headers["authorization"].split(" ")[1];
  if (!token) {
    return res.status(401).send("Access denied. No token provided.");
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(400).send("Invalid token.");
  }
};
