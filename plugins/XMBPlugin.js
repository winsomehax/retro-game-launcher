class XMBPlugin extends BasePlugin {
  constructor() {
    super('XMB');
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.time = 0;
    
    // Wave parameters - Sony XMB style with 4x width
    this.waves = [
      { color: '#42a5f5', speed: 0.02, frequency: 0.002, amplitude: 160, yOffset: 0 }, // 4x amplitude
      { color: '#f44336', speed: 0.025, frequency: 0.003, amplitude: 140, yOffset: 0 }, // 4x amplitude
      { color: '#4caf50', speed: 0.018, frequency: 0.0025, amplitude: 180, yOffset: 0 }, // 4x amplitude
      { color: '#ffab00', speed: 0.022, frequency: 0.0035, amplitude: 120, yOffset: 0 }, // 4x amplitude
      { color: '#9c27b0', speed: 0.015, frequency: 0.0015, amplitude: 200, yOffset: 0 } // 4x amplitude
    ];
  }

  init() {
    // If already initialized, don't do it again
    if (this.initialized) return;

    // Only initialize on the main app page
    if (!document.getElementById('app')) return;

    try {
      // Create canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'xmb-wave-canvas';
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;

      // Style for background positioning
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.zIndex = '-1';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.background = 'transparent';

      // Insert at beginning of body
      document.body.insertBefore(this.canvas, document.body.firstChild);

      // Get 2D context
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        this.canvas = null;
        return;
      }

      // Mark as initialized
      this.initialized = true;

      // Start animation if not already running
      if (!this.animationId) {
        this.animate();
      }

      // Handle window resize
      window.addEventListener('resize', this.handleResize.bind(this));

    } catch (error) {
      console.error('Error initializing XMB wave effect:', error);
    }
  }

  destroy() {
    // Cancel the animation frame if it's running
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    // Remove the canvas if it exists
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
      this.ctx = null;
    }

    // Reset time
    this.time = 0;
    this.initialized = false;

    // Remove resize listener
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  apply() {
    this.init();
  }

  remove() {
    this.destroy();
  }

  // Animation loop
  animate() {
    if (!this.ctx || !this.canvas) {
      this.initialized = false;
      return;
    }

    // Clear with very light fade
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update time
    this.time += 0.02;

    // Draw each wave
    this.waves.forEach((wave, index) => {
      // Position waves around the middle with slight offsets
      wave.yOffset = this.canvas.height * 0.5 + (index - 2) * 30 + Math.sin(this.time * 0.2) * 20; // 4x vertical spread

      // Draw wave
      this.ctx.beginPath();

      // Create a smooth wave with 4x width effect
      for (let x = 0; x <= this.canvas.width; x += 0.5) { // Even smaller steps for smoother waves with wider effect
        // Combine multiple sine waves for complex motion
        const y = wave.yOffset +
                  Math.sin(x * wave.frequency + this.time * wave.speed * 60) * wave.amplitude * 0.7 +
                  Math.sin(x * wave.frequency * 2.2 + this.time * wave.speed * 80) * wave.amplitude * 0.3;

        if (x === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }

      // Style the wave
      this.ctx.strokeStyle = wave.color;
      this.ctx.lineWidth = 4; // Slightly thicker lines
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.globalAlpha = 0.8; // Slightly more opaque
      this.ctx.stroke();

      // Add stronger glow effect
      this.ctx.shadowColor = wave.color;
      this.ctx.shadowBlur = 40; // Even stronger glow for wider waves
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
      this.ctx.globalAlpha = 1.0;
    });

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  // Handle window resize
  handleResize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
    }
  }
}