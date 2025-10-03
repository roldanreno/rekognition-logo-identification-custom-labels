// AR Overlay Management for Logo Detection
class AROverlay {
    constructor() {
        this.scene = null;
        this.arButton = null;
        this.canvas = null;
        this.ctx = null;
        this.isARActive = false;
        this.currentDetection = null;
        this.animationFrame = null;
        
        // Border animation properties
        this.borderAnimation = {
            progress: 0,
            direction: 1,
            speed: 0.02
        };
    }

    initialize() {
        try {
            // Get AR scene and button elements
            this.scene = document.getElementById('ar-scene');
            this.arButton = document.getElementById('ar-button');
            
            // Get detection canvas for border drawing
            this.canvas = document.getElementById('detection-canvas');
            this.ctx = this.canvas.getContext('2d');
            
            // Set up AR button click handler
            this.setupARButtonHandler();
            
            // Initialize canvas size
            this.resizeCanvas();
            
            // Listen for window resize
            window.addEventListener('resize', () => this.resizeCanvas());
            
            console.log('AR Overlay initialized');
            return true;
        } catch (error) {
            console.error('AR Overlay initialization failed:', error);
            throw error;
        }
    }

    setupARButtonHandler() {
        if (this.arButton) {
            // Add click event listener
            this.arButton.addEventListener('click', () => {
                this.handleButtonClick();
            });
            
            // Add cursor pointer for better UX
            this.arButton.setAttribute('cursor', 'pointer');
            
            // Add hover effects
            this.arButton.addEventListener('mouseenter', () => {
                this.arButton.setAttribute('material', 'color: #6366F1; opacity: 1');
            });
            
            this.arButton.addEventListener('mouseleave', () => {
                this.arButton.setAttribute('material', 'color: #4F46E5; opacity: 0.9');
            });
        }
    }

    showDetection(detections) {
        if (!detections || detections.length === 0) {
            this.hideDetection();
            return;
        }

        // Use the detection with highest confidence
        const bestDetection = detections.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
        );

        this.currentDetection = bestDetection;
        
        // Show AR button
        this.showARButton(bestDetection);
        
        // Draw detection border
        this.drawDetectionBorder(bestDetection);
        
        // Start border animation
        this.startBorderAnimation();
        
