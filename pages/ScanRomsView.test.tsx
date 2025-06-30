import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScanRomsView } from './ScanRomsView';
import { Platform, Game } from '../types'; // Added Game for type usage
import { DEFAULT_ROM_FOLDER } from '../constants';
import { joinPathSegments } from '../utils'; // Import the utility function

// Mocking fetch API
global.fetch = jest.fn();

// Define the ScannedRom structure, mirroring its definition in ScanRomsView.tsx
interface ScannedRom {
  displayName: string;
  fileName: string;
}

const mockPlatforms: Platform[] = [
  {
    id: 1,
    name: 'Nintendo Entertainment System',
    alias: 'nes',
    emulators: [{ id: 'emu1', name: 'Nestopia', executablePath: '/path/to/nestopia', args: '-rom {romPath}' }],
    icon: '', console: '', controller: '', developer: '', manufacturer: '', media: '', cpu: '', memory: '', graphics: '', sound: '', maxcontrollers: '', display: '', overview: '', youtube: '', userIconUrl: '',
  },
  {
    id: 2,
    name: 'Super Nintendo',
    alias: 'snes',
    emulators: [{ id: 'emu2', name: 'Snes9x', executablePath: '/path/to/snes9x', args: '-rom {romPath}' }],
    icon: '', console: '', controller: '', developer: '', manufacturer: '', media: '', cpu: '', memory: '', graphics: '', sound: '', maxcontrollers: '', display: '', overview: '', youtube: '', userIconUrl: '',
  },
];

