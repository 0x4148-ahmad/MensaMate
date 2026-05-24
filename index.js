import 'dotenv/config'
import { Telegraf, session } from 'telegraf'
import Database from 'better-sqlite3';
import cron from 'node-cron';

///////////////////////////////////////// BEGIN INIT MENSAMATE /////////////////////////////////////////
const db = new Database('data/canteens.db');
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session());
db.pragma('foreign_keys = ON');

console.log('Setup MensaMate Bot . . .');
db.exec('CREATE TABLE IF NOT EXISTS canteens (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, address TEXT, lat REAL, lng REAL )');
db.exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, telegram_chat_id BIGINT UNIQUE NOT NULL, canteen_id INT NOT NULL, FOREIGN KEY (canteen_id) REFERENCES canteens(id) ON DELETE CASCADE )');

async function setupCanteens() {
  console.log("Get API Data . . .");
  const canteens = await fetch('https://openmensa.org/api/v2/canteens');
  const data = await canteens.json();
  // console.log(data[1]);
  let counter = 0;
  const insert = db.prepare('INSERT OR REPLACE INTO canteens (id, name, city, address, lat, lng) VALUES (?, ?, ?, ? , ?, ?)');
  const transaction = db.transaction((canteens) => {
    canteens.forEach(canteen => {
        insert.run(canteen.id,
          canteen.name,
          canteen.city,
          canteen.address,
          canteen.coordinates?.[0] ?? null,
          canteen.coordinates?.[1] ?? null);
        counter++;
    });
  });

  try {
    counter = 0;
    transaction(data);
    console.log("////////////////// Canteens saved successfully //////////////////");
    console.log("//////////////// Added / Changed " + counter + " new Canteens ////////////////");
  }
  catch (error) {
    console.log(error.message);
  }
}

async function getMeals(userName, chatID, date) {
  // Test: 
  // date = '2026-05-11';
  let getCanteenID = '';
  try {
    getCanteenID = db.prepare('SELECT canteen_id FROM users where telegram_chat_id = ?').get(chatID);
  }
  catch (error) {
    console.log(error.message)
    return 'I cannot find you in my database. Please register first with /start 🤖';
  }

  if (!getCanteenID)
    return 'I cannot find you in my database. Please register first with /start 🤖';
  // console.log(getCanteenID.canteen_id);

  const meals = await fetch('https://openmensa.org/api/v2/canteens/' + getCanteenID.canteen_id + '/days/' + date + '/meals');
  if (!meals.ok || meals.length === 0)
    return 'Looks like your canteen is closed today.';

  const currentMeals = await meals.json();
  // console.log(currentMeals);

  let message = '';
  message += 'Hello ' + userName + '! 👋\nHere are the meals as you wished.\n\n<code>';
  message += '┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n';
  message += ' 🍽️ MEALS OF THE DAY; FOR YOU 🍽️   \n';
  message += '┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛</code>\n\n';
  currentMeals.forEach(meal => {
    message += '<strong>◈ ' + meal.category + ': </strong>' + (meal.prices?.students ? ( meal.prices.students.toFixed(2).replace('.', ',') + ' €' ) : ( '' )) + '\n';
    message += '<code>' + meal.name.replace('|', 'dazu') + '</code>\n\n';
  });
  message += '<code>';
  message += '─────────────────────────────────\n';
  message += '   ✨ Enjoy your Meal Mate! ✨   ';
  message += '</code>';
  return message;
}


///////////////////////////////////////// END INIT MENSAMATE /////////////////////////////////////////


///////////////////////////////////////// BEGIN SETUP AND PREPARE MENSAMATE /////////////////////////////////////////
const check = db.prepare('SELECT COUNT(*) AS count FROM canteens').get();
if (check.count === 0) 
  await setupCanteens();

bot.command('start',(ctx) => {
  ctx.session ??= {};
  ctx.session.status = 'waitingForCity';
  return ctx.reply('Hello! I am your personal Bot, please write me your city Mate');
});

bot.command('today', async (ctx) => {
  const text = await getMeals(ctx.from.first_name, ctx.chat.id, getDateWithOffset(0));
  return ctx.reply(text, { parse_mode: 'HTML' });
});

bot.command('tomorrow', async (ctx) => {
  const text = await getMeals(ctx.from.first_name, ctx.chat.id, getDateWithOffset(1));
  return ctx.reply(text, { parse_mode: 'HTML' });
});

bot.command('canteen', (ctx) => {
  const checkIfRegistered = db.prepare('SELECT * FROM users where telegram_chat_id = ?').get(ctx.chat.id);
  if (!checkIfRegistered) 
    return ctx.reply('I cannot find you in my database. But we can become friends with /start ! 🤖');

  ctx.session ??= {};
  ctx.session.status = 'waitingForCity';
  return ctx.reply('Want to change your canteen?\nNo problem, just write me your city!');
});

