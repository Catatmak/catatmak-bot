require('dotenv').config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = process.env.MONGODB_URL;

const MongoDbClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function connectToMongoDB() {
  try {
    await MongoDbClient.connect();
    await MongoDbClient.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");
  } finally {
    await MongoDbClient.close();
  }
}

module.exports = { MongoDbClient, connectToMongoDB };
