# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

<a name="2.15.2"></a>
## [2.15.2](https://bitbucket.org/Loneless/trixiebot/compare/v2.15.1...v2.15.2) (2019-09-25)


### Bug Fixes

* **fetch member:** fixed wrong usages of Guild.fetchMember(). ([abd34be](https://bitbucket.org/Loneless/trixiebot/commits/abd34be))



<a name="2.15.1"></a>
## [2.15.1](https://bitbucket.org/Loneless/trixiebot/compare/v2.15.0...v2.15.1) (2019-09-23)


### Bug Fixes

* **status:** made status loop more consistently ([db85773](https://bitbucket.org/Loneless/trixiebot/commits/db85773))



<a name="2.15.0"></a>
# [2.15.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.14.2...v2.15.0) (2019-09-23)


### Features

* **status:** loop over server count, website link and status text ([1a5ddff](https://bitbucket.org/Loneless/trixiebot/commits/1a5ddff))
* implemented an error cases manager ([c7b1ecd](https://bitbucket.org/Loneless/trixiebot/commits/c7b1ecd))



<a name="2.14.2"></a>
## [2.14.2](https://bitbucket.org/Loneless/trixiebot/compare/v2.14.1...v2.14.2) (2019-09-18)


### Bug Fixes

* **BaseCommand:** fix default rate limiter message ([f8a825a](https://bitbucket.org/Loneless/trixiebot/commits/f8a825a))
* **help generation:** add missing space after "optional" identifier ([099f4ea](https://bitbucket.org/Loneless/trixiebot/commits/099f4ea))
* **IPC Adapter:** fixed little typo ([6aa1cd0](https://bitbucket.org/Loneless/trixiebot/commits/6aa1cd0))
* **member fetching:** fixed fetching members instead of getting them only from cache ([f31743a](https://bitbucket.org/Loneless/trixiebot/commits/f31743a))
* **README:** fix scrolling of footer license notice on Github ([35ebaf7](https://bitbucket.org/Loneless/trixiebot/commits/35ebaf7))
* **touch cmd:** fixed wrong no-mention message ([683e4d1](https://bitbucket.org/Loneless/trixiebot/commits/683e4d1))
* **waifu cmd:** re-adjust steal and escape chances ([5b93fbe](https://bitbucket.org/Loneless/trixiebot/commits/5b93fbe))


### Features

* **mentions parser:** at last also search through usernames to find a fit ([b72870a](https://bitbucket.org/Loneless/trixiebot/commits/b72870a))



<a name="2.14.1"></a>
## [2.14.1](https://bitbucket.org/Loneless/trixiebot/compare/v2.14.0...v2.14.1) (2019-09-10)


### Bug Fixes

* **ipc adapter:** fixed trixieweb being denied a connected when it reconnects ([1de6ec7](https://bitbucket.org/Loneless/trixiebot/commits/1de6ec7))



<a name="2.14.0"></a>
# [2.14.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.13.3...v2.14.0) (2019-09-10)


### Bug Fixes

* **audio stuff:** stop sending duplicate audio packets as Discord stopped supporting it ([59cc861](https://bitbucket.org/Loneless/trixiebot/commits/59cc861))
* **cc errors:** move error logging of unknown errors from master to worker for better debugging ([a578660](https://bitbucket.org/Loneless/trixiebot/commits/a578660))
* **cc settings:** fixed returned parameters for dashboard ([5d332c0](https://bitbucket.org/Loneless/trixiebot/commits/5d332c0))
* **CustomCommand:** fixed trying to run empty or invalid custom command ([fe5b6ec](https://bitbucket.org/Loneless/trixiebot/commits/fe5b6ec))
* **e621 cmd:** give proper error if parsing the response failed or connected was refused ([72238d8](https://bitbucket.org/Loneless/trixiebot/commits/72238d8))
* **owner cmds:** send message to channel with id if guild with id doesn't exist ([4c17a6c](https://bitbucket.org/Loneless/trixiebot/commits/4c17a6c))


### Features

* **cc runtime:** add .size() to String to get length of String ([05687cd](https://bitbucket.org/Loneless/trixiebot/commits/05687cd))



<a name="2.13.3"></a>
## [2.13.3](https://bitbucket.org/Loneless/trixiebot/compare/v2.13.2...v2.13.3) (2019-08-29)


### Bug Fixes

* **cc member.addRole:** dont throw an error when user already has role ([be2605c](https://bitbucket.org/Loneless/trixiebot/commits/be2605c))



<a name="2.13.2"></a>
## [2.13.2](https://bitbucket.org/Loneless/trixiebot/compare/v2.13.1...v2.13.2) (2019-08-29)


### Bug Fixes

* **poll cmd:** fixed throwing errors because of unescaped option text ([cc6fe60](https://bitbucket.org/Loneless/trixiebot/commits/cc6fe60))


### Features

* **cc runtime:** improve errors and error handling ([615f412](https://bitbucket.org/Loneless/trixiebot/commits/615f412))



<a name="2.13.1"></a>
## [2.13.1](https://bitbucket.org/Loneless/trixiebot/compare/v2.13.0...v2.13.1) (2019-08-28)


### Bug Fixes

* **cc handlers:** message deletion should work now ([05c0623](https://bitbucket.org/Loneless/trixiebot/commits/05c0623))



<a name="2.13.0"></a>
# [2.13.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.12.2...v2.13.0) (2019-08-28)


### Bug Fixes

* some typos ([5184ba2](https://bitbucket.org/Loneless/trixiebot/commits/5184ba2))
* **bj cmd:** no longer secretly double downable ([e581c60](https://bitbucket.org/Loneless/trixiebot/commits/e581c60))
* **db:** switch to new server discovery engine ([43889a5](https://bitbucket.org/Loneless/trixiebot/commits/43889a5))
* **trixie cmd:** fixed !trixie in DMs ([9f7cc70](https://bitbucket.org/Loneless/trixiebot/commits/9f7cc70))


### Features

* **cc:** implement adding and removing roles from users ([217a12f](https://bitbucket.org/Loneless/trixiebot/commits/217a12f))



<a name="2.12.2"></a>
## [2.12.2](https://bitbucket.org/Loneless/trixiebot/compare/v2.12.1...v2.12.2) (2019-08-15)


### Bug Fixes

* **alert:** fix a little bug when deleting an online message ([aa9ad09](https://bitbucket.org/Loneless/trixiebot/commits/aa9ad09))
* **ascii cmd:** fix errors regarding mime type recognition and switched to fetch instead of request module ([77b9f15](https://bitbucket.org/Loneless/trixiebot/commits/77b9f15))
* **blackjack:** don't give double the bet as a win ([8ebdb43](https://bitbucket.org/Loneless/trixiebot/commits/8ebdb43))
* **gif cmd:** fixed gif random command in not nsfw channels ([fcd76e7](https://bitbucket.org/Loneless/trixiebot/commits/fcd76e7))
* **info cmd:** fixed memory usage display ([f30720a](https://bitbucket.org/Loneless/trixiebot/commits/f30720a))
* **penis cmd:** fixed penis creation ([bbccf67](https://bitbucket.org/Loneless/trixiebot/commits/bbccf67))


### Features

* **intl:** add full icu data file to node runtime ([0f85627](https://bitbucket.org/Loneless/trixiebot/commits/0f85627))



<a name="2.12.1"></a>
## [2.12.1](https://bitbucket.org/Loneless/trixiebot/compare/v2.12.0...v2.12.1) (2019-08-10)


### Bug Fixes

* **cc regexp:** fixed my upscrewings ([a8d57ef](https://bitbucket.org/Loneless/trixiebot/commits/a8d57ef))



<a name="2.12.0"></a>
# [2.12.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.11.2...v2.12.0) (2019-08-10)


### Features

* **cc:** add RegExp support!! ([b0d56be](https://bitbucket.org/Loneless/trixiebot/commits/b0d56be))



<a name="2.11.2"></a>
## [2.11.2](https://bitbucket.org/Loneless/trixiebot/compare/v2.11.1...v2.11.2) (2019-08-10)


### Bug Fixes

* **sb list:** replace non-emojis in set and fill up to max amount of samples ([5b3f842](https://bitbucket.org/Loneless/trixiebot/commits/5b3f842))
* **status:** didn't floor random array index ([acb83d4](https://bitbucket.org/Loneless/trixiebot/commits/acb83d4))



<a name="2.11.1"></a>
## [2.11.1](https://bitbucket.org/Loneless/trixiebot/compare/v2.11.0...v2.11.1) (2019-08-07)


### Bug Fixes

* revert to old version of standard-version to fix changelog generation ([87c0ebe](https://bitbucket.org/Loneless/trixiebot/commits/87c0ebe))


### Features

* implement seasonal commands ([9c25b54](https://bitbucket.org/Loneless/trixiebot/commits/9c25b54))
* new way to do special statuses at specific times ([f905e19](https://bitbucket.org/Loneless/trixiebot/commits/f905e19))



<a name="2.11.0"></a>
## [2.11.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.10.0...v2.11.0) (2019-08-06)


### Bug Fixes

* **naughty cmd:** fixed progress bar ([594fada](https://bitbucket.org/Loneless/trixiebot/commit/594fada))


### Features

* add DocumentMapCache#update ([a16884e](https://bitbucket.org/Loneless/trixiebot/commit/a16884e))
* **daily command:** finally calculate daily streaks by individual dates they were collected ([e898761](https://bitbucket.org/Loneless/trixiebot/commit/e898761))
* add github and reportbug commands ([7c6008e](https://bitbucket.org/Loneless/trixiebot/commit/7c6008e))
* gracefully shut down bot on reboot and kill signals ([1baad00](https://bitbucket.org/Loneless/trixiebot/commit/1baad00))



<a name="2.10.0"></a>
## [2.10.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.9.1...v2.10.0) (2019-07-25)


### Features

* **casino:** added blackjack (alias bj) command ([65c9166](https://bitbucket.org/Loneless/trixiebot/commit/65c9166))



<a name="2.9.1"></a>
### [2.9.1](https://bitbucket.org/Loneless/trixiebot/compare/v2.9.0...v2.9.1) (2019-07-24)


### Bug Fixes

* **twitch alerts:** fixed twitch alert api migration problem ([d8d9008](https://bitbucket.org/Loneless/trixiebot/commit/d8d9008))



<a name="2.9.0"></a>
## [2.9.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.8.3...v2.9.0) (2019-07-24)


### Bug Fixes

* message collector, permissionsFor fixes ([d3ec01c](https://bitbucket.org/Loneless/trixiebot/commit/d3ec01c))
* **cc errors:** handle non-runtime errors ([959e69c](https://bitbucket.org/Loneless/trixiebot/commit/959e69c))
* **cc manager:** put custom commands type command first before any keyword commands ([0b127ae](https://bitbucket.org/Loneless/trixiebot/commit/0b127ae))


### Features

* create better keyword registry (need to work on this implementation) ([add14bc](https://bitbucket.org/Loneless/trixiebot/commit/add14bc))
* implement CommandScope ([bae7908](https://bitbucket.org/Loneless/trixiebot/commit/bae7908))
* implemented CommandScope for commands that can be executed in not just guilds ([71c2678](https://bitbucket.org/Loneless/trixiebot/commit/71c2678))
* **cli:** add ascii banner ([c970647](https://bitbucket.org/Loneless/trixiebot/commit/c970647))
* **scoped cmds:** make all commands that don't need guilds available in dm ([559f5d3](https://bitbucket.org/Loneless/trixiebot/commit/559f5d3))



<a name="2.8.3"></a>
## [2.8.3](https://bitbucket.org/Loneless/trixiebot/compare/v2.8.2...v2.8.3) (2019-07-13)


### Bug Fixes

* **alert:** don't log unreachable api errors. They just clutter the logs with garbage ([6b87076](https://bitbucket.org/Loneless/trixiebot/commits/6b87076))
* hopefully fixed problems with missing Message#member on messages sent in guild ([b0b8202](https://bitbucket.org/Loneless/trixiebot/commits/b0b8202))
* **Audio Manager:** destroy voice connection when disconnected from a vc by an admin. ([e915cdb](https://bitbucket.org/Loneless/trixiebot/commits/e915cdb))
* **blep command:** show blep gif ([12ebc79](https://bitbucket.org/Loneless/trixiebot/commits/12ebc79))
* **owner commands:** fix exec errors on too long stdout and allowed top level await in eval ([dd7b13f](https://bitbucket.org/Loneless/trixiebot/commits/dd7b13f))
* **owner commands:** fixed Trixie crashing when looking up a file ([974a9bd](https://bitbucket.org/Loneless/trixiebot/commits/974a9bd))
* **poll command:** handle NaN and 0 votes errors ([8bd9bf7](https://bitbucket.org/Loneless/trixiebot/commits/8bd9bf7))
* **role command:** Collection#find deprecation waning ([4f76730](https://bitbucket.org/Loneless/trixiebot/commits/4f76730))


### Features

* better error context in logs (only for developer) ([c5bf4ef](https://bitbucket.org/Loneless/trixiebot/commits/c5bf4ef))
* improved logging ([08def3e](https://bitbucket.org/Loneless/trixiebot/commits/08def3e))



<a name="2.8.2"></a>
## [2.8.2](https://bitbucket.org/Loneless/trixiebot/compare/v2.8.1...v2.8.2) (2019-07-08)


### Bug Fixes

* fixed the message nonce error thing i guess maybe?? ([514129a](https://bitbucket.org/Loneless/trixiebot/commits/514129a))



<a name="2.8.1"></a>
## [2.8.1](https://bitbucket.org/Loneless/trixiebot/compare/v2.8.0...v2.8.1) (2019-07-05)


### Bug Fixes

* **alert command:** Piczel endless errors when no stream is online on the site ([1a4f00d](https://bitbucket.org/Loneless/trixiebot/commits/1a4f00d))
* **audio manager:** disconnecting even tho already disconnected ([e972b3c](https://bitbucket.org/Loneless/trixiebot/commits/e972b3c))



<a name="2.8.0"></a>
# [2.8.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.7.3...v2.8.0) (2019-06-30)


### Features

* **alert command:** better nsfw warn image ([6f9c0bd](https://bitbucket.org/Loneless/trixiebot/commits/6f9c0bd))



<a name="2.7.3"></a>
## [2.7.3](https://bitbucket.org/Loneless/trixiebot/compare/v2.7.2...v2.7.3) (2019-06-28)


### Bug Fixes

* **alert command:** im a dumb dumb ([906efc9](https://bitbucket.org/Loneless/trixiebot/commits/906efc9))



<a name="2.7.2"></a>
## [2.7.2](https://bitbucket.org/Loneless/trixiebot/compare/v2.7.1...v2.7.2) (2019-06-27)


### Bug Fixes

* **debug command:** Divided internal latency by wrong factor ([b63814d](https://bitbucket.org/Loneless/trixiebot/commits/b63814d))


### Features

* **alert:** visual indication of differences between streaming services ([3ddb08c](https://bitbucket.org/Loneless/trixiebot/commits/3ddb08c))



<a name="2.7.1"></a>
## [2.7.1](https://bitbucket.org/Loneless/trixiebot/compare/v2.7.0...v2.7.1) (2019-06-26)


### Bug Fixes

* **ascii command:** fixed typo, now returning help ([caa1398](https://bitbucket.org/Loneless/trixiebot/commits/caa1398))
* **cc runtime:** fixed RichEmbed timestamp ([af26663](https://bitbucket.org/Loneless/trixiebot/commits/af26663))


### Features

* **ping command:** Add internal latency ([3a156dd](https://bitbucket.org/Loneless/trixiebot/commits/3a156dd))
* new deleted messages catching ([70836c0](https://bitbucket.org/Loneless/trixiebot/commits/70836c0))



<a name="2.7.0"></a>
# [2.7.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.6.0...v2.7.0) (2019-06-24)


### Bug Fixes

* potential bug in AliasCommand, that would probably have never happened tho ([6d22531](https://bitbucket.org/Loneless/trixiebot/commits/6d22531))
* **cc:** fixed $args ([c3e0fef](https://bitbucket.org/Loneless/trixiebot/commits/c3e0fef))


### Features

* **Command System:** added Overloaded Commands ([5342c36](https://bitbucket.org/Loneless/trixiebot/commits/5342c36))
* **Command System:** Improved Plug&Play-ability of commands ([4a34db9](https://bitbucket.org/Loneless/trixiebot/commits/4a34db9))
* added overloaded commands everywhere needed, ([31c9da8](https://bitbucket.org/Loneless/trixiebot/commits/31c9da8))
* added ROADMAP.md ([47dd02d](https://bitbucket.org/Loneless/trixiebot/commits/47dd02d))
* **help command:** deep search help (e.g. !help alert remove) ([e93e1ca](https://bitbucket.org/Loneless/trixiebot/commits/e93e1ca))
* **help command:** show custom commands ([db7f284](https://bitbucket.org/Loneless/trixiebot/commits/db7f284))



<a name="2.6.0"></a>
# [2.6.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.5.1...v2.6.0) (2019-06-20)


### Bug Fixes

* adjusted statistics update interval to prevent ratelimit errors ([86474ab](https://bitbucket.org/Loneless/trixiebot/commits/86474ab))
* allow owner accessing config and db in owner commands ([4d6dd88](https://bitbucket.org/Loneless/trixiebot/commits/4d6dd88))
* finding default channel when vc channel is called "general" bug ([f89362e](https://bitbucket.org/Loneless/trixiebot/commits/f89362e))
* fixed some more small issues ([a6be3af](https://bitbucket.org/Loneless/trixiebot/commits/a6be3af))
* leave vc if only bots are left in the chat ([89cfbbe](https://bitbucket.org/Loneless/trixiebot/commits/89cfbbe))


### Features

* **alert command:** Re-imagined the autoban command. Now actually usable for all cases. Yay! ([b501883](https://bitbucket.org/Loneless/trixiebot/commits/b501883))
* add Paginator to penis command ([90e22a0](https://bitbucket.org/Loneless/trixiebot/commits/90e22a0))
* **alert command:** show alert list when passing alert command no arguments (ux flow) ([e8da17b](https://bitbucket.org/Loneless/trixiebot/commits/e8da17b))



<a name="2.5.1"></a>
## [2.5.1](https://bitbucket.org/Loneless/trixiebot/compare/v2.5.0...v2.5.1) (2019-06-17)


### Bug Fixes

* **sb:** partially fix opus encode/decode errors caused by ffmpeg in soundboard ([8bf3274](https://bitbucket.org/Loneless/trixiebot/commits/8bf3274))
* **chat command:** fixed infinite typing ([3ec4085](https://bitbucket.org/Loneless/trixiebot/commits/3ec4085))


### Features

* cleaner config files ([55f0eae](https://bitbucket.org/Loneless/trixiebot/commits/55f0eae))



<a name="2.5.0"></a>
# [2.5.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.4.10...v2.5.0) (2019-06-12)


### Bug Fixes

* **cc interpreter:** fixed Infinity ([d2729f1](https://bitbucket.org/Loneless/trixiebot/commits/d2729f1))


### Features

* **server stats:** redone the whole server stats stuff ([06600d8](https://bitbucket.org/Loneless/trixiebot/commits/06600d8))
* added userstats command ([b36c81d](https://bitbucket.org/Loneless/trixiebot/commits/b36c81d))



<a name="2.4.10"></a>
## [2.4.10](https://bitbucket.org/Loneless/trixiebot/compare/v2.4.9...v2.4.10) (2019-05-28)


### Bug Fixes

* **cache:** circular code typo fixed ([89633c6](https://bitbucket.org/Loneless/trixiebot/commits/89633c6))
* **changelog command:** fixing the bullet point lists and added a link to the full changelog ([2f8fa72](https://bitbucket.org/Loneless/trixiebot/commits/2f8fa72))
* **db caching:** now actually caching documents after going into the db ([cf2a897](https://bitbucket.org/Loneless/trixiebot/commits/cf2a897))


### Features

* **caching:** add internal doc ttl ([50fa2b8](https://bitbucket.org/Loneless/trixiebot/commits/50fa2b8))
* tried to cache more. Failed, but hey. Reduced db queries before command execution from 5 to 4 ([4d5aa87](https://bitbucket.org/Loneless/trixiebot/commits/4d5aa87))



<a name="2.4.9"></a>
## [2.4.9](https://bitbucket.org/Loneless/trixiebot/compare/v2.4.8...v2.4.9) (2019-05-28)


### Bug Fixes

* **message mentions:** fixed some critical bugs with empty strings matching to some user in the server ([4396cc5](https://bitbucket.org/Loneless/trixiebot/commits/4396cc5))
* divine discord bots stats update fixed ([db0aa65](https://bitbucket.org/Loneless/trixiebot/commits/db0aa65))



<a name="2.4.8"></a>
## [2.4.8](https://bitbucket.org/Loneless/trixiebot/compare/v2.4.7...v2.4.8) (2019-05-28)


### Bug Fixes

* **vc manager:** trixie leaves the voice call automatically again after everyone has left. ([b5c09f5](https://bitbucket.org/Loneless/trixiebot/commits/b5c09f5))



<a name="2.4.7"></a>
## [2.4.7](https://bitbucket.org/Loneless/trixiebot/compare/v2.4.6...v2.4.7) (2019-05-25)


### Bug Fixes

* **dailies:** im stupid ([a12cd2f](https://bitbucket.org/Loneless/trixiebot/commits/a12cd2f))



<a name="2.4.6"></a>
## [2.4.6](https://bitbucket.org/Loneless/trixiebot/compare/v2.4.5...v2.4.6) (2019-05-25)


### Features

* **dailies:** update the streak method so it actually works more like a streak ([c95c42c](https://bitbucket.org/Loneless/trixiebot/commits/c95c42c))



<a name="2.4.5"></a>
## [2.4.5](https://bitbucket.org/Loneless/trixiebot/compare/v2.4.4...v2.4.5) (2019-05-22)


### Bug Fixes

* **alert:** throw less unrelevant errors in logs ([1216ad0](https://bitbucket.org/Loneless/trixiebot/commits/1216ad0))
* **cc:** add future reserved keywords ([b4710e3](https://bitbucket.org/Loneless/trixiebot/commits/b4710e3))


### Features

* 100% more Trixie Lulamoon quotes in the status!!!!!!1 ([c2773d6](https://bitbucket.org/Loneless/trixiebot/commits/c2773d6))
* updated content in !trixie command ([4b8adb1](https://bitbucket.org/Loneless/trixiebot/commits/4b8adb1))



<a name="2.4.4"></a>
## [2.4.4](https://bitbucket.org/Loneless/trixiebot/compare/v2.4.3...v2.4.4) (2019-05-14)


### Bug Fixes

* **cc grammar:** fixed grammar issues with exponential expressions ([e143297](https://bitbucket.org/Loneless/trixiebot/commits/e143297))


### Features

* **cc runtime:** parseNumber supports radix now ([a491fc6](https://bitbucket.org/Loneless/trixiebot/commits/a491fc6))



<a name="2.4.3"></a>
## [2.4.3](https://bitbucket.org/Loneless/trixiebot/compare/v2.4.2...v2.4.3) (2019-05-13)


### Bug Fixes

* **cc interpreter:** seriously the developer is just a big dumbo ([4648982](https://bitbucket.org/Loneless/trixiebot/commits/4648982))



<a name="2.4.2"></a>
## [2.4.2](https://bitbucket.org/Loneless/trixiebot/compare/v2.4.1...v2.4.2) (2019-05-13)


### Bug Fixes

* **cc communication:** fixed some problems that could lead to unexpected errors ([188564e](https://bitbucket.org/Loneless/trixiebot/commits/188564e))
* **cc grammar:** fixed some crutial grammar problems in TrixieScript parser regarding chained multiply and additive operations ([606eae4](https://bitbucket.org/Loneless/trixiebot/commits/606eae4))



<a name="2.4.1"></a>
## [2.4.1](https://bitbucket.org/Loneless/trixiebot/compare/v2.4.0...v2.4.1) (2019-05-12)


### Bug Fixes

* **cc database:** curtial bug regarding saving custom commands fixed ([8156879](https://bitbucket.org/Loneless/trixiebot/commits/8156879))
* **cc interpreter:** fixed a little buggy bug ([d46d778](https://bitbucket.org/Loneless/trixiebot/commits/d46d778))



<a name="2.4.0"></a>
# [2.4.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.3.2...v2.4.0) (2019-05-12)


### Bug Fixes

* **naughty command:** remove image upon artist' request ([275e923](https://bitbucket.org/Loneless/trixiebot/commits/275e923))


### Features

* Custom Commands have been added. Get more information about this feature at https://docs.trixie.loneless.art ([293669d](https://bitbucket.org/Loneless/trixiebot/commits/293669d))



<a name="2.3.2"></a>
## [2.3.2](https://bitbucket.org/Loneless/trixiebot/compare/v2.3.1...v2.3.2) (2019-05-04)


### Bug Fixes

* **alert command:** some typos ([39f06f8](https://bitbucket.org/Loneless/trixiebot/commits/39f06f8))



<a name="2.3.1"></a>
## [2.3.1](https://bitbucket.org/Loneless/trixiebot/compare/v2.3.0...v2.3.1) (2019-04-21)


### Bug Fixes

* **alert:** some twitch channels not working with names longer than 15 characters ([33256b4](https://bitbucket.org/Loneless/trixiebot/commits/33256b4))



<a name="2.3.0"></a>
# [2.3.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.2.0...v2.3.0) (2019-04-16)


### Bug Fixes

* **alert help:** fixed supported website list ([8c8895d](https://bitbucket.org/Loneless/trixiebot/commits/8c8895d))
* DocumentCache expireAfterSeconds math fixed ([3286b6b](https://bitbucket.org/Loneless/trixiebot/commits/3286b6b))


### Features

* **alert command:** added Piczel.tv support ([3b4e5d1](https://bitbucket.org/Loneless/trixiebot/commits/3b4e5d1))
* **alert command:** added Smashcast support ([085495f](https://bitbucket.org/Loneless/trixiebot/commits/085495f))



<a name="2.2.0"></a>
# [2.2.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.1.1...v2.2.0) (2019-04-15)


### Bug Fixes

* **prefix command:** now works like a charm again ([9408b38](https://bitbucket.org/Loneless/trixiebot/commits/9408b38))


### Features

* **alert:** !alert compact and !alert cleanup commands added ([6e9ee6b](https://bitbucket.org/Loneless/trixiebot/commits/6e9ee6b))
* **alert:** added Twitch support ([9d32fb4](https://bitbucket.org/Loneless/trixiebot/commits/9d32fb4))
* **alert:** New alert system behind the scenes. ([f599e7b](https://bitbucket.org/Loneless/trixiebot/commits/f599e7b))



<a name="2.1.1"></a>
## [2.1.1](https://bitbucket.org/Loneless/trixiebot/compare/v2.0.4...v2.1.1) (2019-03-03)


### Bug Fixes

* **audio manager:** updated voice channel reference, when trixie is moved from vc to vc ([8e35089](https://bitbucket.org/Loneless/trixiebot/commits/8e35089))
* fixed other people having a say wether you can buy or cancel a soundboard or waifu slot purchase ([6c87511](https://bitbucket.org/Loneless/trixiebot/commits/6c87511))
* new mentions in text and image action commands not working ([6968800](https://bitbucket.org/Loneless/trixiebot/commits/6968800))
* some code typos ([5d44930](https://bitbucket.org/Loneless/trixiebot/commits/5d44930))
* tried to fix some id of null errors. Let's see with how much success ([741f157](https://bitbucket.org/Loneless/trixiebot/commits/741f157))



<a name="2.1.0"></a>
# [2.1.0](https://bitbucket.org/Loneless/trixiebot/compare/v2.0.4...v2.1.0) (2019-03-03)


### Bug Fixes

* **audio manager:** updated voice channel reference, when trixie is moved from vc to vc ([8e35089](https://bitbucket.org/Loneless/trixiebot/commits/8e35089))
* fixed other people having a say wether you can buy or cancel a soundboard or waifu slot purchase ([6c87511](https://bitbucket.org/Loneless/trixiebot/commits/6c87511))
* some code typos ([5d44930](https://bitbucket.org/Loneless/trixiebot/commits/5d44930))
* tried to fix some id of null errors. Let's see with how much success ([741f157](https://bitbucket.org/Loneless/trixiebot/commits/741f157))


### Features

* new custom mentions approach



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
