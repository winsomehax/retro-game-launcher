class EmulatorRenderer {
    constructor(app) {
        this.app = app;
    }

    renderEmulators() {
        const emulatorsList = document.getElementById('emulators-list');

        // Define all known emulators with their details
        const knownEmulators = [
            { id: 'mednafen', name: 'Mednafen', platforms: ['nes', 'snes', 'gba', 'gb', 'gbc'] },
            { id: 'retroarch', name: 'RetroArch', platforms: ['nes', 'snes', 'gba', 'gb', 'gbc', 'genesis', 'n64', 'psx'] },
            { id: 'desmume', name: 'DeSmuME', platforms: ['nds'] },
            { id: 'pcsx2', name: 'PCSX2', platforms: ['ps2'] },
            { id: 'duckstation', name: 'DuckStation', platforms: ['ps1'] },
            { id: 'citra', name: 'Citra', platforms: ['3ds'] },
            { id: 'ppsspp', name: 'PPSSPP', platforms: ['psp'] },
            { id: 'ryujinx', name: 'Ryujinx', platforms: ['switch'] },
            { id: 'yuzu', name: 'Yuzu', platforms: ['switch'] },
            { id: 'flycast', name: 'Flycast', platforms: ['dreamcast'] },
            { id: 'mupen64plus', name: 'Mupen64Plus', platforms: ['n64'] }
        ];

        // Create a document fragment to build the HTML
        const fragment = document.createDocumentFragment();

        // Process each known emulator
        for (const knownEmulator of knownEmulators) {
            // Check if this emulator is configured in our system
            const configuredEmulator = this.app.emulators.find(e => e.name === knownEmulator.name);

            // Determine status
            let status = 'Not Found';
            let statusClass = 'bg-red-600';

            if (configuredEmulator) {
                status = configuredEmulator.executablePath ? 'Configured' : 'Deployed';
                statusClass = configuredEmulator.executablePath ? 'bg-green-600' : 'bg-blue-600';
            }

            const emulatorElement = document.createElement('div');
            emulatorElement.className = 'bg-neutral-800 rounded-lg p-4';

            // Build the inner HTML string manually to avoid template literal issues
            let innerHTML = '<div class="flex justify-between items-start">';
            innerHTML += '<div>';
            innerHTML += '<h3 class="font-semibold text-lg mb-2">' + knownEmulator.name + '</h3>';
            innerHTML += '<p class="text-neutral-400 text-sm mb-3">Supported Platforms: ' + knownEmulator.platforms.join(', ') + '</p>';
            innerHTML += '</div>';
            innerHTML += '<span class="px-3 py-1 rounded-full text-sm font-medium ' + statusClass + '">' + status + '</span>';
            innerHTML += '</div>';

            // If configured, show details
            if (configuredEmulator) {
                // Display installation type if available
                if (configuredEmulator.installationType) {
                    let installTypeText = configuredEmulator.installationType.charAt(0).toUpperCase() + configuredEmulator.installationType.slice(1);
                    innerHTML += '<p class="text-neutral-400 text-sm mb-1">Installation: ' + installTypeText + '</p>';
                }

                if (configuredEmulator.executablePath) {
                    innerHTML += '<p class="text-neutral-400 text-sm mb-1">Path: ' + configuredEmulator.executablePath + '</p>';
                }

                if (configuredEmulator.args) {
                    innerHTML += '<p class="text-neutral-400 text-sm mb-3">Args: ' + configuredEmulator.args + '</p>';
                }

                if (configuredEmulator.description) {
                    innerHTML += '<p class="text-neutral-400 text-sm mb-3">' + configuredEmulator.description + '</p>';
                }

                // Display website if available
                if (configuredEmulator.website) {
                    innerHTML += '<p class="text-neutral-400 text-sm mb-3"><a href="' + configuredEmulator.website + '" target="_blank">' + (configuredEmulator.website || '') + '</a></p>';
                }

                // Build tags HTML
                let tagsHTML = '<div class="flex flex-wrap gap-1 mb-2">';
                if (configuredEmulator.tags) {
                    for (const tagId of configuredEmulator.tags) {
                        const tag = this.app.platformTags.find(t => t.id === tagId);
                        if (tag) {
                            tagsHTML += '<span class="bg-secondary text-xs px-2 py-1 rounded-full">' + tag.name + '</span>';
                        }
                    }
                }
                tagsHTML += '</div>';
                innerHTML += tagsHTML;
            }

            // Build buttons HTML
            innerHTML += '<div class="flex space-x-2">';
            innerHTML += '<button onclick="app.editEmulator(\'' + (configuredEmulator ? configuredEmulator.emulator_id : 'new-' + knownEmulator.id) + '\')" class="bg-secondary hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors">';
            innerHTML += (configuredEmulator ? 'Edit' : 'Configure');
            innerHTML += '</button>';

            if (configuredEmulator) {
                innerHTML += '<button onclick="app.deleteEmulator(\'' + configuredEmulator.emulator_id + '\')" class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors">';
                innerHTML += 'Delete';
                innerHTML += '</button>';
            }

            innerHTML += '</div>';

            emulatorElement.innerHTML = innerHTML;
            fragment.appendChild(emulatorElement);
        }

        emulatorsList.innerHTML = '';
        emulatorsList.appendChild(fragment);
    }
}

// Make the class available globally
window.EmulatorRenderer = EmulatorRenderer;