const { Client } = require("whatsapp-web.js");
const { Messages } = require("../modules/message");
const { MongoDbClient } = require("./mongodb");
const client = new Client();

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.on("message", async (message) => {
  if (message.from != "status@broadcast") {
    try {
      await Messages(client, MongoDbClient, message);
    } catch (error) {
      console.log(error);
      return error;
    }
  }
});

module.exports = client;