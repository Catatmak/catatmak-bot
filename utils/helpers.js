const { decryptDataAES256Cbc } = require('./crypsi');

function formatRupiah(amount) {
  const formatter = new Intl.NumberFormat("id-ID");
  return `Rp. ${formatter.format(amount)}`;
}

function sumPrice(array) {
  let total = 0;
  for (const item of array) {
    const price = parseInt(decryptDataAES256Cbc(item.price)); // Convert price to a number (assuming it's a string in the data)
    total += price;
  }
  return total;
}

function generateOTP() {
  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp.toString();
}

module.exports = {
  formatRupiah,
  sumPrice,
  generateOTP
}