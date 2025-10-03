// Camera Management Module
class CameraManager {
    constructor() {
        this.stream = null;
        this.video = null;
        this.isActive = false;
        this.constraints = {
            video: {
                width: { ideal: CONFIG.CAMERA.WIDTH },
                height: { ideal: CONFIG.CAMERA.HEIGHT },
                frameRate: { ideal: CONFIG.CAMERA.FRAME_RATE },
                facingMode: CONFIG.CAMERA.FACING_MODE
            },
            audio: false
        };
    }

    async initialize() {
        try {
            this.video = document.getElementById('camera-feed');
            
            // Check if getUserMedia is supported
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Camera access not supported in this browser');
            }

            return true;
        } catch (error) {
            console.error('Camera initialization failed:', error);
            throw error;
        }
    }

    async startCamera() {
        try {
            // Request camera permission and stream
            this.stream = await navigator.mediaDevices.getUserMedia(this.constraints);
            
            // Attach stream to video element
            this.video.srcObject = this.stream;
            
            // Wait for video to be ready
            await new Promise((resolve) => {
                this.video.onloadedmetadata = () => {
                    this.video.play();
                    resolve();
                };
            });

            this.isActive = true;
            this.updateStatus('Camera active', 'success');
            
            return true;
        } catch (error) {
            console.error('Failed to start camera:', error);
            this.handleCameraError(error);
            throw error;
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        
        if (this.video) {
            this.video.srcObject = null;
        }
        
        this.isActive = false;
        this.updateStatus('Camera stopped', 'warning');
    }

    captureFrame() {
        if (!this.isActive || !this.video) {
            return null;
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;
        
        ctx.drawImage(this.video, 0, 0);
        
        return {
            canvas,
            imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
            dataURL: canvas.toDataURL('image/jpeg', 0.8)
        };
    }

    getVideoElement() {
        return this.video;
    }

    isReady() {
        return this.isActive && this.video && this.video.readyState >= 2;
    }

    handleCameraError(error) {
        let message = 'Unknown camera error';
        
        switch (error.name) {
            case 'NotAllowedError':
                message = 'Camera access denied. Please allow camera permissions and refresh.';
                break;
            case 'NotFoundError':
                message = 'No camera found on this device.';
                break;
            case 'NotSupportedError':
                message = 'Camera not supported in this browser.';
                break;
            case 'OverconstrainedError':
                message = 'Camera constraints not supported.';
                break;
            default:
                message = `Camera error: ${error.message}`;
        }
        
        this.updateStatus(message, 'error');
        this.showError(message);
    }

    updateStatus(message, type) {
        const statusText = document.getElementById('status-text');
        const statusIndicator = document.getElementById('status-indicator');
        
        if (statusText) statusText.textContent = message;
        
        if (statusIndicator) {
            statusIndicator.className = `w-3 h-3 rounded-full ${
                type === 'success' ? 'bg-green-500' :
                type === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            }`;
        }
    }

    showError(message) {
        const errorContainer = document.getElementById('error-container');
        const errorMessage = document.getElementById('error-message');
        
        if (errorContainer && errorMessage) {
            errorMessage.textContent = message;
            errorContainer.classList.remove('hidden');
            
            // Auto-hide after 10 seconds
            setTimeout(() => {
                errorContainer.classList.add('hidden');
            }, 10000);
        }
    }
}

// Export for global use
window.CameraManager = CameraManager;
