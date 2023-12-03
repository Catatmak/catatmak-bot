require('dotenv').config()
const qrcode = require("qrcode-terminal");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require('cors')
const helpers = require('./utils/helpers')
const { Client, LocalAuth } = require("whatsapp-web.js");
const { MongoClient, ServerApiVersion } = require("mongodb");
const { Messages } = require("./modules/message");
const { encyptDataAES256Cbc, generatedHmacSha256 } = require('./utils/crypsi');
const {
  v4: uuidv4
} = require("uuid");
const uri = process.env.MONGODB_URL;
const port = process.env.PORT;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname));
app.use(cors())
app.use(bodyParser.json());

// Init Mongodb
const MongoDbClient = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await MongoDbClient.connect();
    await MongoDbClient.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    await MongoDbClient.close();
  }
}

// Init whatsapp web js
const client = new Client({
  puppeteer: {
    executablePath: '/usr/bin/brave-browser-stable',
  },
  authStrategy: new LocalAuth({
    clientId: "client-one"
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox']
  }
});

client.on('authenticated', (session) => {
  console.log('WHATSAPP WEB => Authenticated');
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

client.on("message", async (message) => {
  if(message.from != 'status@broadcast') {
    try {
      await Messages(client, MongoDbClient, message);
    } catch (error) {
      console.log(error);
      return error;
    }
  }
});

// Handle API with Whatsapp message
app.get('/', function (req, res) {
  res.json({
      status: 200,
      message: 'ok'
  });
});

app.post("/verify-otp", async (req, res) => {
  try {
    const { phone, otp } = req.body;
    const uuid = uuidv4();

    if (!phone) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid request. "phone" parameters are required.' });
    }

    if (!otp) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid request. "otp" parameters are required.' });
    }

    await MongoDbClient.connect();

    const database = MongoDbClient.db("lapormak");
    const users = database.collection("users");
    const filter = { 
      phone_hmac: generatedHmacSha256(phone)
    };

    const checkOtp = await users.findOne({otp: generatedHmacSha256(otp)});
    if(!checkOtp) {
      return res.status(500).json({ success: false, message: "Kode OTP Salah" });
    }

    const updateData = { 
      $set: {
        otp: '',
        token: generatedHmacSha256(uuid),
        updated_at: new Date(),
      }
    };

    const updateOptions = {
      upsert: true
    };

    await users
      .updateOne(filter, updateData, updateOptions)
      .then((result) => {
        console.log("success verify otp and update token");
      })
      .catch((error) => {
        console.error("error verify token:", error);
      });

    res.json({ success: true, message: "Sukses Verifikasi OTP", token: generatedHmacSha256(uuid) });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Gagal Verifikasi OTP" });
  }
});

app.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;

    // Check if the 'to' and 'otp' parameters are provided
    if (!phone) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid request. "phone" parameters are required.' });
    }

    await MongoDbClient.connect();

    const database = MongoDbClient.db("lapormak");
    const reports = database.collection("users");
    const otpCode = helpers.generateOTP();
    const filter = { 
      phone_hmac: generatedHmacSha256(phone)
    };

    const updateData = { 
      $set: {
        otp: generatedHmacSha256(otpCode),
        phone: encyptDataAES256Cbc(phone),
        updated_at: new Date()
      }
    };

    const updateOptions = {
      upsert: true
    };

    reports
      .updateOne(filter, updateData, updateOptions)
      .then((result) => {
        console.log("success send otp");
      })
      .catch((error) => {
        console.error("failed send otp", error);
      });

    const message = `Kode OTP anda ${otpCode}`

    // Send the message
    await client.sendMessage(`${phone}@c.us`, message);

    res.json({ success: true, message: "OTP sent successfully!" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send the message." });
  }
});

app.post("/message", async (req, res) => {
  try {
    const { phone, message } = req.body;

    // Check if the 'to' and 'message' parameters are provided
    if (!phone) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid request. "phone" parameters are required.' });
    }

    if (!message) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid request. "message" parameters are required.' });
    }

    // Send the message
    await client.sendMessage(`${phone}@c.us`, message);

    res.json({ success: true, message: "Message sent successfully!" });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send the message." });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

client.initialize();
run().catch(console.dir);