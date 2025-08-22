class GEOMETRICPlugin extends BasePlugin {
  constructor() {
    super('GEOMETRIC');
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.time = 0;
    
    // Geometric parameters
    this.shapes = [];
    this.shapeCount = 12;
    
    // Shape colors
    this.colors = [
      'rgba(255, 0, 255, 0.7)',   // Magenta
      'rgba(0, 255, 255, 0.7)',   // Cyan
      'rgba(255, 255, 0, 0.7)',   // Yellow
      'rgba(255, 0, 170, 0.7)',   // Pink
      'rgba(0, 255, 170, 0.7)',   // Green
      'rgba(255, 85, 0, 0.7)',    // Orange
      'rgba(170, 0, 255, 0.7)'    // Purple
    ];
    
    // Shape types
    this.shapeTypes = ['cube', 'pyramid', 'sphere', 'torus'];
  }

  init() {
    // If already initialized, don't do it again
    if (this.initialized) return;

    // Only initialize on the main app page
    if (!document.getElementById('app')) return;

    try {
      // Create canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'geometric-canvas';
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;

      // Style for background positioning
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.zIndex = '-1';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.background = 'radial-gradient(ellipse at center, #0a0a1a 0%, #000000 100%)';

      // Insert at beginning of body
      document.body.insertBefore(this.canvas, document.body.firstChild);

      // Get 2D context
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        this.canvas = null;
        return;
      }

      // Initialize shapes
      this.initializeShapes();

      // Mark as initialized
      this.initialized = true;

      // Start animation if not already running
      if (!this.animationId) {
        this.animate();
      }

      // Handle window resize
      window.addEventListener('resize', this.handleResize.bind(this));

    } catch (error) {
      console.error('Error initializing GEOMETRIC effect:', error);
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
    this.shapes = [];

    // Remove resize listener
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  apply() {
    this.init();
  }

  remove() {
    this.destroy();
  }

  // Initialize shapes
  initializeShapes() {
    this.shapes = [];
    
    for (let i = 0; i < this.shapeCount; i++) {
      this.shapes.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: 30 + Math.random() * 70,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        type: this.shapeTypes[Math.floor(Math.random() * this.shapeTypes.length)],
        morph: Math.random() * Math.PI * 2,
        morphSpeed: 0.01 + Math.random() * 0.02,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5
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

    // Update and draw shapes
    this.updateAndDrawShapes();

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  // Update and draw shapes
  updateAndDrawShapes() {
    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];
      
      // Update shape position
      shape.x += shape.speedX;
      shape.y += shape.speedY;
      
      // Update rotation
      shape.rotation += shape.rotationSpeed;
      
      // Update morph
      shape.morph += shape.morphSpeed;
      
      // Reset shape if it goes off screen
      if (shape.x < -100 || shape.x > this.canvas.width + 100 || 
          shape.y < -100 || shape.y > this.canvas.height + 100) {
        shape.x = Math.random() * this.canvas.width;
        shape.y = Math.random() * this.canvas.height;
      }
      
      // Draw shape based on type
      this.ctx.save();
      this.ctx.translate(shape.x, shape.y);
      this.ctx.rotate(shape.rotation);
      
      switch (shape.type) {
        case 'cube':
          this.drawCube(shape);
          break;
        case 'pyramid':
          this.drawPyramid(shape);
          break;
        case 'sphere':
          this.drawSphere(shape);
          break;
        case 'torus':
          this.drawTorus(shape);
          break;
      }
      
      this.ctx.restore();
    }
  }

  // Draw cube
  drawCube(shape) {
    const size = shape.size * (0.8 + Math.sin(shape.morph) * 0.2);
    
    // Draw cube faces with gradient
    const gradient = this.ctx.createLinearGradient(-size/2, -size/2, size/2, size/2);
    gradient.addColorStop(0, shape.color);
    gradient.addColorStop(1, shape.color.replace('0.7', '0.3'));
    
    this.ctx.fillStyle = gradient;
    this.ctx.strokeStyle = shape.color.replace('0.7', '0.9');
    this.ctx.lineWidth = 2;
    
    // Front face
    this.ctx.beginPath();
    this.ctx.moveTo(-size/2, -size/2);
    this.ctx.lineTo(size/2, -size/2);
    this.ctx.lineTo(size/2, size/2);
    this.ctx.lineTo(-size/2, size/2);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    
    // Add 3D effect with side faces
    this.ctx.beginPath();
    this.ctx.moveTo(size/2, -size/2);
    this.ctx.lineTo(size/2 + size/4, -size/2 - size/4);
    this.ctx.lineTo(size/2 + size/4, size/2 - size/4);
    this.ctx.lineTo(size/2, size/2);
    this.ctx.closePath();
    this.ctx.fillStyle = shape.color.replace('0.7', '0.4');
    this.ctx.fill();
    this.ctx.stroke();
  }

  // Draw pyramid
  drawPyramid(shape) {
    const size = shape.size * (0.8 + Math.sin(shape.morph) * 0.2);
    
    // Draw pyramid with gradient
    const gradient = this.ctx.createLinearGradient(-size/2, size/2, 0, -size/2);
    gradient.addColorStop(0, shape.color);
    gradient.addColorStop(1, shape.color.replace('0.7', '0.3'));
    
    this.ctx.fillStyle = gradient;
    this.ctx.strokeStyle = shape.color.replace('0.7', '0.9');
    this.ctx.lineWidth = 2;
    
    // Pyramid base
    this.ctx.beginPath();
    this.ctx.moveTo(-size/2, size/2);
    this.ctx.lineTo(size/2, size/2);
    this.ctx.lineTo(0, -size/2);
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
  }

  // Draw sphere
  drawSphere(shape) {
    const size = shape.size * (0.8 + Math.sin(shape.morph) * 0.2);
    
    // Draw sphere with radial gradient
    const gradient = this.ctx.createRadialGradient(
      -size/4, -size/4, 0,
      0, 0, size/2
    );
    gradient.addColorStop(0, shape.color.replace('0.7', '0.9'));
    gradient.addColorStop(1, shape.color);
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size/2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Add highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(-size/6, -size/6, size/6, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // Draw torus
  drawTorus(shape) {
    const size = shape.size * (0.8 + Math.sin(shape.morph) * 0.2);
    const tubeRadius = size * 0.3;
    const ringRadius = size * 0.5;
    
    // Draw torus with gradient
    const gradient = this.ctx.createLinearGradient(-ringRadius, -ringRadius, ringRadius, ringRadius);
    gradient.addColorStop(0, shape.color);
    gradient.addColorStop(1, shape.color.replace('0.7', '0.3'));
    
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = tubeRadius;
    this.ctx.lineJoin = 'round';
    
    // Draw torus ring
    this.ctx.beginPath();
    for (let i = 0; i <= 360; i += 10) {
      const angle = i * Math.PI / 180;
      const x = Math.cos(angle) * ringRadius;
      const y = Math.sin(angle) * ringRadius;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.closePath();
    this.ctx.stroke();
  }

  // Handle window resize
  handleResize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.initializeShapes(); // Reinitialize shapes for new dimensions
    }
  }
}