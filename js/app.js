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
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.loadData().then(() => {
            this.loadSettings();
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
            this.initializeScanView();
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

            // Normalize platform data to ensure 'id' property exists and process media
            if (this.platforms) {
                this.platforms.forEach(p => {
                    if (p.platform_id && !p.id) {
                        p.id = p.platform_id.toString();
                    }
                    // Add video URL if available in media
                    if (p.media && p.media.video && !p.video_url) {
                        p.video_url = p.media.video;
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

    async getAssetPath(url) {
        if (!url) return url;
        try {
            // Use a simple caching mechanism to avoid repeated IPC calls for the same URL
            if (!this.assetPathCache) {
                this.assetPathCache = new Map();
            }
            
            if (this.assetPathCache.has(url)) {
                return this.assetPathCache.get(url);
            }
            
            const assetPath = await window.electronAPI.getAssetPath(url);
            this.assetPathCache.set(url, assetPath || url); // Fallback to original URL if asset path is null
            return assetPath || url;
        } catch (error) {
            console.error('Error getting asset path:', error);
            return url; // Fallback to original URL on error
        }
    }

    async renderGames() {
        const gamesGrid = document.getElementById('games-grid');
        if (this.games.length === 0) {
            gamesGrid.innerHTML = '<p class="text-neutral-400 col-span-full text-center py-8">No games found. Add some games to get started!</p>';
            return;
        }

        // Create a document fragment to build the HTML
        const fragment = document.createDocumentFragment();
        
        for (const game of this.games) {
            const gameElement = document.createElement('div');
            gameElement.className = 'bg-neutral-800 rounded-lg p-4 hover:bg-neutral-700 transition-colors';
            gameElement.innerHTML = `
                <div class="aspect-[3/4] bg-neutral-700 rounded mb-3 flex items-center justify-center relative overflow-hidden">
                    ${game.cover_image_path ? 
                        `<img src="${game.cover_image_path}" alt="${game.title}" class="w-full h-full object-cover rounded game-image" data-original-src="${game.cover_image_path}">` :
                        `<span class="text-neutral-500">No Image</span>`
                    }
                    ${game.video_url ? 
                        `<video class="game-video absolute inset-0 w-full h-full object-cover rounded opacity-0 transition-opacity duration-300" muted preload="none">
                            <source src="${game.video_url}" type="video/mp4" data-original-src="${game.video_url}">
                        </video>` :
                        ''
                    }
                </div>
                <h3 class="font-semibold mb-1">${game.title}</h3>
                <p class="text-sm text-neutral-400 mb-1">${this.getPlatformName(game.platformId)}</p>
                <p class="text-sm text-neutral-400 mb-1">${this.getEmulatorName(game.emulatorId)}</p>
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
                    <button onclick="app.launchGame('${game.id}')" class="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm transition-colors">
                        Launch
                    </button>
                    <button onclick="app.deleteGame('${game.id}')" class="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors">
                        Delete
                    </button>
                </div>
            `;
            
            fragment.appendChild(gameElement);
        }
        
        gamesGrid.innerHTML = '';
        gamesGrid.appendChild(fragment);

        // Process images and videos to use cached assets
        const images = gamesGrid.querySelectorAll('.game-image');
        const videos = gamesGrid.querySelectorAll('.game-video source');
        
        for (const img of images) {
            const originalSrc = img.getAttribute('data-original-src');
            if (originalSrc) {
                const assetPath = await this.getAssetPath(originalSrc);
                img.src = assetPath;
            }
        }
        
        for (const videoSource of videos) {
            const originalSrc = videoSource.getAttribute('data-original-src');
            if (originalSrc) {
                const assetPath = await this.getAssetPath(originalSrc);
                videoSource.src = assetPath;
            }
        }
        
        // Add event listeners for hover effects
        document.querySelectorAll('.game-image').forEach((img, index) => {
            const video = img.parentElement.querySelector('.game-video');
            if (video) {
                img.addEventListener('mouseenter', () => {
                    video.classList.remove('opacity-0');
                    video.classList.add('opacity-100');
                    video.play().catch(e => console.log("Video play failed:", e));
                });
                
                img.addEventListener('mouseleave', () => {
                    video.classList.remove('opacity-100');
                    video.classList.add('opacity-0');
                    video.pause();
                    video.currentTime = 0;
                });
            }
        });
    }

    renderPlatforms() {
        const platformsList = document.getElementById('platforms-list');
        if (this.platforms.length === 0) {
            platformsList.innerHTML = '<p class="text-neutral-400 text-center py-8">No platforms configured.</p>';
            return;
        }

        platformsList.innerHTML = this.platforms.map(platform => `
            <div class="bg-neutral-800 rounded-lg p-4 flex items-center">
                <div class="w-32 h-32 mr-4 flex-shrink-0 relative">
                    ${platform.cover_image_path ?
                `<img src="${platform.cover_image_path}" alt="${platform.name}" class="w-full h-full object-contain rounded">` :
                `<div class="w-full h-full bg-neutral-700 rounded flex items-center justify-center text-neutral-500 text-center">No Image</div>`
            }
                    ${platform.video_url ? 
                `<button onclick="app.playVideo('${platform.video_url}')" class="absolute bottom-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center">
                    ▶
                </button>` : ''
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

        modalTitle.textContent = 'Select Platform Media';

        if (!media || Object.keys(media).length === 0) {
            modalFields.innerHTML = '<p class="text-neutral-400">No media found for this platform.</p>';
        } else {
            const mediaItems = Object.entries(media).map(([type, url]) => {
                if (!url) return '';
                
                // Check if it's a video based on file extension
                const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg');
                
                if (isVideo) {
                    // For videos, show a video icon/thumbnail
                    return `
                    <div class="cursor-pointer group" onclick="app.selectPlatformImage('${url}', '${platformId}')">
                        <div class="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-neutral-700 flex items-center justify-center">
                            <div class="text-center">
                                <div class="text-4xl mb-2">▶️</div>
                                <div class="text-neutral-300">Video</div>
                            </div>
                        </div>
                        <h3 class="mt-2 text-sm text-neutral-300 text-center capitalize">${type.replace(/_/g, ' ')}</h3>
                    </div>
                    `;
                } else {
                    // For images, show the image
                    return `
                    <div class="cursor-pointer group" onclick="app.selectPlatformImage('${url}', '${platformId}')">
                        <div class="aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-neutral-700">
                        <img src="${url}" class="w-full h-full object-cover object-center group-hover:opacity-75">
                        </div>
                        <h3 class="mt-2 text-sm text-neutral-300 text-center capitalize">${type.replace(/_/g, ' ')}</h3>
                    </div>
                    `;
                }
            }).join('');
            modalFields.innerHTML = `<div class="image-modal-grid grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8">${mediaItems}</div>`;
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
            // Check if the selected media is a video or an image
            if (imageUrl.includes('.mp4') || imageUrl.includes('.webm') || imageUrl.includes('.ogg')) {
                // It's a video, update the video URL
                platform.video_url = imageUrl;
            } else {
                // It's an image, update the cover image path
                platform.cover_image_path = imageUrl;
            }
            await this.saveData('platforms', this.platforms);
            this.renderPlatforms();
        }
        const modal = document.getElementById('modal');
        modal.classList.add('hidden');
        document.getElementById('modal-save').classList.remove('hidden');
    }

    renderEmulators() {
        // Use the EmulatorRenderer class to render emulators
        const emulatorRenderer = new EmulatorRenderer(this);
        emulatorRenderer.renderEmulators();
    }

    setupEventListeners() {
        // Add game button
        document.getElementById('add-game-btn').addEventListener('click', () => {
            this.showAddGameModal();
        });

        // Add platform button
        const addPlatformBtn = document.getElementById('add-platform-btn');
        if (addPlatformBtn) {
            addPlatformBtn.addEventListener('click', async () => {
                const platforms = await window.electronAPI.getPlatforms();
                this.showAddPlatformModal(platforms);
            });
        }

        // Add emulator button
        const addEmulatorBtn = document.getElementById('add-emulator-btn');
        if (addEmulatorBtn) {
            addEmulatorBtn.addEventListener('click', () => {
                this.showAddEmulatorModal();
            });
        }

        // Discover emulators button
        const discoverEmulatorsBtn = document.getElementById('discover-emulators-btn');
        if (discoverEmulatorsBtn) {
            discoverEmulatorsBtn.addEventListener('click', () => {
                this.discoverEmulators();
            });
        }

        // Scan folder button
        const scanFolderBtn = document.getElementById('scan-folder-btn');
        if (scanFolderBtn) {
            scanFolderBtn.addEventListener('click', () => {
                this.scanFolder();
            });
        }

        // Get suggestions button
        const getSuggestionsBtn = document.getElementById('get-suggestions-btn');
        if (getSuggestionsBtn) {
            getSuggestionsBtn.addEventListener('click', () => {
                this.getSuggestions();
            });
        }

        // Enrich selected button
        const enrichSelectedBtn = document.getElementById('enrich-selected-btn');
        if (enrichSelectedBtn) {
            enrichSelectedBtn.addEventListener('click', () => {
                this.enrichSelected();
            });
        }

        // Import selected button
        const importSelectedBtn = document.getElementById('import-selected-btn');
        if (importSelectedBtn) {
            importSelectedBtn.addEventListener('click', () => {
                this.importSelected();
            });
        }

        // Select all ROMs checkbox
        const selectAllRoms = document.getElementById('select-all-roms');
        if (selectAllRoms) {
            selectAllRoms.addEventListener('change', (e) => {
                const checkboxes = document.querySelectorAll('.rom-checkbox');
                checkboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                });
            });
        }

        // Event delegation for details buttons
        const romsTableBody = document.getElementById('roms-table-body');
        if (romsTableBody) {
            romsTableBody.addEventListener('click', (e) => {
                if (e.target.classList.contains('details-btn')) {
                    this.showEnrichedDetails(e.target.closest('tr'));
                }
            });
        }

        // Save settings button
        const saveSettingsBtn = document.getElementById('save-settings-btn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }

        const addTagBtn = document.getElementById('add-tag-btn');
        if (addTagBtn) {
            addTagBtn.addEventListener('click', () => {
                const newTagInput = document.getElementById('new-tag-input');
                this.addTag(newTagInput.value.trim());
                newTagInput.value = '';
            });
        }

        // Password visibility toggle functionality
        document.addEventListener('click', (e) => {
            if (e.target.closest('.toggle-password-visibility')) {
                const toggleButton = e.target.closest('.toggle-password-visibility');
                const targetId = toggleButton.getAttribute('data-target');
                const input = document.getElementById(targetId);
                const eyeIcon = toggleButton.querySelector('.eye-icon');
                const eyeOpen = toggleButton.querySelectorAll('.eye-open');
                const eyeClosed = toggleButton.querySelector('.eye-closed');

                if (input && eyeIcon) {
                    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
                    input.setAttribute('type', type);
                    
                    // Toggle eye icons
                    if (type === 'password') {
                        eyeOpen.forEach(el => el.classList.add('hidden'));
                        eyeClosed.classList.remove('hidden');
                    } else {
                        eyeOpen.forEach(el => el.classList.remove('hidden'));
                        eyeClosed.classList.add('hidden');
                    }
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save settings
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (this.currentView === 'settings') {
                    this.saveSettings();
                }
            }

            // ESC to close modals
            if (e.key === 'Escape') {
                const modal = document.getElementById('modal');
                if (modal && !modal.classList.contains('hidden')) {
                    modal.classList.add('hidden');
                    const modalSave = document.getElementById('modal-save');
                    if (modalSave) {
                        modalSave.classList.remove('hidden');
                    }
                }
            }
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
                    <select id="${field.id}" name="${field.id}" class="p-3 bg-neutral-800 border border-neutral-700 rounded w-full" multiple>
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

            // Show loading state
            const saveButton = document.getElementById('modal-save');
            const originalText = saveButton.textContent;
            saveButton.textContent = 'Saving...';
            saveButton.disabled = true;

            onSubmit(data);
            closeModal();

            // Reset button state (in case closeModal didn't handle it)
            saveButton.textContent = originalText;
            saveButton.disabled = false;
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

    getEmulatorName(emulatorId) {
        if (!emulatorId) return 'No emulator selected';
        const emulator = this.emulators.find(e => e.emulator_id === emulatorId);
        return emulator ? emulator.name : 'Unknown Emulator';
    }

    showAddGameModal() { const platformOptions = this.platforms.map(p => `<option value=\"${p.id}\">${p.name}</option>`).join(''); const emulatorOptions = this.emulators.map(e => `<option value=\"${e.emulator_id}\">${e.name}</option>`).join(''); const fields = [{ id: 'title', label: 'Game Title' }, { id: 'platformId', label: 'Platform', type: 'select', options: platformOptions }, { id: 'emulatorId', label: 'Emulator', type: 'select', options: `<option value=\"\">-- Select an Emulator --</option>${emulatorOptions}` }, { id: 'romPath', label: 'ROM Path' }, { id: 'tags', label: 'Tags', type: 'tags', value: [] }]; this.showModal('Add Game', fields, (data) => { if (data.title && data.platformId && data.romPath) { this.addGame(data); } }); }

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
            { id: 'description', label: 'Description', type: 'textarea' },
            { id: 'website', label: 'Website' },
            { id: 'tags', label: 'Tags', type: 'tags', value: [] }
        ];
        this.showModal('Add Emulator', fields, (data) => {
            if (data.name && data.executablePath) {
                this.addEmulator(data);
            }
        });
    }

    async addGame(gameData) {
        // Validate required fields
        if (!gameData.title) {
            alert('Game title is required.');
            return;
        }

        if (!gameData.platformId) {
            alert('Platform is required.');
            return;
        }

        if (!gameData.romPath) {
            alert('ROM path is required.');
            return;
        }

        const existingGame = this.games.find(g => g.title === gameData.title && g.platformId === gameData.platformId);
        if (existingGame) {
            alert(`Game with title "${existingGame.title}" and platform "${this.getPlatformName(existingGame.platformId)}" already exists.`);
            return;
        }

        const newGame = {
            id: gameData.id || Date.now().toString(),
            title: gameData.title,
            platformId: gameData.platformId,
            emulatorId: gameData.emulatorId || '',
            romPath: gameData.romPath,
            cover_image_path: gameData.cover_image_path || '',
            description: gameData.description || '',
            genre: gameData.genre || '',
            releaseDate: gameData.releaseDate || '',
            tags: gameData.tags || []
        };

        this.games.push(newGame);
        await this.saveData('games', this.games);
        this.renderGames();
    }

    async addPlatform(platformData) {
        // Validate required fields
        if (!platformData.id) {
            alert('Platform ID is required.');
            return;
        }

        if (!platformData.name) {
            alert('Platform name is required.');
            return;
        }

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
        // Validate required fields
        if (!emulatorData.name) {
            alert('Emulator name is required.');
            return;
        }

        if (!emulatorData.executablePath) {
            alert('Emulator executable path is required.');
            return;
        }

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
            description: emulatorData.description || '',
            website: emulatorData.website || '',
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
            document.getElementById('scan-folder-btn').textContent = this.selectedScanFolder;
            this.startScan();
        }
    }

    async discoverEmulators() {
        try {
            // Show scanning indicator with progress
            const emulatorsList = document.getElementById('emulators-list');
            emulatorsList.innerHTML = `
                <div class="text-neutral-400 text-center py-8">
                    <p>Discovering emulators... <span class="loading-spinner"></span></p>
                    <div id="discovery-progress" class="mt-4 text-sm text-neutral-500">
                        <p>Initializing discovery...</p>
                    </div>
                </div>
            `;

            const progressElement = document.getElementById('discovery-progress');

            // Update progress text
            const updateProgress = (message) => {
                if (progressElement) {
                    progressElement.innerHTML = `<p>${message}</p>`;
                }
            };

            // Set up progress handler
            window.handleEmulatorDiscoveryProgress = updateProgress;

            // Call the Electron IPC to discover emulators
            const discoveredEmulators = await window.electronAPI.discoverEmulators();

            // Clean up progress handler
            window.handleEmulatorDiscoveryProgress = null;

            if (discoveredEmulators.length === 0) {
                emulatorsList.innerHTML = '<p class="text-neutral-400 text-center py-8">No emulators found. You can manually add emulators using the "Add Emulator" button.</p>';
                return;
            }

            // Add discovered emulators to our list (avoiding duplicates)
            updateProgress(`Found ${discoveredEmulators.length} emulators. Configuring...`);

            let addedCount = 0;
            for (const [index, discovered] of discoveredEmulators.entries()) {
                const existing = this.emulators.find(e => e.executablePath === discovered.executablePath);
                if (!existing) {
                    this.emulators.push({
                        emulator_id: discovered.id,
                        name: discovered.name,
                        executablePath: discovered.executablePath,
                        args: discovered.args || '',
                        description: `Auto-discovered ${discovered.installationType} emulator`,
                        website: '',
                        tags: discovered.tags || [],
                        installationType: discovered.installationType,
                        packageInfo: discovered.packageInfo || null,
                        flatpakInfo: discovered.flatpakInfo || null,
                        snapInfo: discovered.snapInfo || null,
                        supportedPlatforms: discovered.supportedPlatforms || [],
                        workingDirectory: '',
                        environmentVariables: {},
                        displayMode: 'windowed',
                        resolution: '',
                        audioSettings: {},
                        performance: {}
                    });
                    addedCount++;
                    updateProgress(`Configuring ${discovered.name} (${index + 1}/${discoveredEmulators.length})...`);
                }
            }

            await this.saveData('emulators', this.emulators);
            this.renderEmulators();

            // Show a more detailed result message instead of an alert
            const resultMessage = addedCount > 0
                ? `Discovery complete! Found ${discoveredEmulators.length} emulators, added ${addedCount} new ones.`
                : `Discovery complete! Found ${discoveredEmulators.length} emulators. None were added because they already exist.`;

            // Prepend the success message to the top of the emulators list
            const successMessage = document.createElement('div');
            successMessage.className = 'emulator-discovery-success bg-green-900/30 border border-green-800 rounded-lg p-4 mb-6';
            successMessage.innerHTML = `<p class="text-green-400 font-semibold">${resultMessage}</p>`;
            emulatorsList.insertBefore(successMessage, emulatorsList.firstChild);

            // Clear the message after 5 seconds
            setTimeout(() => {
                if (successMessage && successMessage.parentNode) {
                    successMessage.remove();
                }
            }, 5000);
        } catch (error) {
            console.error('Error discovering emulators:', error);
            const emulatorsList = document.getElementById('emulators-list');
            emulatorsList.innerHTML = '<p class="text-red-500 text-center py-8">Error discovering emulators. Check console for details.</p>';
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

        // Show scanning indicator
        const romsTableBody = document.getElementById('roms-table-body');
        romsTableBody.innerHTML = '<tr><td colspan="5" class="p-3 text-center">Scanning folder... <span id="scan-progress"></span></td></tr>';

        try {
            const files = await window.electronAPI.readDirectory(this.selectedScanFolder);
            const ignoredExtensions = ['.txt', '.doc', '.jpg', '.gif', '.png', '.mkv', '.avi', '.mp4', '.ttf'];

            // Filter ROM files
            const roms = files.filter(file => {
                const extension = file.substring(file.lastIndexOf('.')).toLowerCase();
                return !ignoredExtensions.includes(extension);
            });

            romsTableBody.innerHTML = roms.map(rom => `
                <tr data-rom="${rom}" data-status="new">
                    <td class="p-3"><input type="checkbox" class="rom-checkbox"></td>
                    <td class="p-3">${rom}</td>
                    <td class="p-3"><input type="text" class="w-full bg-neutral-700 p-2 rounded" value=""></td>
                    <td class="p-3"><span class="status-badge bg-gray-600">New</span></td>
                    <td class="p-3">
                        <button class="details-btn bg-neutral-600 hover:bg-neutral-500 px-3 py-1 rounded text-sm" disabled>Details</button>
                    </td>
                </tr>
            `).join('');

            document.getElementById('scan-pipeline').classList.remove('hidden');
        } catch (error) {
            console.error('Error scanning folder:', error);
            romsTableBody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-red-500">Error scanning folder. Check console for details.</td></tr>';
        }
    }

    async getSuggestions() {
        const romRows = Array.from(document.querySelectorAll('#roms-table-body tr'));
        const selectedRows = romRows.filter(row => row.querySelector('.rom-checkbox').checked);

        if (selectedRows.length === 0) {
            alert('Please select at least one ROM to get suggestions for.');
            return;
        }

        const platformName = this.getPlatformName(document.getElementById('scan-platform-select').value);
        const romsToProcess = selectedRows.map(row => row.dataset.rom);

        // Show progress
        const progressElement = document.getElementById('scan-progress');
        if (progressElement) {
            progressElement.textContent = `Processing ${romsToProcess.length} ROMs...`;
        }

        const batchSize = 25;
        let processedCount = 0;

        for (let i = 0; i < romsToProcess.length; i += batchSize) {
            const batch = romsToProcess.slice(i, i + batchSize);

            // Update progress
            if (progressElement) {
                progressElement.textContent = `Processing ${processedCount}/${romsToProcess.length} ROMs...`;
            }

            try {
                const suggestions = await window.electronAPI.queryGeminiTitlesBatch(batch, platformName);
                selectedRows.forEach(row => {
                    const romName = row.dataset.rom;
                    if (suggestions[romName]) {
                        row.querySelector('input[type="text"]').value = suggestions[romName];
                        this.updateRomStatus(row, 'Suggested', 'bg-blue-600');
                    }
                });

                processedCount += batch.length;
            } catch (error) {
                console.error('Error getting suggestions from AI:', error);
                alert('An error occurred while getting suggestions from the AI.');
                break;
            }
        }

        // Clear progress indicator
        if (progressElement) {
            progressElement.textContent = '';
        }

        alert(`${processedCount} ROMs processed!`);
    }

    async enrichSelected() {
        const romRows = Array.from(document.querySelectorAll('#roms-table-body tr'));
        const selectedRows = romRows.filter(row => row.querySelector('.rom-checkbox').checked);

        if (selectedRows.length === 0) {
            alert('Please select at least one ROM to enrich.');
            return;
        }

        const platformId = document.getElementById('scan-platform-select').value;

        // Show progress
        const progressElement = document.getElementById('scan-progress');
        if (progressElement) {
            progressElement.textContent = `Enriching ${selectedRows.length} ROMs...`;
        }

        let enrichedCount = 0;
        let errorCount = 0;

        for (const [index, row] of selectedRows.entries()) {
            const suggestedTitle = row.querySelector('input[type="text"]').value;
            if (!suggestedTitle) {
                this.updateRomStatus(row, 'Needs Suggestion', 'bg-yellow-600');
                continue;
            }

            this.updateRomStatus(row, 'Enriching...', 'bg-yellow-600');

            try {
                const result = await window.electronAPI.searchGameOnScreenScraper(platformId, suggestedTitle);
                
                // Check if result indicates success
                if (result && result.success) {
                    const enrichedGame = this.processScreenScraperResponse(result.data, row.dataset.rom);
                    if (enrichedGame) {
                        row.dataset.enriched = JSON.stringify(enrichedGame);
                        this.updateRomStatus(row, 'Enriched', 'bg-green-600');
                        row.querySelector('.details-btn').disabled = false;
                        enrichedCount++;
                    } else {
                        this.updateRomStatus(row, 'Enrichment Failed', 'bg-red-600');
                        errorCount++;
                    }
                } else if (result && result.error) {
                    // Handle specific errors, especially authentication errors
                    if (result.error.includes('Authentication failed')) {
                        this.updateRomStatus(row, 'Auth Error', 'bg-red-800');
                        // Show alert for authentication error but only once
                        if (errorCount === 0) {
                            alert('Authentication failed: Please check your ScreenScraper credentials in the .env file');
                        }
                    } else {
                        this.updateRomStatus(row, 'Not Found', 'bg-red-600');
                    }
                    errorCount++;
                } else {
                    this.updateRomStatus(row, 'Not Found', 'bg-red-600');
                    errorCount++;
                }
            } catch (error) {
                console.error(`Failed to enrich ${suggestedTitle}:`, error);
                this.updateRomStatus(row, 'Error', 'bg-red-600');
                errorCount++;
            }

            // Update progress
            if (progressElement) {
                progressElement.textContent = `Enriched ${enrichedCount}/${selectedRows.length} ROMs...`;
            }
        }

        // Clear progress indicator
        if (progressElement) {
            progressElement.textContent = '';
        }

        alert(`Enrichment complete! ${enrichedCount} enriched, ${errorCount} errors.`);
    }

    async importSelected() {
        const romRows = Array.from(document.querySelectorAll('#roms-table-body tr'));
        const selectedRows = romRows.filter(row => row.querySelector('.rom-checkbox').checked && row.dataset.enriched);

        if (selectedRows.length === 0) {
            alert('Please select at least one enriched ROM to import.');
            return;
        }

        // Show progress
        const progressElement = document.getElementById('scan-progress');
        if (progressElement) {
            progressElement.textContent = `Importing ${selectedRows.length} ROMs...`;
        }

        let importedCount = 0;
        for (const [index, row] of selectedRows.entries()) {
            const gameData = JSON.parse(row.dataset.enriched);
            await this.addGame(gameData);
            this.updateRomStatus(row, 'Imported', 'bg-purple-600');
            row.querySelector('.rom-checkbox').disabled = true;
            importedCount++;

            // Update progress
            if (progressElement) {
                progressElement.textContent = `Imported ${importedCount}/${selectedRows.length} ROMs...`;
            }
        }

        // Clear progress indicator
        if (progressElement) {
            progressElement.textContent = '';
        }

        alert(`${importedCount} games imported successfully!`);
        this.showView('games');
    }

    updateRomStatus(row, text, badgeClass) {
        const statusBadge = row.querySelector('.status-badge');
        statusBadge.textContent = text;
        statusBadge.className = `status-badge ${badgeClass}`;
    }

    showEnrichedDetails(row) {
        const gameData = JSON.parse(row.dataset.enriched);
        const fields = [
            { id: 'title', label: 'Title', value: gameData.title, readOnly: true },
            { id: 'platform', label: 'Platform', value: this.getPlatformName(gameData.platformId), readOnly: true },
            { id: 'description', label: 'Description', type: 'textarea', value: gameData.description, readOnly: true },
            { id: 'genre', label: 'Genre', value: gameData.genre, readOnly: true },
            { id: 'developer', label: 'Developer', value: gameData.developers, readOnly: true },
            { id: 'publisher', label: 'Publisher', value: gameData.publishers, readOnly: true },
            { id: 'players', label: 'Players', value: gameData.players, readOnly: true },
            { id: 'releaseDate', label: 'Release Date', value: gameData.releaseDate, readOnly: true },
            { id: 'cover_image_path', label: 'Cover Image', value: gameData.cover_image_path, readOnly: true },
        ];
        this.showModal('Enriched Details', fields, () => { });
    }

    processScreenScraperResponse(gameData, romPath) {
        // Handle the case where gameData is a single game object or an array
        const game = Array.isArray(gameData) ? gameData[0] : gameData;
        
        if (!game) {
            return null;
        }

        const getTitle = (noms) => {
            if (!noms || noms.length === 0) return 'Unknown Title';
            const preferredRegions = ['us', 'eu', 'ss', 'wor'];
            for (const region of preferredRegions) {
                const nom = noms.find(n => n.region === region);
                if (nom) return nom.text;
            }
            return noms[0].text || 'Unknown Title';
        };

        const getScreenshot = (medias) => {
            if (!medias || medias.length === 0) return '';
            const screenshot = medias.find(m => m.type === 'ss' || m.type === 'screenshot');
            if (screenshot && screenshot.url) return screenshot.url;
            const boxart = medias.find(m => m.type === 'box-2D');
            return boxart && boxart.url ? boxart.url : '';
        };

        const getDescription = (synopsis) => {
            if (!synopsis) return '';
            const desc = synopsis.find(s => s.langue === 'en');
            return desc ? desc.text : (synopsis[0]?.text || '');
        };

        const getGenre = (genres) => {
            if (!genres || genres.length === 0) return '';
            const genre = genres[0];
            if (genre.noms && genre.noms.length > 0) {
                const enGenre = genre.noms.find(n => n.langue === 'en');
                return enGenre ? enGenre.text : (genre.noms[0]?.text || '');
            }
            return '';
        };

        const getReleaseDate = (dates) => {
            if (!dates || dates.length === 0) return '';
            return dates[0].text;
        };

        const getVideo = (medias) => {
            // Try to find a video
            const video = medias.find(m => m.type === 'video' && m.url);
            if (video) return video.url;
            // Return empty string if no video found
            return '';
        };

        // Get platform ID from the game data
        const platformId = game.systeme ? game.systeme.id : '';

        return {
            id: game.id,
            title: getTitle(game.noms),
            platformId: platformId,
            emulatorId: '',
            romPath: romPath,
            cover_image_path: getScreenshot(game.medias),
            video_url: getVideo(game.medias),
            description: getDescription(game.synopsis),
            genre: getGenre(game.genres),
            releaseDate: getReleaseDate(game.dates),
            tags: []
        };
    }

    async saveSettings() {
        const settings = {
            THEGAMESDB_API_KEY: document.getElementById('thegamesdb-key').value,
            RAWG_API_KEY: document.getElementById('rawg-key').value,
            GEMINI_API_KEY: document.getElementById('gemini-key').value,
            LOW_RESOURCES_MODE: document.getElementById('low-resources-mode').checked
        };

        try {
            // Save settings through Electron IPC
            const result = await window.electronAPI.saveSettings(settings);
            if (result.success) {
                // Check the low resources setting and apply it immediately
                if (typeof window.checkLowResourcesSetting === 'function') {
                    // Add a small delay to ensure settings are properly saved
                    setTimeout(() => {
                        window.checkLowResourcesSetting();
                    }, 100);
                }
                alert('Settings saved successfully!');
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            alert('Failed to save settings. Check console for details.');
        }
    }

    async loadSettings() {
        try {
            const settings = await window.electronAPI.loadSettings();
            document.getElementById('thegamesdb-key').value = settings.THEGAMESDB_API_KEY || '';
            document.getElementById('rawg-key').value = settings.RAWG_API_KEY || '';
            document.getElementById('gemini-key').value = settings.GEMINI_API_KEY || '';
            document.getElementById('low-resources-mode').checked = settings.LOW_RESOURCES_MODE || false;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async launchGame(gameId) {
        const game = this.games.find(g => g.id === gameId);
        if (!game) {
            alert('Game not found!');
            return;
        }

        const platform = this.platforms.find(p => p.id === game.platformId);
        if (!platform) {
            alert('Platform not found!');
            return;
        }

        // Find emulator for this game, or fallback to platform-based selection
        let emulator;
        if (game.emulatorId) {
            // Use the specific emulator selected for this game
            emulator = this.emulators.find(e => e.emulator_id === game.emulatorId);
        } else {
            // Fallback to finding emulator for this platform
            emulator = this.emulators.find(e => {
                // This is a simplified approach - in a real app, you'd have a more sophisticated way
                // of associating emulators with platforms
                return e.tags && e.tags.includes(platform.id);
            }) || this.emulators[0]; // Fallback to first emulator if none found
        }

        if (!emulator) {
            alert('No emulator configured! Please add an emulator first.');
            return;
        }

        try {
            await window.electronAPI.launchGame({
                romPath: game.romPath,
                emulatorPath: emulator.executablePath,
                emulatorArgs: emulator.args || ''
            });
            console.log('Game launch initiated');
        } catch (error) {
            console.error('Error launching game:', error);
            alert('Failed to launch game. Check console for details.');
        }
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
        const emulatorOptions = this.emulators.map(e => `<option value="${e.emulator_id}" ${e.emulator_id === game.emulatorId ? 'selected' : ''}>${e.name}</option>`).join('');
        const fields = [
            { id: 'title', label: 'Game Title', value: game.title },
            { id: 'platformId', label: 'Platform', type: 'select', options: platformOptions },
            { id: 'emulatorId', label: 'Emulator', type: 'select', options: `<option value="">-- Select an Emulator --</option>${emulatorOptions}` },
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
                    gameToUpdate.emulatorId = data.emulatorId;
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
            { id: 'description', label: 'Description', type: 'textarea', value: emulator.description || '' },
            { id: 'website', label: 'Website', value: emulator.website || '' },
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
                emulator.description = data.description;
                emulator.website = data.website;
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
                console.log(`Found platform: ${platform.name}. Updating platform information.`);
                // Update all available fields from the result
                if (result.description !== undefined) {
                    platform.description = result.description;
                }
                if (result.manufacturer !== undefined) {
                    platform.manufacturer = result.manufacturer;
                }
                if (result.release_year !== undefined) {
                    platform.release_year = result.release_year;
                }
                await this.saveData('platforms', this.platforms);
                this.renderPlatforms();
                console.log('Platform information updated and UI re-rendered.');
            } else {
                console.warn('Could not find platform or missing result from data sources.', platform, result);
            }
        } catch (error) {
            console.error('Error querying data sources:', error);
        }
    }

    initializeScanView() {
        const select = document.getElementById('scan-platform-select');
        select.innerHTML = '<option value="">-- Select a Platform --</option>';

        this.platforms.forEach(platform => {
            const option = document.createElement('option');
            option.value = platform.id;
            option.textContent = platform.name;
            select.appendChild(option);
        });

        select.addEventListener('change', () => {
            document.getElementById('scan-folder-btn').disabled = !select.value;
        });

        document.getElementById('scan-folder-btn').disabled = !select.value;
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

    playVideo(videoUrl) {
        // Create a modal to play the video
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalFields = document.getElementById('modal-fields');
        const modalCancel = document.getElementById('modal-cancel');
        const modalSave = document.getElementById('modal-save');

        modalTitle.textContent = 'Video Player';
        
        // Create video player element
        modalFields.innerHTML = `
            <div class="video-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
                <video controls style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: black;">
                    <source src="${videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            </div>
        `;

        modal.classList.remove('hidden');

        const closeModal = () => {
            // Pause the video when closing the modal
            const video = modalFields.querySelector('video');
            if (video) {
                video.pause();
            }
            modal.classList.add('hidden');
            modalSave.classList.remove('hidden');
        };

        modalSave.classList.add('hidden');
        modalCancel.addEventListener('click', closeModal, { once: true });
    }
}

// Initialize the app
const app = new RetroGameLauncher();