class MATRIXPlugin extends BasePlugin {
  constructor() {
    super('MATRIX');
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.columns = [];
    this.time = 0;
    
    // Matrix parameters
    this.fontSize = 14;
    this.columnsCount = 0;
    this.drops = [];
    
    // Matrix characters - Katakana characters for authentic look
    this.chars = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  }

  init() {
    // If already initialized, don't do it again
    if (this.initialized) return;

    // Only initialize on the main app page
    if (!document.getElementById('app')) return;

    try {
      // Create canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'matrix-canvas';
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;

      // Style for background positioning
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.zIndex = '-1';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.background = '#000';

      // Insert at beginning of body
      document.body.insertBefore(this.canvas, document.body.firstChild);

      // Get 2D context
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        this.canvas = null;
        return;
      }

      // Initialize matrix columns
      this.initializeColumns();

      // Mark as initialized
      this.initialized = true;

      // Start animation if not already running
      if (!this.animationId) {
        this.animate();
      }

      // Handle window resize
      window.addEventListener('resize', this.handleResize.bind(this));

    } catch (error) {
      console.error('Error initializing MATRIX effect:', error);
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

    // Reset time and columns
    this.time = 0;
    this.initialized = false;
    this.columns = [];
    this.drops = [];

    // Remove resize listener
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  apply() {
    this.init();
  }

  remove() {
    this.destroy();
  }

  // Initialize matrix columns
  initializeColumns() {
    this.columns = [];
    this.drops = [];
    
    // Calculate number of columns based on canvas width and font size
    this.columnsCount = Math.floor(this.canvas.width / this.fontSize);
    
    // Create columns with random properties
    for (let i = 0; i < this.columnsCount; i++) {
      this.columns.push({
        x: i * this.fontSize,
        chars: [],
        length: Math.floor(Math.random() * 20) + 5, // Random length between 5 and 25
        speed: Math.random() * 3 + 2 // Random speed between 2 and 5
      });
      
      // Initialize drop position for each column
      this.drops.push(Math.floor(Math.random() * -100));
    }
  }

  // Get a random character from the matrix set
  getRandomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }

  // Animation loop
  animate() {
    if (!this.ctx || !this.canvas) {
      this.initialized = false;
      return;
    }

    // Semi-transparent black overlay to create fading effect
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Set font properties
    this.ctx.font = `${this.fontSize}px monospace`;
    
    // Draw each column
    for (let i = 0; i < this.columns.length; i++) {
      const column = this.columns[i];
      
      // Move drop down
      this.drops[i]++;
      
      // Reset drop if it goes beyond canvas
      if (this.drops[i] * this.fontSize > this.canvas.height && Math.random() > 0.975) {
        this.drops[i] = Math.floor(Math.random() * -30);
      }
      
      // Draw characters in the column
      for (let j = 0; j < column.length; j++) {
        const y = (this.drops[i] - j) * this.fontSize;
        
        // Only draw if character is on screen
        if (y > 0 && y < this.canvas.height) {
          // Head character is bright green
          if (j === 0) {
            this.ctx.fillStyle = '#00ff41';
          } 
          // Characters near head are medium green
          else if (j < 3) {
            this.ctx.fillStyle = '#00cc33';
          } 
          // Fading trail characters
          else {
            const fadeFactor = Math.max(0, 1 - (j / column.length));
            const greenValue = Math.floor(100 * fadeFactor);
            this.ctx.fillStyle = `#00${greenValue.toString(16).padStart(2, '0')}00`;
          }
          
          // Draw character
          const char = this.getRandomChar();
          this.ctx.fillText(char, column.x, y);
        }
      }
    }

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  // Handle window resize
  handleResize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.initializeColumns(); // Reinitialize columns for new dimensions
    }
  }
}