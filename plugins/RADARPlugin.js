class RADARPlugin extends BasePlugin {
  constructor() {
    super('RADAR');
    this.animationId = null;
    this.canvas = null;
    this.ctx = null;
    this.initialized = false;
    this.time = 0;
    
    // Radar parameters
    this.targets = [];
    this.targetCount = 15;
    this.radarRadius = 0;
    this.segmentAngle = 0;
    this.segmentWidth = 35; // degrees
    this.centerX = 0;
    this.centerY = 0;
    
    // Colors
    this.radarColor = '#00ff00'; // Classic green radar
    this.backgroundColor = '#001100';
  }

  init() {
    // If already initialized, don't do it again
    if (this.initialized) return;

    // Only initialize on the main app page
    if (!document.getElementById('app')) return;

    try {
      // Create canvas element
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'radar-canvas';
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

      // Initialize radar elements
      this.centerX = this.canvas.width / 2;
      this.centerY = this.canvas.height / 2;
      this.radarRadius = Math.min(this.canvas.width, this.canvas.height) * 0.4;
      this.initializeTargets();

      // Mark as initialized
      this.initialized = true;

      // Start animation if not already running
      if (!this.animationId) {
        this.animate();
      }

      // Handle window resize
      window.addEventListener('resize', this.handleResize.bind(this));

    } catch (error) {
      console.error('Error initializing RADAR effect:', error);
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
    this.targets = [];

    // Remove resize listener
    window.removeEventListener('resize', this.handleResize.bind(this));
  }

  apply() {
    this.init();
  }

  remove() {
    this.destroy();
  }

  // Initialize radar targets
  initializeTargets() {
    this.targets = [];
    
    for (let i = 0; i < this.targetCount; i++) {
      // Place targets in a circular pattern with some randomness
      const distance = 50 + Math.random() * (this.radarRadius - 100);
      const angle = Math.random() * Math.PI * 2;
      const x = this.centerX + Math.cos(angle) * distance;
      const y = this.centerY + Math.sin(angle) * distance;
      
      this.targets.push({
        x: x,
        y: y,
        distance: distance,
        angle: angle,
        intensity: 0, // How bright the target is when hit by radar
        decay: 0.02 // How fast the intensity decays
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
    this.time += 0.02;

    // Clear canvas with a dark background
    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Update radar elements
    this.updateRadar();

    // Draw radar elements
    this.drawRadar();

    this.animationId = requestAnimationFrame(this.animate.bind(this));
  }

  // Update radar elements
  updateRadar() {
    // Rotate the radar segment
    this.segmentAngle = (this.segmentAngle + 1) % 360;
    
    // Update target intensities
    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      
      // Decay intensity
      target.intensity = Math.max(0, target.intensity - target.decay);
      
      // Check if target is within the radar segment
      const angleDiff = Math.abs(this.normalizeAngle(target.angle * 180 / Math.PI - this.segmentAngle));
      if (angleDiff <= this.segmentWidth / 2) {
        // Target is within segment, increase intensity
        target.intensity = Math.min(1, target.intensity + 0.1);
      }
    }
  }

  // Normalize angle to 0-360 range
  normalizeAngle(angle) {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }

  // Draw radar elements
  drawRadar() {
    // Draw radar circle
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, this.radarRadius, 0, Math.PI * 2);
    this.ctx.strokeStyle = this.radarColor;
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // Draw crosshairs
    this.ctx.beginPath();
    this.ctx.moveTo(this.centerX - this.radarRadius, this.centerY);
    this.ctx.lineTo(this.centerX + this.radarRadius, this.centerY);
    this.ctx.moveTo(this.centerX, this.centerY - this.radarRadius);
    this.ctx.lineTo(this.centerX, this.centerY + this.radarRadius);
    this.ctx.stroke();

    // Draw concentric circles
    for (let i = 1; i <= 4; i++) {
      const radius = (this.radarRadius / 4) * i;
      this.ctx.beginPath();
      this.ctx.arc(this.centerX, this.centerY, radius, 0, Math.PI * 2);
      this.ctx.stroke();
      
      // Draw distance markers
      this.ctx.fillStyle = this.radarColor;
      this.ctx.font = '12px monospace';
      this.ctx.fillText(`${i * 25}`, this.centerX + radius - 20, this.centerY - 5);
    }

    // Draw angle markers
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const x1 = this.centerX + Math.cos(angle) * (this.radarRadius - 20);
      const y1 = this.centerY + Math.sin(angle) * (this.radarRadius - 20);
      const x2 = this.centerX + Math.cos(angle) * this.radarRadius;
      const y2 = this.centerY + Math.sin(angle) * this.radarRadius;
      
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
      
      // Draw angle labels
      const labelX = this.centerX + Math.cos(angle) * (this.radarRadius + 15);
      const labelY = this.centerY + Math.sin(angle) * (this.radarRadius + 15);
      this.ctx.fillStyle = this.radarColor;
      this.ctx.font = '12px monospace';
      this.ctx.fillText(`${i * 45}°`, labelX - 15, labelY + 5);
    }

    // Draw radar segment
    const startAngle = (this.segmentAngle - this.segmentWidth / 2) * Math.PI / 180;
    const endAngle = (this.segmentAngle + this.segmentWidth / 2) * Math.PI / 180;
    
    this.ctx.beginPath();
    this.ctx.moveTo(this.centerX, this.centerY);
    this.ctx.arc(this.centerX, this.centerY, this.radarRadius, startAngle, endAngle);
    this.ctx.closePath();
    
    // Create gradient for the segment
    const gradient = this.ctx.createRadialGradient(
      this.centerX, this.centerY, 0,
      this.centerX, this.centerY, this.radarRadius
    );
    gradient.addColorStop(0, 'rgba(0, 255, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 255, 0, 0.05)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fill();

    // Draw segment border
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, this.radarRadius, startAngle, endAngle);
    this.ctx.strokeStyle = this.radarColor;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // Draw targets
    for (let i = 0; i < this.targets.length; i++) {
      const target = this.targets[i];
      
      // Draw target with intensity-based color
      const alpha = target.intensity * 0.8 + 0.2;
      this.ctx.fillStyle = `rgba(0, 255, 0, ${alpha})`;
      
      this.ctx.beginPath();
      this.ctx.arc(target.x, target.y, 5, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Draw target glow when hit
      if (target.intensity > 0.1) {
        this.ctx.beginPath();
        this.ctx.arc(target.x, target.y, 10, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(0, 255, 0, ${target.intensity * 0.3})`;
        this.ctx.fill();
      }
    }

    // Draw center dot
    this.ctx.fillStyle = this.radarColor;
    this.ctx.beginPath();
    this.ctx.arc(this.centerX, this.centerY, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  // Handle window resize
  handleResize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.centerX = this.canvas.width / 2;
      this.centerY = this.canvas.height / 2;
      this.radarRadius = Math.min(this.canvas.width, this.canvas.height) * 0.4;
      this.initializeTargets(); // Reinitialize targets for new dimensions
    }
  }
}