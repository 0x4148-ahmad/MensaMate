[![Docker](https://img.shields.io/badge/Docker-supported-blue.svg)](https://www.docker.com/) [![Telegram](https://img.shields.io/badge/Telegram-Bot-blue.svg?logo=telegram)](https://t.me/mensamate_bot) [![Status](https://img.shields.io/badge/Bot--Status-online-brightgreen.svg)]() [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

# MensaMate
MensaMate is a Telegram Bot, that shows you the meals from your favorite canteen.


## 🚀 Live Demo
The bot is running 24/7 and is ready to use!
[Use MensaMate](https://t.me/mensamate_bot)

<details>
    <summary>🤖 Click here for a demo</summary>
    <br>
    <p align="center">
        <img src="assets/demo.gif" width="350" alt="MensaMate Demo">
    </p>
</details>


## 🛠️ Installation
If you want your own instance of MensaMate, you need Docker and Git, then follow these steps:

### 1. Clone and prepare the Bot
```bash
# Clone the Repository
git clone https://github.com/0x4148-ahmad/MensaMate.git mensamate

# Go to the directory
cd mensamate

# Rename the .env
cp .env.example .env
```

### 2. Configure the Bot
Open the **.env** file and add your configuration:
* **Telegram Bot Token:** Get it from [@BotFather](https://t.me/BotFather)

* **Admin Chat ID:** Get your ChatID between MensaMate and you from [@userinfobot](https://t.me/userinfobot)

### 3. Start the Bot
```bash
# Build and start the Container in the background
docker compose up -d --build
```


## 📄 License
[MIT](LICENSE)