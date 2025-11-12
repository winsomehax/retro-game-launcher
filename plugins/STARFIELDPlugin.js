class STARFIELDPlugin extends BasePlugin {
  constructor() {
    super('STARFIELD');
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.stars = [];
    this.time = 0;
    
    // Starfield parameters
    this.starCount = 500;
    this.maxDepth = 2000;
    this.centerSize = 3; // Size of the center star
  }

  init() {
    // If already initialized, don't do it again
    if (this.initialized) return;

    // Only initialize on the main app page
    if (!document.getElementById('app')) return;

    try {
      // Create canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'starfield-canvas';
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;

      // Style for background positioning
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.zIndex = '-1';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.background = 'radial-gradient(ellipse at center, #0a0e1a 0%, #020408 100%)';

      // Insert at beginning of body
      document.body.insertBefore(this.canvas, document.body.firstChild);

      // Get 2D context
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        this.canvas = null;
        return;
      }

      // Initialize stars
      this.initializeStars();

      // Mark as initialized
      this.initialized = true;

      // Start animation if not already running
      if (!this.animationId) {
        this.animate();
      }

      // Handle window resize
      window.addEventListener('resize', this.handleResize.bind(this));

    } catch (error) {
      console.error('Error initializing STARFIELD effect:', error);
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
    this.stars = [];

    // Remove resize listener
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  apply() {
    this.init();
  }

  remove() {
    this.destroy();
  }

  // Initialize stars with random positions
  initializeStars() {
    this.stars = [];
    for (let i = 0; i < this.starCount; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width - this.canvas.width / 2,
        y: Math.random() * this.canvas.height - this.canvas.height / 2,
        z: Math.random() * this.maxDepth,
        speed: 0.5 + Math.random() * 2 // Random speed between 0.5 and 2.5
      });
    }
  }

  // Animation loop
  animate() {
    if (!this.ctx || !this.canvas) {
      this.initialized = false;
      return;
    }

    // Clear canvas with a very dark background
    this.ctx.fillStyle = 'rgba(2, 4, 8, 0.2)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update time
    this.time += 0.01;

    // Center of the screen
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Draw each star
    this.stars.forEach(star => {
      // Move star towards viewer
      star.z -= star.speed;
      
      // Reset star if it has moved past the viewer
      if (star.z <= 0) {
        star.x = Math.random() * this.canvas.width - this.canvas.width / 2;
        star.y = Math.random() * this.canvas.height - this.canvas.height / 2;
        star.z = this.maxDepth;
      }

      // Calculate position on screen
      const k = 128.0 / star.z;
      const x = star.x * k + centerX;
      const y = star.y * k + centerY;
      
      // Only draw if star is on screen
      if (x >= 0 && x < this.canvas.width && y >= 0 && y < this.canvas.height) {
        // Calculate size and brightness based on distance
        const size = Math.max(0.1, this.centerSize * k);
        const brightness = Math.min(1, 1.0 - (star.z / this.maxDepth));
        
        // Draw star with color based on distance (blue for distant, white for close)
        const colorValue = Math.floor(100 + brightness * 155);
        this.ctx.fillStyle = `rgb(${colorValue}, ${colorValue}, ${Math.floor(200 + brightness * 55)})`;
        
        // Draw the star
        this.ctx.beginPath();
        this.ctx.arc(x, y, size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add a subtle glow effect for brighter stars
        if (brightness > 0.7) {
          this.ctx.beginPath();
          this.ctx.arc(x, y, size * 2, 0, Math.PI * 2);
          const gradient = this.ctx.createRadialGradient(x, y, size, x, y, size * 2);
          gradient.addColorStop(0, `rgba(${colorValue}, ${colorValue}, ${Math.floor(200 + brightness * 55)}, ${0.3 * brightness})`);
          gradient.addColorStop(1, `rgba(${colorValue}, ${colorValue}, ${Math.floor(200 + brightness * 55)}, 0)`);
          this.ctx.fillStyle = gradient;
          this.ctx.fill();
        }
      }
    });

    // Draw a subtle center glow
    const centerGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 300);
    centerGradient.addColorStop(0, 'rgba(100, 150, 255, 0.1)');
    centerGradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
    this.ctx.fillStyle = centerGradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  // Handle window resize
  handleResize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.initializeStars(); // Reinitialize stars for new dimensions
    }
  }
}