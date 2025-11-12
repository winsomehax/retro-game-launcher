class RETROCRTPlugin extends BasePlugin {
  constructor() {
    super('RETROCRT');
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.time = 0;
    
    // CRT parameters
    this.scanlineSpacing = 3; // Reduced spacing for more pronounced scanlines
    this.flickerIntensity = 0.1; // Increased flicker
    this.distortionAmount = 0.15; // Increased distortion
    
    // Game elements
    this.pacman = {
      x: 0,
      y: 0,
      radius: 16,
      angle: 0, // For mouth animation
      speed: 2,
      color: '#ffff00'
    };
    
    this.ghosts = [];
    this.pellets = [];
    this.powerPellets = [];
    this.walls = [];
    this.mazeLayout = [];
    this.gridSize = 40; // Doubled from 20 to 40
    this.mazeWidth = 19;
    this.mazeHeight = 21;
    this.score = 0;
    this.gameWidth = 0;
    this.gameHeight = 0;
    
    // Colors
    this.screenColor = '#00ff00'; // Classic green CRT
    this.backgroundColor = '#001100';
    this.wallColor = '#0066cc';
    this.pelletColor = '#ffffff';
    this.powerPelletColor = '#ffff00';
    this.ghostColors = ['#ff0000', '#ff9900', '#00ffff', '#ff66ff'];
  }

  init() {
    // If already initialized, don't do it again
    if (this.initialized) return;

    // Only initialize on the main app page
    if (!document.getElementById('app')) return;

    try {
      // Create canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'retro-crt-canvas';
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

      // Initialize game elements
      this.gameWidth = this.canvas.width;
      this.gameHeight = this.canvas.height;
      this.initializeGame();

      // Mark as initialized
      this.initialized = true;

      // Start animation if not already running
      if (!this.animationId) {
        this.animate();
      }

      // Handle window resize
      window.addEventListener('resize', this.handleResize.bind(this));

    } catch (error) {
      console.error('Error initializing RETRO CRT effect:', error);
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
    this.ghosts = [];
    this.pellets = [];
    this.powerPellets = [];
    this.walls = [];

    // Remove resize listener
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  apply() {
    this.init();
  }

  remove() {
    this.destroy();
  }

  // Initialize game elements for Pacman
  initializeGame() {
    // Initialize Pacman in a valid path position
    this.pacman.x = 1 * this.gridSize + this.gridSize/2; // Start at top left path
    this.pacman.y = 1 * this.gridSize + this.gridSize/2;
    this.pacman.angle = 0;
    
    // Maze layout - simplified Pacman maze
    this.walls = [];
    this.gridSize = 40; // Doubled from 20 to 40
    this.mazeWidth = 19;
    this.mazeHeight = 21;
    
    // Simplified Pacman maze layout (1 = wall, 0 = path)
    this.mazeLayout = [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
      [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,0,1],
      [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
      [1,1,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,1,1],
      [0,0,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,0],
      [1,1,1,1,0,1,0,1,1,0,1,1,0,1,0,1,1,1,1],
      [0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0],
      [1,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1],
      [0,0,0,1,0,1,0,0,0,0,0,0,0,1,0,1,0,0,0],
      [1,1,1,1,0,1,0,1,1,1,1,1,0,1,0,1,1,1,1],
      [1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1],
      [1,0,1,1,0,1,1,1,0,1,0,1,1,1,0,1,1,0,1],
      [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
      [1,1,0,1,0,1,0,1,1,1,1,1,0,1,0,1,0,1,1],
      [1,0,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1],
      [1,0,1,1,1,1,1,1,0,1,0,1,1,1,1,1,1,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ];
    
    // Create walls based on maze layout
    for (let y = 0; y < this.mazeLayout.length; y++) {
      for (let x = 0; x < this.mazeLayout[y].length; x++) {
        if (this.mazeLayout[y][x] === 1) {
          this.walls.push({
            x: x * this.gridSize,
            y: y * this.gridSize,
            width: this.gridSize,
            height: this.gridSize
          });
        }
      }
    }
    
    // Initialize pellets based on maze layout
    this.pellets = [];
    this.powerPellets = [];
    
    for (let y = 0; y < this.mazeLayout.length; y++) {
      for (let x = 0; x < this.mazeLayout[y].length; x++) {
        if (this.mazeLayout[y][x] === 0) {
          // Place power pellets at specific locations
          if ((x === 1 && y === 1) || (x === 17 && y === 1) || 
              (x === 1 && y === 19) || (x === 17 && y === 19)) {
            this.powerPellets.push({
              x: x * this.gridSize + this.gridSize/2,
              y: y * this.gridSize + this.gridSize/2,
              radius: 12
            });
          } else {
            // Place regular pellets elsewhere
            this.pellets.push({
              x: x * this.gridSize + this.gridSize/2,
              y: y * this.gridSize + this.gridSize/2,
              radius: 4
            });
          }
        }
      }
    }
    
    // Initialize ghosts at starting positions in valid path positions
    this.ghosts = [];
    const ghostStartPositions = [
      {x: 9 * this.gridSize + this.gridSize/2, y: 9 * this.gridSize + this.gridSize/2},   // Red ghost
      {x: 10 * this.gridSize + this.gridSize/2, y: 9 * this.gridSize + this.gridSize/2},  // Pink ghost
      {x: 9 * this.gridSize + this.gridSize/2, y: 11 * this.gridSize + this.gridSize/2},  // Blue ghost
      {x: 10 * this.gridSize + this.gridSize/2, y: 11 * this.gridSize + this.gridSize/2}  // Orange ghost
    ];
    
    for (let i = 0; i < 4; i++) {
      this.ghosts.push({
        x: ghostStartPositions[i].x,
        y: ghostStartPositions[i].y,
        radius: 16,
        color: this.ghostColors[i],
        speed: 1,
        direction: Math.floor(Math.random() * 4), // 0=up, 1=right, 2=down, 3=left
        changeDirectionTimer: Math.random() * 100 + 50
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
    this.time += 0.05;

    // Clear canvas
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update game elements
    this.updateGame();

    // Draw game elements
    this.drawGame();

    // Draw scanlines
    this.drawScanlines();

    // Draw screen flicker
    this.drawScreenFlicker();

    // Draw screen distortion
    this.drawScreenDistortion();

    // Draw screen glow
    this.drawScreenGlow();

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  // Update game elements
  updateGame() {
    // Update Pacman's mouth animation
    this.pacman.angle = (this.pacman.angle + 0.2) % (Math.PI * 2);
    
    // Move Pacman along the maze paths properly
    const time = this.time * 0.03;
    
    // Calculate grid position
    const gridX = Math.floor(this.pacman.x / this.gridSize);
    const gridY = Math.floor(this.pacman.y / this.gridSize);
    
    // Move Pacman in a pattern that follows the actual maze paths
    // This creates a path that goes around the maze following open paths
    const pathTime = Math.floor(time * 2);
    
    if (pathTime % 16 < 4) {
      // Move right along top path
      this.pacman.x = (1 + (pathTime % 4)) * this.gridSize + this.gridSize/2;
      this.pacman.y = 1 * this.gridSize + this.gridSize/2;
    } else if (pathTime % 16 < 8) {
      // Move down right side
      this.pacman.x = 17 * this.gridSize + this.gridSize/2;
      this.pacman.y = (1 + ((pathTime % 4) + 1)) * this.gridSize + this.gridSize/2;
    } else if (pathTime % 16 < 12) {
      // Move left along bottom path
      this.pacman.x = (17 - (pathTime % 4)) * this.gridSize + this.gridSize/2;
      this.pacman.y = 19 * this.gridSize + this.gridSize/2;
    } else {
      // Move up left side
      this.pacman.x = 1 * this.gridSize + this.gridSize/2;
      this.pacman.y = (19 - ((pathTime % 4) + 1)) * this.gridSize + this.gridSize/2;
    }
    
    // Update ghosts with proper path following
    for (let i = 0; i < this.ghosts.length; i++) {
      const ghost = this.ghosts[i];
      const ghostTime = this.time * 0.02 + i;
      
      // Each ghost follows a different path pattern
      if (i === 0) {
        // Red ghost - follows inner loop
        const innerPathTime = Math.floor(ghostTime * 2);
        if (innerPathTime % 12 < 3) {
          ghost.x = (8 + (innerPathTime % 3)) * this.gridSize + this.gridSize/2;
          ghost.y = 9 * this.gridSize + this.gridSize/2;
        } else if (innerPathTime % 12 < 6) {
          ghost.x = 10 * this.gridSize + this.gridSize/2;
          ghost.y = (9 + ((innerPathTime % 3) + 1)) * this.gridSize + this.gridSize/2;
        } else if (innerPathTime % 12 < 9) {
          ghost.x = (10 - (innerPathTime % 3)) * this.gridSize + this.gridSize/2;
          ghost.y = 11 * this.gridSize + this.gridSize/2;
        } else {
          ghost.x = 8 * this.gridSize + this.gridSize/2;
          ghost.y = (11 - ((innerPathTime % 3) + 1)) * this.gridSize + this.gridSize/2;
        }
      } else if (i === 1) {
        // Pink ghost - moves vertically in central column
        ghost.x = 9.5 * this.gridSize;
        const verticalPos = Math.sin(ghostTime * 1.5) * 6;
        ghost.y = (10 + verticalPos) * this.gridSize;
      } else if (i === 2) {
        // Blue ghost - moves horizontally in central row
        const horizontalPos = Math.cos(ghostTime * 1.3) * 6;
        ghost.x = (9.5 + horizontalPos) * this.gridSize;
        ghost.y = 10 * this.gridSize;
      } else {
        // Orange ghost - moves in figure-8 pattern in central area
        const figure8X = Math.cos(ghostTime * 0.8) * 4;
        const figure8Y = Math.sin(ghostTime * 1.6) * 3;
        ghost.x = (9.5 + figure8X) * this.gridSize;
        ghost.y = (10 + figure8Y) * this.gridSize;
      }
    }
    
    // Check pellet collision
    for (let i = this.pellets.length - 1; i >= 0; i--) {
      const pellet = this.pellets[i];
      const dx = this.pacman.x - pellet.x;
      const dy = this.pacman.y - pellet.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < this.pacman.radius + pellet.radius) {
        // Pellet eaten
        this.pellets.splice(i, 1);
        this.score += 10;
      }
    }
    
    // Check power pellet collision
    for (let i = this.powerPellets.length - 1; i >= 0; i--) {
      const pellet = this.powerPellets[i];
      const dx = this.pacman.x - pellet.x;
      const dy = this.pacman.y - pellet.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < this.pacman.radius + pellet.radius) {
        // Power pellet eaten
        this.powerPellets.splice(i, 1);
        this.score += 50;
      }
    }
  }

  // Draw game elements
  drawGame() {
    // Center the maze on the screen
    const offsetX = (this.canvas.width - this.mazeWidth * this.gridSize) / 2;
    const offsetY = (this.canvas.height - this.mazeHeight * this.gridSize) / 2;
    
    // Draw walls
    this.ctx.fillStyle = this.wallColor;
    for (let i = 0; i < this.walls.length; i++) {
      const wall = this.walls[i];
      this.ctx.fillRect(wall.x + offsetX, wall.y + offsetY, wall.width, wall.height);
    }

    // Draw pellets
    this.ctx.fillStyle = this.pelletColor;
    for (let i = 0; i < this.pellets.length; i++) {
      const pellet = this.pellets[i];
      this.ctx.beginPath();
      this.ctx.arc(pellet.x + offsetX, pellet.y + offsetY, pellet.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw power pellets
    this.ctx.fillStyle = this.powerPelletColor;
    for (let i = 0; i < this.powerPellets.length; i++) {
      const pellet = this.powerPellets[i];
      this.ctx.beginPath();
      this.ctx.arc(pellet.x + offsetX, pellet.y + offsetY, pellet.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw ghosts
    for (let i = 0; i < this.ghosts.length; i++) {
      const ghost = this.ghosts[i];
      this.ctx.fillStyle = ghost.color;
      
      // Ghost body (a circle with a wavy bottom)
      this.ctx.beginPath();
      this.ctx.arc(ghost.x + offsetX, ghost.y + offsetY, ghost.radius, Math.PI, 0, false); // Top half circle
      
      // Wavy bottom
      this.ctx.lineTo(ghost.x + offsetX + ghost.radius, ghost.y + offsetY);
      for (let j = 0; j < 3; j++) {
        this.ctx.lineTo(ghost.x + offsetX + ghost.radius - j * (ghost.radius * 2/3), ghost.y + offsetY + ghost.radius/3);
        this.ctx.lineTo(ghost.x + offsetX + ghost.radius - (j+1) * (ghost.radius * 2/3), ghost.y + offsetY);
      }
      this.ctx.closePath();
      this.ctx.fill();
      
      // Ghost eyes
      this.ctx.fillStyle = '#ffffff';
      this.ctx.beginPath();
      this.ctx.arc(ghost.x + offsetX - ghost.radius/3, ghost.y + offsetY - ghost.radius/6, ghost.radius/3, 0, Math.PI * 2);
      this.ctx.arc(ghost.x + offsetX + ghost.radius/3, ghost.y + offsetY - ghost.radius/6, ghost.radius/3, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Ghost pupils
      this.ctx.fillStyle = '#000000';
      this.ctx.beginPath();
      this.ctx.arc(ghost.x + offsetX - ghost.radius/3, ghost.y + offsetY - ghost.radius/6, ghost.radius/6, 0, Math.PI * 2);
      this.ctx.arc(ghost.x + offsetX + ghost.radius/3, ghost.y + offsetY - ghost.radius/6, ghost.radius/6, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Draw Pacman
    this.ctx.fillStyle = this.pacman.color;
    this.ctx.beginPath();
    
    // Calculate mouth angle based on animation
    const mouthAngle = Math.abs(Math.sin(this.pacman.angle)) * 0.8;
    
    // Draw Pacman as a circle with a wedge cut out for the mouth
    this.ctx.arc(
      this.pacman.x + offsetX, 
      this.pacman.y + offsetY, 
      this.pacman.radius, 
      mouthAngle, 
      Math.PI * 2 - mouthAngle
    );
    this.ctx.lineTo(this.pacman.x + offsetX, this.pacman.y + offsetY);
    this.ctx.closePath();
    this.ctx.fill();

    // Draw score
    this.ctx.fillStyle = this.screenColor;
    this.ctx.font = '16px monospace';
    this.ctx.fillText(`SCORE: ${this.score}`, 20, 25);
    
    // Draw game title
    this.ctx.fillStyle = this.screenColor;
    this.ctx.font = '18px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('RETRO CRT - PACMAN', this.canvas.width / 2, 25);
    this.ctx.textAlign = 'left';
  }

  // Draw scanlines
  drawScanlines() {
    // More pronounced scanlines with stronger contrast
    for (let y = 0; y < this.canvas.height; y += this.scanlineSpacing) {
      // Darker scanlines for more pronounced effect
      const intensity = 0.3 + Math.sin(this.time * 0.5 + y * 0.1) * 0.15;
      this.ctx.fillStyle = `rgba(0, 60, 0, ${intensity})`;
      this.ctx.fillRect(0, y, this.canvas.width, 1);
      
      // Add a subtle second scanline for even more texture
      if (y + 1 < this.canvas.height) {
        this.ctx.fillStyle = `rgba(0, 30, 0, ${intensity * 0.5})`;
        this.ctx.fillRect(0, y + 1, this.canvas.width, 1);
      }
    }
  }

  // Draw screen flicker
  drawScreenFlicker() {
    // More pronounced overall screen flicker
    const flicker = 0.9 + Math.sin(this.time * 3) * this.flickerIntensity;
    this.ctx.fillStyle = `rgba(0, 30, 0, ${0.1 * flicker})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Draw screen distortion
  drawScreenDistortion() {
    // More pronounced screen distortion/wave effect
    const waveIntensity = Math.sin(this.time * 0.3) * this.distortionAmount;
    
    // We'll simulate distortion by drawing a more pronounced wave pattern
    this.ctx.strokeStyle = `rgba(0, 50, 0, ${0.1})`;
    this.ctx.lineWidth = 2;
    
    for (let y = 0; y < this.canvas.height; y += 15) {
      this.ctx.beginPath();
      for (let x = 0; x <= this.canvas.width; x += 5) {
        const distortion = Math.sin(x * 0.02 + this.time * 2 + y * 0.1) * waveIntensity * 15;
        if (x === 0) {
          this.ctx.moveTo(x, y + distortion);
        } else {
          this.ctx.lineTo(x, y + distortion);
        }
      }
      this.ctx.stroke();
    }
  }

  // Draw screen glow
  drawScreenGlow() {
    // More pronounced screen glow around edges
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 2
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 30, 0, 0.3)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // Handle window resize
  handleResize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.gameWidth = this.canvas.width;
      this.gameHeight = this.canvas.height;
      this.initializeGame(); // Reinitialize game elements for new dimensions
    }
  }
}