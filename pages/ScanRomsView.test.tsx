import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; // For extended matchers like .toBeInTheDocument()
import { ScanRomsView } from './ScanRomsView';
import { Platform } from '../types'; // Import Platform type
import { DEFAULT_ROM_FOLDER } from '../constants'; // Import if used for default checks

// Mocking fetch API
global.fetch = jest.fn();

// Mock a platform for testing
const mockPlatforms: Platform[] = [
  {
    id: 1,
    name: 'Nintendo Entertainment System',
    alias: 'nes',
    emulators: [{ id: 'emu1', name: 'Nestopia', executablePath: '/path/to/nestopia', args: '-rom {romPath}' }],
    // other fields as required by Platform type
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
  let mockOnAddGames;

  beforeEach(() => {
    mockOnAddGames = jest.fn();
    // Reset fetch mock before each test
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
    // How to verify internal state? React Testing Library encourages testing user-visible changes.
    // For example, if the selected platform name appears somewhere, or if a button becomes enabled.
    // Here, the "Begin Scan" button becomes enabled if a platform is selected.

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
      // Select a platform to enable the scan button
      renderScanRomsView();
      const platformSelect = screen.getByLabelText(/1. Select Platform/i);
      fireEvent.change(platformSelect, { target: { value: mockPlatforms[0].id.toString() } });
    });

    test('"Begin Scan" calls API and displays results', async () => {
      const mockScanResults = ['rom1', 'rom2', 'rom3'];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockScanResults,
      });

      fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));

      expect(global.fetch).toHaveBeenCalledWith('/api/scan-roms', expect.any(Object));
      expect(global.fetch).toHaveBeenCalledWith('/api/scan-roms',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platformId: mockPlatforms[0].id.toString(), folderPath: DEFAULT_ROM_FOLDER })
        })
      );

      expect(await screen.findByText(/Scanning.../i)).toBeInTheDocument(); // Loading state

      await waitFor(() => expect(screen.getByText(`Found ${mockScanResults.length} Potential ROMs`)).toBeInTheDocument());
      for (const romName of mockScanResults) {
        expect(screen.getByLabelText(romName)).toBeInTheDocument();
      }
      // Check if "Select All" is there
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
        json: async () => [], // Empty array for no ROMs
      });

      fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));

      expect(await screen.findByText(/Scanning.../i)).toBeInTheDocument();
      await waitFor(() => expect(screen.getByText(/No ROM files found/i)).toBeInTheDocument());
    });
  });

  describe('ROM Selection and Import', () => {
    const mockScanResults = ['Super Mario', 'Zelda II', 'Contra'];

    beforeEach(async () => {
      renderScanRomsView();
      const platformSelect = screen.getByLabelText(/1. Select Platform/i);
      fireEvent.change(platformSelect, { target: { value: mockPlatforms[1].id.toString() } }); // Select SNES

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockScanResults,
      });
      fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));
      await waitFor(() => expect(screen.getByText(`Found ${mockScanResults.length} Potential ROMs`)).toBeInTheDocument());
    });

    test('checkbox selection works and enables Import button', () => {
      const importButton = screen.getByRole('button', { name: /Import Selected/i });
      expect(importButton).toBeDisabled(); // Initially disabled

      const romCheckbox1 = screen.getByLabelText(mockScanResults[0]);
      fireEvent.click(romCheckbox1);
      expect(romCheckbox1).toBeChecked();
      expect(importButton).not.toBeDisabled(); // Enabled after one selection

      const romCheckbox2 = screen.getByLabelText(mockScanResults[1]);
      fireEvent.click(romCheckbox2);
      expect(romCheckbox2).toBeChecked();

      fireEvent.click(romCheckbox1); // Unselect
      expect(romCheckbox1).not.toBeChecked();
      expect(importButton).not.toBeDisabled(); // Still enabled as one is selected

      fireEvent.click(romCheckbox2); // Unselect the other
      expect(romCheckbox2).not.toBeChecked();
      expect(importButton).toBeDisabled(); // Disabled again
    });

    test('"Select All" checkbox works', () => {
      const selectAllCheckbox = screen.getByLabelText(/Select All/i) as HTMLInputElement;
      fireEvent.click(selectAllCheckbox);
      mockScanResults.forEach(rom => {
        expect(screen.getByLabelText(rom)).toBeChecked();
      });
      expect(screen.getByRole('button', { name: /Import Selected/i })).not.toBeDisabled();
      expect(selectAllCheckbox.checked).toBe(true);

      fireEvent.click(selectAllCheckbox); // Deselect all
      mockScanResults.forEach(rom => {
        expect(screen.getByLabelText(rom)).not.toBeChecked();
      });
      expect(screen.getByRole('button', { name: /Import Selected/i })).toBeDisabled();
      expect(selectAllCheckbox.checked).toBe(false);
    });

    test('"Import Selected to Library" button calls onAddGames with correct data', () => {
      const romToSelect = mockScanResults[0];
      fireEvent.click(screen.getByLabelText(romToSelect)); // Select one ROM

      const romPathInput = screen.getByLabelText(/2. ROMs Folder Path/i) as HTMLInputElement;
      const currentRomsPath = romPathInput.value;

      fireEvent.click(screen.getByRole('button', { name: /Import Selected/i }));

      expect(mockOnAddGames).toHaveBeenCalledTimes(1);
      expect(mockOnAddGames).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title: romToSelect,
            platformId: mockPlatforms[1].id.toString(), // SNES was selected
            romPath: `${currentRomsPath}/${romToSelect}`,
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
    const mockScanResults = ['MetroidPrime'];
    beforeEach(async () => {
      renderScanRomsView();
      const platformSelect = screen.getByLabelText(/1. Select Platform/i);
      fireEvent.change(platformSelect, { target: { value: mockPlatforms[0].id.toString() } });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockScanResults,
      });
      fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));
      await waitFor(() => expect(screen.getByText(`Found ${mockScanResults.length} Potential ROMs`)).toBeInTheDocument());
    });

    test('"Enrich Selected" button is present and shows placeholder message on click', () => {
      const enrichButton = screen.getByRole('button', { name: /Enrich Selected/i });
      expect(enrichButton).toBeInTheDocument();
      // Initially might be disabled if no ROMs are selected by default after scan, or if it requires selection.
      // The current implementation seems to enable it if scannedRoms.length > 0.
      // Let's assume it should be enabled after scan, but disabled if no ROMs are selected.
      // The button text includes "(0)" if nothing is selected.

      expect(enrichButton.textContent).toContain("(0)"); // No roms selected initially
      // The button itself is not disabled, but its action might depend on selectedRoms.
      // The code has `disabled={isLoading || scannedRoms.length === 0}` for the button group,
      // and individual buttons inside might have their own logic or rely on this.
      // The "Enrich Selected" button in the code has `disabled={isLoading || scannedRoms.length === 0}`
      // Let's test clicking it. It should show a message.

      fireEvent.click(enrichButton);
      expect(screen.getByText(/AI Enrichment feature is not yet implemented/i)).toBeInTheDocument();

      // Select a ROM and see if count updates
      fireEvent.click(screen.getByLabelText(mockScanResults[0]));
      expect(enrichButton.textContent).toContain("(1)");
    });
  });

});
