# Test Suite Documentation

This document provides an overview of the comprehensive test suite implemented for the Retro Game Launcher application.

## Test Organization

The tests are organized by module/functionality:

1. **Core Application Logic** (`app.spec.js`)
   - Tests for the main RetroGameLauncher class
   - View management and navigation
   - Data loading and indexing

2. **Game Service** (`GameService.spec.js`)
   - Tests for the GameService class
   - Game search functionality
   - Asset downloading

3. **ScreenScraper API** (`screenscraperAPI.spec.js`)
   - Tests for ScreenScraper API integration
   - Authentication handling
   - Error handling

4. **ROM Scanning** (`rom-scanning.spec.js`)
   - Tests for ROM file detection
   - File filtering logic
   - Batch processing

5. **ROM Processing** (`rom-processing.spec.js`)
   - Tests for ROM file processing
   - Metadata enrichment
   - Batch processing limits

6. **Plugin System** (`PluginManager.spec.js`)
   - Tests for plugin management
   - Plugin loading/unloading
   - Settings integration

7. **Settings Management** (`settings.spec.js`)
   - Tests for settings loading/saving
   - Form validation
   - API key handling

8. **Game Launching** (`launching.spec.js`)
   - Tests for game launching functionality
   - Path validation
   - Error handling

9. **UI Components** (`ui.spec.js`)
   - Tests for UI rendering
   - Modal interactions
   - Form validation

10. **Data Models** (`datamodels.spec.js`)
    - Tests for data normalization
    - Structure validation

11. **Tag System** (`tags.spec.js`)
    - Tests for tag creation
    - Tag assignment to games
    - Tag filtering

12. **Electron Integration** (`electron.spec.js`)
    - Tests for Electron IPC communication
    - File system operations

13. **Utility Functions** (`utils.spec.js`)
    - Tests for utility functions
    - String sanitization
    - UUID generation

14. **Main Process** (`main.spec.js`)
    - Basic tests for main process functionality

## Test Coverage

The test suite provides good coverage for:
- Core application logic
- API integrations
- Data processing
- UI components
- Error handling
- Edge cases

## Running Tests

To run the test suite:

```bash
npm test
```

This will run all tests and provide a coverage report.

## Test Technologies

The test suite uses:
- Jest as the test framework
- JSDOM for DOM mocking
- Mocking for external dependencies