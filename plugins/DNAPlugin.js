class DNAPlugin extends BasePlugin {
  constructor() {
    super('DNA');
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.time = 0;
    
    // DNA parameters
    this.helixRadius = 0;
    this.helixHeight = 0;
    this.centerX = 0;
    this.centerY = 0;
    this.rotation = 0;
    this.helixes = [];
    this.helixCount = 3; // Three double helixes
    
    // Colors
    this.dnaColors = {
      backbone: '#ff5555', // Red for backbone
      bonds: '#5555ff',    // Blue for hydrogen bonds
      adenine: '#ff5555',   // Red
      thymine: '#55ff55',   // Green
      guanine: '#5555ff',   // Blue
      cytosine: '#ffff55'   // Yellow
    };
    
    this.backgroundColor = '#000010';
  }

  init() {
    // If already initialized, don't do it again
    if (this.initialized) return;

    // Only initialize on the main app page
    if (!document.getElementById('app')) return;

    try {
      // Create canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'dna-canvas';
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;

      // Style for background positioning
      this.canvas.style.position = 'fixed';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.zIndex = '-1';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.background = this.backgroundColor;

      // Insert at beginning of body
      document.body.insertBefore(this.canvas, document.body.firstChild);

      // Get 2D context
      this.ctx = this.canvas.getContext('2d');
      if (!this.ctx) {
        this.canvas = null;
        return;
      }

      // Initialize DNA elements
      this.initializeDNA();

      // Mark as initialized
      this.initialized = true;

      // Start animation if not already running
      if (!this.animationId) {
        this.animate();
      }

      // Handle window resize
      window.addEventListener('resize', this.handleResize.bind(this));

    } catch (error) {
      console.error('Error initializing DNA effect:', error);
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
    this.helixes = [];

    // Remove resize listener
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  apply() {
    this.init();
  }

  remove() {
    this.destroy();
  }

  // Initialize DNA structure
  initializeDNA() {
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
    this.helixHeight = this.canvas.height * 0.8;
    this.helixRadius = Math.min(this.canvas.width * 0.1, this.canvas.height * 0.15);
    
    this.helixes = [];
    
    // Create three double helixes side by side
    for (let h = 0; h < this.helixCount; h++) {
      const offsetX = (h - 1) * this.helixRadius * 3; // Spread helixes horizontally
      const basePairs = [];
      
      // Create base pairs along the helix
      const basePairCount = 25;
      for (let i = 0; i < basePairCount; i++) {
        const progress = i / (basePairCount - 1);
        const y = this.centerY - this.helixHeight / 2 + progress * this.helixHeight;
        
        // Random base pair type (A-T or G-C)
        const pairType = Math.random() > 0.5 ? 'AT' : 'GC';
        
        basePairs.push({
          y: y,
          progress: progress,
          pairType: pairType,
          angle: progress * Math.PI * 4 // 2 full rotations
        });
      }
      
      this.helixes.push({
        offsetX: offsetX,
        basePairs: basePairs
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

    // Update time and rotation
    this.time += 0.02;
    this.rotation += 0.01;

    // Draw DNA
    this.drawDNA();

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  // Draw DNA with three vertical double helixes
  drawDNA() {
    // Draw each double helix
    for (let h = 0; h < this.helixes.length; h++) {
      this.drawDoubleHelix(this.helixes[h].offsetX);
    }
  }

  // Draw a single double helix
  drawDoubleHelix(offsetX) {
    // Draw backbone strands
    this.drawBackbone(offsetX);
    
    // Draw base pairs
    this.drawBasePairs(offsetX);
  }

  // Draw backbone strands
  drawBackbone(offsetX) {
    this.ctx.strokeStyle = this.dnaColors.backbone;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    
    // Left backbone
    this.ctx.beginPath();
    for (let i = 0; i < 50; i++) {
      const progress = i / 49;
      const y = this.centerY - this.helixHeight / 2 + progress * this.helixHeight;
      const angle = progress * Math.PI * 4 + this.rotation;
      const x = this.centerX + offsetX + Math.cos(angle) * this.helixRadius;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();
    
    // Right backbone
    this.ctx.beginPath();
    for (let i = 0; i < 50; i++) {
      const progress = i / 49;
      const y = this.centerY - this.helixHeight / 2 + progress * this.helixHeight;
      const angle = progress * Math.PI * 4 + Math.PI + this.rotation; // Offset by 180 degrees
      const x = this.centerX + offsetX + Math.cos(angle) * this.helixRadius;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    this.ctx.stroke();
  }

  // Draw base pairs with 3x larger connection points
  drawBasePairs(offsetX) {
    for (let h = 0; h < this.helixes.length; h++) {
      const helix = this.helixes[h];
      for (let i = 0; i < helix.basePairs.length; i++) {
        const basePair = helix.basePairs[i];
        const angle1 = basePair.angle + this.rotation;
        const angle2 = basePair.angle + Math.PI + this.rotation; // 180 degrees offset
        
        const x1 = this.centerX + offsetX + Math.cos(angle1) * this.helixRadius;
        const y1 = basePair.y;
        const x2 = this.centerX + offsetX + Math.cos(angle2) * this.helixRadius;
        const y2 = basePair.y;
        
        // Draw hydrogen bonds
        this.ctx.strokeStyle = this.dnaColors.bonds;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        
        // Draw base pair letters with glow and 3x larger connection points
        this.drawBaseWithLargePoint(x1, y1, basePair.pairType[0]);
        this.drawBaseWithLargePoint(x2, y2, basePair.pairType[1]);
      }
    }
  }

  // Draw individual base with 3x larger connection point
  drawBaseWithLargePoint(x, y, base) {
    let color;
    switch (base) {
      case 'A': color = this.dnaColors.adenine; break;
      case 'T': color = this.dnaColors.thymine; break;
      case 'G': color = this.dnaColors.guanine; break;
      case 'C': color = this.dnaColors.cytosine; break;
      default: color = '#ffffff';
    }
    
    // Draw 3x larger connection point
    this.ctx.fillStyle = color;
    
    // Add glow effect
    this.ctx.shadowColor = color;
    this.ctx.shadowBlur = 15; // 3x larger glow
    this.ctx.beginPath();
    this.ctx.arc(x, y, 6, 0, Math.PI * 2); // 3x larger point (was 2, now 6)
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
    
    // Draw base letter
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 14px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(base, x, y);
  }

  // Handle window resize
  handleResize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.centerX = this.canvas.width / 2;
      this.centerY = this.canvas.height / 2;
      this.helixHeight = this.canvas.height * 0.8;
      this.helixRadius = Math.min(this.canvas.width * 0.1, this.canvas.height * 0.15);
      this.initializeDNA(); // Reinitialize DNA for new dimensions
    }
  }
}