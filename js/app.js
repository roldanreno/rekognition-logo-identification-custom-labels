// Import modules
import { RekognitionService } from './rekognition.js';

// Main Application Controller
class FMFLogoApp {
    constructor() {
        this.camera = new CameraManager();
        this.smartDetection = new SmartDetection();
        this.rekognition = new RekognitionService();
        this.arOverlay = new AROverlay();
        
        this.isRunning = false;
        this.detectionLoop = null;
        this.statsUpdateInterval = null;
        
        // UI elements
        this.elements = {};
        
        // Performance tracking
        this.performance = {
            startTime: null,
            frameCount: 0,
            lastFpsUpdate: 0,
            fps: 0
        };
    }

    async initialize() {
        try {
            console.log('Initializing FMF Logo AR Detection App...');
            
            // Initialize UI elements
            this.initializeUI();
            
            // Initialize components
            await this.camera.initialize();
            await this.rekognition.initialize();
            this.arOverlay.initialize();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start camera
            await this.camera.startCamera();
            
            // Hide loading overlay
            this.hideLoadingOverlay();
            
            console.log('App initialized successfully');
            return true;
            
        } catch (error) {
            console.error('App initialization failed:', error);
            this.showError(`Initialization failed: ${error.message}`);
            throw error;
        }
    }

    initializeUI() {
        // Cache UI elements
        this.elements = {
            startButton: document.getElementById('start-detection'),
            stopButton: document.getElementById('stop-detection'),
            smartDetectionToggle: document.getElementById('smart-detection'),
            confidenceSlider: document.getElementById('confidence-threshold'),
            confidenceValue: document.getElementById('confidence-value'),
            framesProcessed: document.getElementById('frames-processed'),
            apiCalls: document.getElementById('api-calls'),
            detectionsCount: document.getElementById('detections-count'),
            loadingOverlay: document.getElementById('loading-overlay'),
            errorContainer: document.getElementById('error-container'),
            errorMessage: document.getElementById('error-message')
        };
        
        // Initialize confidence slider display
        if (this.elements.confidenceSlider && this.elements.confidenceValue) {
            this.elements.confidenceValue.textContent = `${this.elements.confidenceSlider.value}%`;
        }
    }

