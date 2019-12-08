# Setup TrixieBot on a Server

This is a cheat sheet for the developer to know what to do when setting up a new server.

## Create safe user

Logged in als root we create a safe user named "trixie" with `sudo` privileges

```sh
useradd -s /bin/bash -m -d /home/trixie -c "trixie" trixie
passwd trixie # set a passqord 
usermod -aG sudo trixie
```

Now log in a trixie. Everything below this point should be done as trixie.

## Update system

Update everything to the latest version.

```sh
sudo apt-get update -y
sudo apt-get upgrade -y
```

## Setup Firewall

Setup the firewall and open the appropriate ports for HTTP, HTTPS, SSH, dev and botlist webhook server.

```sh
# make sure ufw is installed
sudo apt-get install ufw -y

sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow http             # HTTP
sudo ufw allow https            # HTTPS
sudo ufw allow ssh              # SSH
sudo ufw allow 8080             # Dev Port
sudo ufw allow 5000             # Votes Port
sudo ufw allow 5010             # Votes Dev Port

sudo ufw enable                 # Run firewall
```

## Install prerequisites

### Install git, build tools, curl, openbssl, gm

```sh
# install git, if not already installed
sudo apt-get install git -y

# install build-essentials
sudo apt-get install build-essential -y
sudo apt-get install curl openssl libssl-dev -y

# install graphics magic for image commands
sudo apt-get install graphicsmagick -y
```

### Install Node.js

```sh
# prepare nodejs installation
curl -sL https://deb.nodesource.com/setup_10.x -o nodesource_setup.sh
chmod +x nodesource_setup.sh
sudo ./nodesource_setup.sh
sudo apt-get update -y

# install nodejs
sudo apt-get remove nodejs ffmpeg -yf
sudo apt-get install nodejs ffmpeg -y
rm nodesource_setup.sh # delete the setup script

# allow access to port 80 and 443 (normally only root has access to ports below 1000)
sudo apt-get install libcap2-bin
sudo setcap cap_net_bind_service=+ep /usr/local/bin/node
```

### Install MongoDB

```sh
# prepare mongodb installation
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 0C49F3730359A14518585931BC711F9BA15703C6
echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.4.list
sudo apt-get update -y

# install mongodb
sudo apt-get install mongodb-org -y
sudo systemctl start mongod
sudo systemctl status mongod
sudo systemctl enable mongod
```

### Install Certbot for HTTPS on website

```sh
# install certbot for Let's Encrypt
sudo apt-get install software-properties-common -y
sudo add-apt-repository universe
sudo add-apt-repository ppa:certbot/certbot
sudo apt-get update -y
sudo apt-get install certbot -y
```

Create a certificate

```sh
sudo certbot certonly --standalone -d www.trixie.loneless.art -d trixie.loneless.art --cert-name trixie.loneless.art
```

### Install Prometheus

https://devopscube.com/install-configure-prometheus-linux/

# Install Node Dependencies

```sh
# and now install the bot's packages already
npm install --production
```

### Install PM2

```sh
sudo npm install pm2 -g
```

### Run Apps and configure restart on reboot

```sh
cd trixiebot
pm2 start pm2prod.json
cd trixieweb
pm2 start pm2prod.json

pm2 save

# restart on reboot
sudo env PATH=$PATH:/usr/local/bin pm2 startup -u trixie

# allow pm2 to access its socket
sudo chown trixie:trixie /home/trixie/.pm2/rpc.sock /home/trixie/.pm2/pub.sock
```
