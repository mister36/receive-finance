const axios = require("axios");
const main = require("../app");

exports.getUsers = async (req, res) => {
  try {
    const cursor = main.client.db().collection("businesses").find();
    let businesses = await cursor.toArray();

    businesses = businesses.map((business) => ({
      business: business.business,
      xrpAddress: business.xrpAddress,
    }));

    res.status(200).json({
      businesses,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.getIpfsData = async (req, res) => {
  const { cid } = req.body;

  try {
    const metadata = (
      await axios.get(`https://gateway.pinata.cloud/ipfs/${cid}`)
    ).data;

    return res.status(200).json(metadata);
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error,
    });
  }
};

exports.getInvestorDeposit = async (req, res) => {
  const { investor } = req.body;

  try {
    const investorDoc = await main.client
      .db()
      .collection("investors")
      .findOne({ investor });

    res.status(200).json({
      amount: investorDoc ? investorDoc.amount : 0,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error,
    });
  }
};
