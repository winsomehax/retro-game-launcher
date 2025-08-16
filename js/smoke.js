// Sony XMB-style colorful wave effect - 4x wider
(function() {
    // Variable to hold the animation frame ID
    let animationId = null;
    let canvas = null;
    let ctx = null;
    let initialized = false;
    
    // Wave parameters - Sony XMB style with 4x width
    const waves = [
        { color: '#42a5f5', speed: 0.02, frequency: 0.002, amplitude: 160, yOffset: 0 }, // 4x amplitude
        { color: '#f44336', speed: 0.025, frequency: 0.003, amplitude: 140, yOffset: 0 }, // 4x amplitude
        { color: '#4caf50', speed: 0.018, frequency: 0.0025, amplitude: 180, yOffset: 0 }, // 4x amplitude
        { color: '#ffab00', speed: 0.022, frequency: 0.0035, amplitude: 120, yOffset: 0 }, // 4x amplitude
        { color: '#9c27b0', speed: 0.015, frequency: 0.0015, amplitude: 200, yOffset: 0 } // 4x amplitude
    ];
    
    let time = 0;
    
    // Function to check settings and initialize or remove effect
    function checkSettingsAndInit() {
        // If we're not on the main app page, don't do anything
        if (!document.getElementById('app')) return;
        
        window.electronAPI.loadSettings().then(settings => {
            if (settings.LOW_RESOURCES_MODE) {
                // Low resources mode is enabled, remove the effect if it exists
                removeWaveEffect();
            } else {
                // Low resources mode is disabled, initialize the effect
                initWaveEffect();
            }
        }).catch(error => {
            console.error('Error loading settings, defaulting to enable effect:', error);
            // If there's an error loading settings, default to enabling the effect
            initWaveEffect();
        });
    }
    
    // Function to remove the wave effect
    function removeWaveEffect() {
        // Cancel the animation frame if it's running
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        
        // Remove the canvas if it exists
        if (canvas) {
            canvas.remove();
            canvas = null;
            ctx = null;
        }
        
        // Reset time
        time = 0;
        initialized = false;
    }
    
    // Function to initialize the wave effect
    function initWaveEffect() {
        // If already initialized, don't do it again
        if (initialized) return;
        
        // Only initialize on the main app page
        if (!document.getElementById('app')) return;
        
        try {
            // Create canvas element
            canvas = document.createElement('canvas');
            canvas.id = 'xmb-wave-canvas';
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // Style for background positioning
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.zIndex = '-1';
            canvas.style.pointerEvents = 'none';
            canvas.style.background = 'transparent';
            
            // Insert at beginning of body
            document.body.insertBefore(canvas, document.body.firstChild);
            
            // Get 2D context
            ctx = canvas.getContext('2d');
            if (!ctx) {
                canvas = null;
                return;
            }
            
            // Mark as initialized
            initialized = true;
            
            // Start animation if not already running
            if (!animationId) {
                animate();
            }
            
            // Handle window resize
            window.addEventListener('resize', handleResize);
            
        } catch (error) {
            console.error('Error initializing wave effect:', error);
        }
    }
    
    // Animation loop
    function animate() {
        if (!ctx || !canvas) {
            initialized = false;
            return;
        }
        
        // Clear with very light fade
        ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Update time
        time += 0.02;
        
        // Draw each wave
        waves.forEach((wave, index) => {
            // Position waves around the middle with slight offsets
            wave.yOffset = canvas.height * 0.5 + (index - 2) * 30 + Math.sin(time * 0.2) * 20; // 4x vertical spread
            
            // Draw wave
            ctx.beginPath();
            
            // Create a smooth wave with 4x width effect
            for (let x = 0; x <= canvas.width; x += 0.5) { // Even smaller steps for smoother waves with wider effect
                // Combine multiple sine waves for complex motion
                const y = wave.yOffset + 
                          Math.sin(x * wave.frequency + time * wave.speed * 60) * wave.amplitude * 0.7 +
                          Math.sin(x * wave.frequency * 2.2 + time * wave.speed * 80) * wave.amplitude * 0.3;
                
                if (x === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            
            // Style the wave
            ctx.strokeStyle = wave.color;
            ctx.lineWidth = 4; // Slightly thicker lines
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.8; // Slightly more opaque
            ctx.stroke();
            
            // Add stronger glow effect
            ctx.shadowColor = wave.color;
            ctx.shadowBlur = 40; // Even stronger glow for wider waves
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
        });
        
        animationId = requestAnimationFrame(animate);
    }
    
    // Handle window resize
    function handleResize() {
        if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
    }
    
    // Expose function to check settings (can be called when settings change)
    window.checkLowResourcesSetting = checkSettingsAndInit;
    
    // Initialize when DOM is ready
    if (document.readyState !== 'loading') {
        setTimeout(checkSettingsAndInit, 100);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(checkSettingsAndInit, 100);
        });
    }
    
    // Also check settings when the page becomes visible (in case of tab switching)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            setTimeout(checkSettingsAndInit, 100);
        }
    });
})();