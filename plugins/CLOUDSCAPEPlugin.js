class CLOUDSCAPEPlugin extends BasePlugin {
  constructor() {
    super('CLOUDSCAPE');
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.time = 0;
    
    // Cloud parameters
    this.clouds = [];
    this.cloudCount = 15;
    this.birds = [];
    this.birdCount = 8;
    
    // Sky colors for day/night cycle
    this.skyColors = [
      '#87CEEB', // Day sky blue
      '#FFB6C1', // Sunset pink
      '#87CEFA', // Light sky blue
      '#4682B4', // Steel blue
      '#1E90FF', // Dodger blue
      '#00008B'  // Dark blue (night)
    ];
    
    // Cloud colors
    this.cloudColors = [
      'rgba(255, 255, 255, 0.9)',
      'rgba(240, 240, 240, 0.85)',
      'rgba(230, 230, 230, 0.8)'
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
      this.canvas.id = 'cloudscape-canvas';
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;

      // Style for background positioning
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.zIndex = '-1';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.background = this.getSkyColor();

      // Insert at beginning of body
      document.body.insertBefore(this.canvas, document.body.firstChild);

      // Get 2D context
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        this.canvas = null;
        return;
      }

      // Initialize clouds and birds
      this.initializeClouds();
      this.initializeBirds();

      // Mark as initialized
      this.initialized = true;

      // Start animation if not already running
      if (!this.animationId) {
        this.animate();
      }

      // Handle window resize
      window.addEventListener('resize', this.handleResize.bind(this));

    } catch (error) {
      console.error('Error initializing CLOUDSCAPE effect:', error);
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
    this.clouds = [];
    this.birds = [];

    // Remove resize listener
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  apply() {
    this.init();
  }

  remove() {
    this.destroy();
  }

  // Get sky color based on time of day
  getSkyColor() {
    const hour = (this.time * 0.1) % 24;
    if (hour < 6 || hour > 20) {
      return this.skyColors[5]; // Night
    } else if (hour < 8 || hour > 18) {
      return this.skyColors[1]; // Sunset/sunrise
    } else {
      return this.skyColors[0]; // Day
    }
  }

  // Initialize clouds
  initializeClouds() {
    this.clouds = [];
    
    for (let i = 0; i < this.cloudCount; i++) {
      this.clouds.push({
        x: Math.random() * this.canvas.width,
        y: 50 + Math.random() * (this.canvas.height * 0.4),
        size: 30 + Math.random() * 70,
        speed: 0.2 + Math.random() * 0.5,
        segments: 5 + Math.floor(Math.random() * 5),
        color: this.cloudColors[Math.floor(Math.random() * this.cloudColors.length)]
      });
    }
  }

  // Initialize birds
  initializeBirds() {
    this.birds = [];
    
    for (let i = 0; i < this.birdCount; i++) {
      this.birds.push({
        x: Math.random() * this.canvas.width,
        y: 100 + Math.random() * 200,
        size: 3 + Math.random() * 5,
        speed: 1 + Math.random() * 2,
        wingAngle: 0,
        wingSpeed: 0.2 + Math.random() * 0.3,
        direction: Math.random() > 0.5 ? 1 : -1
      });
    }
  }

  // Animation loop
  animate() {
    if (!this.ctx || !this.canvas) {
      this.initialized = false;
      return;
    }

    // Update time
    this.time += 0.01;

    // Update sky color for day/night cycle
    this.canvas.style.background = this.getSkyColor();

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw distant mountains
    this.drawMountains();

    // Update and draw clouds
    this.updateAndDrawClouds();

    // Update and draw birds
    this.updateAndDrawBirds();

    // Draw sun/moon
    this.drawCelestialBody();

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  // Draw distant mountains
  drawMountains() {
    const gradient = this.ctx.createLinearGradient(0, this.canvas.height * 0.6, 0, this.canvas.height);
    gradient.addColorStop(0, 'rgba(50, 50, 70, 0.7)');
    gradient.addColorStop(1, 'rgba(30, 30, 50, 0.9)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    
    // Create mountain silhouette
    this.ctx.moveTo(0, this.canvas.height);
    for (let x = 0; x <= this.canvas.width; x += 50) {
      const y = this.canvas.height * 0.7 + Math.sin(x * 0.02 + this.time * 0.1) * 30;
      this.ctx.lineTo(x, y);
    }
    this.ctx.lineTo(this.canvas.width, this.canvas.height);
    this.ctx.closePath();
    this.ctx.fill();
  }

  // Update and draw clouds
  updateAndDrawClouds() {
    for (let i = 0; i < this.clouds.length; i++) {
      const cloud = this.clouds[i];
      
      // Update cloud position
      cloud.x += cloud.speed;
      
      // Reset cloud if it goes off screen
      if (cloud.x > this.canvas.width + 100) {
        cloud.x = -100;
        cloud.y = 50 + Math.random() * (this.canvas.height * 0.4);
      }
      
      // Draw cloud with fluffy appearance
      this.ctx.fillStyle = cloud.color;
      
      // Create a fluffy cloud using multiple circles
      for (let j = 0; j < cloud.segments; j++) {
        const segmentX = cloud.x + (j - cloud.segments/2) * (cloud.size * 0.3);
        const segmentY = cloud.y + Math.sin(this.time + j) * 2;
        const segmentSize = cloud.size * (0.7 + Math.sin(this.time * 2 + j) * 0.1);
        
        this.ctx.beginPath();
        this.ctx.arc(segmentX, segmentY, segmentSize, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  // Update and draw birds
  updateAndDrawBirds() {
    for (let i = 0; i < this.birds.length; i++) {
      const bird = this.birds[i];
      
      // Update bird position
      bird.x += bird.speed * bird.direction;
      bird.wingAngle += bird.wingSpeed;
      
      // Reset bird if it goes off screen
      if ((bird.direction > 0 && bird.x > this.canvas.width + 50) || 
          (bird.direction < 0 && bird.x < -50)) {
        bird.x = bird.direction > 0 ? -50 : this.canvas.width + 50;
        bird.y = 100 + Math.random() * 200;
      }
      
      // Draw bird
      this.ctx.save();
      this.ctx.translate(bird.x, bird.y);
      if (bird.direction < 0) {
        this.ctx.scale(-1, 1); // Flip for left-moving bird
      }
      
      // Bird body
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, bird.size, bird.size * 0.5, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Bird wings
      const wingOffset = Math.sin(bird.wingAngle) * bird.size * 0.5;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      this.ctx.beginPath();
      this.ctx.moveTo(-bird.size * 0.5, 0);
      this.ctx.lineTo(-bird.size * 1.5, -wingOffset);
      this.ctx.lineTo(-bird.size * 0.5, wingOffset);
      this.ctx.closePath();
      this.ctx.fill();
      
      // Bird beak
      this.ctx.fillStyle = 'orange';
      this.ctx.beginPath();
      this.ctx.moveTo(bird.size, 0);
      this.ctx.lineTo(bird.size * 1.5, -bird.size * 0.2);
      this.ctx.lineTo(bird.size * 1.5, bird.size * 0.2);
      this.ctx.closePath();
      this.ctx.fill();
      
      this.ctx.restore();
    }
  }

  // Draw sun or moon based on time of day
  drawCelestialBody() {
    const hour = (this.time * 0.1) % 24;
    let x = (this.time * 10) % (this.canvas.width + 200) - 100;
    let y = 100 + Math.sin(x * 0.01) * 50;
    
    if (hour < 6 || hour > 20) {
      // Moon (night)
      this.ctx.fillStyle = 'rgba(255, 255, 220, 0.8)';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 30, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Moon crater
      this.ctx.fillStyle = 'rgba(200, 200, 180, 0.5)';
      this.ctx.beginPath();
      this.ctx.arc(x - 10, y - 10, 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(x + 15, y + 5, 7, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      // Sun (day)
      this.ctx.fillStyle = 'rgba(255, 255, 200, 0.9)';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 40, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Sun rays
      this.ctx.strokeStyle = 'rgba(255, 255, 200, 0.5)';
      this.ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const startX = x + Math.cos(angle) * 45;
        const startY = y + Math.sin(angle) * 45;
        const endX = x + Math.cos(angle) * 60;
        const endY = y + Math.sin(angle) * 60;
        
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(endX, endY);
        this.ctx.stroke();
      }
    }
  }

  // Handle window resize
  handleResize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.initializeClouds(); // Reinitialize clouds for new dimensions
      this.initializeBirds(); // Reinitialize birds for new dimensions
    }
  }
}