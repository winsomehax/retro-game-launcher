import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScanRomsView } from './ScanRomsView';
import { Platform, Game } from '../types';
import { DEFAULT_ROM_FOLDER } from '../constants';

global.fetch = jest.fn();

const mockPlatforms: Platform[] = [
  {
    id: 1, name: 'Nintendo Entertainment System', alias: 'nes', emulators: [{ id: 'emu1', name: 'Nestopia', executablePath: '/path/to/nestopia', args: '-rom {romPath}' }],
    icon: '', console: '', controller: '', developer: '', manufacturer: '', media: '', cpu: '', memory: '', graphics: '', sound: '', maxcontrollers: '', display: '', overview: '', youtube: '', userIconUrl: '',
  },
  {
    id: 2, name: 'Super Nintendo', alias: 'snes', emulators: [{ id: 'emu2', name: 'Snes9x', executablePath: '/path/to/snes9x', args: '-rom {romPath}' }],
    icon: '', console: '', controller: '', developer: '', manufacturer: '', media: '', cpu: '', memory: '', graphics: '', sound: '', maxcontrollers: '', display: '', overview: '', youtube: '', userIconUrl: '',
  },
];

// Helper to create mock ScannedRomFile objects
const createMockScannedRomFile = (name: string, ext: string = 'nes') => ({ name, filename: `${name}.${ext}` });

