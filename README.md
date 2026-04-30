# 🏎️ F1 Bot & Web Dashboard

Welcome to the F1 Bot repository! This project combines a dynamic Discord bot with a dedicated web interface to serve up the latest from the grid. Whether you're tracking defensive masterclasses from the Minister of Defence, watching the Prince dominate the track, or just keeping up with the Goat, this application is built to deliver.

## 📋 Project Overview

This repository provides everything needed to run a Formula 1 Discord bot and an accompanying web platform. 
* **Bot Engine:** The core functionality is driven by the `f1_bot.py` script
* **Web Frontend:** The visual layout is handled by `index.html`, with `f1car.png` included as a graphical asset
* **Custom Routing:** The project is configured to be hosted at `if1.trionine.xyz`, as defined by the `CNAME` file
* **Cloud Ready:** A `Procfile` is included, instructing host platforms to run `worker: python f1_bot.py`

## 🛠️ Tech Stack

This project is built with Python and utilises the following dependencies specified in `requirements.txt`
* **`discord.py`**: For full integration with the Discord API
* **`Flask`**: To serve the web application and handle backend routing
* **`requests`**: For fetching external F1 data endpoints
* **`python-dotenv`**: To securely load environment variables and bot tokens

## 📂 Repository Structure

* `f1_bot.py` - Main execution script for the bot worker.
* `index.html` - HTML document for the web application's interface.
* `f1car.png` - Image asset utilised within the project.
* `requirements.txt` - Python package dependencies.
* `Procfile` - Process execution commands for cloud hosting environments.
* `CNAME` - Custom domain configuration.

## 🚀 Installation & Usage

### 1. Local Setup
Ensure you have Python installed, then install the required libraries:
```
pip install -r requirements.txt
```

### 2. Environment Variables
Create a `.env` file in the root directory to store your sensitive credentials (thanks to `python-dotenv`):
```env
DISCORD_TOKEN=your_bot_token_here
```

### 3. Execution
To start the bot locally, run the main Python file:
```
python f1_bot.py
```
