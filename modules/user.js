require('dotenv').config();
const { encyptDataAES256Cbc, generatedHmacSha256 } = require('../utils/crypsi');

async function registerUserIfNeeded(db, from) {
  const database = db.db("lapormak");
  const users = database.collection("users");
  const check_phone_register = await users.findOne({
    phone_hmac: generatedHmacSha256(from.split("@")[0])
  });

  if (!check_phone_register) {
    const doc = {
      phone: encyptDataAES256Cbc(from.split("@")[0]),
      phone_hmac: generatedHmacSha256(from.split("@")[0]),
      updated_at: new Date(),
      created_at: new Date(),
    };
    const result = await users.insertOne(doc);
    console.log(`${from} registered with the _id: ${result.insertedId}`);
  }
}

module.exports = {
  registerUserIfNeeded
};
