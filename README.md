# TrixieBot

## Using the Official TrixieBot

### [Add TrixieBot to your server now](https://trixie.loneless.art/invite) and enjoy it's full set of features with low latency on machines it was specifically designed for.

---
Trixie is an all-in-one Discord Bot for pony lovers

She offers a variety of great features, many of which to satisfy the needs of My Little Pony fans and server admins.

## Top Features

* Powerful Custom Commands
* Full custom low-latency Soundboard
* A giant set of image commands
* Picarto, Twitch and Smashcast Stream announcer
* User- / Server Stats and Analytics
* Role management
* 100% customizable (disable / enable everything)
* Utility and fun stuff
* Constantly worked on
* and much more...

---
## Creating your copy of TrixieBot

**WARNING**: The owner of TrixieBot does not recommend building Trixie as it's not documented and most builds here will be extremely unstable, potentially untested and including unfinished features.
If you however still want to build your own instance of Trixie or would like to help out improving Trixie and fixing bugs or issueing bug reports, you are very welcome to do so.

### Preparing

Trixie is dependant on:
* node.js v10.x
* graphicsmagick
* ffmpeg
* mongodb

so make sure to have those installed before working with Trixie. There's a `install.sh` in the project's root that could help with installing what you need if you're on Ubuntu 18.04.

Also, this should be obvious, but for Trixie to work you will need a Discord API key and a bot user account.

Now clone the repository to your machine and install the dependencies.

```
git clone https://github.com/LonelessCodes/trixiebot.git
cd trixiebot
npm install
```

This might take one or more minutes, depending on your internet connection and the speed of your machine.

### Setting up

In the config folder there's a template.yaml file that includes all settings Trixie needs to run properly. You must create a copy of that file as `default.yaml` or create files for specific NODE_ENV values and fill out all info, or remove optional properties so they won't use the XXXX placeholder keys. Not providing optional values will disable those features though.

Trixie creates the database automatically when starting.

### Running

To run in development mode (beware: development means development. Don't run in public servers!) go `npm run dev` or if you're on windows `node dev`.

For crash savety and restart on reboot official Trixie uses pm2 with the configs at `pm2dev.json` and `pm2prod.json`.

### Editing

If you're going to edit the code, make sure you're using a proper IDE for code editing. Your best bet might be VS Code.
