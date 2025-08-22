class OCEANDEPTHSPlugin extends BasePlugin {
  constructor() {
    super('OCEANDEPTHS');
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.time = 0;
    
    // Ocean parameters
    this.seaweed = [];
    this.bubbles = [];
    this.fish = [];
    this.particleCount = 100;
    this.fishCount = 15;
    this.seaweedCount = 20;
    
    // Ocean colors
    this.waterColors = [
      'rgba(0, 100, 200, 0.7)',   // Deep blue
      'rgba(0, 80, 180, 0.7)',    // Dark blue
      'rgba(0, 120, 220, 0.7)',   // Medium blue
      'rgba(0, 60, 160, 0.7)'     // Very dark blue
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
      this.canvas.id = 'ocean-canvas';
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;

      // Style for background positioning
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.zIndex = '-1';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.background = 'linear-gradient(to bottom, #000033 0%, #000066 50%, #000022 100%)';

      // Insert at beginning of body
      document.body.insertBefore(this.canvas, document.body.firstChild);

      // Get 2D context
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        this.canvas = null;
        return;
      }

      // Initialize ocean elements
      this.initializeSeaweed();
      this.initializeBubbles();
      this.initializeFish();

      // Mark as initialized
      this.initialized = true;

      // Start animation if not already running
      if (!this.animationId) {
        this.animate();
      }

      // Handle window resize
      window.addEventListener('resize', this.handleResize.bind(this));

    } catch (error) {
      console.error('Error initializing OCEAN DEPTHS effect:', error);
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
    this.seaweed = [];
    this.bubbles = [];
    this.fish = [];

    // Remove resize listener
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  apply() {
    this.init();
  }

  remove() {
    this.destroy();
  }

  // Initialize seaweed
  initializeSeaweed() {
    this.seaweed = [];
    
    for (let i = 0; i < this.seaweedCount; i++) {
      this.seaweed.push({
        x: Math.random() * this.canvas.width,
        y: this.canvas.height - 20,
        height: 100 + Math.random() * 150,
        width: 5 + Math.random() * 10,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.01 + Math.random() * 0.02,
        color: this.waterColors[Math.floor(Math.random() * this.waterColors.length)]
      });
    }
  }

  // Initialize bubbles
  initializeBubbles() {
    this.bubbles = [];
    
    for (let i = 0; i < this.particleCount; i++) {
      this.bubbles.push({
        x: Math.random() * this.canvas.width,
        y: this.canvas.height + Math.random() * 100, // Start from bottom
        size: Math.random() * 8 + 2,
        speed: Math.random() * 0.8 + 0.2,
        life: Math.random() * 500 + 300, // Much longer life (300-800 frames)
        age: 0
      });
    }
  }

  // Initialize fish
  initializeFish() {
    this.fish = [];
    
    for (let i = 0; i < this.fishCount; i++) {
      // All fish swim from left to right initially
      this.fish.push({
        x: -50 - Math.random() * 100, // Start off-screen to the left
        y: 100 + Math.random() * (this.canvas.height - 200),
        size: 10 + Math.random() * 20,
        speed: Math.random() * 2 + 1, // All positive speeds
        direction: 1, // All fish swim right initially
        color: `hsl(${Math.random() * 60}, 80%, 60%)`, // Various fish colors
        wiggle: Math.random() * Math.PI * 2,
        wiggleSpeed: 0.05 + Math.random() * 0.1
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
    this.ctx.fillStyle = 'rgba(0, 0, 20, 0.1)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update time
    this.time += 0.02;

    // Draw seaweed
    this.drawSeaweed();

    // Update and draw bubbles
    this.updateAndDrawBubbles();

    // Update and draw fish
    this.updateAndDrawFish();

    // Draw caustic light effects
    this.drawCausticLight();

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  // Draw seaweed
  drawSeaweed() {
    for (let i = 0; i < this.seaweed.length; i++) {
      const plant = this.seaweed[i];
      
      // Update sway
      plant.sway += plant.swaySpeed;
      const swayOffset = Math.sin(plant.sway) * 10;
      
      // Draw seaweed with gradient
      const gradient = this.ctx.createLinearGradient(
        plant.x + swayOffset, plant.y,
        plant.x + swayOffset, plant.y - plant.height
      );
      gradient.addColorStop(0, plant.color);
      gradient.addColorStop(1, plant.color.replace('0.7', '0.3'));
      
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      
      // Create wavy seaweed shape
      this.ctx.moveTo(plant.x + swayOffset, plant.y);
      for (let j = 0; j < plant.height; j += 10) {
        const wave = Math.sin(j * 0.1 + plant.sway) * 5;
        this.ctx.lineTo(plant.x + swayOffset + wave, plant.y - j);
      }
      this.ctx.lineTo(plant.x + swayOffset, plant.y - plant.height);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  // Update and draw bubbles
  updateAndDrawBubbles() {
    for (let i = 0; i < this.bubbles.length; i++) {
      const bubble = this.bubbles[i];
      
      // Update bubble position
      bubble.y -= bubble.speed;
      bubble.x += Math.sin(this.time + bubble.age * 0.05) * 0.3;
      
      // Age the bubble
      bubble.age++;
      
      // Reset bubble if it goes off screen or reaches end of life
      if (bubble.y < -20 || bubble.age > bubble.life) {
        bubble.x = Math.random() * this.canvas.width;
        bubble.y = this.canvas.height + 20; // Reset to bottom
        bubble.age = 0;
      }
      
      // Draw bubble with highlight
      this.ctx.beginPath();
      this.ctx.arc(bubble.x, bubble.y, bubble.size, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(200, 230, 255, 0.3)';
      this.ctx.fill();
      
      // Add highlight
      this.ctx.beginPath();
      this.ctx.arc(bubble.x - bubble.size * 0.3, bubble.y - bubble.size * 0.3, bubble.size * 0.3, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.fill();
    }
  }

  // Update and draw fish
  updateAndDrawFish() {
    for (let i = 0; i < this.fish.length; i++) {
      const fish = this.fish[i];
      
      // Update fish position (all swim from left to right)
      fish.x += fish.speed;
      fish.wiggle += fish.wiggleSpeed;
      
      // Reset fish when they go off the right side of the screen
      if (fish.x > this.canvas.width + 50) {
        fish.x = -50; // Reset to the left side
        fish.y = 100 + Math.random() * (this.canvas.height - 200); // Random new Y position
      }
      
      // Draw fish (all facing right)
      this.ctx.save();
      this.ctx.translate(fish.x, fish.y);
      
      // Fish body
      this.ctx.fillStyle = fish.color;
      this.ctx.beginPath();
      this.ctx.ellipse(0, 0, fish.size, fish.size * 0.5, 0, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Fish tail
      this.ctx.fillStyle = fish.color;
      this.ctx.beginPath();
      this.ctx.moveTo(-fish.size, 0);
      this.ctx.lineTo(-fish.size * 1.5, -fish.size * 0.3);
      this.ctx.lineTo(-fish.size * 1.5, fish.size * 0.3);
      this.ctx.closePath();
      this.ctx.fill();
      
      // Fish eye
      this.ctx.fillStyle = 'white';
      this.ctx.beginPath();
      this.ctx.arc(fish.size * 0.5, -fish.size * 0.2, fish.size * 0.2, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.fillStyle = 'black';
      this.ctx.beginPath();
      this.ctx.arc(fish.size * 0.55, -fish.size * 0.2, fish.size * 0.1, 0, Math.PI * 2);
      this.ctx.fill();
      
      this.ctx.restore();
    }
  }

  // Draw caustic light effects
  drawCausticLight() {
    // Create a subtle caustic light effect
    for (let i = 0; i < 5; i++) {
      const x = (Math.sin(this.time * 0.5 + i) * 0.5 + 0.5) * this.canvas.width;
      const y = 50 + Math.sin(this.time * 0.3 + i * 0.7) * 30;
      const size = 200 + Math.sin(this.time * 2 + i) * 50;
      
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size);
      gradient.addColorStop(0, 'rgba(100, 200, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
      
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // Handle window resize
  handleResize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.initializeSeaweed(); // Reinitialize seaweed for new dimensions
      this.initializeBubbles(); // Reinitialize bubbles for new dimensions
      this.initializeFish(); // Reinitialize fish for new dimensions
    }
  }
}