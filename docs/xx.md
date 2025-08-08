# ScreenScraper Classifications List API Documentation

This document describes the `classificationListe.php` API endpoint for retrieving the list of game rating classifications available on ScreenScraper.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `classificationListe.php` | `classificationsList` | Retrieves a list of game rating classifications on ScreenScraper, including their numeric IDs, short names, names in multiple languages, parent classification relationships, and associated media URLs. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `items`: Information type to retrieve (set to `classifications`)<br><br>**Returned Elements:**<br>- `langue` (xml) / `id` (json):<br>  - `id`: Numeric ID of the classification<br>  - `nomcourt`: Short name of the classification<br>  - `nom_de`: Name of the classification in German (if available)<br>  - `nom_en`: Name of the classification in English (if available)<br>  - `nom_es`: Name of the classification in Spanish (if available)<br>  - `nom_fr`: Name of the classification in French (if available)<br>  - `nom_it`: Name of the classification in Italian (if available)<br>  - `nom_pt`: Name of the classification in Portuguese (if available)<br>  - `parent`: ID of the parent classification (0 if main classification)<br>  - `medias`:<br>    - `media_pictomonochrome`: Download URL for the monochrome pictogram media<br>    - `media_pictocouleur`: Download URL for the color pictogram media<br>    - `media_background`: Download URL for the background media |

## Example Call
```
https://api.screenscraper.fr/api2/classificationListe.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=test&sspassword=test
```

# ScreenScraper Genres List API Documentation

This document describes the `genresListe.php` API endpoint for retrieving the list of game genres available on ScreenScraper.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `genresListe.php` | `genresList` | Retrieves a list of game genres on ScreenScraper, including their numeric IDs, names in multiple languages, parent genre relationships, and associated media URLs. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `items`: Information type to retrieve (set to `genres`)<br><br>**Returned Elements:**<br>- `genre` (xml) / `id` (json):<br>  - `id`: Numeric ID of the genre<br>  - `nom_de`: Name of the genre in German<br>  - `nom_en`: Name of the genre in English<br>  - `nom_es`: Name of the genre in Spanish<br>  - `nom_fr`: Name of the genre in French<br>  - `nom_it`: Name of the genre in Italian<br>  - `nom_pt`: Name of the genre in Portuguese<br>  - `parent`: ID of the parent genre (0 if main genre)<br>  - `medias`:<br>    - `media_pictomonochrome`: Download URL for the monochrome pictogram media<br>    - `media_pictocouleur`: Download URL for the color pictogram media<br>    - `media_background`: Download URL for the background media |

## Example Call
```
https://api.screenscraper.fr/api2/genresListe.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=test&sspassword=test
```

# ScreenScraper Game Information List API Documentation

This document describes the `infosJeuListe.php` API endpoint for retrieving the list of information types available for games on ScreenScraper.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `infosJeuListe.php` | `gameInfoList` | Retrieves a list of information types for games on ScreenScraper, including their numeric IDs, names, categories, applicable system types or systems, and additional properties. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `items`: Information type to retrieve (set to `infos`)<br><br>**Returned Elements:**<br>- `info` (xml) / `id` (json):<br>  - `id`: Numeric ID of the information type<br>  - `nomcourt`: Short name of the information type<br>  - `nom`: Long name of the information type<br>  - `categorie`: Category of the information type<br>  - `plateformtypes`: List of system types where the information is available (IDs separated by `|`, empty if applicable to all system types)<br>  - `plateforms`: List of systems where the information is available (IDs separated by `|`, empty if applicable to all systems)<br>  - `type`: Type of information<br>  - `autogen`: Indicates if the information is auto-generated (0 = no, 1 = yes)<br>  - `multiregions`: Indicates if the information supports multiple regions (0 = no, 1 = yes)<br>  - `multisupports`: Indicates if the information supports multiple media types (0 = no, 1 = yes)<br>  - `multiversions`: Indicates if the information supports multiple versions (0 = no, 1 = yes)<br>  - `multichoix`: Indicates if the information supports multiple choices (0 = no, 1 = yes) |

## Example Call
```
https://api.screenscraper.fr/api2/infosJeuListe.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=test&sspassword=test
```

# ScreenScraper ROM Information List API Documentation

