require('dotenv').config();

const { Telegraf } = require('telegraf');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start((ctx) => {
  return ctx.reply('MensaMate am Start! Ich höre dich.');
});

bot.launch();


console.log("Der Bot-Prozess wurde gestartet...");