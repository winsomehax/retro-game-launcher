class FIREPLACEPlugin extends BasePlugin {
  constructor() {
    super('FIREPLACE');
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.time = 0;
    
    // Fireplace parameters
    this.flames = [];
    this.embers = [];
    this.smoke = [];
    this.logs = [];
    this.flameCount = 300;
    this.emberCount = 100;
    this.smokeCount = 150;
    
    // Fire colors
    this.fireColors = [
      '#ff3300', // Bright red-orange
      '#ff6600', // Orange
      '#ff9900', // Yellow-orange
      '#ffff00', // Yellow
      '#ffcc00'  // Light orange
    ];
    
    // Smoke colors
    this.smokeColors = [
      'rgba(100, 100, 100, 0.6)',
      'rgba(150, 150, 150, 0.4)',
      'rgba(200, 200, 200, 0.2)'
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
      this.canvas.id = 'fireplace-canvas';
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;

      // Style for background positioning
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.zIndex = '-1';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.background = 'radial-gradient(ellipse at center, #1a0000 0%, #000000 70%)';

      // Insert at beginning of body
      document.body.insertBefore(this.canvas, document.body.firstChild);

      // Get 2D context
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        this.canvas = null;
        return;
      }

      // Initialize fireplace elements
      this.initializeLogs();
      this.initializeFlames();
      this.initializeEmbers();
      this.initializeSmoke();

      // Mark as initialized
      this.initialized = true;

      // Start animation if not already running
      if (!this.animationId) {
        this.animate();
      }

      // Handle window resize
      window.addEventListener('resize', this.handleResize.bind(this));

    } catch (error) {
      console.error('Error initializing FIREPLACE effect:', error);
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
    this.flames = [];
    this.embers = [];
    this.smoke = [];
    this.logs = [];

    // Remove resize listener
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  apply() {
    this.init();
  }

  remove() {
    this.destroy();
  }

  // Initialize logs at the bottom of the fireplace
  initializeLogs() {
    this.logs = [];
    
    // Create multiple logs at different positions
    for (let i = 0; i < 5; i++) {
      this.logs.push({
        x: this.canvas.width / 2 - 200 + Math.random() * 400,
        y: this.canvas.height - 100 - Math.random() * 50,
        width: 200 + Math.random() * 150,
        height: 25 + Math.random() * 15,
        angle: (Math.random() - 0.5) * 0.8
      });
    }
  }

  // Initialize flames
  initializeFlames() {
    this.flames = [];
    
    // Create more flames at the base of the logs
    for (let i = 0; i < this.flameCount; i++) {
      this.flames.push({
        x: this.canvas.width / 2 - 150 + Math.random() * 300,
        y: this.canvas.height - 150,
        size: Math.random() * 60 + 30,
        speed: Math.random() * 4 + 2,
        life: Math.random() * 80 + 40,
        age: 0,
        color: this.fireColors[Math.floor(Math.random() * this.fireColors.length)],
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.02 + Math.random() * 0.03
      });
    }
  }

  // Initialize embers
  initializeEmbers() {
    this.embers = [];
    
    for (let i = 0; i < this.emberCount; i++) {
      this.embers.push({
        x: this.canvas.width / 2 - 150 + Math.random() * 300,
        y: this.canvas.height - 120,
        size: Math.random() * 6 + 2,
        speedX: (Math.random() - 0.5) * 4,
        speedY: -Math.random() * 6 - 2,
        life: Math.random() * 150 + 100,
        age: 0,
        color: this.fireColors[Math.floor(Math.random() * this.fireColors.length)]
      });
    }
  }

  // Initialize smoke
  initializeSmoke() {
    this.smoke = [];
    
    for (let i = 0; i < this.smokeCount; i++) {
      this.smoke.push({
        x: this.canvas.width / 2 - 50 + Math.random() * 100,
        y: this.canvas.height - 200,
        size: Math.random() * 40 + 20,
        speedX: (Math.random() - 0.5) * 2,
        speedY: -Math.random() * 3 - 1,
        life: Math.random() * 200 + 150,
        age: 0,
        color: this.smokeColors[Math.floor(Math.random() * this.smokeColors.length)],
        opacity: 0.2 + Math.random() * 0.4
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
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update time
    this.time += 0.05;

    // Draw logs
    this.drawLogs();

    // Update and draw flames
    this.updateAndDrawFlames();

    // Update and draw embers
    this.updateAndDrawEmbers();

    // Update and draw smoke
    this.updateAndDrawSmoke();

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  // Draw logs
  drawLogs() {
    for (let i = 0; i < this.logs.length; i++) {
      const log = this.logs[i];
      
      this.ctx.save();
      this.ctx.translate(log.x + log.width / 2, log.y + log.height / 2);
      this.ctx.rotate(log.angle);
      
      // Draw log with gradient
      const gradient = this.ctx.createLinearGradient(-log.width / 2, -log.height / 2, log.width / 2, log.height / 2);
      gradient.addColorStop(0, '#331100');
      gradient.addColorStop(0.5, '#552200');
      gradient.addColorStop(1, '#221100');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(-log.width / 2, -log.height / 2, log.width, log.height);
      
      // Add bark texture
      this.ctx.strokeStyle = '#110500';
      this.ctx.lineWidth = 2;
      for (let j = 0; j < 8; j++) {
        this.ctx.beginPath();
        this.ctx.moveTo(-log.width / 2 + j * (log.width / 8), -log.height / 2);
        this.ctx.lineTo(-log.width / 2 + j * (log.width / 8), log.height / 2);
        this.ctx.stroke();
      }
      
      this.ctx.restore();
    }
  }

  // Update and draw flames
  updateAndDrawFlames() {
    for (let i = 0; i < this.flames.length; i++) {
      const flame = this.flames[i];
      
      // Update flame position with swaying motion
      flame.y -= flame.speed;
      flame.x += Math.sin(this.time + flame.sway) * 3;
      flame.sway += flame.swaySpeed;
      
      // Age the flame
      flame.age++;
      
      // Reset flame if it goes off screen or reaches end of life
      if (flame.y < this.canvas.height * 0.3 || flame.age > flame.life) {
        flame.x = this.canvas.width / 2 - 150 + Math.random() * 300;
        flame.y = this.canvas.height - 150;
        flame.age = 0;
        flame.color = this.fireColors[Math.floor(Math.random() * this.fireColors.length)];
      }
      
      // Calculate flame size based on age and position
      const sizeFactor = Math.min(1, 1 - (flame.age / flame.life));
      const currentSize = flame.size * sizeFactor;
      
      // Draw flame with gradient
      const gradient = this.ctx.createRadialGradient(
        flame.x, flame.y, 0,
        flame.x, flame.y, currentSize
      );
      gradient.addColorStop(0, flame.color);
      gradient.addColorStop(0.5, flame.color.replace('#', '#') + '80');
      gradient.addColorStop(1, flame.color.replace('#', '#') + '00');
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(flame.x, flame.y, currentSize, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Add glow effect
      this.ctx.shadowColor = flame.color;
      this.ctx.shadowBlur = 30 * sizeFactor;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }

  // Update and draw embers
  updateAndDrawEmbers() {
    for (let i = 0; i < this.embers.length; i++) {
      const ember = this.embers[i];
      
      // Update ember position
      ember.x += ember.speedX;
      ember.y += ember.speedY;
      
      // Add gravity
      ember.speedY += 0.1;
      
      // Add some flicker
      ember.x += Math.sin(this.time * 3 + ember.age * 0.2) * 0.5;
      
      // Age the ember
      ember.age++;
      
      // Reset ember if it goes off screen or reaches end of life
      if (ember.y > this.canvas.height || ember.age > ember.life) {
        ember.x = this.canvas.width / 2 - 150 + Math.random() * 300;
        ember.y = this.canvas.height - 120;
        ember.speedY = -Math.random() * 6 - 2;
        ember.age = 0;
        ember.color = this.fireColors[Math.floor(Math.random() * this.fireColors.length)];
      }
      
      // Draw ember
      this.ctx.beginPath();
      this.ctx.arc(ember.x, ember.y, ember.size, 0, Math.PI * 2);
      this.ctx.fillStyle = ember.color;
      this.ctx.fill();
      
      // Add glow effect
      this.ctx.shadowColor = ember.color;
      this.ctx.shadowBlur = 15;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }

  // Update and draw smoke
  updateAndDrawSmoke() {
    for (let i = 0; i < this.smoke.length; i++) {
      const smoke = this.smoke[i];
      
      // Update smoke position
      smoke.x += smoke.speedX;
      smoke.y += smoke.speedY;
      
      // Add some sway
      smoke.x += Math.sin(this.time * 0.5 + smoke.age * 0.05) * 0.8;
      
      // Age the smoke
      smoke.age++;
      
      // Reset smoke if it goes off screen or reaches end of life
      if (smoke.y < -50 || smoke.age > smoke.life) {
        smoke.x = this.canvas.width / 2 - 50 + Math.random() * 100;
        smoke.y = this.canvas.height - 200;
        smoke.age = 0;
      }
      
      // Calculate opacity based on age and position
      const ageFactor = Math.min(1, smoke.age / (smoke.life * 0.3));
      const positionFactor = Math.max(0, 1 - (smoke.y / this.canvas.height));
      const currentOpacity = smoke.opacity * ageFactor * positionFactor;
      
      // Draw smoke
      this.ctx.beginPath();
      this.ctx.arc(smoke.x, smoke.y, smoke.size, 0, Math.PI * 2);
      this.ctx.fillStyle = smoke.color.replace(/\d\.\d+\)/, currentOpacity + ')');
      this.ctx.fill();
    }
  }

  // Handle window resize
  handleResize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.initializeLogs(); // Reinitialize logs for new dimensions
      this.initializeFlames(); // Reinitialize flames for new dimensions
      this.initializeEmbers(); // Reinitialize embers for new dimensions
      this.initializeSmoke(); // Reinitialize smoke for new dimensions
    }
  }
}