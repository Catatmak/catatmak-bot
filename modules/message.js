const { handleMenuOption } = require('./chat');
const { handleImage } = require('./image');
const { registerUserIfNeeded } = require('./user');

const Messages = async (client, db, msg) => {
  const from = msg.from;
  const message = msg.body;
  const type = msg.type;
  const split_message = message.split(" ");

  try {
    await db.connect();
    await registerUserIfNeeded(db, from);
    await handleMenuOption(db, msg, from, type, split_message);
    await handleImage(db, msg, from, type);
  } catch (error) {
    console.error(error);
    return error;
  }
};

exports.Messages = Messages;