class AURORAPlugin extends BasePlugin {
  constructor() {
    super('AURORA');
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.time = 0;
    
    // Aurora parameters
    this.particles = [];
    this.particleCount = 150;
    this.colors = [
      'rgba(0, 255, 100, 0.1)',    // Green
      'rgba(0, 200, 255, 0.1)',    // Blue
      'rgba(100, 0, 255, 0.1)',    // Purple
      'rgba(0, 255, 200, 0.1)',    // Cyan
      'rgba(150, 255, 0, 0.1)'     // Light Green
    ];
    
    // Wave parameters for aurora movement
    this.waves = [
      { amplitude: 30, frequency: 0.01, speed: 0.02, yOffset: 0 },
      { amplitude: 50, frequency: 0.015, speed: 0.015, yOffset: 0 },
      { amplitude: 40, frequency: 0.02, speed: 0.01, yOffset: 0 }
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
      this.canvas.id = 'aurora-canvas';
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;

      // Style for background positioning
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.zIndex = '-1';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.background = 'radial-gradient(ellipse at center, #000010 0%, #000000 100%)';

      // Insert at beginning of body
      document.body.insertBefore(this.canvas, document.body.firstChild);

      // Get 2D context
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        this.canvas = null;
        return;
      }

      // Initialize particles
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
      console.error('Error initializing AURORA effect:', error);
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

    // Reset time and particles
    this.time = 0;
    this.initialized = false;
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

  // Initialize aurora particles
  initializeParticles() {
    this.particles = [];
    
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        alpha: Math.random() * 0.2 + 0.05,
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
    this.ctx.fillStyle = 'rgba(0, 0, 10, 0.05)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update time
    this.time += 0.01;

    // Draw aurora waves
    this.drawAuroraWaves();

    // Update and draw particles
    this.updateAndDrawParticles();

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  // Draw aurora wave patterns
  drawAuroraWaves() {
    // Draw multiple wave layers with different colors
    for (let layer = 0; layer < this.colors.length; layer++) {
      const color = this.colors[layer];
      const yOffsetBase = this.canvas.height * 0.3 + layer * 20;
      
      this.ctx.beginPath();
      
      // Create a smooth wave
      for (let x = 0; x <= this.canvas.width; x += 2) {
        let y = yOffsetBase;
        
        // Combine multiple sine waves for complex motion
        for (let i = 0; i < this.waves.length; i++) {
          const wave = this.waves[i];
          y += Math.sin(x * wave.frequency + this.time * wave.speed * 60 + layer * 0.5) * wave.amplitude;
        }
        
        if (x === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
      
      // Close the path to create a filled area
      this.ctx.lineTo(this.canvas.width, this.canvas.height);
      this.ctx.lineTo(0, this.canvas.height);
      this.ctx.closePath();
      
      // Create gradient for the aurora effect
      const gradient = this.ctx.createLinearGradient(0, yOffsetBase - 100, 0, yOffsetBase + 100);
      gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
      
      // Add glow effect
      this.ctx.shadowColor = color.replace('0.1', '0.5');
      this.ctx.shadowBlur = 30;
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = 2;
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
      
      // Add some wave motion to particles
      particle.y += Math.sin(this.time * 2 + particle.x * 0.01) * 0.5;
      
      // Age the particle
      particle.age++;
      
      // Reset particle if it goes off screen or reaches end of life
      if (particle.x < -10 || particle.x > this.canvas.width + 10 || 
          particle.y < -10 || particle.y > this.canvas.height + 10 ||
          particle.age > particle.life) {
        particle.x = Math.random() * this.canvas.width;
        particle.y = Math.random() * this.canvas.height * 0.5; // Keep in upper half
        particle.age = 0;
      }
      
      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.fill();
      
      // Add glow to some particles
      if (Math.random() > 0.7) {
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        this.ctx.fillStyle = particle.color.replace('0.1', '0.05');
        this.ctx.fill();
      }
    }
  }

  // Handle window resize
  handleResize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.initializeParticles(); // Reinitialize particles for new dimensions
    }
  }
}