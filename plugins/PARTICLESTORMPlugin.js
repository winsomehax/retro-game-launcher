class PARTICLESTORMPlugin extends BasePlugin {
  constructor() {
    super('PARTICLESTORM');
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.time = 0;
    
    // Particle parameters
    this.particles = [];
    this.particleCount = 300;
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseRadius = 100;
    
    // Particle colors
    this.colors = [
      '#ff00ff', // Magenta
      '#00ffff', // Cyan
      '#ffff00', // Yellow
      '#ff00aa', // Pink
      '#00ffaa', // Green
      '#ff5500', // Orange
      '#aa00ff'  // Purple
    ];
    
    // Bind mouse events
    this.handleMouseMove = this.handleMouseMove.bind(this);
  }

  init() {
    // If already initialized, don't do it again
    if (this.initialized) return;

    // Only initialize on the main app page
    if (!document.getElementById('app')) return;

    try {
      // Create canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'particlestorm-canvas';
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
      
      // Handle mouse movement for interactivity
      document.addEventListener('mousemove', this.handleMouseMove);

    } catch (error) {
      console.error('Error initializing PARTICLE STORM effect:', error);
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
    this.particles = [];

    // Remove event listeners
    window.removeEventListener('resize', this.handleResize.bind(this));
    document.removeEventListener('mousemove', this.handleMouseMove);

    // Remove mouse move listener
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    }
  }

  apply() {
    this.init();
  }

  remove() {
    this.destroy();
  }

  // Handle mouse movement
  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
  }

  // Initialize particles
  initializeParticles() {
    this.particles = [];
    
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        life: Math.random() * 200 + 100,
        age: 0,
        originalSpeedX: (Math.random() - 0.5) * 2,
        originalSpeedY: (Math.random() - 0.5) * 2
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

    // Update and draw particles
    this.updateAndDrawParticles();

    // Draw connections between nearby particles
    this.drawParticleConnections();

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  // Update and draw particles
  updateAndDrawParticles() {
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      
      // Calculate distance to mouse
      const dx = particle.x - this.mouseX;
      const dy = particle.y - this.mouseY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // React to mouse proximity
      if (distance < this.mouseRadius) {
        const angle = Math.atan2(dy, dx);
        const force = (this.mouseRadius - distance) / this.mouseRadius;
        particle.speedX += Math.cos(angle) * force * 5;
        particle.speedY += Math.sin(angle) * force * 5;
      } else {
        // Gradually return to original speed
        particle.speedX += (particle.originalSpeedX - particle.speedX) * 0.05;
        particle.speedY += (particle.originalSpeedY - particle.speedY) * 0.05;
      }
      
      // Update particle position
      particle.x += particle.speedX;
      particle.y += particle.speedY;
      
      // Add some turbulence
      particle.x += Math.sin(this.time * 0.5 + particle.age * 0.01) * 0.2;
      particle.y += Math.cos(this.time * 0.5 + particle.age * 0.01) * 0.2;
      
      // Age the particle
      particle.age++;
      
      // Reset particle if it goes off screen or reaches end of life
      if (particle.x < -20 || particle.x > this.canvas.width + 20 || 
          particle.y < -20 || particle.y > this.canvas.height + 20 ||
          particle.age > particle.life) {
        particle.x = Math.random() * this.canvas.width;
        particle.y = Math.random() * this.canvas.height;
        particle.age = 0;
        particle.speedX = particle.originalSpeedX;
        particle.speedY = particle.originalSpeedY;
      }
      
      // Draw particle with glow
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      this.ctx.fillStyle = particle.color;
      this.ctx.fill();
      
      // Add glow effect
      this.ctx.shadowColor = particle.color;
      this.ctx.shadowBlur = 15;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }

  // Draw connections between nearby particles
  drawParticleConnections() {
    const maxDistance = 100;
    
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < maxDistance) {
          const alpha = 1 - (distance / maxDistance);
          this.ctx.beginPath();
          this.ctx.moveTo(p1.x, p1.y);
          this.ctx.lineTo(p2.x, p2.y);
          this.ctx.strokeStyle = `rgba(100, 200, 255, ${alpha * 0.3})`;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
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