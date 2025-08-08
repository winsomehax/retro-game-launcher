# AGENTS.md

**** Overview ****
This file provides an overview of the project for AI agents to quickly understand the codebase and make changes efficiently.

IMPORTANT RULES

**** DO AS THE USER REQUESTS: You are not in a position to know the full details of how the user needs to work. If the user is asking for something that you consider a security hole... warn them, but if they insist on you doing and state that they are aware of the RISKS then DO IT. It is their project not yours. State this up front.

**** RUNNING THE APP
If you want to run the app, ensure you use the "timeout" command with a reasonable amount of seconds. For example:

timeout ./app 

Will run the command ./app and after 10s kill it. This is to stop you from getting trapped into a block waiting for an app to start.

**** MAKE USE OF EXISTING CODE
There are a great many free components in tw-elements - especially ones that follow standard practices to make easy and attractive apps from chunks of existing functionality. Entirely custom building/styling of UI components must be a last resort. Example: using tw-elements rather than your own custom code.

**** BE TERSE ****
I don't want to be fluffed or complimented. Just make the points that need to be made quickly and tersely.


## Project Overview

This project is a desktop-only retro game launcher, running on Electron. It allows users to browse and launch retro games, manage their game library, and configure emulators. The application is built with a pure HTML/CSS/JS frontend. The intent is to make it easy for the user to import large numbers of games and enrich their metadata by using online sources of information. 

## Retro Databases and AI Agents
ScreenScraper.fr provides structured information, but also allow the use of AIs such as Gemini or Github Models if specific information is not available in ScreenScraper.fr. For example:

* A user has a folder of roms, but the precise name may not be available to search in ScreenScraper.fr. 
* An AI may be able to enrich those rom names with the real name of the game, which can then be looked up in ScreenScraper.fr

The aim is is to allow the user to quickly import large numbers of ROMs, enrich their metadata and then manage the library going forward.

## Scanning Rom Folder
The intent is to ensure the user can import large collections of ROMs quickly. The system has the ability to call the Electron's File System API allowing the user to select a folder to scan. The application then uses nodejs calls to scan the folder ignoring folders and files:

txt
doc
jpg, gif, png
mkv, avi, mp4 etc
doc
ttf

Presenting the user with a list of possible ROMS. The user can then choose to pass these ROMS names to an AI to see if it can enrich it with the full name of the game, and then use ScreenScraper.fr to enrich it with full metadate and finally import  them.



### Online database queries

#### ScreenScraper.fr
##### Media associated with all platforms
https://api.screenscraper.fr/api2/mediasSystemeListe.php?devid=$SCREENSCRAPER_DEVID&devpassword=$SCREENSCRAPER_DEV_PASSWORD&output=json

##### Media associated with a game
https://api.screenscraper.fr/api2/mediasJeuListe.php?devid=$SCREENSCRAPER_DEVID&devpassword=$SCREENSCRAPER_DEV_PASSWORD&output=json&id=1

##### Information on a game 
https://api.screenscraper.fr/api2/jeuInfos.php?systemeid=1&media=video&devid=$SCREENSCRAPER_DEVID&devpassword=$SCREENSCRAPER_DEV_PASSWORD&output=json

##### Genre list in screenscraper
https://api.screenscraper.fr/api2/genresListe.php?devid=$SCREENSCRAPER_DEVID&devpassword=$SCREENSCRAPER_DEV_PASSWORD&output=json

#### TheGamesDB

##### Search game by name
Search TheGamesDB for a game by name

https://api.thegamesdb.net/v1.1/Games/ByGameName?apikey=THEGAMESDB_API_KEY&name=zelda&fields=players%2Cpublishers%2Cgenres%2Coverview%2Clast_updated%2Crating%2Cplatform%2Ccoop%2Cyoutube%2Cos%2Cprocessor%2Cram%2Chdd%2Cvideo%2Csound%2Calternates&include=boxart%2Cplatform

##### Get all platforms recorded in TheGamesDB
https://api.thegamesdb.net/v1/Platforms?apikey=[api key]&fields=icon%2Cconsole%2Ccontroller%2Cdeveloper%2Cmanufacturer%2Cmedia%2Ccpu%2Cmemory%2Cgraphics%2Csound%2Cmaxcontrollers%2Cdisplay%2Coverview%2Cyoutube

##### Get platform images by ID
https://api.thegamesdb.net/v1/Platforms/Images?apikey=[api key]&platforms_id=6&filter%5Btype%5D=fanart%2Cbanner%2Cboxart


##### Get all the genres recorded in TheGamesDB
https://api.thegamesdb.net/v1/Genres?apikey=apikey

#### Gemini

"what retro game is represented by the rom filename: uridium-c64disk.zip

Ask Gemini a question. Example: What game is represented by this ROM file {romname} on platform {platform}. Return your information as JSON only."

A query of this type to gemini could look like this in curl.

curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=GEMINI_API_KEY" \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Explain how AI works in a few words"
          }
        ]
      }
    ]
  }'

###

## Tech Stack

- Electron
- Dotenv

## Project Structure