This document describes the `infosRomListe.php` API endpoint for retrieving the list of information types available for ROMs on ScreenScraper.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `infosRomListe.php` | `romInfoList` | Retrieves a list of information types for ROMs on ScreenScraper, including their numeric IDs, names, categories, applicable system types or systems, and additional properties. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `items`: Information type to retrieve (set to `infos`)<br><br>**Returned Elements:**<br>- `info` (xml) / `id` (json):<br>  - `id`: Numeric ID of the information type<br>  - `nomcourt`: Short name of the information type<br>  - `nom`: Long name of the information type<br>  - `categorie`: Category of the information type<br>  - `plateformtypes`: List of system types where the information is available (IDs separated by `|`, empty if applicable to all system types)<br>  - `plateforms`: List of systems where the information is available (IDs separated by `|`, empty if applicable to all systems)<br>  - `type`: Type of information<br>  - `autogen`: Indicates if the information is auto-generated (0 = no, 1 = yes)<br>  - `multiregions`: Indicates if the information supports multiple regions (0 = no, 1 = yes)<br>  - `multisupports`: Indicates if the information supports multiple media types (0 = no, 1 = yes)<br>  - `multiversions`: Indicates if the information supports multiple versions (0 = no, 1 = yes)<br>  - `multichoix`: Indicates if the information supports multiple choices (0 = no, 1 = yes) |

## Example Call
```
https://api.screenscraper.fr/api2/infosRomListe.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=test&sspassword=test
```

# ScreenScraper Languages List API Documentation

This document describes the `languesListe.php` API endpoint for retrieving the list of languages available on ScreenScraper.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `languesListe.php` | `languagesList` | Retrieves a list of languages on ScreenScraper, including their numeric IDs, short names, names in multiple languages, parent language relationships, and associated media URLs. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `items`: Information type to retrieve (set to `langues`)<br><br>**Returned Elements:**<br>- `langue` (xml) / `id` (json):<br>  - `id`: Numeric ID of the language<br>  - `nomcourt`: Short name of the language<br>  - `nom_de`: Name of the language in German<br>  - `nom_en`: Name of the language in English<br>  - `nom_es`: Name of the language in Spanish<br>  - `nom_fr`: Name of the language in French<br>  - `nom_it`: Name of the language in Italian<br>  - `nom_pt`: Name of the language in Portuguese<br>  - `parent`: ID of the parent language (0 if main language)<br>  - `medias`:<br>    - `media_pictomonochrome`: Download URL for the monochrome pictogram media<br>    - `media_pictocouleur`: Download URL for the color pictogram media<br>    - `media_background`: Download URL for the background media |

## Example Call
```
https://api.screenscraper.fr/api2/languesListe.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=test&sspassword=test
```

# ScreenScraper Company Media API Documentation

This document describes the `mediaCompagnie.php` API endpoint for downloading media images associated with game companies.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `mediaCompagnie.php` | `companyMedia` | Downloads media images for game companies based on provided identifiers and optional checksums for update optimization. Returns a PNG image, a checksum match confirmation (`CRCOK`, `MD5OK`, or `SHA1OK`), or `NOMEDIA` if the media is not found. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `crc` (optional): CRC checksum of the local image<br>- `md5` (optional): MD5 checksum of the local image<br>- `sha1` (optional): SHA1 checksum of the local image<br>- `companyid`: Numeric ID of the company (required)<br>- `media`: Text ID of the media to retrieve (required)<br>- `mediaformat` (optional): Media format (e.g., jpg, png, mp4, zip, mp3; informational, does not affect returned format)<br><br>**Output Parameters:**<br>- `maxwidth` (optional): Maximum width in pixels of the returned image<br>- `maxheight` (optional): Maximum height in pixels of the returned image<br>- `outputformat` (optional): Format of the returned image (png or jpg)<br><br>**Returns:**<br>- PNG image<br>- Text: `CRCOK`, `MD5OK`, or `SHA1OK` if the provided `crc`, `md5`, or `sha1` matches the server's checksum<br>- Text: `NOMEDIA` if the media file is not found |

## Example Call
```
https://api.screenscraper.fr/api2/mediaCompagnie.php?devid=xxx&devpassword=yyy&softname=zzz&ssid=test&sspassword=test&crc=&md5=&sha1=&companyid=3&media=logo-monochrome
```

# Media Group API Documentation

