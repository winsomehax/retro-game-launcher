# Video Media Support

This document describes the video media support added to the Retro Game Launcher application.

## Overview

The Retro Game Launcher now supports video media for games. When games are added or enriched, the application will search for playable video URLs and store them in the game data structure. These videos will play when users hover over the screenshot image in the main view.

## Game Data Structure

A new field `video_url` has been added to the game data structure:

```json
{
  "id": "12345",
  "title": "Game Title",
  "platformId": "66",
  "romPath": "/path/to/rom",
  "cover_image_path": "https://example.com/image.jpg",
  "video_url": "https://example.com/video.mp4",
  "description": "Game description",
  "genre": "Action",
  "releaseDate": "1985",
  "tags": []
}
```

## Implementation Details

### Backend (GameService)

The `GameService` class has been updated to fetch video media when enriching games:

1. When searching for game information via ScreenScraper API, the service now looks for media with type `video`
2. If a video URL is found, it's included in the game's media object
3. The video URL is then stored in the game data structure

### Frontend (app.js)

The frontend has been updated to handle video URLs:

1. **Game Rendering**: When rendering games in the main view, both the cover image and video are included in the DOM
2. **Hover Effect**: JavaScript event listeners are added to show the video on hover:
   - When hovering over the game image, the video fades in and starts playing
   - When the mouse leaves, the video fades out, pauses, and resets to the beginning
3. **Modals**: All game-related modals (Add Game, Edit Game, Enriched Details) now include a field for the video URL

### UI/UX Features

1. Videos are muted by default to comply with autoplay policies
2. Videos are preloaded with `preload="none"` to reduce bandwidth usage
3. Smooth fade transitions between images and videos
4. Videos automatically pause and reset when the mouse leaves the image area

## Supported Video Formats

The implementation currently supports MP4 videos, which is the format provided by ScreenScraper.fr. Additional formats can be added by modifying the `<video>` tag to include multiple `<source>` elements.

## API Integration

The video functionality integrates with the ScreenScraper API through the GameService:

1. The `getGameOverview` method now extracts video URLs from the media array
2. The `processScreenScraperResponse` function includes a new `getVideo` helper to find video media

## Future Enhancements

Possible future enhancements include:

1. Support for additional video formats
2. Volume controls for videos
3. Looping options for videos
4. Alternative triggers for video playback (click instead of hover)
5. Preloading optimizations for better performance