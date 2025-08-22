class NEONGRIDPlugin extends BasePlugin {
  constructor() {
    super('NEONGRID');
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.time = 0;
    
    // Grid parameters
    this.gridSize = 40;
    this.lines = [];
    this.particles = [];
    this.particleCount = 100;
    
    // Neon colors
    this.colors = [
      '#ff00ff', // Magenta
      '#00ffff', // Cyan
      '#ffff00', // Yellow
      '#ff00aa', // Pink
      '#00ffaa'  // Green
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
      this.canvas.id = 'neongrid-canvas';
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;

      // Style for background positioning
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.zIndex = '-1';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.background = '#000010';

      // Insert at beginning of body
      document.body.insertBefore(this.canvas, document.body.firstChild);

      // Get 2D context
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        this.canvas = null;
        return;
      }

      // Initialize grid lines and particles
      this.initializeGrid();
      this.initializeParticles();

      // Mark as initialized
      this.initialized = true;

      // Start animation if not already running
      if (!this.animationId) {
        this.animate();
      }

      // Handle window resize
      window.addEventListener('resize', this.handleResize.bind(this));

    } catch (error) {
      console.error('Error initializing NEON GRID effect:', error);
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

    // Reset time and data
    this.time = 0;
    this.initialized = false;
    this.lines = [];
    this.particles = [];

    // Remove resize listener
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  apply() {
    this.init();
  }

  remove() {
    this.destroy();
  }

  // Initialize grid lines
  initializeGrid() {
    this.lines = [];
    
    // Vertical lines
    for (let x = 0; x <= this.canvas.width; x += this.gridSize) {
      this.lines.push({
        startX: x,
        startY: 0,
        endX: x,
        endY: this.canvas.height,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        pulse: Math.random() * Math.PI * 2,
        width: 1
      });
    }
    
    // Horizontal lines
    for (let y = 0; y <= this.canvas.height; y += this.gridSize) {
      this.lines.push({
        startX: 0,
        startY: y,
        endX: this.canvas.width,
        endY: y,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        pulse: Math.random() * Math.PI * 2,
        width: 1
      });
    }
  }

  // Initialize particles
  initializeParticles() {
    this.particles = [];
    
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        life: Math.random() * 100 + 50,
        age: 0
      });
    }
  }

  // Animation loop
  animate() {
    if (!this.ctx || !this.canvas) {
      this.initialized = false;
      return;
    }

    // Clear with a very dark background and slight fade effect
    this.ctx.fillStyle = 'rgba(0, 0, 10, 0.1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update time
    this.time += 0.02;

    // Draw grid lines with pulsing effect
    this.drawGridLines();

    // Update and draw particles
    this.updateAndDrawParticles();

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  // Draw grid lines with pulsing effect
  drawGridLines() {
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      
      // Update pulse effect
      line.pulse += 0.05;
      const pulseValue = Math.sin(line.pulse) * 0.5 + 0.5;
      
      // Calculate line width based on pulse
      const width = 1 + pulseValue * 3;
      
      // Draw main line
      this.ctx.beginPath();
      this.ctx.moveTo(line.startX, line.startY);
      this.ctx.lineTo(line.endX, line.endY);
      
      // Style the line
      this.ctx.strokeStyle = line.color;
      this.ctx.lineWidth = width;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
      
      // Add glow effect
      this.ctx.shadowColor = line.color;
      this.ctx.shadowBlur = 15 * pulseValue;
      this.ctx.stroke();
      this.ctx.shadowBlur = 0;
    }
  }

  // Update and draw particles
  updateAndDrawParticles() {
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      
      // Update particle position
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      
      // Age the particle
      particle.age++;
      
      // Reset particle if it goes off screen or reaches end of life
      if (particle.x < -10 || particle.x > this.canvas.width + 10 || 
          particle.y < -10 || particle.y > this.canvas.height + 10 ||
          particle.age > particle.life) {
        particle.x = Math.random() * this.canvas.width;
        particle.y = Math.random() * this.canvas.height;
        particle.age = 0;
      }
      
      // Draw particle with glow
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.fill();
      
      // Add glow effect
      this.ctx.shadowColor = particle.color;
      this.ctx.shadowBlur = 10;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }

  // Handle window resize
  handleResize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.initializeGrid(); // Reinitialize grid for new dimensions
      this.initializeParticles(); // Reinitialize particles for new dimensions
    }
  }
}