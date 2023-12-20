require('dotenv').config()
const { encyptDataAES256Cbc, generatedHmacSha256, decryptDataAES256Cbc } = require('../utils/crypsi');
const { formatRupiah, sumPrice } = require('../utils/helpers');
const {
  v4: uuidv4
} = require("uuid");
const constant = require('../utils/constant');
const moment = require('moment-timezone');

const today = new Date();
today.setHours(0, 0, 0, 0); // Set the time to the start of the day

async function handleMenuOption(db, msg, from, type, split_message) {
  const menu = ["1", "2", "3", "4"];
  const database = db.db("lapormak");

  if (msg.body == "1") {
    handleOption1(msg);
  } else if (msg.body == "2") {
    handleOption2(msg);
  } else if (msg.body == "3") {
    handleOption3(msg, from, database);
  } else if (msg.body == "4") {
    handleOption4(msg);
  } else if(msg.body == "5") {
    handleOption5(msg);
  } else if(split_message.length > 1) {
    handleInsertByChat(msg, split_message, database, from);
  } else if(!menu.includes(msg.body) && type != "image") {
    handleDefaultMenu(msg);
  }
}

async function handleOption1(msg) {
  await msg.reply('Untuk melakukan catat pengeluaran, silahkan ketikan\n\n*nama pengeluaran harga*\ncontoh: **Bakso 15000**');
}

async function handleOption2(msg) {
  await msg.reply('Untuk melakukan catat pemasukan, silahkan ketikan\n\n*catatmak nama pemasukan jumlah*\ncontoh: **catatmak Gajian 5.000.000**');
}

async function handleOption3(msg, from, db) {
  const reports = db.collection("financials");
  const data = await reports
    .find({
      phone: generatedHmacSha256(from.split("@")[0]),
      created_at: {
        $gte: today
      },
      type: 'outcome'
    })
    .sort({
      created_at: -1
    })
    .toArray();

  if (data.length < 1) {
    await msg.reply("Kamu belum melakukan pengeluaran hari ini 🥹\n\nYuk mulai catat pengeluaranmu dengan **nama pengeluaran harga** atau pilih angka 1");
  }

  if (data.length > 0) {
    let text = `Pengeluaran kamu hari ini 💵\n*${formatRupiah(sumPrice(data))}* \n\n`;
    data.map((item, i) => {
      text += `${i + 1}. ${decryptDataAES256Cbc(item.title)} ${formatRupiah(decryptDataAES256Cbc(item.price))}\n`;
    });

    text += '\n⭐ Kamu bisa melakukan update atau hapus data di aplikasi';
    await msg.reply(text);
  }
}

async function handleOption4(msg) {
  await msg.reply(constant.menuOption3);
}

async function handleOption5(msg) {
  await msg.reply(constant.menuOption4);
}

async function handleOption6(msg, db, from) {
  const uuid = uuidv4();
  const database = db.db("lapormak");
  const reports = database.collection("users");
  const filter = {
    phone_hmac: generatedHmacSha256(from.split("@")[0])
  }; // Replace 'your_document_id' with the ID of the document you want to update
  const updateData = {
    $set: {
      token: generatedHmacSha256(uuid),
      phone: encyptDataAES256Cbc(from.split("@")[0]),
      updated_at: new Date(),
      created_at: new Date()
    }
  };
  const updateOptions = {
    upsert: true // This enables upsert functionality
  };
  // Update a single document that matches the filter
  reports
    .updateOne(filter, updateData, updateOptions)
    .then((result) => {
      console.log("verify token added:", result);
    })
    .catch((error) => {
      console.error("error verify token:", error);
      return error;
    });

  const message = `Silahkan buka link di bawah ini untuk melakukan login ke dashboard website.\n\nhttps://lapormak.com/verify?token=${generatedHmacSha256(uuid)}\n*Link akan expired dalam 20 menit.`;

  // Send the message
  await msg.reply(message);
}

async function handleInsertByChat(msg, split_message, db, from) {
  const reports = db.collection("financials");
  const now = moment(new Date());
  const currentDate = now.format('YYYY-MM-DDTHH:mm:ss.SSS[Z]');

  // handle jika chat pemasukan
  if(split_message[0].toLowerCase() == 'catatmak') {
    const doc = {
      phone: generatedHmacSha256(from.split("@")[0]),
      title: encyptDataAES256Cbc(
        split_message
        .slice(1, split_message.length - 1)
        .join(" ")),
      price: encyptDataAES256Cbc(split_message[split_message.length - 1].split('.').join('')),
      type: 'income',
      source: 'whatsapp',
      created_at: new Date(currentDate),
      updated_at: new Date(currentDate),
    };
  
    const result = await reports.insertOne(doc);
    console.log(`${JSON.stringify(result)} data income have been inserted`);
    await msg.reply(
      `${split_message.slice(1, split_message.length - 1).join(" ")} dengan jumlah ${formatRupiah(
          split_message[split_message.length - 1].split('.').join('')
        )} \n\nBerhasil ditambahkan 👍`
    );

    return;
  }

  if (isNaN(split_message[split_message.length - 1])) {
    return await msg.reply(`Maaf format yang kamu ketik kurang tepat\nSilahkan ketikan: \n**nama pengeluaran harga**\n\ncontoh: Bakso 15000`);
  }

  if (!parseInt(split_message[split_message.length - 1])) {
    return await msg.reply(`Maaf format yang kamu ketik kurang tepat\nSilahkan ketikan: \n**nama pengeluaran harga**\n\ncontoh: Bakso 15000`);
  }

  if (parseInt(split_message[split_message.length - 1]) > 99999999) {
    return await msg.reply(`Maaf harga yang kamu ketik terlalu besar\nSilahkan ketikan ulang dengan harga yang lebih kecil: \n"nama pengeluaran harga"\n\ncontoh: Bakso 15000`);
  }

  const doc = {
    phone: generatedHmacSha256(from.split("@")[0]),
    title: encyptDataAES256Cbc(
      split_message
      .slice(0, split_message.length - 1)
      .join(" ")),
    price: encyptDataAES256Cbc(split_message[split_message.length - 1].split('.').join('')),
    type: 'outcome',
    source: 'whatsapp',
    created_at: new Date(currentDate),
    updated_at: new Date(currentDate),
  };

  const result = await reports.insertOne(doc);
  console.log(`${JSON.stringify(result)} data outcome have been inserted`);
  await msg.reply(
    `${split_message.slice(0, split_message.length - 1).join(" ")} dengan harga ${formatRupiah(
        split_message[split_message.length - 1].split('.').join('')
      )} \n\nBerhasil ditambahkan 👍`
  );
}

async function handleDefaultMenu(msg) {
  await msg.reply(constant.menuDefault);
}

module.exports = {
  handleMenuOption
};