describe('ScanRomsView Component', () => {
  let mockOnAddGames: jest.Mock<void, [Game[], string]>; // Typed mock function

  beforeEach(() => {
    mockOnAddGames = jest.fn();
    (global.fetch as jest.Mock).mockClear();
  });

  const renderScanRomsView = (platforms = mockPlatforms) => {
    return render(
      <ScanRomsView
        platforms={platforms}
        onAddGames={mockOnAddGames}
      />
    );
  };

  test('renders initial components correctly', () => {
    renderScanRomsView();
    expect(screen.getByLabelText(/1. Select Platform/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/2. ROMs Folder Path/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3. Begin Scan/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g., \/Users\/username\/roms\/snes/i)).toHaveValue(DEFAULT_ROM_FOLDER);
  });

  test('shows "no platforms" message if platforms array is empty', () => {
    renderScanRomsView([]);
    expect(screen.getByText(/You need to configure a platform first/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3. Begin Scan/i })).toBeDisabled();
  });

  test('platform selection updates state', () => {
    renderScanRomsView();
    const platformSelect = screen.getByLabelText(/1. Select Platform/i);
    fireEvent.change(platformSelect, { target: { value: mockPlatforms[0].id.toString() } });
    expect(screen.getByRole('button', { name: /3. Begin Scan/i })).not.toBeDisabled();
  });

  test('ROMs path input updates state', () => {
    renderScanRomsView();
    const romPathInput = screen.getByLabelText(/2. ROMs Folder Path/i);
    fireEvent.change(romPathInput, { target: { value: '/custom/roms/path' } });
    expect(romPathInput).toHaveValue('/custom/roms/path');
  });

  describe('Scanning Functionality', () => {
    beforeEach(() => {

      renderScanRomsView();
      const platformSelect = screen.getByLabelText(/1. Select Platform/i);
      fireEvent.change(platformSelect, { target: { value: mockPlatforms[0].id.toString() } });
    });

    test('"Begin Scan" calls API and displays results', async () => {
      // 1. Update mock API response
      const mockApiScanResults: ScannedRom[] = [
        { displayName: 'rom1', fileName: 'rom1.nes' },
        { displayName: 'rom2', fileName: 'rom2.smc' },
        { displayName: 'rom3', fileName: 'rom3.gen' },
      ];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiScanResults,
      });

      fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));
      expect(global.fetch).toHaveBeenCalledWith('/api/scan-roms',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platformId: mockPlatforms[0].id.toString(), folderPath: DEFAULT_ROM_FOLDER })
        })
      );

      expect(await screen.findByText(/Scanning.../i)).toBeInTheDocument();

      // 2. Verify displayed text and count
      await waitFor(() => expect(screen.getByText(`Found ${mockApiScanResults.length} Potential ROMs`)).toBeInTheDocument());
      for (const rom of mockApiScanResults) {
        // Checkboxes are associated with labels that contain the displayName
        expect(screen.getByLabelText(rom.displayName)).toBeInTheDocument();
      }
      expect(screen.getByLabelText(/Select All/i)).toBeInTheDocument();
    });

    test('handles API error during scan', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Test API Error' }),
        status: 500
      });
      fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));
      expect(await screen.findByText(/Scanning.../i)).toBeInTheDocument();
      await waitFor(() => expect(screen.getByText(/Test API Error/i)).toBeInTheDocument());
    });

    test('handles no ROMs found scenario', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });
      fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));
      expect(await screen.findByText(/Scanning.../i)).toBeInTheDocument();
      await waitFor(() => expect(screen.getByText(/No ROM files found/i)).toBeInTheDocument());
    });
  });

  describe('ROM Selection and Import', () => {
    // 4. Update mockScanResults for this suite
    const mockSuiteScanResults: ScannedRom[] = [
      { displayName: 'Super Mario World', fileName: 'Super Mario World.smc' },
      { displayName: 'Zelda A Link to the Past', fileName: 'Zelda A Link to the Past.sfc' },
      { displayName: 'Contra III The Alien Wars', fileName: 'Contra III The Alien Wars.smc' },
    ];

    beforeEach(async () => {
      renderScanRomsView();
      const platformSelect = screen.getByLabelText(/1. Select Platform/i);
      fireEvent.change(platformSelect, { target: { value: mockPlatforms[1].id.toString() } }); // Select SNES

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuiteScanResults,
      });
      fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));
      await waitFor(() => expect(screen.getByText(`Found ${mockSuiteScanResults.length} Potential ROMs`)).toBeInTheDocument());
    });

    test('checkbox selection works and enables Import button', () => {
      const importButton = screen.getByRole('button', { name: /Import Selected/i });
      expect(importButton).toBeDisabled();

      // 3. Ensure correct ROM object is used for interaction
      const romCheckbox1 = screen.getByLabelText(mockSuiteScanResults[0].displayName);
      fireEvent.click(romCheckbox1);
      expect(romCheckbox1).toBeChecked();
      expect(importButton).not.toBeDisabled();

      const romCheckbox2 = screen.getByLabelText(mockSuiteScanResults[1].displayName);
      fireEvent.click(romCheckbox2);
      expect(romCheckbox2).toBeChecked();

      fireEvent.click(romCheckbox1);
      expect(romCheckbox1).not.toBeChecked();
      expect(importButton).not.toBeDisabled();

      fireEvent.click(romCheckbox2);
      expect(romCheckbox2).not.toBeChecked();
      expect(importButton).toBeDisabled();
    });

    test('"Select All" checkbox works', () => {
      const selectAllCheckbox = screen.getByLabelText(/Select All/i) as HTMLInputElement;
      fireEvent.click(selectAllCheckbox);

      mockSuiteScanResults.forEach(rom => {
        expect(screen.getByLabelText(rom.displayName)).toBeChecked();
      });
      expect(screen.getByRole('button', { name: /Import Selected/i })).not.toBeDisabled();
      expect(selectAllCheckbox.checked).toBe(true);
      fireEvent.click(selectAllCheckbox);
      mockSuiteScanResults.forEach(rom => {
        expect(screen.getByLabelText(rom.displayName)).not.toBeChecked();
      });
      expect(screen.getByRole('button', { name: /Import Selected/i })).toBeDisabled();
      expect(selectAllCheckbox.checked).toBe(false);
    });

    test('"Import Selected to Library" button calls onAddGames with correct data', () => {
      // 5. General review: romToSelect should be an object
      const romObjectToSelect = mockSuiteScanResults[0];
      fireEvent.click(screen.getByLabelText(romObjectToSelect.displayName));
      const romPathInput = screen.getByLabelText(/2. ROMs Folder Path/i) as HTMLInputElement;
      const currentRomsPath = romPathInput.value;

      fireEvent.click(screen.getByRole('button', { name: /Import Selected/i }));

      expect(mockOnAddGames).toHaveBeenCalledTimes(1);
      // 4. Update assertion for onAddGames
      expect(mockOnAddGames).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String), // Check for any string for ID
            title: romObjectToSelect.displayName, // title is displayName
            platformId: mockPlatforms[1].id.toString(), // SNES was selected
            romPath: joinPathSegments(currentRomsPath, romObjectToSelect.fileName), // Use joinPathSegments
            coverImageUrl: '',
            description: '',
            genre: '',
            releaseDate: '',
          })
        ]),
        mockPlatforms[1].id.toString() // The selectedPlatformId
      );
      expect(screen.getByText(/game\(s\) successfully prepared for import/i)).toBeInTheDocument();
    });
  });

  describe('Enrich Selected Button', () => {
    // Update mockScanResults for this suite as well
    const mockSuiteEnrichResults: ScannedRom[] = [
      { displayName: 'Metroid Prime Game', fileName: 'Metroid Prime Game.iso' }
    ];
    beforeEach(async () => {
      renderScanRomsView();
      const platformSelect = screen.getByLabelText(/1. Select Platform/i);
      fireEvent.change(platformSelect, { target: { value: mockPlatforms[0].id.toString() } });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuiteEnrichResults,
      });
      fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));
      await waitFor(() => expect(screen.getByText(`Found ${mockSuiteEnrichResults.length} Potential ROMs`)).toBeInTheDocument());
    });

    test('"Enrich Selected" button is present and shows placeholder message on click', () => {
      const enrichButton = screen.getByRole('button', { name: /Enrich Selected/i });
      expect(enrichButton).toBeInTheDocument();
      expect(enrichButton.textContent).toContain("(0)");

      fireEvent.click(enrichButton); // Click when no items are selected
      expect(screen.getByText(/No ROMs selected to enrich/i)).toBeInTheDocument(); // Updated message check

      // Select a ROM and see if count updates and message changes
      fireEvent.click(screen.getByLabelText(mockSuiteEnrichResults[0].displayName));
      expect(enrichButton.textContent).toContain("(1)");

      fireEvent.click(enrichButton); // Click when items are selected
      expect(screen.getByText(/AI Enrichment feature is not yet implemented/i)).toBeInTheDocument();
    });
  });
});
