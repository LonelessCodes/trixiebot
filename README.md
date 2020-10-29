# TrixieBot

<div>

<img src="https://discordbots.org/api/widget/397037692963258368.png" width="250" style="float:right; margin-left: .5rem" />

## Using the Official TrixieBot

***[Add TrixieBot to your server now](https://trixiebot.com/invite) and enjoy it's full set of features with low latency on machines it was specifically designed for.***

</div>

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
* Supports multiple languages
* and much more...

---
## Creating your copy of TrixieBot

**WARNING**: The owner of TrixieBot does not recommend building Trixie as it's not documented and most builds here will be extremely unstable, potentially untested and including unfinished features.
If you however still want to build your own instance of Trixie or would like to help out improving Trixie and fixing bugs or issueing bug reports, you are very welcome to do so.

### Preparing

Trixie is dependant on:
* node.js v12.x
* graphicsmagick
* ffmpeg
* mongodb 4.2

so make sure to have those installed before working with Trixie.

Also, this should be obvious, but for Trixie to work you will need a Discord API key and a bot user account.

Now clone the repository to your machine, install the dependencies and transpile the source files.

```
git clone https://github.com/LonelessCodes/trixiebot.git
cd trixiebot
npm install
npm run build
```

This might take one or more minutes, depending on your internet connection and the speed of your machine.

### Setting up

In the config folder there's a template.yaml file that includes all settings Trixie needs to run properly. You must create a copy of that file as `default.yaml` or create files for specific NODE_ENV values and fill out all info, or remove optional properties so they won't use the XXXX placeholder keys. Not providing optional values will disable those features though.

Trixie creates the database automatically when starting.

### Running

To run in development mode (beware: development means development. Don't run in public servers!) go `npm run start:dev` or `npm run start:watch` to compile at runtime and reload on src changes.

If you want to use pm2 for crash savety and restart on reboot, run `npm run pm2` or `npm run pm2:dev` for development.

### Editing

If you're going to edit the code, make sure you're using a proper IDE for code editing. Your best bet might be VS Code.

# License

TrixieBot is licensed under the [GNU General Public License v3.0](LICENSE)

Copyright (C) 2018-2020 Christian Schäfer / Loneless

`Permissions of this strong copyleft license are conditioned on making available complete source code of licensed works and modifications, which include larger works using a licensed work, under the same license. Copyright and license notices must be preserved. Contributors provide an express grant of patent rights.`
