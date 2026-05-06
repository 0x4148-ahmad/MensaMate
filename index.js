import 'dotenv/config'
import { Telegraf } from 'telegraf'
import Database from 'better-sqlite3';

const db = new Database('canteens.db');
const bot = new Telegraf(process.env.BOT_TOKEN);

db.exec('CREATE TABLE IF NOT EXISTS canteens (id INTEGER PRIMARY KEY, name TEXT NOT NULL, city TEXT NOT NULL)');
const check = db.prepare('SELECT COUNT(*) AS count FROM canteens').get();

if (check.count === 0) {
  const canteen = await fetch('https://openmensa.org/api/v2/canteens/98');
  const data = await canteen.json();

  console.log(data)
}




bot.command('start',(ctx) => {
  return ctx.reply('MensaMate am Start! Ich höre dich...');
});

bot.launch();


console.log("Der Bot-Prozess wurde gestartet...");