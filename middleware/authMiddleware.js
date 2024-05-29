const { SECRETKEY } = require("../controllers/userCtrl");

async function auth(req, res, next) {
  try {
    console.log("req header:", req);

    //  take the token from autherization

    const token = req.header.autherization.split(" ")[1];

    // token is created by own if it's length smaller than 500 otherwise it's google auth token
    const isCustomAuth = token.length < 500;

    let decodedData;

    if (token && isCustomAuth) {
      decodedData = jwt.verify(token, SECRETKEY);

      req.userId = decodedData?.id;
    } else {
      decodedData = jwt.decode(token);

      req.userId = decodedData?.sub;
    }

    next();
  } catch (error) {
    console.log(`Request header is not found:`);
  }
}

module.exports = auth;