This document describes the `mediaGroup.php` API endpoint for downloading media images related to game groups.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `mediaGroup.php` | `mediaGroup` | Downloads media images for game groups based on provided identifiers and optional checksums for update optimization. Returns a PNG image, a checksum match confirmation (`CRCOK`, `MD5OK`, or `SHA1OK`), or `NOMEDIA` if the media is not found. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `crc` (optional): CRC checksum of the local image<br>- `md5` (optional): MD5 checksum of the local image<br>- `sha1` (optional): SHA1 checksum of the local image<br>- `groupid`: Numeric ID of the group (e.g., from `genreListe.php`, `modeListe.php`; group types: genre, mode, famille, theme, style) (required)<br>- `media`: Text ID of the media to retrieve (e.g., from `genreListe.php`, `modeListe.php`; group types: genre, mode, famille, theme, style) (required)<br>- `mediaformat` (optional): Media format (e.g., jpg, png, mp4, zip, mp3; informational, does not affect returned format)<br><br>**Output Parameters:**<br>- `maxwidth` (optional): Maximum width in pixels of the returned image<br>- `maxheight` (optional): Maximum height in pixels of the returned image<br>- `outputformat` (optional): Format of the returned image (png or jpg)<br><br>**Returns:**<br>- PNG image<br>- Text: `CRCOK`, `MD5OK`, or `SHA1OK` if the provided `crc`, `md5`, or `sha1` matches the server's checksum<br>- Text: `NOMEDIA` if the media file is not found |

## Example Call
```
https://api.screenscraper.fr/api2/mediaGroup.php?devid=xxx&devpassword=yyy&softname=zzz&ssid=test&sspassword=test&crc=&md5=&sha1=&groupid=1&media=logo-monochrome
```

# ScreenScraper Game Media List API Documentation

