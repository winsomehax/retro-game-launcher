class RADARPlugin extends BasePlugin {
  constructor() {
    super('RADAR');
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.time = 0;
    
    // Circle parameters
    this.circles = [
      { radius: 100, speed: 1.2, angle: 0, direction: 1, color: '#42a5f5' },  // Blue
      { radius: 200, speed: 2.5, angle: 0, direction: -1, color: '#f44336' }, // Red
      { radius: 300, speed: 3.8, angle: 0, direction: 1, color: '#4caf50' },  // Green
      { radius: 400, speed: 1.7, angle: 0, direction: -1, color: '#ffab00' }, // Orange
      { radius: 500, speed: 4.2, angle: 0, direction: 1, color: '#9c27b0' }   // Purple
    ];
    
    // Direction change interval (10 seconds)
    this.directionChangeInterval = 10000;
    this.lastDirectionChange = 0;
  }

  init() {
    // If already initialized, don't do it again
    if (this.initialized) return;

    // Only initialize on the main app page
    if (!document.getElementById('app')) return;

    try {
      // Create canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'radar-canvas';
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

      // Initialize last direction change time
      this.lastDirectionChange = Date.now();

    } catch (error) {
      console.error('Error initializing RADAR effect:', error);
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
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update time
    this.time += 0.016; // Approximate 60fps

    // Check if it's time to change directions (every 10 seconds)
    const now = Date.now();
    if (now - this.lastDirectionChange > this.directionChangeInterval) {
      this.circles.forEach(circle => {
        // Randomly choose direction (-1 for counter-clockwise, 1 for clockwise)
        circle.direction = Math.random() > 0.5 ? 1 : -1;
      });
      this.lastDirectionChange = now;
    }

    // Center of the screen
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Draw each circle
    this.circles.forEach(circle => {
      // Update angle based on speed and direction
      circle.angle += circle.speed * circle.direction * 0.016; // Adjust for 60fps
      
      // Draw circle outline (50px width) with rotation
      this.ctx.beginPath();
      
      // Create a full circle with rotation
      this.ctx.arc(centerX, centerY, circle.radius, circle.angle, circle.angle + Math.PI * 2);
      
      // Style the circle outline
      this.ctx.strokeStyle = circle.color;
      this.ctx.lineWidth = 50;
      this.ctx.lineCap = 'round';
      this.ctx.globalAlpha = 0.7;
      
      // Add glow effect
      this.ctx.shadowColor = circle.color;
      this.ctx.shadowBlur = 30;
      
      this.ctx.stroke();
      
      // Reset shadow
      this.ctx.shadowBlur = 0;
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