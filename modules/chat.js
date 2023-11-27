require('dotenv').config()
const { encyptDataAES256Cbc, generatedHmacSha256, decryptDataAES256Cbc } = require('../utils/crypsi');
const { formatRupiah, sumPrice } = require('../utils/helpers');
const constant = require('../utils/constant');

async function handleMenuOption(db, msg, from, type, split_message) {
  const menu = ["1", "2", "3", "4"];
  const database = db.db("lapormak");
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set the time to the start of the day

  if (msg.body == "1") {
    handleOption1(msg);
  } else if (msg.body == "2") {
    handleOption2(msg, from, database);
  } else if (msg.body == "3") {
    handleOption3(msg);
  } else if(msg.body == "4") {
    handleOption4(msg);
  } else if(split_message.length > 1) {
    handleInsertByChat(msg, split_message, database);
  } else if(!menu.includes(msg.body) && type != "image") {
    handleDefaultMenu(msg);
  } else {
    handleDefaultMenu(msg);
  }
}

async function handleOption1(msg) {
  await msg.reply('Untuk melakukan catat pengeluaran, silahkan ketikan "#lapor"\n\nnama pengeluaran harga\n\ncontoh: Bakso 15000');
}

async function handleOption2(msg, from, db) {
  const reports = db.collection("financials");
  const data = await reports
    .find({
      phone: generatedHmacSha256(from.split("@")[0]),
      created_at: {
        $gte: today
      }
    })
    .sort({
      created_at: -1
    })
    .toArray();

  if (data.length < 1) {
    await msg.reply("Kamu belum melakukan pengeluaran hari ini 🥹\n\nYuk mulai catat pengeluaranmu dengan nama pengeluaran harga atau pilih angka 1");
  }

  if (data.length > 0) {
    let text = `Pengeluaran kamu hari ini 💵\n*${formatRupiah(sumPrice(data))}* \n\n`;
    data.map((item, i) => {
      text += `${i + 1}. ${decryptDataAES256Cbc(item.outcome_name)} ${formatRupiah(decryptDataAES256Cbc(item.price))}\n`;
    });

    text += '\n*Kamu bisa melakukan update atau hapus data di web dashboard';
    await msg.reply(text);
  }
}

async function handleOption3(msg) {
  await msg.reply(constant.menuOption3);
}

async function handleOption4(msg) {
  await msg.reply(constant.menuOption4);
}

async function handleInsertByChat(msg, split_message, db) {
  const reports = db.collection("financials");

  if (isNaN(split_message[split_message.length - 1])) {
    return await msg.reply(`Maaf format yang kamu ketik kurang tepat\nSilahkan ketikan: \n"nama pengeluaran harga"\n\ncontoh: Bakso 15000`);
  }

  if (!parseInt(split_message[split_message.length - 1])) {
    return await msg.reply(`Maaf format yang kamu ketik kurang tepat\nSilahkan ketikan: \n"nama pengeluaran harga"\n\ncontoh: Bakso 15000`);
  }

  if (parseInt(split_message[split_message.length - 1]) > 99999999) {
    return await msg.reply(`Maaf harga yang kamu ketik terlalu besar\nSilahkan ketikan ulang dengan harga yang lebih kecil: \n"nama pengeluaran harga"\n\ncontoh: Bakso 15000`);
  }

  const doc = {
    phone: generatedHmacSha256(from.split("@")[0]),
    outcome_name: encyptDataAES256Cbc(
      split_message
      .slice(1, split_message.length - 1)
      .join(" ")),
    price: encyptDataAES256Cbc(split_message[split_message.length - 1].split('.').join('')),
    type: 'outcome',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const result = await reports.insertOne(doc);
  console.log(`${JSON.stringify(result)} data outcome have been inserted`);
  await msg.reply(
    `${split_message.slice(1, split_message.length - 1).join(" ")} dengan harga ${formatRupiah(
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