This document describes the `mediasJeuListe.php` API endpoint for retrieving the list of media types available for games on ScreenScraper.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `mediasJeuListe.php` | `gameMediaList` | Retrieves a list of media types for games on ScreenScraper, including their numeric IDs, names, categories, applicable system types or systems, and additional properties. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `items`: Information type to retrieve (set to `medias`)<br><br>**Returned Elements:**<br>- `media` (xml) / `id` (json):<br>  - `id`: Numeric ID of the media<br>  - `nomcourt`: Short name of the media<br>  - `nom`: Long name of the media<br>  - `categorie`: Category of the media<br>  - `plateformtypes`: List of system types where the media is available (IDs separated by `|`, empty if applicable to all system types)<br>  - `plateforms`: List of systems where the media is available (IDs separated by `|`, empty if applicable to all systems)<br>  - `type`: Type of media<br>  - `fileformat`: File format of the media<br>  - `fileformat2`: Secondary file format accepted for media proposals<br>  - `autogen`: Indicates if the media is auto-generated (0 = no, 1 = yes)<br>  - `multiregions`: Indicates if the media supports multiple regions (0 = no, 1 = yes)<br>  - `multisupports`: Indicates if the media supports multiple media types (0 = no, 1 = yes)<br>  - `multiversions`: Indicates if the media supports multiple versions (0 = no, 1 = yes)<br>  - `extrain# ScreenScraper System Media List API Documentation

This document describes the `mediasSystemeListe.php` API endpoint for retrieving the list of media types available for systems on ScreenScraper.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `mediasSystemeListe.php` | `systemMediaList` | Retrieves a list of media types for systems on ScreenScraper, including their numeric IDs, names, categories, applicable system types or systems, and additional properties. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `items`: Information type to retrieve (set to `medias`)<br><br>**Returned Elements:**<br>- `media` (xml) / `id` (json):<br>  - `id`: Numeric ID of the media<br>  - `nomcourt`: Short name of the media<br>  - `nom`: Long name of the media<br>  - `categorie`: Category of the media<br>  - `plateformtypes`: List of system types where the media is available (IDs separated by `|`, empty if applicable to all system types)<br>  - `plateforms`: List of systems where the media is available (IDs separated by `|`, empty if applicable to all systems)<br>  - `type`: Type of media<br>  - `fileformat`: File format of the media<br>  - `fileformat2`: Secondary file format accepted for media proposals<br>  - `autogen`: Indicates if the media is auto# ScreenScraper Number of Players List API Documentation

This document describes the `nbJoueursListe.php` API endpoint for retrieving the list of player count designations available on ScreenScraper.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `nbJoueursListe.php` | `playerCountList` | Retrieves a list of player count designations on ScreenScraper, including their numeric IDs, names, and parent relationships. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `items`: Information type to retrieve (set to `nbjoueur`)<br><br>**Returned Elements:**<br>- `id`: Numeric ID of the player count<br>- `nom`: Designation of the player count<br>- `parent`: Numeric ID of the parent player count (0 if no parent) |

## Example Call
```
https://api.screenscraper.fr/api2/nbJoueursListe.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=test&sspassword=test
```

# ScreenScraper Regions List API Documentation

This document describes the `regionsListe.php` API endpoint for retrieving the list of regions available on ScreenScraper.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `regionsListe.php` | `regionsList` | Retrieves a list of regions on ScreenScraper, including their numeric IDs, short names, names in multiple languages, parent region relationships, and associated media URLs. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `items`: Information type to retrieve (set to `regions`)<br><br>**Returned Elements:**<br>- `region` (xml) / `id` (json):<br>  - `id`: Numeric ID of the region<br>  - `nomcourt`: Short name of the region<br>  - `nom_de`: Name of the region in German<br>  - `nom_en`: Name of the region in English<br>  - `nom_es`: Name of the region in Spanish<br>  - `nom_fr`: Name of the region in French<br>  - `nom_it`: Name of the region in Italian<br>  - `nom_pt`: Name of the region in Portuguese<br>  - `parent`: ID of the parent region (0 if main region)<br>  - `medias`:<br>    - `media_pictomonochrome`: Download URL for the monochrome pictogram media<br>    - `media_pictocouleur`: Download URL for the color pictogram media<br>    - `media_background`: Download URL for the background media |

## Example Call
```
https://api.screenscraper.fr/api2/regionsListe.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=test&sspassword=test
```

# ScreenScraper ROM Types List API Documentation

This document describes the `romTypesListe.php` API endpoint for retrieving the list of ROM types available on ScreenScraper.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `romTypesListe.php` | `romTypesList` | Retrieves a list of ROM types (e.g., game, demo, beta) on ScreenScraper. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `items`: Information type to retrieve (set to `romtypes`)<br><br>**Returned Elements:**<br>- `nom`: Designation of the ROM type(s) |

## Example Call
```
https://api.screenscraper.fr/api2/romTypesListe.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=test&sspassword=test
```

# ScreenScraper API Documentation

This document describes multiple API endpoints for retrieving system information, media, game search results, game details, and submitting user contributions on ScreenScraper.

## systemesListe.php

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `systemesListe.php` | `systemsList` | Retrieves a list of systems, their details, and associated media on ScreenScraper. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `item`: Information type to retrieve (set to `systeme` for XML, `systemes` for JSON)<br><br>**Returned Elements:**<br>- `id`: Numeric ID of the system<br>- `parentid`: Numeric ID of the parent system<br>- `noms`:<br>  - `nom_xx`: System name for region `xx` (from `regionsListe.php`)<br>  - `nom_recalbox`: System name in Recalbox<br>  - `nom_retropie`: System name in RetroPie<br>  - `nom_launchbox`: System name in Launchbox<br>  - `nom_hyperspin`: System name in Hyperspin<br>  - `noms_commun`: Common system name<br>- `extensions`: File extensions for ROMs (all emulators)<br>- `compagnie`: System manufacturer's name<br>- `type`: System type (Arcade, Console, Console Portable, Emulation Arcade, Flipper, Online, Ordinateur, Smartphone)<br>- `datedebut`: Production start year<br>- `datefin`: Production end year<br>- `romtype`: ROM type(s) (see `romTypesListe.php`)<br>- `supporttype`: Original media type(s) (see `supportTypesListe.php`)<br>- `medias`:<br>  - `media_logosmonochrome`, `media_wheels`, `media_wheelscarbon`, `media_wheelscarbonvierge`, `media_wheelssteel`, `media_wheelssteelvierge`, `media_photos`, `media_video`, `media_fanart`, `media_bezels`, `media_backgrounds`, `media_screenmarquees`, `media_screenmarqueevierges`, `media_boxs3dvierge`, `media_supports2dvierge`, `media_controleur`, `media_illustration`: Download URLs and checksums (CRC32, MD5, SHA1) for various media types per region |

## Example Call
```
https://api.screenscraper.fr/api2/systemesListe.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=test&sspassword=test
```

## mediaSysteme.php

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `mediaSysteme.php` | `systemMedia` | Downloads system media images based on provided identifiers and optional checksums for update optimization. Returns a PNG image, a checksum match confirmation (`CRCOK`, `MD5OK`, or `SHA1OK`), or `NOMEDIA` if the media is not found. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `crc` (optional): CRC checksum of the local image<br>- `md5` (optional): MD5 checksum of the local image<br>- `sha1` (optional): SHA1 checksum of the local image<br>- `systemeid`: Numeric ID of the system (see `systemesListe.php`) (required)<br>- `media`: Text ID of the media to retrieve (see `systemesListe.php`) (required)<br>- `mediaformat` (optional): Media format (e.g., jpg, png, mp4, zip, mp3; informational)<br><br>**Output Parameters:**<br>- `maxwidth` (optional): Maximum width in pixels<br>- `maxheight` (optional): Maximum height in pixels<br>- `outputformat` (optional): Returned image format (png or jpg)<br><br>**Returns:**<br>- PNG image<br>- Text: `CRCOK`, `MD5OK`, or `SHA1OK` if checksum matches<br>- Text: `NOMEDIA` if media not found |

## Example Call
```
https://api.screenscraper.fr/api2/mediaSysteme.php?devid=xxx&devpassword=yyy&softname=zzz&ssid=test&sspassword=test&crc=&md5=&sha1=&systemeid=1&media=wheel(wor)
```

## mediaVideoSysteme.php

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `mediaVideoSysteme.php` | `systemVideoMedia` | Downloads system video media based on provided identifiers and optional checksums for update optimization. Returns an MP4 video, a checksum match confirmation (`CRCOK`, `MD5OK`, or `SHA1OK`), or `NOMEDIA` if the media is not found. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `crc` (optional): CRC checksum of the local video<br>- `md5` (optional): MD5 checksum of the local video<br>- `sha1` (optional): SHA1 checksum of the local video<br>- `systemeid`: Numeric ID of the system (see `systemesListe.php`) (required)<br>- `media`: Text ID of the media to retrieve (see `systemesListe.php`) (required)<br>- `mediaformat` (optional): Media format (e.g., jpg, png, mp4, zip, mp3; informational)<br><br>**Returns:**<br>- MP4 video<br>- Text: `CRCOK`, `MD5OK`, or `SHA1OK` if checksum matches<br>- Text: `NOMEDIA` if media not found |

## Example Call
```
https://api.screenscraper.fr/api2/mediaVideoSysteme.php?devid=xxx&devpassword=yyy&softname=zzz&ssid=test&sspassword=test&crc=&md5=&sha1=&systemeid=1&media=video
```

## jeuRecherche.php

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `jeuRecherche.php` | `gameSearch` | Searches for games by name, returning a table of up to 30 games sorted by probability. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `systemeid` (optional): Numeric ID of the system (see `systemesListe.php`)<br>- `recherche`: Name of the game to search for<br>- `item`: Information type to retrieve (set to `jeux`)<br><br>**Returned Elements:**<br>- `serveurcpu1`: CPU usage % of the primary server<br>- `serveurcpu2`: CPU usage % of the secondary server<br>- `threadsmin`: API accesses in the last 60 seconds<br>- `nbscrapeurs`: Current API users<br>- `apiacces`: API accesses today (French time)<br>- `ssuser`: User information (as per `ssuserInfos.php`)<br>- `jeux` (table): Game details (similar to `jeuInfos.php`, excluding ROM info) |

## Example Call
```
https://api.screenscraper.fr/api2/jeuRecherche.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=test&sspassword=test&systemeid=1&recherche=sonic
```

## jeuInfos.php

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `jeuInfos.php` | `gameInfo` | Retrieves detailed game information and associated media. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `crc` (optional): CRC checksum of the ROM/ISO/folder<br>- `md5` (optional): MD5 checksum of the ROM/ISO/folder<br>- `sha1` (optional): SHA1 checksum of the ROM/ISO/folder<br>- `systemeid`: Numeric ID of the system (required)<br>- `romtype`: Type of ROM (file, ISO, folder)<br>- `romnom`: Name of the file (with extension) or folder<br>- `romtaille` (optional): Size in bytes of the file or folder<br>- `serialnum` (optional): Serial number of the ROM/ISO<br>- `gameid` (optional): Numeric ID of the game<br><br>**Returned Elements:**<br>- `serveurcpu1`, `serveurcpu2`, `threadsmin`, `nbscrapeurs`, `apiacces`: Server stats<br>- `ssuser`: User information (as per `ssuserInfos.php`)<br>- `jeu`:<br>  - `id`: Numeric game ID<br>  - `romid`: Numeric ROM ID<br>  - `notgame`: Indicates if ROM is a non-game (demo/app)<br>  - `nom`: Internal ScreenScraper game name<br>  - `noms`: Game titles per region<br>  - `regionshortnames`: Short region names<br>  - `cloneof`: Clone ID (if applicable)<br>  - `systeme`: System details<br>  - `editeur`, `developpeur`: Publisher and developer names and media<br>  - `joueurs`: Number of players<br>  - `note`: Game rating (out of 20)<br>  - `topstaff`: Included in ScreenScraper TOP Staff (0/1)<br>  - `rotation`, `resolution`: Arcade-specific details<br>  - `synopsis`: Game descriptions per language<br>  - `classifications`: Game ratings and media<br>  - `dates`: Release dates per region<br>  - `genres`, `modes`, `familles`, `numeros`, `themes`, `styles`: Game attributes and media<br>  - `sp2kcfg`: Recalbox Pad2Keyboard config<br>  - `actions`, `couleurs`: Game control mappings<br>  - `medias`: Various game media URLs (screenshots, fanart, videos, etc.)<br>  - `roms`: List of associated ROMs with details<br>  - `rom`: Scraped ROM details (if found) |

## Example Call
```
https://api.screenscraper.fr/api2/jeuInfos.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=test&sspassword=test&crc=50ABC90A&systemeid=1&romtype=rom&romnom=Sonic%20The%20Hedgehog%202%20(World).zip&romtaille=749652
```

## mediaJeu.php

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `mediaJeu.php` | `gameMedia` | Downloads game media images based on provided identifiers and optional checksums for update optimization. Returns a PNG image, a checksum match confirmation (`CRCOK`, `MD5OK`, or `SHA1OK`), or `NOMEDIA` if the media is not found. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `crc` (optional): CRC checksum of the local image<br>- `md5` (optional): MD5 checksum of the local image<br>- `sha1` (optional): SHA1 checksum of the local image<br>- `systemeid`: Numeric ID of the system (see `systemesListe.php`) (required)<br>- `jeuid`: Numeric ID of the game (see `jeuInfos.php`) (required)<br>- `media`: Text ID of the media to retrieve (see `jeuInfos.php`) (required)<br>- `mediaformat` (optional): Media format (e.g., jpg, png, mp4, zip, mp3; informational)<br><br>**Output Parameters:**<br>- `maxwidth` (optional): Maximum width in pixels<br>- `maxheight` (optional): Maximum height in pixels<br>- `outputformat` (optional): Returned image format (png or jpg)<br><br>**Returns:**<br>- PNG image<br>- Text: `CRCOK`, `MD5OK`, or `SHA1OK` if checksum matches<br>- Text: `NOMEDIA` if media not found |

## Example Call
```
https://api.screenscraper.fr/api2/mediaJeu.php?devid=xxx&devpassword=yyy&softname=zzz&ssid=test&sspassword=test&crc=&md5=&sha1=&systemeid=1&jeuid=3&media=wheel-hd(wor)
```

## mediaVideoJeu.php

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `mediaVideoJeu.php` | `gameVideoMedia` | Downloads game video media based on provided identifiers and optional checksums for update optimization. Returns an MP4 video, a checksum match confirmation (`CRCOK`, `MD5OK`, or `SHA1OK`), or `NOMEDIA` if the media is not found. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `crc` (optional): CRC checksum of the local video<br>- `md5` (optional): MD5 checksum of the local video<br>- `sha1` (optional): SHA1 checksum of the local video<br>- `systemeid`: Numeric ID of the system (see `systemesListe.php`) (required)<br>- `jeuid`: Numeric ID of the game (see `jeuInfos.php`) (required)<br>- `media`: Text ID of the media to retrieve (see `jeuInfos.php`) (required)<br>- `mediaformat` (optional): Media format (e.g., jpg, png, mp4, zip, mp3; informational)<br><br>**Returns:**<br>- MP4 video<br>- Text: `CRCOK`, `MD5OK`, or `SHA1OK` if checksum matches<br>- Text: `NOMEDIA` if media not found |

## Example Call
```
https://api.screenscraper.fr/api2/mediaVideoJeu.php?devid=xxx&devpassword=yyy&softname=zzz&ssid=test&sspassword=test&crc=&md5=&sha1=&systemeid=1&jeuid=3&media=video
```

## mediaManuelJeu.php

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `mediaManuelJeu.php` | `gameManualMedia` | Downloads game manuals based on provided identifiers and optional checksums for update optimization. Returns a PDF manual, a checksum match confirmation (`CRCOK`, `MD5OK`, or `SHA1OK`), or `NOMEDIA` if the media is not found. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `crc` (optional): CRC checksum of the local manual<br>- `md5` (optional): MD5 checksum of the local manual<br>- `sha1` (optional): SHA1 checksum of the local manual<br>- `systemeid`: Numeric ID of the system (see `systemesListe.php`) (required)<br>- `jeuid`: Numeric ID of the game (see `jeuInfos.php`) (required)<br>- `media`: Text ID of the media to retrieve (see `jeuInfos.php`) (required)<br>- `mediaformat` (optional): Media format (e.g., jpg, png, mp4, zip, mp3, pdf; informational)<br><br>**Returns:**<br>- PDF manual<br>- Text: `CRCOK`, `MD5OK`, or `SHA1OK` if checksum matches<br>- Text: `NOMEDIA` if media not found |

## Example Call
```
https://api.screenscraper.fr/api2/mediaManuelJeu.php?devid=xxx&devpassword=yyy&softname=zzz&ssid=test&sspassword=test&crc=&md5=&sha1=&systemeid=1&jeuid=3&media=manuel(eu)
```

## botNote.php

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `botNote.php` | `submitGameRating` | Submits a game rating (1-20) for a game by a ScreenScraper user via a GET request. | **Input Parameters:**<br>- `ssid`: ScreenScraper user ID (required, text)<br>- `sspassword`: ScreenScraper user password (required, text)<br>- `gameid`: Numeric ID of the game (required, text)<br>- `note`: Game rating (integer from 1 to 20, required)<br><br>**Returns:**<br>- Textual information indicating success or failure of the submission |

## Example Call
```
https://api.screenscraper.fr/api2/botNote.php?devid=xxx&devpassword=yyy&softname=zzz&ssid=test&sspassword=test&gameid=3&note=18
```

## botProposition.php

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `botProposition.php` | `submitProposal` | Submits textual information or media proposals to ScreenScraper via a POST request with `multipart/form-data`. | **Input Parameters (General):**<br>- `ssid`: ScreenScraper user ID (required, text)<br>- `sspassword`: ScreenScraper user password (required, text)<br>- `gameid` (optional, text): Numeric ID of the game<br>- `romid` (optional, text): Numeric ID of the ROM<br><br>**For Textual Info Proposal:**<br>- `modiftypeinfo`: Type of information (see `infosJeuListe.php` or `infosRomListe.php`, text)<br>- `modifregion` (optional): Short region name (see `regionsListe.php`, text)<br>- `modiflangue` (optional): Short language name (see `languesListe.php`, text)<br>- `modifversion` (optional): Version of the information (text)<br>- `modiftexte`: The information content (text)<br>- `modifsource` (optional): Source of the information (URL, scan, author, etc., text)<br><br>**For Media Proposal:**<br>- `modiftypemedia`: Type of media (see `mediasJeuListe.php`, text)<br>- `modifmediafile` (optional): File to upload (file, format per `modiftypemedia`)<br>- `modifmediafileurl` (optional): URL of the media (text, format per `modiftypemedia`)<br>- `modiftyperegion` (optional): Short region name (see `regionsListe.php`, text)<br>- `modiftypenumsupport` (optional): Media number (0-10, text)<br>- `modiftypeversion` (optional): Version of the media (text)<br>- `modifmediasource` (optional): Source of the media (URL, scan, author, etc., text)<br><br>**Returns:**<br>- Textual information indicating success or failure of the submission |

## Example HTML Form for Textual Proposal
```html
<html>
  <head>
    <META http-equiv="Content-Type" content="text/html; charset=UTF-8"> 
    <META http-equiv="content-language" content="fr"> 
    <title></title>
  </head> 
  <body> 
    <form name="myform" id="myform" method="post" enctype="multipart/form-data" action="https://api.screenscraper.fr/api2/botProposition.php?ssid=xxx&sspassword=yyy"> 
      <input type="text" name="gameid" value="3"> 
      <input type="text" name="modiftypeinfo" value="description">
      <input type="text" name="modifregion" value="">   
      <input type="text" name="modiflangue" value="fr"> 
      <input type="text" name="modifversion" value=""> 
      <input type="text" name="modiftexte" value="ici, le synopsis du jeu ! ne pas valider, c'est un test ;)"> 
      <input type="text" name="modifsource" value="botProposition / source de l'info">
      <input type="submit" value="envoyer"> 
    </form>
    <script> 
      document.getElementById("myform").submit();
    </script>
  </body>
