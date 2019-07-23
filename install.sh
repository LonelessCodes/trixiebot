#!/bin/sh

# update all packages
sudo apt-get update -y

# open ports for HTTP and HTTPS server
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow http # HTTP
sudo ufw allow https # HTTPS
sudo ufw allow ssh # SSH
sudo ufw allow 8080 # Dev Port
sudo ufw allow 5000 # Votes Port
sudo ufw enable # Run firewall

# install build-essentials
sudo apt-get install build-essential -y

# install graphics magic for image commands
sudo apt-get install graphicsmagick -y

# prepare nodejs installation
curl -sL https://deb.nodesource.com/setup_10.x -o nodesource_setup.sh
sudo bash nodesource_setup.sh
sudo apt-get update -y

# install nodejs
sudo apt-get remove nodejs ffmpeg -yf
sudo apt-get install nodejs ffmpeg -y
rm nodesource_setup.sh # delete the setup script

# prepare mongodb installation
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 0C49F3730359A14518585931BC711F9BA15703C6
echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.4.list
sudo apt-get update -y

# install mongodb
sudo apt-get install mongodb-org -y
sudo systemctl start mongod
sudo systemctl status mongod
sudo systemctl enable mongod

# install production manager 2
sudo npm install -g pm2

# install certbot for Let's Encrypt
sudo apt-get install software-properties-common -y
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update -y
sudo apt-get install certbot -y

# and now install the bot's packages already
npm install