describe('ScanRomsView Component', () => {
  let mockOnAddGames: jest.Mock;

  beforeEach(() => {
    mockOnAddGames = jest.fn();
    (global.fetch as jest.Mock).mockClear();
  });

  const renderScanRomsView = (platforms = mockPlatforms) => {
    render(<ScanRomsView platforms={platforms} onAddGames={mockOnAddGames} />);
  };

  test('renders initial components correctly', () => {
    renderScanRomsView();
    expect(screen.getByLabelText(/1. Select Platform/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/2. ROMs Folder Path/i)).toHaveValue(DEFAULT_ROM_FOLDER);
    expect(screen.getByRole('button', { name: /3. Begin Scan/i })).toBeInTheDocument();
  });

  test('shows "no platforms" message if platforms array is empty', () => {
    renderScanRomsView([]);
    expect(screen.getByText(/You need to configure a platform first/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /3. Begin Scan/i })).toBeDisabled();
  });

  const selectPlatform = async (platformId: number | string) => {
    const platformSelect = screen.getByLabelText(/1. Select Platform/i);
    await act(async () => {
      fireEvent.change(platformSelect, { target: { value: platformId.toString() } });
    });
  };


  describe('Scanning Functionality', () => {
    test('"Begin Scan" calls API and displays initial results', async () => {
      renderScanRomsView();
      await selectPlatform(mockPlatforms[0].id);

      const mockApiScanResults = [
        createMockScannedRomFile('Contra'),
        createMockScannedRomFile('Super Mario Bros'),
      ];
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiScanResults,
      });

      fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));

      expect(await screen.findByText(/Scanning.../i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(`Found ${mockApiScanResults.length} Potential ROMs for ${mockPlatforms[0].name}`)).toBeInTheDocument();
      });

      for (const rom of mockApiScanResults) {
        expect(screen.getByLabelText(new RegExp(rom.name, "i"))).toBeInTheDocument();
      }
      // All items are selected by default after scan for enrichment
      const selectAllCheckbox = screen.getByLabelText(/Select All/i) as HTMLInputElement;
      expect(selectAllCheckbox.checked).toBe(true);
      expect(screen.getByRole('button', { name: /Enrich Selected \(\d+\)/i})).not.toBeDisabled();
    });

    test('handles API error during scan', async () => {
        renderScanRomsView();
        await selectPlatform(mockPlatforms[0].id);
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            json: async () => ({ error: 'Test API Scan Error' }),
            status: 500
        });
        fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));
        expect(await screen.findByText(/Test API Scan Error/i)).toBeInTheDocument();
    });

    test('handles no ROMs found scenario', async () => {
        renderScanRomsView();
        await selectPlatform(mockPlatforms[0].id);
        (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => [] });
        fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));
        expect(await screen.findByText(/No ROM files found/i)).toBeInTheDocument();
    });
  });

  describe('Enrichment Functionality', () => {
    const initialScanResults = [
      createMockScannedRomFile('mkombat'),
      createMockScannedRomFile('stfighter2'),
    ];

    const mockEnrichmentApiResult = {
      source: 'Gemini',
      enriched_roms: [
        { original_name: 'mkombat', suggested_title: 'Mortal Kombat' },
        { original_name: 'stfighter2', suggested_title: 'Street Fighter II' },
      ],
    };

    beforeEach(async () => {
      renderScanRomsView();
      await selectPlatform(mockPlatforms[0].id);

      // Mock scan API call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => initialScanResults,
      });
      fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));
      await waitFor(() => expect(screen.getByText(`Found ${initialScanResults.length} Potential ROMs`)).toBeInTheDocument());
    });

    test('calls enrich API and displays enriched results with editable titles', async () => {
      // Mock enrich API call
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockEnrichmentApiResult,
      });

      const enrichButton = screen.getByRole('button', { name: new RegExp(`Enrich Selected \\(${initialScanResults.length}\\)`, "i") });
      fireEvent.click(enrichButton);

      expect(await screen.findByText(/Enriching.../i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(`Enriched ROM Titles for ${mockPlatforms[0].name}`)).toBeInTheDocument();
      });

      for (const enriched of mockEnrichmentApiResult.enriched_roms) {
        // Check for original name display (e.g., as a label or part of text)
        expect(screen.getByText(new RegExp(`Original: ${enriched.original_name}`, "i"))).toBeInTheDocument();
        // Check for the input field with the suggested title
        const inputElement = screen.getByDisplayValue(enriched.suggested_title) as HTMLInputElement;
        expect(inputElement).toBeInTheDocument();
        // Check if AI suggestion is also displayed
         expect(screen.getByText(new RegExp(`AI Suggestion: ${enriched.suggested_title}`, "i"))).toBeInTheDocument();

        // Test editing the title
        fireEvent.change(inputElement, { target: { value: `${enriched.suggested_title} - Edited` } });
        expect(inputElement.value).toBe(`${enriched.suggested_title} - Edited`);
      }
       // All items are selected by default after enrichment
      const selectAllEnrichedCheckbox = screen.getByLabelText(/Select All/i) as HTMLInputElement;
      expect(selectAllEnrichedCheckbox.checked).toBe(true);
      expect(screen.getByRole('button', { name: /Import Selected \(\d+\)/i})).not.toBeDisabled();
    });

    test('handles enrich API error', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Test AI Enrichment Error' })
        });
        fireEvent.click(screen.getByRole('button', { name: new RegExp(`Enrich Selected`, "i") }));
        expect(await screen.findByText(/Test AI Enrichment Error/i)).toBeInTheDocument();
    });
  });

  describe('Import Functionality', () => {
    const romsToScan = [createMockScannedRomFile('Game1'), createMockScannedRomFile('Game2')];

    test('imports selected ROMs from initial scan (no enrichment)', async () => {
      renderScanRomsView();
      await selectPlatform(mockPlatforms[1].id); // SNES

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => romsToScan });
      fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));
      await waitFor(() => expect(screen.getByText(`Found ${romsToScan.length} Potential ROMs`)).toBeInTheDocument());

      // Deselect the second ROM ("Game2")
      // Checkboxes are labeled by rom.name
      const checkboxGame2 = screen.getByLabelText(new RegExp(romsToScan[1].name, "i")) as HTMLInputElement;
      fireEvent.click(checkboxGame2); // This will uncheck it as all are selected by default

      fireEvent.click(screen.getByRole('button', { name: /Import Selected \(1\)/i }));

      expect(mockOnAddGames).toHaveBeenCalledTimes(1);
      const gamesImported = mockOnAddGames.mock.calls[0][0] as Game[];
      expect(gamesImported).toHaveLength(1);
      expect(gamesImported[0]).toMatchObject({
        title: romsToScan[0].name,
        platformId: mockPlatforms[1].id.toString(),
        romPath: `${DEFAULT_ROM_FOLDER}/${romsToScan[0].filename}`,
      });
      expect(screen.getByText(/1 game\(s\) successfully prepared/i)).toBeInTheDocument();
    });

    test('imports selected ROMs after enrichment with edited title', async () => {
      renderScanRomsView();
      await selectPlatform(mockPlatforms[0].id); // NES

      const scannedRom = createMockScannedRomFile('dkong');
      const enrichmentSuggestion = { original_name: 'dkong', suggested_title: 'Donkey Kong' };
      const editedTitle = 'Donkey Kong (Classic)';

      // Mock Scan
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => [scannedRom] });
      fireEvent.click(screen.getByRole('button', { name: /3. Begin Scan/i }));
      await waitFor(() => expect(screen.getByText(/Found 1 Potential ROM/i)).toBeInTheDocument());

      // Mock Enrich
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ source: 'Gemini', enriched_roms: [enrichmentSuggestion] })
      });
      fireEvent.click(screen.getByRole('button', { name: /Enrich Selected \(1\)/i }));
      await waitFor(() => expect(screen.getByText(/Enriched ROM Titles/i)).toBeInTheDocument());

      // Edit title
      const titleInput = screen.getByDisplayValue(enrichmentSuggestion.suggested_title) as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: editedTitle } });

      // Import
      fireEvent.click(screen.getByRole('button', { name: /Import Selected \(1\)/i }));

      expect(mockOnAddGames).toHaveBeenCalledTimes(1);
      const gamesImported = mockOnAddGames.mock.calls[0][0] as Game[];
      expect(gamesImported).toHaveLength(1);
      expect(gamesImported[0]).toMatchObject({
        title: editedTitle,
        platformId: mockPlatforms[0].id.toString(),
        romPath: `${DEFAULT_ROM_FOLDER}/${scannedRom.filename}`,
      });
      expect(screen.getByText(/1 game\(s\) successfully prepared/i)).toBeInTheDocument();
    });
  });
});
