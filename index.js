require('dotenv').config();
const express = require("express");
const app = express();
const port = process.env.PORT;
const bodyParser = require("body-parser");
const cors = require("cors");
const whatsapp = require("./init/whatsapp");
const { connectToMongoDB } = require("./init/mongodb");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(__dirname));
app.use(cors());
app.use(bodyParser.json());

app.post("/verify", async (req, res) => {
  // Handle verification endpoint
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

connectToMongoDB().catch(console.dir);
whatsapp.initialize();