bot.command('info', (ctx) => {
  let message = '🤖 <b>MensaMate Bot</b> <code>v1.0.0</code>\n';
  message += '<i>Your smart Canteen Mate</i>\n\n';
  message += '👤 <b>Author:</b> Ahmad Hussein\n';
  message += '💻 <b>Tech Stack:</b> Node.js | SQLite | Docker\n';
  message += '🏠 <b>Host:</b> Raspberry Pi\n\n';
  message += '📦 <b>Source Code:</b> <a href="https://github.com/0x4148-ahmad/MensaMate">GitHub Repository</a>'
  return ctx.reply(message, { parse_mode: 'HTML' });
});

bot.command('feedback', (ctx) => {
  ctx.session ??= {};
  ctx.session.status = 'feedback';
  return ctx.reply("Please write me your feedback or problems,\n I'll send it to my creator! 😀");
})

bot.command('share', (ctx) => {
  return ctx.replyWithPhoto({ source: 'assets/qrcode_mensamate.jpg' });
});

bot.command('stop', (ctx) => {
  const checkIfRegistered = db.prepare('DELETE FROM users WHERE telegram_chat_id = ?').run(ctx.chat.id);
  if (checkIfRegistered.changes)
    return ctx.reply('I deleted all your data from my brain.\nGoodbye, my Friend! 👋\nHopefully, see you again.');
  else
    return ctx.reply('I cannot find you in my database. But we can become friends with /start ! 🤖');
});


bot.on('text', async (ctx) => {
  if (ctx.session?.status === 'waitingForCity') {
    const city = ctx.message.text;
    ctx.session.status = null;

    const userCanteens = db.prepare('SELECT id, name FROM canteens WHERE city LIKE ?').all(`%${city}%`);

    if (userCanteens.length === 0)
      return ctx.reply('I cannot find a canteen in that city, please change the city with /start');

    const buttons = userCanteens.map(current => [
      { text: current.name, callback_data: `${current.id}` }
    ]);

    return ctx.reply('Choose your canteen or change city with /start', {
      reply_markup: { inline_keyboard: buttons }
    });
  }
  else if (ctx.session?.status === 'feedback') {
    ctx.session.status = null;
    const date = getDateWithOffset(0,false);

    let message = '<b>📩 New Feedback Received!</b>\n\n';
    message += '🆔 From: ' + ctx.chat.id + '\n';
    message += '🗓️ Date: ' + date[0] + ', ' + date[1] + '\n';
    message += '───────────────\n';
    message += '🔷 BEGIN MESSAGE 🔷\n\n'
    message += '<code>' + ctx.message.text + '</code>\n\n'
    message += '🔷 END MESSAGE 🔷\n';
    message += '───────────────';

    try {
      await ctx.telegram.sendMessage(process.env.ADMIN_CHAT_ID, message, { parse_mode: 'HTML' });
    }
    catch(error) {
      console.log(error.message);
      return ctx.reply('🔴 ERROR: Please try again later. 🔴');
    }
    return ctx.reply('Thank you! ✌️\nYour feedback has been forwarded to my creator.\nHave a nice day! 🚀');
  }
});

bot.on('callback_query', async (ctx) => {
  // console.log(ctx.callbackQuery.data);
  const userName = ctx.from.first_name;
  const telegramChatID = ctx.chat.id;
  const canteenID = ctx.callbackQuery.data;

  await ctx.answerCbQuery();
  await ctx.editMessageReplyMarkup(undefined);

  try {
    const insertUser = db.prepare('INSERT OR REPLACE INTO USERS (name, telegram_chat_id, canteen_id) VALUES (?, ?, ?)');
    insertUser.run(userName, telegramChatID, canteenID);
    return ctx.editMessageText('Thank you ' + userName + '. I noticed your canteen in my brain.')
  }
  catch(error) {
    console.error(error.message);
    return ctx.reply('Error: Please try again.')
  }

});

cron.schedule('0 8 * * *', () => {
  sendDailyMessage();
}, {
  timezone: "Europe/Berlin"
});

bot.launch();
console.log('MensaMate is online!');
///////////////////////////////////////// END SETUP AND PREPARE MENSAMATE /////////////////////////////////////////


///////////////////////////////////////// BEGIN SUPPORT FUNCTIONS /////////////////////////////////////////
function getDateWithOffset(offset, onlyDate = true) {
  const day = new Date();
  day.setDate(day.getDate() + offset);
  if (onlyDate)
    return day.toISOString().split('T')[0];
  else {
    let date = day.toISOString().split('T');
    date [1] = date[1].split('.')[0];
    return date;
  }
}

async function sendDailyMessage() {
  const users = db.prepare('SELECT telegram_chat_id as id, name FROM USERS').all();
  for (const user of users) {
    const message = await getMeals(user.name, user.id, getDateWithOffset(0));
    await bot.telegram.sendMessage(user.id, message, { parse_mode: 'HTML' });
  }
}
///////////////////////////////////////// END SUPPORT FUNCTIONS /////////////////////////////////////////