        this.isARActive = true;
    }

    hideDetection() {
        // Hide AR button
        this.hideARButton();
        
        // Clear detection border
        this.clearCanvas();
        
        // Stop border animation
        this.stopBorderAnimation();
        
        this.currentDetection = null;
        this.isARActive = false;
    }

    showARButton(detection) {
        if (!this.arButton) return;

        // Position button based on detection location
        let position = CONFIG.AR.BUTTON_POSITION;
        
        if (detection.boundingBox) {
            // Position button at center of detected logo
            const centerX = (detection.boundingBox.left + detection.boundingBox.width / 2 - 0.5) * 4;
            const centerY = -(detection.boundingBox.top + detection.boundingBox.height / 2 - 0.5) * 3;
            
            position = {
                x: centerX,
                y: centerY,
                z: CONFIG.AR.BUTTON_POSITION.z
            };
        }

        // Update button position and make visible
        this.arButton.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
        this.arButton.setAttribute('visible', 'true');
        
        // Add entrance animation
        this.arButton.setAttribute('animation', 
            'property: scale; from: 0 0 0; to: 1 1 1; dur: 300; easing: easeOutBack'
        );
        
        console.log(`AR button shown at position: ${position.x}, ${position.y}, ${position.z}`);
    }

    hideARButton() {
        if (!this.arButton) return;

        // Add exit animation before hiding
        this.arButton.setAttribute('animation', 
            'property: scale; from: 1 1 1; to: 0 0 0; dur: 200; easing: easeInBack'
        );
        
        // Hide after animation completes
        setTimeout(() => {
            this.arButton.setAttribute('visible', 'false');
        }, 200);
    }

    drawDetectionBorder(detection) {
        if (!this.ctx || !detection.boundingBox) return;

        const box = detection.boundingBox;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        // Convert normalized coordinates to canvas coordinates
        const x = box.left * canvasWidth;
        const y = box.top * canvasHeight;
        const width = box.width * canvasWidth;
        const height = box.height * canvasHeight;
        
        // Clear previous drawings
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Set border style
        this.ctx.strokeStyle = CONFIG.UI.BORDER_COLOR;
        this.ctx.lineWidth = CONFIG.UI.BORDER_WIDTH;
        this.ctx.setLineDash([10, 5]); // Dashed line
        
        // Draw border rectangle
        this.ctx.strokeRect(x, y, width, height);
        
        // Draw confidence label
        this.drawConfidenceLabel(detection, x, y);
    }

    drawConfidenceLabel(detection, x, y) {
        const confidence = Math.round(detection.confidence * 100);
        const label = `${detection.name} (${confidence}%)`;
        
        // Set text style
        this.ctx.fillStyle = CONFIG.UI.BORDER_COLOR;
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'left';
        
        // Draw background for text
        const textMetrics = this.ctx.measureText(label);
        const textWidth = textMetrics.width + 10;
        const textHeight = 25;
        
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(x, y - textHeight, textWidth, textHeight);
        
        // Draw text
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(label, x + 5, y - 8);
    }

    startBorderAnimation() {
        if (this.animationFrame) return; // Already animating
        
        const animate = () => {
            if (!this.isARActive || !this.currentDetection) {
                this.stopBorderAnimation();
                return;
            }
            
            // Update animation progress
            this.borderAnimation.progress += this.borderAnimation.speed * this.borderAnimation.direction;
            
            if (this.borderAnimation.progress >= 1) {
                this.borderAnimation.progress = 1;
                this.borderAnimation.direction = -1;
            } else if (this.borderAnimation.progress <= 0) {
                this.borderAnimation.progress = 0;
                this.borderAnimation.direction = 1;
            }
            
            // Redraw border with animation
            this.drawAnimatedBorder();
            
            this.animationFrame = requestAnimationFrame(animate);
        };
        
        animate();
    }

    stopBorderAnimation() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    drawAnimatedBorder() {
        if (!this.currentDetection || !this.currentDetection.boundingBox) return;
        
        const box = this.currentDetection.boundingBox;
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        const x = box.left * canvasWidth;
        const y = box.top * canvasHeight;
        const width = box.width * canvasWidth;
        const height = box.height * canvasHeight;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Animate border opacity and dash pattern
        const opacity = 0.5 + 0.5 * this.borderAnimation.progress;
        const dashOffset = this.borderAnimation.progress * 20;
        
        this.ctx.strokeStyle = CONFIG.UI.BORDER_COLOR;
        this.ctx.globalAlpha = opacity;
        this.ctx.lineWidth = CONFIG.UI.BORDER_WIDTH;
        this.ctx.setLineDash([10, 5]);
        this.ctx.lineDashOffset = dashOffset;
        
        // Draw animated border
        this.ctx.strokeRect(x, y, width, height);
        
        // Reset alpha
        this.ctx.globalAlpha = 1;
        
        // Draw confidence label
        this.drawConfidenceLabel(this.currentDetection, x, y);
    }

    clearCanvas() {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    resizeCanvas() {
        if (!this.canvas) return;
        
        const video = document.getElementById('camera-feed');
        if (video) {
            this.canvas.width = video.offsetWidth;
            this.canvas.height = video.offsetHeight;
        }
    }

    handleButtonClick() {
        console.log('AR button clicked - redirecting to:', CONFIG.AR.REDIRECT_URL);
        
        // Add click animation
        if (this.arButton) {
            this.arButton.setAttribute('animation', 
                'property: scale; from: 1 1 1; to: 1.2 1.2 1.2; dur: 100; direction: alternate; loop: 1'
            );
        }
        
        // Redirect after short delay for animation
        setTimeout(() => {
            window.open(CONFIG.AR.REDIRECT_URL, '_blank');
        }, 150);
        
        // Track click event (for analytics)
        this.trackButtonClick();
    }

    trackButtonClick() {
        // Log click event with detection details
        const eventData = {
            timestamp: new Date().toISOString(),
            detection: this.currentDetection ? {
                name: this.currentDetection.name,
                confidence: this.currentDetection.confidence,
                boundingBox: this.currentDetection.boundingBox
            } : null,
            userAgent: navigator.userAgent
        };
        
        console.log('Button click tracked:', eventData);
        
        // Here you could send analytics to your preferred service
        // Example: analytics.track('ar_button_click', eventData);
    }

    getStatus() {
        return {
            isActive: this.isARActive,
            hasDetection: !!this.currentDetection,
            buttonVisible: this.arButton ? this.arButton.getAttribute('visible') === 'true' : false
        };
    }
}

// Export for global use
window.AROverlay = AROverlay;
