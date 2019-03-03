# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="2.1.0"></a>
# [2.1.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.0.4...v2.1.0) (2019-03-03)


### Bug Fixes

* **audio manager:** updated voice channel reference, when trixie is moved from vc to vc ([8e35089](https://bitbucket.org/Loneless/trixiebot/commits/8e35089))
* fixed other people having a say wether you can buy or cancel a soundboard or waifu slot purchase ([6c87511](https://bitbucket.org/Loneless/trixiebot/commits/6c87511))
* some code typos ([5d44930](https://bitbucket.org/Loneless/trixiebot/commits/5d44930))
* tried to fix some id of null errors. Let's see with how much success ([741f157](https://bitbucket.org/Loneless/trixiebot/commits/741f157))



<a name="2.0.4"></a>
## [2.0.4](https://bitbucket.org/Loneless/trixiebot/compare/v2.0.3...v2.0.4) (2019-02-03)


### Bug Fixes

* **soundboard command:** users not in vc cannot play samples from sb list anymore ([d0dd0b4](https://bitbucket.org/Loneless/trixiebot/commits/d0dd0b4))
* **tts & soundboard command:** delay in playback ([e74dd51](https://bitbucket.org/Loneless/trixiebot/commits/e74dd51))



<a name="2.0.3"></a>
## [2.0.3](https://bitbucket.org/Loneless/trixiebot/compare/v2.0.2...v2.0.3) (2019-01-31)


### Bug Fixes

* another fix for help generation for website ([99e1550](https://bitbucket.org/Loneless/trixiebot/commits/99e1550))



<a name="2.0.2"></a>
## [2.0.2](https://bitbucket.org/Loneless/trixiebot/compare/v2.0.1...v2.0.2) (2019-01-31)


### Bug Fixes

* dont crash SampleList when user not connected ([836592e](https://bitbucket.org/Loneless/trixiebot/commits/836592e))



<a name="2.0.1"></a>
## [2.0.1](https://bitbucket.org/Loneless/trixiebot/compare/v1.34.1...v2.0.1) (2019-01-30)


### Bug Fixes

* soundboard moved to category audio ([1e1b266](https://bitbucket.org/Loneless/trixiebot/commits/1e1b266))



<a name="2.0.0"></a>
# [2.0.0](https://bitbucket.org/Loneless/trixiebot/compare/v1.34.1...v2.0.0) (2019-01-30)


### Bug Fixes

* **daily command:** fixed bug in daily command where it would crash when not already called before ([6ec06da](https://bitbucket.org/Loneless/trixiebot/commits/6ec06da))
* **mlpquote command:** fixed "submitted by" link ([395f13a](https://bitbucket.org/Loneless/trixiebot/commits/395f13a))
* **poll command:** {{votesCount}} bug fixed ([87eafa4](https://bitbucket.org/Loneless/trixiebot/commits/87eafa4))
* bigger horsepussy ([e8d21db](https://bitbucket.org/Loneless/trixiebot/commits/e8d21db))
* change from old to new website url ([5961f4c](https://bitbucket.org/Loneless/trixiebot/commits/5961f4c))


### Features

* added alias stop for stopvc command ([d2128bd](https://bitbucket.org/Loneless/trixiebot/commits/d2128bd))
* bank trans command added ([f3d1520](https://bitbucket.org/Loneless/trixiebot/commits/f3d1520))
* seperated trixie and help command ([887ead1](https://bitbucket.org/Loneless/trixiebot/commits/887ead1))
* soundboard command added ([c6e50a2](https://bitbucket.org/Loneless/trixiebot/commits/c6e50a2))



<a name="1.34.1"></a>
## [1.34.1](https://bitbucket.org/Loneless/trixiebot/compare/v1.34.0...v1.34.1) (2019-01-27)


### Bug Fixes

* global rate limiter (so sorry so sorry that it showed up in every help command) ([dfb14cd](https://bitbucket.org/Loneless/trixiebot/commits/dfb14cd))
* **upvotes:** headers for receiving upvotes fixed ([4ee3843](https://bitbucket.org/Loneless/trixiebot/commits/4ee3843))



<a name="1.34.0"></a>
# [1.34.0](https://bitbucket.org/Loneless/trixiebot/compare/v1.33.0...v1.34.0) (2019-01-27)


### Bug Fixes

* **ascii command:** finally fixed ascii command DOS (I hope) ([1b12402](https://bitbucket.org/Loneless/trixiebot/commits/1b12402))
* **credits:** check account state before getting dailies ([6f1d58e](https://bitbucket.org/Loneless/trixiebot/commits/6f1d58e))
* **credits help:** fixed some usage issues ([ae4fb30](https://bitbucket.org/Loneless/trixiebot/commits/ae4fb30))
* **website manager:** undefined this error while getting deleted messages fixed ([d1853cd](https://bitbucket.org/Loneless/trixiebot/commits/d1853cd))
* added a Rate Limiter to every command. ([cbd3420](https://bitbucket.org/Loneless/trixiebot/commits/cbd3420))
* commands throwing errors when deleting messages that were already deleted ([37b9080](https://bitbucket.org/Loneless/trixiebot/commits/37b9080))
* encode most queries in URLs (trump, mlp, derpi) to URI components now, so they return the wanted results ([2c65cb1](https://bitbucket.org/Loneless/trixiebot/commits/2c65cb1))
* help generation for website fix ([acc848a](https://bitbucket.org/Loneless/trixiebot/commits/acc848a))
* hoping to fix some "missing permission" errors ([8bb362c](https://bitbucket.org/Loneless/trixiebot/commits/8bb362c))


### Features

* join, stop, leave commands added ([cc7b0dc](https://bitbucket.org/Loneless/trixiebot/commits/cc7b0dc))
* new audio manager for easier voice channel handling ([6975736](https://bitbucket.org/Loneless/trixiebot/commits/6975736))
* **8ball command:** give less neutral replies ([8304377](https://bitbucket.org/Loneless/trixiebot/commits/8304377))
* **daily command:** send time left ([db3f89d](https://bitbucket.org/Loneless/trixiebot/commits/db3f89d))
* new paginator: now emoji based ([1ffbd90](https://bitbucket.org/Loneless/trixiebot/commits/1ffbd90))



<a name="1.33.0"></a>
# [1.33.0](https://bitbucket.org/Loneless/trixiebot/compare/v1.32.1...v1.33.0) (2019-01-22)


### Bug Fixes

* **ascii command:** tried to fix the ascii command ([6b21f70](https://bitbucket.org/Loneless/trixiebot/commits/6b21f70))
* **help command:** fixed some help command bugs ([0e3ea71](https://bitbucket.org/Loneless/trixiebot/commits/0e3ea71))
* **timeout command:** fix wrong database call and therefore a deprecation error ([560d865](https://bitbucket.org/Loneless/trixiebot/commits/560d865))
* **whois command:** remove fetchUser code, as it's being deprecated ([623dfaa](https://bitbucket.org/Loneless/trixiebot/commits/623dfaa))


### Features

* add a currency system ([cdec948](https://bitbucket.org/Loneless/trixiebot/commits/cdec948))
* bank and daily command added ([5b6f49a](https://bitbucket.org/Loneless/trixiebot/commits/5b6f49a))
* whois command added ([f5d9551](https://bitbucket.org/Loneless/trixiebot/commits/f5d9551))
* **waifu command:** buyslots command added ([947b91e](https://bitbucket.org/Loneless/trixiebot/commits/947b91e))



<a name="1.32.1"></a>
## [1.32.1](https://bitbucket.org/Loneless/trixiebot/compare/v1.32.0...v1.32.1) (2019-01-16)


### Bug Fixes

* **guild stats:** guild stats command showing right user sums now ([0be9d47](https://bitbucket.org/Loneless/trixiebot/commits/0be9d47))
* **logging:** stop logging every deleted messages ([0928d9b](https://bitbucket.org/Loneless/trixiebot/commits/0928d9b))



<a name="1.32.0"></a>
# [1.32.0](https://bitbucket.org/Loneless/trixiebot/compare/v1.31.0...v1.32.0) (2019-01-16)


### Bug Fixes

* **deleted command:** save and return user tag from db if user not found ([697cc00](https://bitbucket.org/Loneless/trixiebot/commits/697cc00))
* **guild stats:** send better stats to web instance ([014fb80](https://bitbucket.org/Loneless/trixiebot/commits/014fb80))


### Features

* add guild stats logging ([6a1d858](https://bitbucket.org/Loneless/trixiebot/commits/6a1d858))
* add stats command for guild stats ([213c988](https://bitbucket.org/Loneless/trixiebot/commits/213c988))
* chat/cleverbot command added ([b16bb0a](https://bitbucket.org/Loneless/trixiebot/commits/b16bb0a))



<a name="1.31.0"></a>
## [1.31.0](https://bitbucket.org/Loneless/trixiebot/compare/v1.30.1...v1.31.0) (2019-01-09)


### Features

* add guild stats logging ([6a1d858](https://bitbucket.org/Loneless/trixiebot/commits/6a1d858))



<a name="1.30.1"></a>
## [1.30.1](https://bitbucket.org/Loneless/trixiebot/compare/v1.30.0...v1.30.1) (2019-01-03)


### Bug Fixes

* **commands:** fixed shrug command ([22217d5](https://bitbucket.org/Loneless/trixiebot/commits/22217d5))
* **commands:** horsep**** command following Derpi API License ([9a73861](https://bitbucket.org/Loneless/trixiebot/commits/9a73861))


### Features

* new stats logic ([f4f7057](https://bitbucket.org/Loneless/trixiebot/commits/f4f7057))



<a name="1.30.0"></a>
# [1.30.0](https://bitbucket.org/Loneless/trixiebot/compare/v1.29.1...v1.30.0) (2018-12-31)


### Features

* add changelog command ([9e2da74](https://bitbucket.org/Loneless/trixiebot/commits/9e2da74))



<a name="1.29.1"></a>
## [1.29.1](https://bitbucket.org/Loneless/trixiebot/compare/v1.29.0...v1.29.1) (2018-12-31)


### Bug Fixes

* **upvotes:** forgot to import UpvotesManager in Core xD ([95f4beb](https://bitbucket.org/Loneless/trixiebot/commits/95f4beb))



<a name="1.29.0"></a>
# [1.29.0](https://bitbucket.org/Loneless/trixiebot/compare/v1.28.1...v1.29.0) (2018-12-30)


### Bug Fixes

* fixed some optional property issues ([6b3e85d](https://bitbucket.org/Loneless/trixiebot/commits/6b3e85d))
* **mention users:** fixed mentioning in waifu command ([02e9788](https://bitbucket.org/Loneless/trixiebot/commits/02e9788))
* **waifu:** cooldown set higher ([46be470](https://bitbucket.org/Loneless/trixiebot/commits/46be470))


### Features

* **stats:** post stats to discordbotlist.com ([acfccd5](https://bitbucket.org/Loneless/trixiebot/commits/acfccd5))
* Instead of mentioning users, can also Username[#0000](https://bitbucket.org/Loneless/trixiebot/issues/0000) them ([8e93701](https://bitbucket.org/Loneless/trixiebot/commits/8e93701))
* **stats:** post stats to discordbots.org ([6afaf39](https://bitbucket.org/Loneless/trixiebot/commits/6afaf39))
* **votes:** added vote webhooks ([648df90](https://bitbucket.org/Loneless/trixiebot/commits/648df90))



<a name="1.28.1"></a>
## [1.28.1](https://bitbucket.org/Loneless/trixiebot/compare/v1.28.0...v1.28.1) (2018-12-28)


### Bug Fixes

* **waifu:** cooldown typos fixed ([72ad396](https://bitbucket.org/Loneless/trixiebot/commits/72ad396))



<a name="1.28.0"></a>
# [1.28.0](https://bitbucket.org/Loneless/trixiebot/compare/v1.27.1...v1.28.0) (2018-12-28)


### Features

* **waifu:** added waifu escape command ([3496320](https://bitbucket.org/Loneless/trixiebot/commits/3496320))



<a name="1.27.0"></a>
# [1.27.0](https://bitbucket.org/Loneless/trixiebot/compare/v1.25.6...v1.27.0) (2018-12-28)


### Bug Fixes

* **nsfw commands:** image commands now obey guidelines ([b9adfd6](https://bitbucket.org/Loneless/trixiebot/commits/b9adfd6))


### Features

* added a changelog and release chain ([37c9929](https://bitbucket.org/Loneless/trixiebot/commits/37c9929))
* post stats to ls.terminal.ink ([acded38](https://bitbucket.org/Loneless/trixiebot/commits/acded38))



<a name="1.25.6"></a>
## [1.25.6](https://bitbucket.org/Loneless/trixiebot/compare/v1.25.7...v1.25.6) (2018-12-27)


### Bug Fixes

* show MLP category in help ([2cdbdcb](https://bitbucket.org/Loneless/trixiebot/commits/2cdbdcb))