</html>
```

# ScreenScraper Infrastructure API Documentation

This document describes the `ssinfraInfos.php` API endpoint for retrieving information about the ScreenScraper infrastructure.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `ssinfraInfos.php` | `infraInfo` | Retrieves information about the ScreenScraper infrastructure, including server CPU usage, API access statistics, and quota details. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `item`: Information type to retrieve (set to `serveurs` for ScreenScraper server information)<br><br>**Returned Elements:**<br>- `cpu1`: CPU usage percentage of server 1 (average over the last 5 minutes)<br>- `cpu2`: CPU usage percentage of server 2 (average over the last 5 minutes)<br>- `cpu3`: CPU usage percentage of server 3 (average over the last 5 minutes)<br>- `threadsmin`: Number of API accesses in the last minute<br>- `nbscrapeurs`: Number of scrapers using the API in the last minute<br>- `apiacces`: Number of API accesses in the current day (GMT+1)<br><br>**Status:**<br>- `closefornomember`: API status for anonymous users (not registered or not identified) (0: open, 1: closed)<br>- `closeforleecher`: API status for non-contributing members (no validated contributions) (0: open, 1: closed)<br><br>**Quota:**<br>- `maxthreadfornonmember`: Maximum number of concurrent threads allowed for anonymous users<br>- `threadfornonmember`: Current number of concurrent threads opened by anonymous users<br>- `maxthreadformember`: Maximum number of concurrent threads allowed for registered members<br>- `threadformember`: Current number of concurrent threads opened by registered members |

## Example Call
```
https://api.screenscraper.fr/api2/ssinfraInfos.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml
```

# ScreenScraper User Information API Documentation

This document describes the `ssuserInfos.php` API endpoint for retrieving information about a ScreenScraper user.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `ssuserInfos.php` | `userInfo` | Retrieves detailed information about a ScreenScraper user, including their profile, contribution statistics, thread limits, API quotas, and visit history. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid`: ScreenScraper user ID (required)<br>- `sspassword`: ScreenScraper user password (required)<br>- `item`: Information type to retrieve (set to `ssuser` for ScreenScraper user information)<br><br>**Returned Elements:**<br>- `id`: User's ScreenScraper username<br>- `numid`: User's numeric ScreenScraper ID<br>- `niveau`: User's ScreenScraper level<br>- `contribution`: Financial contribution level (2 = 1 additional thread, 3+ = 5 additional threads)<br>- `uploadsysteme`: Count of validated system media contributions<br>- `uploadinfos`: Count of validated text information contributions<br>- `romasso`: Count of validated ROM association contributions<br>- `uploadmedia`: Count of validated game media contributions<br>- `propositionok`: Number of user proposals validated by a moderator<br>- `propositionko`: Number of user proposals rejected by a moderator<br>- `quotarefu`: Percentage of user proposals rejected<br><br>**Threads:**<br>- `maxthreads`: Maximum number of threads allowed for the user (also indicated for non-registered users)<br>- `maxdownloadspeed`: Maximum download speed (in KB/s) allowed for the user (also indicated for non-registered users)<br><br>**Quotas:**<br>- `requeststoday`: Total API calls made by the user in the current day<br>- `requestskotoday`: Number of API calls with negative responses (e.g., ROM/game not found) in the current day<br>- `maxrequestspermin`: Maximum API calls allowed per minute for the user (see FAQ)<br>- `maxrequestsperday`: Maximum API calls allowed per day for the user (see FAQ)<br>- `maxrequestskoperday`: Maximum API calls with negative responses allowed per day for the user (see FAQ)<br><br>**Visit Information:**<br>- `visites`: Number of user visits to ScreenScraper<br>- `datedernierevisite`: Date of the user's last visit to ScreenScraper (format: yyyy-mm-dd hh:mm:ss)<br>- `favregion`: User's favorite region for visits (e.g., france, europe, usa, japon) |

