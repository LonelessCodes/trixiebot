# TrixieBot

### [Add TrixieBot to your server now](discordapp.com/oauth2/authorize?client_id=397037692963258368&scope=bot)

A feature-rich Discord Bot for pony lovers (or losers, your choice), including integration of:

* Derpibooru
* e621
* Giphy
* Uberfacts

with features of

* point system
* managing roles
* timeouting users
* and having sexual intercourse with another user

as well as many other great features

---
## Creating your modified copy of TrixieBot

If you don't want to be dependant on whenever the original servers TrixieBot is running on are online or you want to create your own fork of TrixieBot, you can of course run your own copy of TrixieBot.

Copy the repository to your machine so you can edit the code to your requirements.

```
git clone https://github.com/LonelessCodes/TrixieBot
cd TrixieBot
npm install
```

Next get into your Discord account's applications panel on https://discordapp.com/developers/applications/me, create a new app and make sure you add a Discord user to it. It will ask you if you want to do it further down.

Done that you can add your bot to your server, by copying the client id at the top of the page and pasting it into this link:

```https://discordapp.com/oauth2/authorize?client_id=KEY&scope=bot```

You'll be shown a dialog from which you can select which server to add the bot to.

The bot doesn't have keys and tokens hard coded into the script, instead in the repository root there's a folder called ```keys``` which holds a bunch of json files that include all the keys used to authenticate with any service the bot uses. 

Now with that knowledge go back to the bot settings and copy the token in the bot user section. This is the key used to log into your bot user, so keep it save and don't show it to anyone.

The key file to authenticate with Discord is called ```discord.json``` and has only one property, which is ```token``` and holds the bot user token that you just copied. So in the ```keys``` folder create the file ```discord.json``` with content:

```
{
    "token": "TOKEN"
}
```

Remember to double quote the token so JSON reads it as a proper string.

So once you've done all that your bot is basically ready to go. Though you will notice once you start running the bot it will tell you to use the full spectrum of TrixieBot you need to sign up on a few services and get an API key for each service that you'll have to paste into a new key file each. Don't worry though: If you don't want to use those services you don't have to.
