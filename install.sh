#!/bin/sh

apt-get update

curl -sL https://deb.nodesource.com/setup_9.x -o nodesource_setup.sh
bash nodesource_setup.sh
apt-get update
apt-get install nodejs ffmpeg
rm nodesource_setup.sh

npm install -g pm2
npm install
