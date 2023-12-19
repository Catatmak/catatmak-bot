require('dotenv').config()
const mindee = require("mindee");
const fs = require("fs");
const mime = require("mime-types");
const {
  v4: uuidv4
} = require("uuid");
const { encyptDataAES256Cbc, generatedHmacSha256, decryptDataAES256Cbc } = require('../utils/crypsi');
const { formatRupiah } = require('../utils/helpers');
const {Storage} = require('@google-cloud/storage');
const path = require('path');

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
          uuid + `.${fileExtension}`,
          media.data,
          "base64",
          function(err) {
            if (err) {
              console.log(err);
              return err;
            } else {
              console.log('File saved successfully');
            }
          }
        );
      }
    } catch (error) {
      console.log(error)
    }

    const fileName = uuid + `.${fileExtension}`;

    try {
      const storage = new Storage({
        keyFilename: path.join(__dirname, '../config/gcloud.json'),
        projectId: 'catatmak',
      });
      console.log(fileName)
      const destinationFileName = `${fileName}`;
      const uploadStorage = await storage.bucket('catatmak-private').upload(fileName, {
        destination: destinationFileName,
      });

      if (!uploadStorage && uploadStorage.length < 0) {
        return wrapper.error(uploadStorage, 'internal server error', 500);
      }

      // Set the expiration time for the signed URL (in seconds)
      const expiration = 3000; // 5 minutes

      // Generate a signed URL
      const signedUrl = await storage.bucket('catatmak-private').file(destinationFileName).getSignedUrl({
        action: 'read', // specify the action, e.g., 'read', 'write', 'delete'
        expires: Date.now() + expiration * 1000, // expiration time in milliseconds
      });

      const database = db.db("lapormak");
      const mindeeClc = database.collection('mindee');
      const mindeeData = await mindeeClc.find({}).sort({limit: -1}).toArray();
      let mindeeApi = '';
      let mindeeLimit = 0;

      if (!mindeeData) {
        return wrapper.error(new BadRequestError('mindee api key is not found'), 'mindee api key is not found', 500);
      }

      if (mindeeData?.length > 0) {
        mindeeApi = mindeeData[0].apiKey;
        mindeeLimit = parseInt(mindeeData[0].limit);
      }


      const mindeeClient = new mindee.Client({
        apiKey: mindeeApi
      });
      const apiResponse = mindeeClient
        .docFromPath(fileName ? fileName : uuid + `.${fileExtension}`)
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
              const reports = database.collection("financials");

              item.totalAmount = Math.floor(item.totalAmount);
              const supplierName = data.supplier_name && data.supplier_name.value ? `[${data.supplier_name.value}] ${item.description}` : item.description;

              const doc = {
                phone: generatedHmacSha256(from.split("@")[0]),
                title: encyptDataAES256Cbc(supplierName),
                price: (item.totalAmount < 100 ?
                  `${item.totalAmount}000` : item.totalAmount),
                image_name: fileName,
                image_url: signedUrl,
                source: 'whatsapp',
                type: 'outcome',
                category: '',
                created_at: new Date(),
                updated_at: new Date(),
              };

              // handle nan
              if (isNaN(doc.price) || doc.price == 'null000') {
                doc.price = 0
                await msg.reply(`Maaf, sepertinya scanner kami tidak tepat, kamu bisa melakukan edit atau hapus melalui aplikasi. \n\n Silahkan ketikan 4`);
              }

              await reports.insertOne(doc);
              await msg.reply(`${decryptDataAES256Cbc(doc.title)} dengan harga ${formatRupiah((doc.price))} berhasil ditambahkan`);
            })
          );
        } else if (resp.document.totalAmount > 0) {
          const database = db.db("lapormak");
          const reports = database.collection("financials");

          resp.document.totalAmount = Math.floor(resp.document.totalAmount);

          const doc = {
            phone: generatedHmacSha256(from.split("@")[0]),
            title: encyptDataAES256Cbc(data.supplier_name.value ? data.supplier_name.value : 'Transaksi'),
            price: (resp.document.totalAmount < 1000 ?
              `${resp.document.totalAmount}000` : resp.document.totalAmount),
            image_url: signedUrl,
            image_name: fileName,
            source: 'whatsapp',
            type: 'outcome',
            category: '',
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
          await msg.reply(`${decryptDataAES256Cbc(doc.title)} dengan harga ${formatRupiah((doc.price))} berhasil ditambahkan`);
        } else {
          await msg.reply(`Mohon maaf, struk yang kamu kirimkan kurang jelas atau buram 😔,\n\nCoba kirim ulang dengan pencahayaan yang terang ☺️`);
        }
      });

      mindeeLimit = mindeeLimit -1;
      const minusLimitMindee = await mindeeClc.updateOne({apiKey: mindeeApi}, {$set: {limit: mindeeLimit}});
      if (!minusLimitMindee) {
        console.log('failed update limit mindee');
      }
      
      fs.unlinkSync(fileName);
    } catch (error) {
      console.log(error)
      return error;
    }
  }
}

module.exports = {
  handleImage
};
