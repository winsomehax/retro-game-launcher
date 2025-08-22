// Simple retro game launcher app

class Tag {
    constructor(name) {
        this.id = RetroGameLauncher.generateUUID();
        this.name = name;
    }
}
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
    static generateUUID() {
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
            const rawData = {
                games: await window.electronAPI.loadData('games') || [],
                platforms: await window.electronAPI.loadData('platforms') || [],
                emulators: await window.electronAPI.loadData('emulators') || [],
                tags: await window.electronAPI.loadData('tags') || []
            };

            // Normalize data using DataModel
            this.games = window.DataModel ? 
                window.DataModel.normalizeGameData(rawData.games) : 
                rawData.games;
                
            this.platforms = window.DataModel ? 
                window.DataModel.normalizePlatformData(rawData.platforms) : 
                rawData.platforms;
                
            this.emulators = window.DataModel ? 
                window.DataModel.normalizeEmulatorData(rawData.emulators) : 
                rawData.emulators;
                
            this.tags = window.DataModel ? 
                window.DataModel.normalizeTagData(rawData.tags) : 
                rawData.tags;

            // Build indexes for efficient searching and filtering
            this.buildIndexes();
            
            this.renderGames();
            this.renderPlatforms();
            this.renderEmulators();
        } catch (error) {
            const sanitizedError = window.Sanitizer ? window.Sanitizer.sanitizeForLog(error.message) : error.message;
            console.error('Error loading data:', sanitizedError);
        }
    }

    // Build indexes for efficient searching and filtering
    buildIndexes() {
        // Indexes for efficient searching and filtering
        this.gameIndex = new Map(); // Index by game ID
        this.gameTitleIndex = new Map(); // Index by lowercase title for search
        this.gamePlatformIndex = new Map(); // Index by platform ID for filtering
        this.gameGenreIndex = new Map(); // Index by genre for search
        this.gameDescriptionIndex = new Map(); // Index by description for search
        
        // Build indexes
        for (const game of this.games) {
            // Index by ID
            this.gameIndex.set(game.id, game);
            
            // Index by title (lowercase for case-insensitive search)
            if (game.title) {
                const lowerTitle = game.title.toLowerCase();
                if (!this.gameTitleIndex.has(lowerTitle)) {
                    this.gameTitleIndex.set(lowerTitle, []);
                }
                this.gameTitleIndex.get(lowerTitle).push(game);
            }
            
            // Index by platform
            if (game.platformId) {
                if (!this.gamePlatformIndex.has(game.platformId)) {
                    this.gamePlatformIndex.set(game.platformId, []);
                }
                this.gamePlatformIndex.get(game.platformId).push(game);
            }
            
            // Index by genre
            if (game.genre) {
                const lowerGenre = game.genre.toLowerCase();
                if (!this.gameGenreIndex.has(lowerGenre)) {
                    this.gameGenreIndex.set(lowerGenre, []);
                }
                this.gameGenreIndex.get(lowerGenre).push(game);
            }
            
            // Index by description
            if (game.description) {
                const lowerDescription = game.description.toLowerCase();
                if (!this.gameDescriptionIndex.has(lowerDescription)) {
                    this.gameDescriptionIndex.set(lowerDescription, []);
                }
                this.gameDescriptionIndex.get(lowerDescription).push(game);
            }
        }
        
        // Indexes for platforms
        this.platformIndex = new Map(); // Index by platform ID
        this.platformNameIndex = new Map(); // Index by platform name
        
        for (const platform of this.platforms) {
            // Index by ID
            this.platformIndex.set(platform.id, platform);
            
            // Index by name
            if (platform.name) {
                this.platformNameIndex.set(platform.name.toLowerCase(), platform);
            }
        }
        
        // Indexes for emulators
        this.emulatorIndex = new Map(); // Index by emulator ID
        
        for (const emulator of this.emulators) {
            // Index by ID
            this.emulatorIndex.set(emulator.emulator_id, emulator);
        }
    }

    async getAssetPath(url) {
        if (!url) return url;
        try {
            // Use a more sophisticated caching mechanism with expiration
            if (!this.assetPathCache) {
                this.assetPathCache = new Map();
                this.assetPathCacheTimestamps = new Map();
            }
            
            const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
            
            // Check if we have a cached version that's still valid
            if (this.assetPathCache.has(url)) {
                const timestamp = this.assetPathCacheTimestamps.get(url);
                if (Date.now() - timestamp < CACHE_DURATION) {
                    return this.assetPathCache.get(url);
                } else {
                    // Expired, remove from cache
                    this.assetPathCache.delete(url);
                    this.assetPathCacheTimestamps.delete(url);
                }
            }
            
            const assetPath = await window.electronAPI.getAssetPath(url);
            const finalPath = assetPath || url;
            
            // Cache the result with timestamp
            this.assetPathCache.set(url, finalPath);
            this.assetPathCacheTimestamps.set(url, Date.now());
            
            return finalPath;
        } catch (error) {
            const sanitizedError = window.Sanitizer ? window.Sanitizer.sanitizeForLog(error.message) : error.message;
            console.error('Error getting asset path:', sanitizedError);
            return url; // Fallback to original URL on error
        }
    }

    async renderGames() {
        const gamesGrid = document.getElementById('games-grid');
        if (this.games.length === 0) {
            // Clear the games grid efficiently
            while (gamesGrid.firstChild) {
                gamesGrid.removeChild(gamesGrid.firstChild);
            }
            
            // Create the "no games" message using DOM methods
            const noGamesMessage = document.createElement('p');
            noGamesMessage.className = 'text-neutral-400 col-span-full text-center py-8';
            noGamesMessage.textContent = 'No games found. Add some games to get started!';
            gamesGrid.appendChild(noGamesMessage);
            return;
        }

        // Clear the games grid efficiently
        while (gamesGrid.firstChild) {
            gamesGrid.removeChild(gamesGrid.firstChild);
        }
        
        // Create a document fragment to build the HTML
        const fragment = document.createDocumentFragment();
        
        for (const game of this.games) {
            const gameElement = document.createElement('div');
            gameElement.className = 'bg-neutral-800 rounded-lg p-4 hover:bg-neutral-700 transition-colors';
            
            // Create the game content using safe DOM methods
            const aspectDiv = document.createElement('div');
            aspectDiv.className = 'aspect-[3/4] bg-neutral-700 rounded mb-3 flex items-center justify-center relative overflow-hidden';
            
            if (game.cover_image_path) {
                const img = document.createElement('img');
                // Don't sanitize image URLs as they may contain special characters that are valid in URLs
                img.src = game.cover_image_path;
                img.alt = game.title || 'Game cover';
                img.className = 'w-full h-full object-cover rounded game-image';
                img.setAttribute('data-original-src', game.cover_image_path);
                aspectDiv.appendChild(img);
            } else {
                const noImageSpan = document.createElement('span');
                noImageSpan.className = 'text-neutral-500';
                noImageSpan.textContent = 'No Image';
                aspectDiv.appendChild(noImageSpan);
            }
            
            if (game.video_url) {
                const video = document.createElement('video');
                video.className = 'game-video absolute inset-0 w-full h-full object-cover rounded opacity-0 transition-opacity duration-300';
                video.muted = true;
                video.preload = 'none';
                
                const source = document.createElement('source');
                // Don't sanitize video URLs as they may contain special characters that are valid in URLs
                source.src = game.video_url;
                source.type = 'video/mp4';
                source.setAttribute('data-original-src', game.video_url);
                video.appendChild(source);
                aspectDiv.appendChild(video);
            }
            
            const titleEl = document.createElement('h3');
            titleEl.className = 'font-semibold mb-1';
            titleEl.textContent = game.title || 'Untitled Game';
            
            const platformEl = document.createElement('p');
            platformEl.className = 'text-sm text-neutral-400 mb-1';
            platformEl.textContent = this.getPlatformName(game.platformId);
            
            const emulatorEl = document.createElement('p');
            emulatorEl.className = 'text-sm text-neutral-400 mb-1';
            emulatorEl.textContent = this.getEmulatorName(game.emulatorId);
            
            const descriptionEl = document.createElement('p');
            descriptionEl.className = 'text-sm text-neutral-400 mb-2';
            descriptionEl.textContent = game.description || 'No description';
            
            const tagsDiv = document.createElement('div');
            tagsDiv.className = 'flex flex-wrap gap-1 mb-2';
            
            if (Array.isArray(game.tags) && game.tags.length > 0) {
                game.tags.forEach(tagId => {
                    const tag = this.tags.find(t => t.id === tagId);
                    if (tag) {
                        const tagSpan = document.createElement('span');
                        tagSpan.className = 'bg-secondary text-xs px-2 py-1 rounded-full';
                        tagSpan.textContent = tag.name;
                        tagsDiv.appendChild(tagSpan);
                    }
                });
            }
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'flex space-x-2 mt-2';
            
            const editButton = document.createElement('button');
            editButton.className = 'edit-game-btn bg-secondary hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors';
            editButton.textContent = 'Edit';
            editButton.setAttribute('data-game-id', game.id);
            
            const launchButton = document.createElement('button');
            launchButton.className = 'launch-game-btn bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm transition-colors';
            launchButton.textContent = 'Launch';
            launchButton.setAttribute('data-game-id', game.id);
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-game-btn bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors';
            deleteButton.textContent = 'Delete';
            deleteButton.setAttribute('data-game-id', game.id);
            
            buttonsDiv.appendChild(editButton);
            buttonsDiv.appendChild(launchButton);
            buttonsDiv.appendChild(deleteButton);
            
            gameElement.appendChild(aspectDiv);
            gameElement.appendChild(titleEl);
            gameElement.appendChild(platformEl);
            gameElement.appendChild(emulatorEl);
            gameElement.appendChild(descriptionEl);
            gameElement.appendChild(tagsDiv);
            gameElement.appendChild(buttonsDiv);
            
            fragment.appendChild(gameElement);
        }
        
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
        
        // Add event listeners for edit game buttons
        document.querySelectorAll('.edit-game-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const gameId = button.getAttribute('data-game-id');
                const game = this.games.find(g => g.id === gameId);
                if (game) {
                    this.showEditGameModal(game);
                }
            });
        });
        
        // Add event listeners for launch game buttons
        document.querySelectorAll('.launch-game-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const gameId = button.getAttribute('data-game-id');
                this.launchGame(gameId);
            });
        });
        
        // Add event listeners for delete game buttons
        document.querySelectorAll('.delete-game-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const gameId = button.getAttribute('data-game-id');
                this.deleteGame(gameId);
            });
        });
    }

    async renderPlatforms() {
        const platformsList = document.getElementById('platforms-list');
        if (this.platforms.length === 0) {
            // Clear the platforms list
            while (platformsList.firstChild) {
                platformsList.removeChild(platformsList.firstChild);
            }
            
            // Create the "no platforms" message using DOM methods
            const noPlatformsMessage = document.createElement('p');
            noPlatformsMessage.className = 'text-neutral-400 col-span-full text-center py-8';
            noPlatformsMessage.textContent = 'No platforms configured.';
            platformsList.appendChild(noPlatformsMessage);
            return;
        }

        // Clear the platforms list efficiently
        while (platformsList.firstChild) {
            platformsList.removeChild(platformsList.firstChild);
        }
        
        // Create platform elements safely using DOM methods
        const fragment = document.createDocumentFragment();
        
        this.platforms.forEach(platform => {
            const platformDiv = document.createElement('div');
            platformDiv.className = 'bg-neutral-800 rounded-lg p-4 hover:bg-neutral-700 transition-colors';
            
            // Create the platform content using safe DOM methods
            const aspectDiv = document.createElement('div');
            aspectDiv.className = 'aspect-[3/4] bg-neutral-700 rounded mb-3 flex items-center justify-center relative overflow-hidden';
            
            if (platform.cover_image_path) {
                const img = document.createElement('img');
                // Use the asset path directly, the image loading will handle caching
                img.src = platform.cover_image_path;
                img.alt = platform.name || 'Platform cover';
                img.className = 'w-full h-full object-cover rounded platform-image';
                img.setAttribute('data-original-src', platform.cover_image_path);
                aspectDiv.appendChild(img);
            } else {
                const noImageSpan = document.createElement('span');
                noImageSpan.className = 'text-neutral-500';
                noImageSpan.textContent = 'No Image';
                aspectDiv.appendChild(noImageSpan);
            }
            
            if (platform.video_url) {
                const videoButton = document.createElement('button');
                videoButton.className = 'absolute bottom-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-8 h-8 flex items-center justify-center';
                videoButton.textContent = '▶';
                // Use addEventListener instead of onclick attribute
                videoButton.addEventListener('click', () => this.playVideo(platform.video_url));
                aspectDiv.appendChild(videoButton);
            }
            
            const nameEl = document.createElement('h3');
            nameEl.className = 'font-semibold mb-1';
            nameEl.textContent = platform.name || 'Unknown Platform';
            
            const manufacturerEl = document.createElement('p');
            manufacturerEl.className = 'text-sm text-neutral-400 mb-1';
            manufacturerEl.textContent = platform.manufacturer || 'No manufacturer';
            
            const releaseYearEl = document.createElement('p');
            releaseYearEl.className = 'text-sm text-neutral-400 mb-1';
            releaseYearEl.textContent = platform.release_year || 'No release year';
            
            const descriptionEl = document.createElement('p');
            descriptionEl.className = 'text-sm text-neutral-400 mb-2';
            descriptionEl.textContent = platform.description || 'No description available.';
            
            const tagsDiv = document.createElement('div');
            tagsDiv.className = 'flex flex-wrap gap-1 mb-2';
            
            if (platform.tags && Array.isArray(platform.tags)) {
                platform.tags.forEach(tagId => {
                    const tag = this.tags.find(t => t.id === tagId);
                    if (tag) {
                        const tagSpan = document.createElement('span');
                        tagSpan.className = 'bg-secondary text-xs px-2 py-1 rounded-full';
                        tagSpan.textContent = tag.name;
                        tagsDiv.appendChild(tagSpan);
                    }
                });
            }
            
            const buttonsDiv = document.createElement('div');
            buttonsDiv.className = 'flex space-x-2 mt-2';
            
            const editButton = document.createElement('button');
            editButton.className = 'bg-secondary hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors';
            editButton.textContent = 'Edit';
            // Use addEventListener instead of onclick attribute
            editButton.addEventListener('click', () => this.editPlatform(platform.id));
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors';
            deleteButton.textContent = 'Delete';
            // Use addEventListener instead of onclick attribute
            deleteButton.addEventListener('click', () => this.deletePlatform(platform.id));
            
            const viewImagesButton = document.createElement('button');
            viewImagesButton.className = 'bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm transition-colors';
            viewImagesButton.textContent = 'View Images';
            // Use addEventListener instead of onclick attribute
            viewImagesButton.addEventListener('click', () => {
                const platformId = platform.platform_id || platform.id;
                this.viewPlatformImages(platformId);
            });
            
            const queryButton = document.createElement('button');
            queryButton.className = 'bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm transition-colors';
            queryButton.textContent = 'Query Data Sources';
            // Use addEventListener instead of onclick attribute
            queryButton.addEventListener('click', () => this.queryDataSourcesForPlatform(platform.name));
            
            buttonsDiv.appendChild(editButton);
            buttonsDiv.appendChild(deleteButton);
            buttonsDiv.appendChild(viewImagesButton);
            buttonsDiv.appendChild(queryButton);
            
            platformDiv.appendChild(aspectDiv);
            platformDiv.appendChild(nameEl);
            platformDiv.appendChild(manufacturerEl);
            platformDiv.appendChild(releaseYearEl);
            platformDiv.appendChild(descriptionEl);
            platformDiv.appendChild(tagsDiv);
            platformDiv.appendChild(buttonsDiv);
            
            fragment.appendChild(platformDiv);
        });
        
        platformsList.appendChild(fragment);
        
        // Process images to use cached assets
        const images = platformsList.querySelectorAll('.platform-image');
        
        for (const img of images) {
            const originalSrc = img.getAttribute('data-original-src');
            if (originalSrc) {
                const assetPath = await this.getAssetPath(originalSrc);
                img.src = assetPath;
            }
        }
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

        // Clear existing content
        while (modalFields.firstChild) {
            modalFields.removeChild(modalFields.firstChild);
        }

        if (!media || Object.keys(media).length === 0) {
            const noMediaMessage = document.createElement('p');
            noMediaMessage.className = 'text-neutral-400';
            noMediaMessage.textContent = 'No media found for this platform.';
            modalFields.appendChild(noMediaMessage);
        } else {
            const gridDiv = document.createElement('div');
            gridDiv.className = 'image-modal-grid grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-8';
            
            Object.entries(media).forEach(([type, url]) => {
                if (!url) return;
                
                // Check if it's a video based on file extension
                const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg');
                
                const itemDiv = document.createElement('div');
                itemDiv.className = 'cursor-pointer group select-platform-image-btn';
                itemDiv.setAttribute('data-url', url);
                itemDiv.setAttribute('data-platform-id', platformId);
                
                const aspectDiv = document.createElement('div');
                aspectDiv.className = 'aspect-w-1 aspect-h-1 w-full overflow-hidden rounded-lg bg-neutral-700 flex items-center justify-center';
                
                if (isVideo) {
                    // For videos, show a video icon/thumbnail
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'text-center';
                    
                    const iconDiv = document.createElement('div');
                    iconDiv.className = 'text-4xl mb-2';
                    iconDiv.textContent = '▶️';
                    
                    const textDiv = document.createElement('div');
                    textDiv.className = 'text-neutral-300';
                    textDiv.textContent = 'Video';
                    
                    contentDiv.appendChild(iconDiv);
                    contentDiv.appendChild(textDiv);
                    aspectDiv.appendChild(contentDiv);
                } else {
                    // For images, show the image
                    const img = document.createElement('img');
                    img.src = url;
                    img.className = 'w-full h-full object-cover object-center group-hover:opacity-75';
                    img.alt = type.replace(/_/g, ' ');
                    aspectDiv.appendChild(img);
                }
                
                const titleEl = document.createElement('h3');
                titleEl.className = 'mt-2 text-sm text-neutral-300 text-center capitalize';
                titleEl.textContent = type.replace(/_/g, ' ');
                
                itemDiv.appendChild(aspectDiv);
                itemDiv.appendChild(titleEl);
                gridDiv.appendChild(itemDiv);
            });
            
            modalFields.appendChild(gridDiv);
        }

        modal.classList.remove('hidden');

        // Add event listeners for platform image selection buttons
        document.querySelectorAll('.select-platform-image-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const imageUrl = button.getAttribute('data-url');
                const platformId = button.getAttribute('data-platform-id');
                this.selectPlatformImage(imageUrl, platformId);
            });
        });

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

        // Background effect dropdown
        const backgroundEffectSelect = document.getElementById('background-effect');
        if (backgroundEffectSelect) {
            backgroundEffectSelect.addEventListener('change', () => {
                // Update background effect immediately
                if (typeof window.updateBackgroundEffect === 'function') {
                    window.updateBackgroundEffect(backgroundEffectSelect.value);
                }
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
        // Use the new secure ModalSystem
        window.ModalSystem.show(title, fields, onSubmit);
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

    showAddGameModal() {
        const platformOptions = this.platforms.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        const emulatorOptions = this.emulators.map(e => `<option value="${e.emulator_id}">${e.name}</option>`).join('');
        const fields = [
            { id: 'title', label: 'Game Title' },
            { id: 'platformId', label: 'Platform', type: 'select', options: platformOptions },
            { id: 'emulatorId', label: 'Emulator', type: 'select', options: `<option value="">-- Select an Emulator --</option>${emulatorOptions}` },
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
        const errors = [];
        if (!gameData.title) {
            errors.push('Game title is required.');
        }

        if (!gameData.platformId) {
            errors.push('Platform is required.');
        }

        if (!gameData.romPath) {
            errors.push('ROM path is required.');
        }

        if (errors.length > 0) {
            window.ErrorHandler?.handleValidationErrors(errors, 'Add Game') || console.warn('Validation errors in addGame:', errors.join(', '));
            return;
        }

        const existingGame = this.games.find(g => g.title === gameData.title && g.platformId === gameData.platformId);
        if (existingGame) {
            const message = `Game with title "${existingGame.title}" and platform "${this.getPlatformName(existingGame.platformId)}" already exists.`;
            window.ErrorHandler?.handleWarning(message, 'Add Game') || console.warn(message);
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
        const errors = [];
        if (!platformData.id) {
            errors.push('Platform ID is required.');
        }

        if (!platformData.name) {
            errors.push('Platform name is required.');
        }

        if (errors.length > 0) {
            window.ErrorHandler?.handleValidationErrors(errors, 'Add Platform') || console.warn('Validation errors in addPlatform:', errors.join(', '));
            return;
        }

        const existingPlatform = this.platforms.find(p => p.platform_id === platformData.id);
        if (existingPlatform) {
            const sanitizedName = window.Sanitizer ? window.Sanitizer.sanitizeForLog(platformData.name) : platformData.name;
            const message = `Platform with name "${sanitizedName}" already exists.`;
            window.ErrorHandler?.handleWarning(message, 'Add Platform') || console.warn(message);
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
        const errors = [];
        if (!emulatorData.name) {
            errors.push('Emulator name is required.');
        }

        if (!emulatorData.executablePath) {
            errors.push('Emulator executable path is required.');
        }

        if (errors.length > 0) {
            window.ErrorHandler?.handleValidationErrors(errors, 'Add Emulator') || console.warn('Validation errors in addEmulator:', errors.join(', '));
            return;
        }

        const existingEmulator = this.emulators.find(e => e.name === emulatorData.name);
        if (existingEmulator) {
            const message = `Emulator with name "${existingEmulator.name}" already exists.`;
            window.ErrorHandler?.handleWarning(message, 'Add Emulator') || console.warn(message);
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
            const sanitizedName = window.Sanitizer ? window.Sanitizer.sanitizeForLog(name) : name;
            const sanitizedError = window.Sanitizer ? window.Sanitizer.sanitizeForLog(error.message) : error.message;
            console.error(`Error saving ${sanitizedName}:`, sanitizedError);
            const errorMessage = `Failed to save ${sanitizedName}. Check console for details.`;
            window.ErrorHandler?.handleError(errorMessage, error, 'Save Data') || console.error(errorMessage);
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
                    const sanitizedMessage = window.Sanitizer ? window.Sanitizer.sanitizeForDisplay(message) : message;
                    progressElement.innerHTML = `<p>${sanitizedMessage}</p>`;
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
            window.ErrorHandler?.handleWarning('Please select a folder first.', 'Scan Folder') || console.warn('Please select a folder first.');
            return;
        }

        const platformId = document.getElementById('scan-platform-select').value;
        if (!platformId) {
            window.ErrorHandler?.handleWarning('Please select a platform first.', 'Scan Folder') || console.warn('Please select a platform first.');
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

            // Clear existing content
            while (romsTableBody.firstChild) {
                romsTableBody.removeChild(romsTableBody.firstChild);
            }

            roms.forEach(rom => {
                const tr = document.createElement('tr');
                tr.setAttribute('data-rom', window.Sanitizer ? window.Sanitizer.escapeHTML(rom) : rom);
                tr.setAttribute('data-status', 'new');

                const td1 = document.createElement('td');
                td1.className = 'p-3';
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'rom-checkbox';
                td1.appendChild(checkbox);

                const td2 = document.createElement('td');
                td2.className = 'p-3';
                td2.textContent = rom;

                const td3 = document.createElement('td');
                td3.className = 'p-3';
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'w-full bg-neutral-700 p-2 rounded';
                input.value = '';
                td3.appendChild(input);

                const td4 = document.createElement('td');
                td4.className = 'p-3';
                const statusSpan = document.createElement('span');
                statusSpan.className = 'status-badge bg-gray-600';
                statusSpan.textContent = 'New';
                td4.appendChild(statusSpan);

                const td5 = document.createElement('td');
                td5.className = 'p-3';
                const detailsBtn = document.createElement('button');
                detailsBtn.className = 'details-btn bg-neutral-600 hover:bg-neutral-500 px-3 py-1 rounded text-sm';
                detailsBtn.disabled = true;
                detailsBtn.textContent = 'Details';
                td5.appendChild(detailsBtn);

                tr.appendChild(td1);
                tr.appendChild(td2);
                tr.appendChild(td3);
                tr.appendChild(td4);
                tr.appendChild(td5);

                romsTableBody.appendChild(tr);
            });

            document.getElementById('scan-pipeline').classList.remove('hidden');
        } catch (error) {
            console.error('Error scanning folder:', error);
            const errorMessage = 'Error scanning folder. Check console for details.';
            window.ErrorHandler?.handleError(errorMessage, error, 'Scan Folder') || console.error(errorMessage);
            romsTableBody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-red-500">Error scanning folder. Check console for details.</td></tr>';
        }
    }

    async getSuggestions() {
        const romRows = Array.from(document.querySelectorAll('#roms-table-body tr'));
        const selectedRows = romRows.filter(row => row.querySelector('.rom-checkbox').checked);

        if (selectedRows.length === 0) {
            window.ErrorHandler?.handleWarning('Please select at least one ROM to get suggestions for.', 'Get Suggestions') || console.warn('Please select at least one ROM to get suggestions for.');
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
                const errorMessage = 'An error occurred while getting suggestions from the AI.';
                window.ErrorHandler?.handleError(errorMessage, error, 'Get Suggestions') || console.error(errorMessage, error);
                break;
            }
        }

        // Clear progress indicator
        if (progressElement) {
            progressElement.textContent = '';
        }

        const successMessage = `${processedCount} ROMs processed!`;
        window.ErrorHandler?.showSuccess(successMessage) || console.log(successMessage);
    }

    async enrichSelected() {
        const romRows = Array.from(document.querySelectorAll('#roms-table-body tr'));
        const selectedRows = romRows.filter(row => row.querySelector('.rom-checkbox').checked);

        if (selectedRows.length === 0) {
            window.ErrorHandler?.handleWarning('Please select at least one ROM to enrich.', 'Enrich ROMs') || console.warn('Please select at least one ROM to enrich.');
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
                            const errorMessage = 'Authentication failed: Please check your ScreenScraper credentials in the .env file';
                            window.ErrorHandler?.handleError(errorMessage, new Error(result.error), 'Enrich ROMs') || console.error(errorMessage);
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

        const resultMessage = `Enrichment complete! ${enrichedCount} enriched, ${errorCount} errors.`;
        window.ErrorHandler?.showInfo(resultMessage) || console.log(resultMessage);
    }

    async importSelected() {
        const romRows = Array.from(document.querySelectorAll('#roms-table-body tr'));
        const selectedRows = romRows.filter(row => row.querySelector('.rom-checkbox').checked && row.dataset.enriched);

        if (selectedRows.length === 0) {
            window.ErrorHandler?.handleWarning('Please select at least one enriched ROM to import.', 'Import ROMs') || console.warn('Please select at least one enriched ROM to import.');
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

        const successMessage = `${importedCount} games imported successfully!`;
        window.ErrorHandler?.showSuccess(successMessage) || console.log(successMessage);
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
            BACKGROUND_EFFECT: document.getElementById('background-effect').value,
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
                
                // Update background effect immediately if the function exists
                if (typeof window.updateBackgroundEffect === 'function') {
                    const selectedEffect = document.getElementById('background-effect').value;
                    setTimeout(async () => {
                        await window.updateBackgroundEffect(selectedEffect);
                    }, 100);
                }
                
                const successMessage = 'Settings saved successfully!';
                window.ErrorHandler?.showSuccess(successMessage) || console.log(successMessage);
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        } catch (error) {
            console.error('Error saving settings:', error);
            const errorMessage = 'Failed to save settings. Check console for details.';
            window.ErrorHandler?.handleError(errorMessage, error, 'Save Settings') || console.error(errorMessage, error);
        }
    }

    async loadSettings() {
        try {
            const settings = await window.electronAPI.loadSettings();
            document.getElementById('thegamesdb-key').value = settings.THEGAMESDB_API_KEY || '';
            document.getElementById('rawg-key').value = settings.RAWG_API_KEY || '';
            document.getElementById('gemini-key').value = settings.GEMINI_API_KEY || '';
            document.getElementById('background-effect').value = settings.BACKGROUND_EFFECT || 'XMB';
            document.getElementById('low-resources-mode').checked = settings.LOW_RESOURCES_MODE || false;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async launchGame(gameId) {
        const game = this.games.find(g => g.id === gameId);
        if (!game) {
            const errorMessage = 'Game not found!';
            window.ErrorHandler?.handleError(errorMessage, new Error(errorMessage), 'Launch Game') || console.error(errorMessage);
            return;
        }

        const platform = this.platforms.find(p => p.id === game.platformId);
        if (!platform) {
            const errorMessage = 'Platform not found!';
            window.ErrorHandler?.handleError(errorMessage, new Error(errorMessage), 'Launch Game') || console.error(errorMessage);
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
            const errorMessage = 'No emulator configured! Please add an emulator first.';
            window.ErrorHandler?.handleError(errorMessage, new Error(errorMessage), 'Launch Game') || console.error(errorMessage);
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
            const errorMessage = 'Failed to launch game. Check console for details.';
            window.ErrorHandler?.handleError(errorMessage, error, 'Launch Game') || console.error(errorMessage, error);
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
            // Validate required fields
            const errors = [];
            if (!data.title) {
                errors.push('Game title is required.');
            }
            if (!data.platformId) {
                errors.push('Platform is required.');
            }
            if (!data.romPath) {
                errors.push('ROM path is required.');
            }
            
            if (errors.length > 0) {
                window.ErrorHandler?.handleValidationErrors(errors, 'Edit Game') || console.warn('Validation errors in editGame:', errors.join(', '));
                return;
            }

            const existingGame = this.games.find(g => g.title === data.title && g.platformId === data.platformId && g.id !== game.id);
            if (existingGame) {
                const message = `Game with title "${existingGame.title}" and platform "${this.getPlatformName(existingGame.platformId)}" already exists.`;
                window.ErrorHandler?.handleWarning(message, 'Edit Game') || console.warn(message);
                return;
            }

            const gameToUpdate = this.games.find(g => g.id === game.id);
            if (gameToUpdate) {
                gameToUpdate.title = data.title;
                gameToUpdate.platformId = data.platformId;
                gameToUpdate.emulatorId = data.emulatorId || '';
                gameToUpdate.romPath = data.romPath;
                gameToUpdate.tags = data.tags || [];
                this.saveData('games', this.games);
                this.renderGames();
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
            // Validate required fields
            const errors = [];
            if (!data.name) {
                errors.push('Emulator name is required.');
            }
            if (!data.executablePath) {
                errors.push('Emulator executable path is required.');
            }
            
            if (errors.length > 0) {
                window.ErrorHandler?.handleValidationErrors(errors, 'Edit Emulator') || console.warn('Validation errors in editEmulator:', errors.join(', '));
                return;
            }

            const existingEmulator = this.emulators.find(e => e.name === data.name && e.emulator_id !== id);
            if (existingEmulator) {
                const message = `Emulator with name "${existingEmulator.name}" already exists.`;
                window.ErrorHandler?.handleWarning(message, 'Edit Emulator') || console.warn(message);
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
        // Sanitize platform name before logging
        const sanitizedName = window.Sanitizer ? window.Sanitizer.sanitizeForLog(platformName) : platformName;
        console.log(`Querying data sources for platform: ${sanitizedName}`);
        try {
            const result = await window.electronAPI.queryDataSources(platformName);
            console.log('Query result:', result);
            const platform = this.platforms.find(p => p.name === platformName);
            if (platform && result) {
                const sanitizedName = window.Sanitizer ? window.Sanitizer.sanitizeForLog(platform.name) : platform.name;
                console.log(`Found platform: ${sanitizedName}. Updating platform information.`);
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
                
                const successMessage = 'Platform information updated successfully!';
                window.ErrorHandler?.showSuccess(successMessage) || console.log(successMessage);
            } else {
                const sanitizedPlatform = window.Sanitizer ? window.Sanitizer.sanitizeForLog(JSON.stringify(platform)) : JSON.stringify(platform);
                const sanitizedResult = window.Sanitizer ? window.Sanitizer.sanitizeForLog(JSON.stringify(result)) : JSON.stringify(result);
                console.warn('Could not find platform or missing result from data sources.', sanitizedPlatform, sanitizedResult);
            }
        } catch (error) {
            const sanitizedError = window.Sanitizer ? window.Sanitizer.sanitizeForLog(error.message) : error.message;
            console.error('Error querying data sources:', sanitizedError);
            const errorMessage = 'Error querying data sources. Check console for details.';
            window.ErrorHandler?.handleError(errorMessage, error, 'Query Data Sources') || console.error(errorMessage, error);
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
        
        // Clear existing content
        while (tagsList.firstChild) {
            tagsList.removeChild(tagsList.firstChild);
        }
        
        tags.forEach(tag => {
            const div = document.createElement('div');
            div.className = 'bg-neutral-800 rounded-lg p-4 flex items-center justify-between';
            
            const span = document.createElement('span');
            span.textContent = tag.name;
            
            const buttonsDiv = document.createElement('div');
            
            const editButton = document.createElement('button');
            editButton.className = 'edit-tag-btn bg-secondary hover:bg-purple-600 px-3 py-1 rounded text-sm transition-colors';
            editButton.textContent = 'Edit';
            editButton.setAttribute('data-tag-id', window.Sanitizer ? window.Sanitizer.escapeHTML(tag.id) : tag.id);
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-tag-btn bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm transition-colors';
            deleteButton.textContent = 'Delete';
            deleteButton.setAttribute('data-tag-id', window.Sanitizer ? window.Sanitizer.escapeHTML(tag.id) : tag.id);
            
            buttonsDiv.appendChild(editButton);
            buttonsDiv.appendChild(deleteButton);
            
            div.appendChild(span);
            div.appendChild(buttonsDiv);
            
            tagsList.appendChild(div);
        });
        
        // Add event listeners for edit tag buttons
        document.querySelectorAll('.edit-tag-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const tagId = button.getAttribute('data-tag-id');
                this.editTag(tagId);
            });
        });
        
        // Add event listeners for delete tag buttons
        document.querySelectorAll('.delete-tag-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const tagId = button.getAttribute('data-tag-id');
                this.deleteTag(tagId);
            });
        });
    }

    async addTag(tagName) {
        if (!tagName) return;
        tagName = tagName.toLowerCase();
        if (this.tags.some(t => t.name === tagName)) {
            const warningMessage = 'Tag already exists.';
            window.ErrorHandler?.handleWarning(warningMessage, 'Add Tag') || console.warn(warningMessage);
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
                    const warningMessage = 'Tag already exists.';
                    window.ErrorHandler?.handleWarning(warningMessage, 'Edit Tag') || console.warn(warningMessage);
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
        
        // Clear existing content
        while (modalFields.firstChild) {
            modalFields.removeChild(modalFields.firstChild);
        }
        
        // Create video player element using safe DOM methods
        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-container';
        videoContainer.style.position = 'relative';
        videoContainer.style.paddingBottom = '56.25%';
        videoContainer.style.height = '0';
        videoContainer.style.overflow = 'hidden';
        
        const video = document.createElement('video');
        video.controls = true;
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
        video.style.width = '100%';
        video.style.height = '100%';
        video.style.background = 'black';
        
        const source = document.createElement('source');
        // Sanitize the src attribute
        source.src = window.Sanitizer ? window.Sanitizer.escapeHTML(videoUrl) : videoUrl;
        source.type = 'video/mp4';
        
        const fallbackText = document.createTextNode('Your browser does not support the video tag.');
        
        video.appendChild(source);
        video.appendChild(fallbackText);
        videoContainer.appendChild(video);
        modalFields.appendChild(videoContainer);

        modal.classList.remove('hidden');

        const closeModal = () => {
            // Pause the video when closing the modal
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