    setupEventListeners() {
        // Start detection button
        if (this.elements.startButton) {
            this.elements.startButton.addEventListener('click', () => {
                this.startDetection();
            });
        }
        
        // Stop detection button
        if (this.elements.stopButton) {
            this.elements.stopButton.addEventListener('click', () => {
                this.stopDetection();
            });
        }
        
        // Smart detection toggle
        if (this.elements.smartDetectionToggle) {
            this.elements.smartDetectionToggle.addEventListener('change', (e) => {
                this.smartDetection.setEnabled(e.target.checked);
                console.log(`Smart detection ${e.target.checked ? 'enabled' : 'disabled'}`);
            });
        }
        
        // Confidence threshold slider
        if (this.elements.confidenceSlider) {
            this.elements.confidenceSlider.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                this.rekognition.setConfidenceThreshold(value / 100);
                if (this.elements.confidenceValue) {
                    this.elements.confidenceValue.textContent = `${value}%`;
                }
            });
        }
        
        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRunning) {
                console.log('Page hidden, pausing detection');
                this.pauseDetection();
            } else if (!document.hidden && this.isRunning) {
                console.log('Page visible, resuming detection');
                this.resumeDetection();
            }
        });
        
        // Handle errors
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.showError(`Unexpected error: ${e.error.message}`);
        });
    }

    async startDetection() {
        if (this.isRunning) return;
        
        try {
            console.log('Starting logo detection...');
            
            // Ensure camera is ready
            if (!this.camera.isReady()) {
                await this.camera.startCamera();
            }
            
            this.isRunning = true;
            this.performance.startTime = Date.now();
            
            // Update UI
            this.updateButtonStates();
            
            // Start detection loop
            this.startDetectionLoop();
            
            // Start stats update
            this.startStatsUpdate();
            
            console.log('Detection started');
            
        } catch (error) {
            console.error('Failed to start detection:', error);
            this.showError(`Failed to start detection: ${error.message}`);
            this.isRunning = false;
            this.updateButtonStates();
        }
    }

    stopDetection() {
        if (!this.isRunning) return;
        
        console.log('Stopping detection...');
        
        this.isRunning = false;
        
        // Stop detection loop
        if (this.detectionLoop) {
            clearTimeout(this.detectionLoop);
            this.detectionLoop = null;
        }
        
        // Stop stats update
        if (this.statsUpdateInterval) {
            clearInterval(this.statsUpdateInterval);
            this.statsUpdateInterval = null;
        }
        
        // Hide any active AR overlays
        this.arOverlay.hideDetection();
        
        // Update UI
        this.updateButtonStates();
        
        console.log('Detection stopped');
    }

    pauseDetection() {
        if (this.detectionLoop) {
            clearTimeout(this.detectionLoop);
            this.detectionLoop = null;
        }
    }

    resumeDetection() {
        if (this.isRunning && !this.detectionLoop) {
            this.startDetectionLoop();
        }
    }

    startDetectionLoop() {
        const processFrame = async () => {
            if (!this.isRunning) return;
            
            try {
                // Capture frame from camera
                const frameData = this.camera.captureFrame();
                if (!frameData) {
                    this.scheduleNextFrame();
                    return;
                }
                
                this.performance.frameCount++;
                this.updateFPS();
                
                // Check if frame should be processed
                if (this.smartDetection.shouldProcessFrame(frameData)) {
                    // Detect logo using Rekognition
                    const detections = await this.rekognition.detectLogo(frameData.dataURL);
                    
                    if (detections && detections.length > 0) {
                        console.log(`Logo detected with confidence: ${detections[0].confidence.toFixed(2)}`);
                        this.arOverlay.showDetection(detections);
                    } else {
                        this.arOverlay.hideDetection();
                    }
                }
                
            } catch (error) {
                console.error('Detection loop error:', error);
                
                // Don't stop the loop for individual frame errors
                if (error.message.includes('ThrottlingException')) {
                    console.log('Throttling detected, slowing down...');
                    await this.delay(2000); // Wait 2 seconds before next frame
                }
            }
            
            this.scheduleNextFrame();
        };
        
        processFrame();
    }

    scheduleNextFrame() {
        if (this.isRunning) {
            // Use requestAnimationFrame for smooth performance
            this.detectionLoop = setTimeout(() => {
                requestAnimationFrame(() => {
                    this.startDetectionLoop();
                });
            }, 100); // Small delay to prevent overwhelming the system
        }
    }

    startStatsUpdate() {
        this.statsUpdateInterval = setInterval(() => {
            this.updateStats();
        }, 1000); // Update every second
    }

    updateStats() {
        const smartStats = this.smartDetection.getStats();
        const rekognitionStats = this.rekognition.getStats();
        
        // Update UI elements
        if (this.elements.framesProcessed) {
            this.elements.framesProcessed.textContent = smartStats.framesAnalyzed;
        }
        
        if (this.elements.apiCalls) {
            this.elements.apiCalls.textContent = rekognitionStats.apiCalls;
        }
        
        if (this.elements.detectionsCount) {
            this.elements.detectionsCount.textContent = rekognitionStats.detections;
        }
        
        // Log performance stats
        console.log('Performance Stats:', {
            fps: this.performance.fps,
            efficiency: smartStats.efficiency,
            successRate: rekognitionStats.successRate,
            avgConfidence: rekognitionStats.avgConfidence
        });
    }

    updateFPS() {
        const now = Date.now();
        if (now - this.performance.lastFpsUpdate >= 1000) {
            this.performance.fps = this.performance.frameCount;
            this.performance.frameCount = 0;
            this.performance.lastFpsUpdate = now;
        }
    }

    updateButtonStates() {
        if (this.elements.startButton) {
            this.elements.startButton.disabled = this.isRunning;
        }
        
        if (this.elements.stopButton) {
            this.elements.stopButton.disabled = !this.isRunning;
        }
    }

    hideLoadingOverlay() {
        if (this.elements.loadingOverlay) {
            this.elements.loadingOverlay.classList.add('hidden');
        }
    }

    showError(message) {
        console.error('App Error:', message);
        
        if (this.elements.errorContainer && this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
            this.elements.errorContainer.classList.remove('hidden');
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                this.elements.errorContainer.classList.add('hidden');
            }, 10000);
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Cleanup method
    destroy() {
        this.stopDetection();
        this.camera.stopCamera();
        this.arOverlay.hideDetection();
        
        // Clear caches
        this.rekognition.clearCache();
        this.smartDetection.reset();
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Create global app instance
        window.app = new FMFLogoApp();
        
        // Initialize the app
        await window.app.initialize();
        
        console.log('FMF Logo AR Detection App ready!');
        
    } catch (error) {
        console.error('Failed to start app:', error);
        
        // Show error in UI
        const errorContainer = document.getElementById('error-container');
        const errorMessage = document.getElementById('error-message');
        
        if (errorContainer && errorMessage) {
            errorMessage.textContent = `Failed to start app: ${error.message}`;
            errorContainer.classList.remove('hidden');
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.destroy();
    }
});
