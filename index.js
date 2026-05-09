import 'dotenv/config'
import { Telegraf, session } from 'telegraf'
import Database from 'better-sqlite3';

///////////////////////////////////////// BEGIN INIT MENSAMATE /////////////////////////////////////////
const db = new Database('canteens.db');
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.use(session());
db.pragma('foreign_keys = ON');

console.log('Setup MensaMate Bot . . .');

db.exec('CREATE TABLE IF NOT EXISTS canteens (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL, address TEXT, lat REAL, lng REAL )');
db.exec('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, telegram_id BIGINT UNIQUE NOT NULL, canteen_id INT NOT NULL, FOREIGN KEY (canteen_id) REFERENCES canteens(id) ON DELETE CASCADE )');


async function setupCanteens() {
  console.log("Get API Data . . .");
  const canteens = await fetch('https://openmensa.org/api/v2/canteens');
  const data = await canteens.json();
  // console.log(data[1]);
  let counter;
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
    console.log("///////// ERROR /////////");
  }
}
///////////////////////////////////////// END INIT MENSAMATE /////////////////////////////////////////


///////////////////////////////////////// BEGIN SETUP AND PREPARE MENSAMATE /////////////////////////////////////////
const check = db.prepare('SELECT COUNT(*) AS count FROM canteens').get();

if (check.count === 0) 
  await setupCanteens();

bot.command('start',(ctx) => {
  ctx.session = {};
  ctx.session.status = 'waitingForCity';
  return ctx.reply('Hello! I am your personal Bot, please write me your city Mate');
});

bot.on('text', (ctx) => {
  if (ctx.session?.status === 'waitingForCity') {
    const city = ctx.message.text;
    ctx.session.status = null;

    const userCanteens = db.prepare('SELECT id, name FROM canteens WHERE city LIKE ?').all(`%${city}%`);
    // TODO: Output if empty canteen list


    const buttons = userCanteens.map(current => [
      { text: current.name, callback_data: `${current.id}` }
    ]);

    return ctx.reply('Choose your canteen or answer again with /start', {
      reply_markup: { inline_keyboard: buttons }
    });
  }
});

bot.on('callback_query', async (ctx) => {
  // console.log(ctx.callbackQuery.data);
  const userName = ctx.from.first_name;
  const telegramID = ctx.from.id;
  const canteenID = ctx.callbackQuery.data;

  await ctx.editMessageReplyMarkup(undefined);

  try {
    const insertUser = db.prepare('INSERT OR REPLACE INTO USERS (name, telegram_id, canteen_id) VALUES (?, ?, ?)');
    insertUser.run(userName, telegramID, canteenID);
    return ctx.reply('Thank you ' + userName + '. I saved your canteen in my brain.')
  }
  catch(error) {
    return ctx.reply('Error: Please try again.')
  }

});

bot.launch();
console.log('MensaMate is online !');
///////////////////////////////////////// END SETUP AND PREPARE MENSAMATE /////////////////////////////////////////