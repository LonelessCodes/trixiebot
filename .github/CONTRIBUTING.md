# Contributing

If you wish to contribute to TrixieBot, feel free to fork the repository and submit a pull request. We use ESLint to enforce a consistent coding style, so having that set up in your editor of choice is a great boon to your development process.

## Setup

To get ready to work on the codebase, please do the following:

1. Get a Discord API token (for bot user) from the developer portal and put it in.
2. Install node.js v10.x, graphicsmagick, ffmpeg and mongodb.
3. Fork & clone the repository, and make sure you're on the **dev** branch.
4. Run `npm install`
5. Copy `template.yaml` to `default.yaml` or `development.yaml` and fill it out with the Discord token you just got and how you've set up mongodb (optional properties can be removed if you're not working on those features).
6. Code your heart out!
7. Run `npm lint` to ESLint to ensure changes are valid.
8. [Submit a pull request](https://github.com/LonelessCodes/trixiebot/compare)

### Running the Bot

To run in development mode (beware: development means development. Don't run in public servers!) go `npm run dev` or if you're on windows `node dev`.

For crash savety and restart on reboot official Trixie uses pm2 with the configs at `pm2dev.json` and `pm2prod.json`.

### Editing

If you're going to edit the code, make sure you're using a proper IDE for code editing. Your best bet might be VS Code.
