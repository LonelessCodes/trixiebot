# Roadmap TrixieBot and TrixieWeb

## 2019

* Overload Commands
* Improve deleted messages catching:
    * with messageID, timestamp, channelID, userID, username#0000
    * also catch edited messages, but only keep them in DB for 3 days, unless message gets deleted (identify if by messageID)
* Improve Plug and Play of Command Registry (remove .name property, get the command_name arg of .run() into .call() somehow)
* Custom Commands !commands should always go first, then the rest
* New Approach at Localization