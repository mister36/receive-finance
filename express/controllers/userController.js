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
