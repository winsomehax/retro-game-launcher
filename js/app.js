class Tag {
    constructor(name) {
        this.id = app.generateUUID();
        this.name = name;
    }
}

// Simple retro game launcher app
class RetroGameLauncher {
    constructor() {
        this.games = [];
        this.platforms = [];
        this.emulators = [];
        this.tags = [];
        this.selectedScanFolder = null;
        this.currentView = 'games';
        this.init();
    }

    // Simple UUID generator
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.loadData().then(() => {
            this.showView('games');
        });
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.getAttribute('href').substring(1);
                this.showView(view);
            });
        });
    }

    showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });
        
        // Show selected view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.remove('hidden');
            this.currentView = viewName;
        }

        if (viewName === 'scan') {
            this.populateScanPlatformSelect();
        }

        if (viewName === 'tags') {
            this.loadTags();
        }

        // Update nav active state
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('bg-primary', 'text-white');
            if (link.getAttribute('href') === `#${viewName}`) {
                link.classList.add('bg-primary', 'text-white');
            }
        });
    }

    async loadData() {
        try {
            this.games = await window.electronAPI.loadData('games') || [];
            this.platforms = await window.electronAPI.loadData('platforms') || [];
            this.emulators = await window.electronAPI.loadData('emulators') || [];
            this.tags = await window.electronAPI.loadData('tags') || [];

            // Normalize platform data to ensure 'id' property exists
            if (this.platforms) {
                this.platforms.forEach(p => {
                    if (p.platform_id && !p.id) {
                        p.id = p.platform_id.toString();
                    }
                });
            }
            
            this.renderGames();
            this.renderPlatforms();
            this.renderEmulators();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    renderGames() {
        const gamesGrid = document.getElementById('games-grid');
        if (this.games.length === 0) {
            gamesGrid.innerHTML = '<p class="text-neutral-400 col-span-full text-center py-8">No games found. Add some games to get started!</p>';
            return;
        }

        gamesGrid.innerHTML = this.games.map(game => `
            <div class="bg-neutral-800 rounded-lg p-4 hover:bg-neutral-700 transition-colors">
                <div class="aspect-[3/4] bg-neutral-700 rounded mb-3 flex items-center justify-center">
                    ${game.cover_image_path ? 
                        `<img src="${game.cover_image_path}" alt="${game.title}" class="w-full h-full object-cover rounded">` :
                        `<span class="text-neutral-500">No Image</span>`
                    }
                </div>
                <h3 class="font-semibold mb-1">${game.title}</h3>
                <p class="text-sm text-neutral-400 mb-2">${this.getPlatformName(game.platformId)}</p>
                <p class="text-sm text-neutral-400 mb-2">${game.description || 'No description'}</p>
                <div class="flex flex-wrap gap-1 mb-2">
                    ${(game.tags || []).map(tagId => {
                        const tag = this.tags.find(t => t.id === tagId);
                        return tag ? `<span class="bg-secondary text-xs px-2 py-1 rounded-full">${tag.name}</span>` : '';
                    }).join('')}
                </div>
                <div class="flex space-x-2 mt-2">
                    <button onclick='app.showEditGameModal(${JSON.stringify(game)})' class="bg-secondary hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors">
                        Edit
                    </button>
                    <button onclick="app.deleteGame('${game.id}')" class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderPlatforms() {
        const platformsList = document.getElementById('platforms-list');
        if (this.platforms.length === 0) {
            platformsList.innerHTML = '<p class="text-neutral-400 text-center py-8">No platforms configured.</p>';
            return;
        }

        platformsList.innerHTML = this.platforms.map(platform => `
            <div class="bg-neutral-800 rounded-lg p-4 flex items-center">
                <div class="w-32 h-32 mr-4 flex-shrink-0">
                    ${platform.cover_image_path ? 
                        `<img src="${platform.cover_image_path}" alt="${platform.name}" class="w-full h-full object-contain rounded">` :
                        `<div class="w-full h-full bg-neutral-700 rounded flex items-center justify-center text-neutral-500 text-center">No Image</div>`
                    }
                </div>
                <div class="flex-grow">
                    <h3 class="font-semibold text-lg mb-2">${platform.name}</h3>
                    <p class="text-neutral-400 text-sm mb-3">${platform.manufacturer || 'No manufacturer'}</p>
                    <p class="text-neutral-400 text-sm mb-3">${platform.release_year || 'No release year'}</p>
                    <p class="text-neutral-400 text-sm mb-3">${platform.description || 'No description available.'}</p>
                    <div class="flex flex-wrap gap-1 mb-2">
                        ${(platform.tags || []).map(tagId => {
                            const tag = this.tags.find(t => t.id === tagId);
                            return tag ? `<span class="bg-secondary text-xs px-2 py-1 rounded-full">${tag.name}</span>` : '';
                        }).join('')}
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="app.editPlatform('${platform.id}')" class="bg-secondary hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors">
                            Edit
                        </button>
                        <button onclick="app.deletePlatform('${platform.id}')" class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors">
                            Delete
                        </button>
                        <button onclick="app.viewPlatformImages('${platform.platform_id}')" class="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors">
                            View Images
                        </button>
                        <button onclick="app.queryDataSourcesForPlatform('${platform.name}')" class="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm transition-colors">
                            Query Data Sources
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async viewPlatformImages(platformId) {
        try {
            const media = await window.electronAPI.getPlatformMedia(platformId);
            this.showImageSelectionModal(media, platformId);
        } catch (error) {
            console.error('Error getting platform media:', error);
        }
    }

    showImageSelectionModal(media, platformId) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalFields = document.getElementById('modal-fields');
        const modalCancel = document.getElementById('modal-cancel');

        modalTitle.textContent = 'Select Platform Image';

        if (!media || Object.keys(media).length === 0) {
            modalFields.innerHTML = '<p class="text-neutral-400">No media found for this platform.</p>';
        } else {
            const imageItems = Object.entries(media).map(([type, url]) => {
                if (!url) return '';
                return `
                <div class="cursor-pointer group" onclick="app.selectPlatformImage('${url}', '${platformId}')">
                    <div class="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-neutral-700">
                    <img src="${url}" class="w-full h-full object-cover object-center group-hover:opacity-75">
                    </div>
                    <h3 class="mt-2 text-sm text-neutral-300 text-center capitalize">${type.replace(/_/g, ' ')}</h3>
                </div>
                `;
            }).join('');
            modalFields.innerHTML = `<div class="image-modal-grid grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8">${imageItems}</div>`;
        }

        modal.classList.remove('hidden');

        const closeModal = () => {
            modal.classList.add('hidden');
            document.getElementById('modal-save').classList.remove('hidden');
        };

        document.getElementById('modal-save').classList.add('hidden');
        modalCancel.addEventListener('click', closeModal, { once: true });
    }

    async selectPlatformImage(imageUrl, platformId) {
        const platform = this.platforms.find(p => p.platform_id.toString() === platformId.toString());
        if (platform) {
            platform.cover_image_path = imageUrl;
            await this.saveData('platforms', this.platforms);
            this.renderPlatforms();
        }
        const modal = document.getElementById('modal');
        modal.classList.add('hidden');
        document.getElementById('modal-save').classList.remove('hidden');
    }

    renderEmulators() {
        const emulatorsList = document.getElementById('emulators-list');
        if (this.emulators.length === 0) {
            emulatorsList.innerHTML = '<p class="text-neutral-400 text-center py-8">No emulators configured.</p>';
            return;
        }

        emulatorsList.innerHTML = this.emulators.map(emulator => `
            <div class="bg-neutral-800 rounded-lg p-4">
                <h3 class="font-semibold text-lg mb-2">${emulator.name}</h3>
                <p class="text-neutral-400 text-sm mb-1">Path: ${emulator.executablePath}</p>
                <p class="text-neutral-400 text-sm mb-3">Args: ${emulator.args}</p>
                <div class="flex flex-wrap gap-1 mb-2">
                    ${(emulator.tags || []).map(tagId => {
                        const tag = this.tags.find(t => t.id === tagId);
                        return tag ? `<span class="bg-secondary text-xs px-2 py-1 rounded-full">${tag.name}</span>` : '';
                    }).join('')}
                </div>
                <div class="flex space-x-2">
                    <button onclick="app.editEmulator('${emulator.emulator_id}')" class="bg-secondary hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors">
                        Edit
                    </button>
                    <button onclick="app.deleteEmulator('${emulator.emulator_id}')" class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Add game button
        document.getElementById('add-game-btn').addEventListener('click', () => {
            this.showAddGameModal();
        });

        // Add platform button
        document.getElementById('add-platform-btn').addEventListener('click', async () => {
            const platforms = await window.electronAPI.getPlatforms();
            this.showAddPlatformModal(platforms);
        });

        // Add emulator button
        document.getElementById('add-emulator-btn').addEventListener('click', () => {
            this.showAddEmulatorModal();
        });

        // Scan folder button
        document.getElementById('scan-folder-btn').addEventListener('click', () => {
            this.scanFolder();
        });

        // Start scan button
        document.getElementById('start-scan-btn').addEventListener('click', () => {
            this.startScan();
        });

        // Save settings button
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('add-tag-btn').addEventListener('click', () => {
            const newTagInput = document.getElementById('new-tag-input');
            this.addTag(newTagInput.value.trim());
            newTagInput.value = '';
        });
    }
        showModal(title, fields, onSubmit) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalFields = document.getElementById('modal-fields');
        const modalForm = document.getElementById('modal-form');
        const modalCancel = document.getElementById('modal-cancel');

        modalTitle.textContent = title;
        modalFields.innerHTML = fields.map(field => {
            let inputHtml = '';
            if (field.type === 'tags') {
                const itemTags = field.value || [];
                const tagOptions = this.tags.map(tag => {
                    const isSelected = itemTags.includes(tag.id);
                    return `<option value="${tag.id}" ${isSelected ? 'selected' : ''}>${tag.name}</option>`;
                }).join('');
                inputHtml = `
                    <select id="${field.id}" name="${field.id}" multiple class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded h-32">
                        ${tagOptions}
                    </select>
                `;
            }
            else if (field.type === 'select') {
                inputHtml = `
                    <select id="${field.id}" name="${field.id}" class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded">
                        ${field.options}
                    </select>
                `;
            } else if (field.type === 'textarea') {
                inputHtml = `
                    <textarea id="${field.id}" name="${field.id}" class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded" ${field.readOnly ? 'readonly' : ''}>${field.value || ''}</textarea>
                `;
            } else {
                inputHtml = `
                    <input type="${field.type || 'text'}" id="${field.id}" name="${field.id}" value="${field.value || ''}" ${field.readOnly ? 'readonly' : ''} class="w-full p-3 bg-neutral-800 border border-neutral-700 rounded">
                `;
            }
            return `
                <div class="mb-4">
                    <label class="block text-sm font-medium mb-2">${field.label}</label>
                    ${inputHtml}
                </div>
            `;
        }).join('');

        modal.classList.remove('hidden');

        const handleSubmit = (e) => {
            e.preventDefault();
            const formData = new FormData(modalForm);
            const data = {};
            for (const [key, value] of formData.entries()) {
                data[key] = value;
            }

            // Handle multi-select for tags
            const tagsSelect = modalForm.querySelector('select[name="tags"]');
            if (tagsSelect) {
                data.tags = Array.from(tagsSelect.selectedOptions).map(option => option.value);
            }
            onSubmit(data);
            closeModal();
        };

        const closeModal = () => {
            modal.classList.add('hidden');
            modalForm.removeEventListener('submit', handleSubmit);
        };

        modalForm.addEventListener('submit', handleSubmit);
        modalCancel.addEventListener('click', closeModal);
    }

    getPlatformName(platformId) {
        const platform = this.platforms.find(p => p.id === platformId);
        return platform ? platform.name : 'Unknown Platform';
    }

    showAddGameModal() {
        const platformOptions = this.platforms.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        const fields = [
            { id: 'title', label: 'Game Title' },
            { id: 'platformId', label: 'Platform', type: 'select', options: platformOptions },
            { id: 'romPath', label: 'ROM Path' },
            { id: 'tags', label: 'Tags', type: 'tags', value: [] }
        ];
        this.showModal('Add Game', fields, (data) => {
            if (data.title && data.platformId && data.romPath) {
                this.addGame(data);
            }
        });
    }

    showAddPlatformModal(platforms) {
        const platformOptions = platforms.map(p => {
            const isAdded = this.platforms.some(localP => localP.platform_id === p.id);
            return `<option value="${p.id}" ${isAdded ? 'disabled' : ''}>${p.name}${isAdded ? ' (Already Added)' : ''}</option>`;
        }).join('');

        const fields = [
            { id: 'platformId', label: 'Platform', type: 'select', options: platformOptions },
            { id: 'manufacturer', label: 'Manufacturer', value: '' },
            { id: 'release_year', label: 'Release Year', type: 'number', value: '' },
            { id: 'description', label: 'Description', type: 'textarea', value: '' },
            { id: 'tags', label: 'Tags', type: 'tags', value: [] }
        ];

        this.showModal('Add Platform', fields, (data) => {
            const selectedPlatform = platforms.find(p => p.id === parseInt(data.platformId));
            if (selectedPlatform) {
                this.addPlatform({
                    ...selectedPlatform,
                    manufacturer: data.manufacturer,
                    release_year: data.release_year,
                    description: data.description,
                    tags: data.tags
                });
            }
        });

        const platformSelect = document.getElementById('platformId');
        const manufacturerInput = document.getElementById('manufacturer');

        platformSelect.addEventListener('change', () => {
            const selectedPlatform = platforms.find(p => p.id === parseInt(platformSelect.value));
            if (selectedPlatform) {
                manufacturerInput.value = selectedPlatform.company || '';
            }
        });

        if (platformSelect.value) {
            platformSelect.dispatchEvent(new Event('change'));
        }
    }

    showAddEmulatorModal() {
        const fields = [
            { id: 'name', label: 'Emulator Name' },
            { id: 'executablePath', label: 'Executable Path' },
            { id: 'args', label: 'Arguments' },
            { id: 'tags', label: 'Tags', type: 'tags', value: [] }
        ];
        this.showModal('Add Emulator', fields, (data) => {
            if (data.name && data.executablePath) {
                this.addEmulator(data);
            }
        });
    }

    async addGame(gameData) {
        const existingGame = this.games.find(g => g.title === gameData.title && g.platformId === gameData.platformId);
        if (existingGame) {
            alert(`Game with title "${existingGame.title}" and platform "${this.getPlatformName(existingGame.platformId)}" already exists.`);
            return;
        }

        const newGame = {
            id: Date.now().toString(),
            title: gameData.title,
            platformId: gameData.platformId,
            romPath: gameData.romPath,
            coverImageUrl: '',
            description: '',
            genre: '',
            releaseDate: '',
            tags: gameData.tags || []
        };
        
        this.games.push(newGame);
        await this.saveData('games', this.games);
        this.renderGames();
    }

    async addPlatform(platformData) {
        const existingPlatform = this.platforms.find(p => p.platform_id === platformData.id);
        if (existingPlatform) {
            alert(`Platform with name "${platformData.name}" already exists.`);
            return;
        }

        const newPlatform = {
            id: platformData.id.toString(),
            platform_id: platformData.id,
            name: platformData.name,
            manufacturer: platformData.manufacturer || platformData.company || '',
            release_year: platformData.release_year || null,
            description: platformData.description || '',
            tags: platformData.tags || []
        };
        
        this.platforms.push(newPlatform);
        await this.saveData('platforms', this.platforms);
        this.renderPlatforms();
    }

    async addEmulator(emulatorData) {
        const existingEmulator = this.emulators.find(e => e.name === emulatorData.name);
        if (existingEmulator) {
            alert(`Emulator with name "${existingEmulator.name}" already exists.`);
            return;
        }

        const newEmulator = {
            emulator_id: this.generateUUID(),
            name: emulatorData.name,
            executablePath: emulatorData.executablePath || '',
            args: emulatorData.args || '',
            tags: emulatorData.tags || []
        };
        
        this.emulators.push(newEmulator);
        await this.saveData('emulators', this.emulators);
        this.renderEmulators();
    }

    async saveData(type, data) {
        try {
            await window.electronAPI.saveData(type, data);
        } catch (error) {
            console.error(`Error saving ${type}:`, error);
        }
    }

    async scanFolder() {
        const folderPath = await window.electronAPI.scanFolder();
        if (folderPath) {
            this.selectedScanFolder = folderPath;
            const scanResultsDiv = document.getElementById('scan-results');
            scanResultsDiv.classList.remove('hidden');
            scanResultsDiv.innerHTML = `<p class="text-green-400">Selected folder: ${folderPath}</p>`;
            this.updateScanButtonStates();
        }
    }

    async startScan() {
        if (!this.selectedScanFolder) {
            alert('Please select a folder first.');
            return;
        }

        const platformId = document.getElementById('scan-platform-select').value;
        if (!platformId) {
            alert('Please select a platform first.');
            return;
        }

        const files = await window.electronAPI.readDirectory(this.selectedScanFolder);
        const ignoredExtensions = ['.txt', '.doc', '.jpg', '.gif', '.png', '.mkv', '.avi', '.mp4', '.ttf'];
        const roms = files.filter(file => {
            const extension = file.substring(file.lastIndexOf('.')).toLowerCase();
            return !ignoredExtensions.includes(extension);
        });

        const scanResultsDiv = document.getElementById('scan-results');
        let html = `<h3 class="text-2xl font-bold mt-6 mb-4">Potential ROMs Found:</h3>`;
        if (roms.length > 0) {
            html += `
                <div class="flex space-x-2 mb-4">
                    <button id="select-all-roms" class="bg-secondary hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors">Select All</button>
                    <button id="deselect-all-roms" class="bg-secondary hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors">Deselect All</button>
                </div>
                <ul id="rom-list" class="space-y-2">`;
            roms.forEach(rom => {
                html += `
                    <li>
                        <label class="flex items-center">
                            <input type="checkbox" class="rom-checkbox form-checkbox h-5 w-5 bg-neutral-700 border-neutral-600 text-primary focus:ring-primary" value="${rom}" checked>
                            <span class="ml-2">${rom}</span>
                        </label>
                    </li>`;
            });
            html += `</ul>`;
            html += `
                <div class="mt-6">
                    <button id="import-roms-btn" class="bg-primary hover:bg-primary-dark px-4 py-2 rounded font-semibold transition-colors">
                        Import Selected ROMs
                    </button>
                </div>`;
        } else {
            html += `<p>No potential ROMs found.</p>`;
        }
        scanResultsDiv.innerHTML += html;

        if (roms.length > 0) {
            document.getElementById('select-all-roms').addEventListener('click', () => {
                document.querySelectorAll('.rom-checkbox').forEach(cb => cb.checked = true);
            });

            document.getElementById('deselect-all-roms').addEventListener('click', () => {
                document.querySelectorAll('.rom-checkbox').forEach(cb => cb.checked = false);
            });

            document.getElementById('import-roms-btn').addEventListener('click', () => {
                const selectedRoms = Array.from(document.querySelectorAll('.rom-checkbox:checked')).map(cb => cb.value);
                this.importRoms(selectedRoms);
            });
        }
    }

    importRoms(roms) {
        console.log('Importing roms:', roms);
        // Further implementation needed
    }

    async saveSettings() {
        const settings = {
            THEGAMESDB_API_KEY: document.getElementById('thegamesdb-key').value,
            RAWG_API_KEY: document.getElementById('rawg-key').value,
            GEMINI_API_KEY: document.getElementById('gemini-key').value
        };
        
        // Save settings logic would go here
        console.log('Settings saved:', settings);
        alert('Settings saved!');
    }

    async deleteGame(id) {
        if (confirm('Are you sure you want to delete this game?')) {
            this.games = this.games.filter(g => g.id !== id);
            await this.saveData('games', this.games);
            this.renderGames();
        }
    }

    showEditGameModal(game) {
        const platformOptions = this.platforms.map(p => `<option value="${p.id}" ${p.id === game.platformId ? 'selected' : ''}>${p.name}</option>`).join('');
        const fields = [
            { id: 'title', label: 'Game Title', value: game.title },
            { id: 'platformId', label: 'Platform', type: 'select', options: platformOptions },
            { id: 'romPath', label: 'ROM Path', value: game.romPath },
            { id: 'tags', label: 'Tags', type: 'tags', value: game.tags || [] }
        ];
        this.showModal('Edit Game', fields, (data) => {
            if (data.title && data.platformId && data.romPath) {
                const existingGame = this.games.find(g => g.title === data.title && g.platformId === data.platformId && g.id !== game.id);
                if (existingGame) {
                    alert(`Game with title "${existingGame.title}" and platform "${this.getPlatformName(existingGame.platformId)}" already exists.`);
                    return;
                }

                const gameToUpdate = this.games.find(g => g.id === game.id);
                if (gameToUpdate) {
                    gameToUpdate.title = data.title;
                    gameToUpdate.platformId = data.platformId;
                    gameToUpdate.romPath = data.romPath;
                    gameToUpdate.tags = data.tags;
                    this.saveData('games', this.games);
                    this.renderGames();
                }
            }
        });
    }

    editPlatform(id) {
        const platform = this.platforms.find(p => p.id === id);
        if (!platform) return;

        const fields = [
            { id: 'name', label: 'Platform Name', value: platform.name, readOnly: true },
            { id: 'manufacturer', label: 'Manufacturer', value: platform.manufacturer },
            { id: 'release_year', label: 'Release Year', type: 'number', value: platform.release_year },
            { id: 'description', label: 'Description', type: 'textarea', value: platform.description },
            { id: 'cover_image_path', label: 'Cover Image URL', value: platform.cover_image_path || '' },
            { id: 'tags', label: 'Tags', type: 'tags', value: platform.tags || [] }
        ];

        this.showModal('Edit Platform', fields, (data) => {
            platform.manufacturer = data.manufacturer;
            platform.release_year = data.release_year;
            platform.description = data.description;
            platform.cover_image_path = data.cover_image_path;
            platform.tags = data.tags;
            this.saveData('platforms', this.platforms);
            this.renderPlatforms();
        });
    }

    async deletePlatform(id) {
        if (confirm('Are you sure you want to delete this platform?')) {
            // Filter platforms safely, ensuring platform and its id are valid.
            this.platforms = this.platforms.filter(p => {
                if (!p || p.id === null || p.id === undefined) {
                    return false; // Remove invalid platform data
                }
                return p.id.toString() !== id.toString();
            });

            // If there are any games, filter out those associated with the deleted platform.
            if (this.games && this.games.length > 0) {
                this.games = this.games.filter(g => {
                    if (!g || g.platformId === null || g.platformId === undefined) {
                        return true; // Keep games that are invalid or have no platform ID
                    }
                    return g.platformId.toString() !== id.toString();
                });
            }

            await this.saveData('platforms', this.platforms);
            await this.saveData('games', this.games);
            this.renderPlatforms();
            this.renderGames();
        }
    }

    editEmulator(id) {
        const emulator = this.emulators.find(e => e.emulator_id === id);
        if (!emulator) return;

        const fields = [
            { id: 'name', label: 'Emulator Name', value: emulator.name || '' },
            { id: 'executablePath', label: 'Executable Path', value: emulator.executablePath || '' },
            { id: 'args', label: 'Arguments', value: emulator.args || '' },
            { id: 'tags', label: 'Tags', type: 'tags', value: emulator.tags || [] }
        ];

        this.showModal('Edit Emulator', fields, (data) => {
            if (data.name) {
                const existingEmulator = this.emulators.find(e => e.name === data.name && e.emulator_id !== id);
                if (existingEmulator) {
                    alert(`Emulator with name "${existingEmulator.name}" already exists.`);
                    return;
                }

                emulator.name = data.name;
                emulator.executablePath = data.executablePath;
                emulator.args = data.args;
                emulator.tags = data.tags;
                this.saveData('emulators', this.emulators);
                this.renderEmulators();
            }
        });
    }

    async deleteEmulator(id) {
        if (confirm('Are you sure you want to delete this emulator?')) {
            this.emulators = this.emulators.filter(e => e.emulator_id !== id);
            await this.saveData('emulators', this.emulators);
            this.renderEmulators();
        }
    }

    async queryDataSourcesForPlatform(platformName) {
        console.log(`Querying data sources for platform: ${platformName}`);
        try {
            const result = await window.electronAPI.queryDataSources(platformName);
            console.log('Query result:', result);
            const platform = this.platforms.find(p => p.name === platformName);
            if (platform && result) {
                console.log(`Found platform: ${platform.name}. Updating description.`);
                platform.description = result.description;
                await this.saveData('platforms', this.platforms);
                this.renderPlatforms();
                console.log('Platform description updated and UI re-rendered.');
            } else {
                console.warn('Could not find platform or missing result from data sources.', platform, result);
            }
        } catch (error) {
            console.error('Error querying data sources:', error);
        }
    }

    updateScanButtonStates() {
        const platformSelected = !!document.getElementById('scan-platform-select').value;
        const folderSelected = !!this.selectedScanFolder;
        const startScanBtn = document.getElementById('start-scan-btn');
        const selectFolderBtn = document.getElementById('scan-folder-btn');

        selectFolderBtn.disabled = !platformSelected;
        startScanBtn.classList.toggle('hidden', !(platformSelected && folderSelected));
    }

    populateScanPlatformSelect() {
        const select = document.getElementById('scan-platform-select');
        select.innerHTML = '<option value="">-- Select a Platform --</option>';

        this.platforms.forEach(platform => {
            const option = document.createElement('option');
            option.value = platform.id;
            option.textContent = platform.name;
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            this.updateScanButtonStates();
        });

        this.updateScanButtonStates();
    }

    loadTags() {
        this.renderTags(this.tags.sort((a, b) => a.name.localeCompare(b.name)));
    }

    renderTags(tags) {
        const tagsList = document.getElementById('tags-list');
        tagsList.innerHTML = tags.map(tag => `
            <div class="bg-neutral-800 rounded-lg p-4 flex items-center justify-between">
                <span>${tag.name}</span>
                <div>
                    <button onclick="app.editTag('${tag.id}')" class="bg-secondary hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors">
                        Edit
                    </button>
                    <button onclick="app.deleteTag('${tag.id}')" class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    async addTag(tagName) {
        if (!tagName) return;
        tagName = tagName.toLowerCase();
        if (this.tags.some(t => t.name === tagName)) {
            alert('Tag already exists.');
            return;
        }
        const newTag = new Tag(tagName);
        this.tags.push(newTag);
        await this.saveData('tags', this.tags);
        this.loadTags();
    }

    editTag(tagId) {
        const tag = this.tags.find(t => t.id === tagId);
        if (!tag) return;

        const fields = [
            { id: 'name', label: 'Tag Name', value: tag.name }
        ];

        this.showModal('Edit Tag', fields, (data) => {
            const newTagName = data.name.trim().toLowerCase();
            if (newTagName && newTagName !== tag.name) {
                if (this.tags.some(t => t.name === newTagName && t.id !== tagId)) {
                    alert('Tag already exists.');
                    return;
                }
                tag.name = newTagName;
                this.saveData('tags', this.tags);
                this.loadTags();
            }
        });
    }

    async deleteTag(tagId) {
        if (confirm(`Are you sure you want to delete this tag? This will remove it from all associated items.`)) {
            const tagToDelete = this.tags.find(t => t.id === tagId);
            if (!tagToDelete) return;

            this.tags = this.tags.filter(t => t.id !== tagId);

            this.platforms.forEach(p => {
                if (p.tags) p.tags = p.tags.filter(t => t !== tagId);
            });
            this.games.forEach(g => {
                if (g.tags) g.tags = g.tags.filter(t => t !== tagId);
            });
            this.emulators.forEach(e => {
                if (e.tags) e.tags = e.tags.filter(t => t !== tagId);
            });

            await this.saveData('tags', this.tags);
            await this.saveData('platforms', this.platforms);
            await this.saveData('games', this.games);
            await this.saveData('emulators', this.emulators);

            this.loadTags();
        }
    }
}

// Initialize the app
const app = new RetroGameLauncher();