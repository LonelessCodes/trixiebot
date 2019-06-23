# Roadmap TrixieBot and TrixieWeb

## 2019

* Improve deleted messages catching:
    * with messageID, timestamp, channelID, userID, username#0000
    * also catch edited messages, but only keep them in DB for 3 days, unless message gets deleted (identify if by messageID)
* Custom Commands !commands should always go first, then the rest
* New Approach at Localization
* Cache more Database stuff that's possibly impacting performance or makes too many calls that could impact performance 
* XP System (global and locale seperated, but connected somehow)
* Purchasable roles
* Marketplace (incl. purchasable roles)