## Example Call
```
https://api.screenscraper.fr/api2/ssuserInfos.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=&sspassword=
```

# ScreenScraper Support Types List API Documentation

This document describes the `supportTypesListe.php` API endpoint for retrieving the list of media support types available on ScreenScraper.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `supportTypesListe.php` | `supportTypesList` | Retrieves a list of media support types (e.g., cartridge, disc) on ScreenScraper. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `items`: Information type to retrieve (set to `supporttypes`)<br><br>**Returned Elements:**<br>- `nom`: Designation of the support type(s) |

## Example Call
```
https://api.screenscraper.fr/api2/supportTypesListe.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=test&sspassword=test
```

# ScreenScraper User Levels API Documentation

This document describes the `userlevelsListe.php` API endpoint for retrieving the list of ScreenScraper user levels.

| French Endpoint | English Endpoint | Description | Parameters |
|-----------------|------------------|-------------|------------|
| `userlevelsListe.php` | `userLevelsList` | Retrieves a list of user levels available on ScreenScraper, including their numeric IDs and names in French. Returns data in XML (default) or JSON format. | **Input Parameters:**<br>- `devid`: Developer ID (required)<br>- `devpassword`: Developer password (required)<br>- `softname`: Name of the calling software (required)<br>- `output`: Response format (xml by default, or json)<br>- `ssid` (optional): ScreenScraper user ID<br>- `sspassword` (optional): ScreenScraper user password<br>- `items`: Information type to retrieve (set to `userlevels`)<br><br>**Returned Elements:**<br>- `userlevel` (xml) / `id` (json):<br>  - `id`: Numeric ID of the user level<br>  - `nom_fr`: Name of the user level in French |

## Example Call
```
https://api.screenscraper.fr/api2/userlevelsListe.php?devid=xxx&devpassword=yyy&softname=zzz&output=xml&ssid=test&sspassword=test
```