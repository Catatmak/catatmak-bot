require('dotenv').config()
const mindee = require("mindee");
const fs = require("fs");
const mime = require("mime-types");
const {
  v4: uuidv4
} = require("uuid");
const { encyptDataAES256Cbc, generatedHmacSha256, decryptDataAES256Cbc } = require('../utils/crypsi');
const { formatRupiah } = require('../utils/helpers');

async function handleImage(db, msg, from, type) {
  // Handle image messages
  if (type == "image") {
    await msg.reply("Tunggu sebentar yaa, Gambar sedang diproses");
    const media = await msg.downloadMedia();
    const fileExtension = mime.extension(media.mimetype);
    const uuid = uuidv4();

    try {
      if(media) {
        fs.writeFile(
          media.filename ? media.filename : uuid + `.${fileExtension}`,
          media.data,
          "base64",
          function(err) {
            if (err) {
              console.log(err);
            } else {
              console.log('File saved successfully');
            }
          }
        );
      }
    } catch (error) {
      console.log(error)
    }

    try {
      const mindeeClient = new mindee.Client({
        apiKey: process.env.MINDEE_API_KEY
      });
      const apiResponse = mindeeClient
        .docFromPath(media.filename ? media.filename : uuid + `.${fileExtension}`)
        .parse(mindee.ReceiptV5);

      apiResponse.then(async (resp) => {
        if (resp.document === undefined) return;

        let data = {
          line_items: resp.document.lineItems,
          supplier_name: resp.document.supplierName,
        };

        if (data.line_items.length > 1) {
          await Promise.all(
            data.line_items.map(async (item) => {
              const database = db.db("lapormak");
              const reports = database.collection("reports");

              item.totalAmount = Math.floor(item.totalAmount);
              const supplierName = data.supplier_name && data.supplier_name.value ? `[${data.supplier_name.value}] ${item.description}` : item.description;

              const doc = {
                phone: generatedHmacSha256(from.split("@")[0]),
                outcome_name: encyptDataAES256Cbc(supplierName),
                price: (item.totalAmount < 100 ?
                  `${item.totalAmount}000` : item.totalAmount),
                image_url: uuid + `.${fileExtension}`,
                created_at: new Date(),
                updated_at: new Date(),
              };

              // handle nan
              if (isNaN(doc.price) || doc.price == 'null000') {
                doc.price = 0
                await msg.reply(`Maaf, sepertinya scanner kami tidak tepat, kamu bisa melakukan edit atau hapus melalui aplikasi. \n\n Silahkan ketikan 4`);
              }

              await reports.insertOne(doc);
              await msg.reply(`${decryptDataAES256Cbc(doc.outcome_name)} dengan harga ${formatRupiah((doc.price))} berhasil ditambahkan`);
            })
          );
        } else if (resp.document.totalAmount > 0) {
          const database = db.db("lapormak");
          const reports = database.collection("reports");

          resp.document.totalAmount = Math.floor(resp.document.totalAmount);

          const doc = {
            phone: generatedHmacSha256(from.split("@")[0]),
            outcome_name: encyptDataAES256Cbc(data.supplier_name.value ? data.supplier_name.value : 'Transaksi'),
            price: (resp.document.totalAmount < 1000 ?
              `${resp.document.totalAmount}000` : resp.document.totalAmount),
            image_url: uuid + `.${fileExtension}`,
            created_at: new Date(),
            updated_at: new Date(),
          };

          // handle nan
          if (isNaN(doc.price) || doc.price == 'null000') {
            doc.price = 0;
            await msg.reply(`Maaf, sepertinya scanner kami tidak tepat, kamu bisa melakukan edit atau hapus melalui aplikasi. \n\n Silahkan ketikan 4`);
          }

          await reports.insertOne(doc);
          console.log(`have been inserted`);
          await msg.reply(`${decryptDataAES256Cbc(doc.outcome_name)} dengan harga ${formatRupiah((doc.price))} berhasil ditambahkan`);
        } else {
          await msg.reply(`Mohon maaf, struk yang kamu kirimkan kurang jelas atau buram 😔,\n\nCoba kirim ulang dengan pencahayaan yang terang ☺️`);
        }
      });
    } catch (error) {
      console.log(error)
      return error;
    }
  }
}

module.exports = {
  handleImage
};
