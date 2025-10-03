// Smart Detection System for Cost Optimization
class SmartDetection {
    constructor() {
        this.lastFrame = null;
        this.lastScanTime = 0;
        this.isEnabled = true;
        this.motionThreshold = CONFIG.DETECTION.MOTION_THRESHOLD;
        this.qualityThreshold = CONFIG.DETECTION.QUALITY_THRESHOLD;
        this.scanInterval = CONFIG.DETECTION.SCAN_INTERVAL;
        
        // Performance tracking
        this.stats = {
            framesAnalyzed: 0,
            framesSkipped: 0,
            motionDetected: 0,
            qualityPassed: 0
        };
    }

    shouldProcessFrame(frameData) {
        if (!this.isEnabled) {
            return true; // Process all frames if smart detection is disabled
        }

        this.stats.framesAnalyzed++;

        // Time-based throttling
        const now = Date.now();
        if (now - this.lastScanTime < this.scanInterval) {
            this.stats.framesSkipped++;
            return false;
        }

        // Motion detection
        if (!this.detectMotion(frameData.imageData)) {
            this.stats.framesSkipped++;
            return false;
        }

        // Quality assessment
        if (!this.assessImageQuality(frameData.imageData)) {
            this.stats.framesSkipped++;
            return false;
        }

        this.lastScanTime = now;
        this.stats.qualityPassed++;
        return true;
    }

    detectMotion(currentImageData) {
        if (!this.lastFrame) {
            this.lastFrame = this.copyImageData(currentImageData);
            this.stats.motionDetected++;
            return true;
        }

        const diff = this.calculateFrameDifference(currentImageData, this.lastFrame);
        this.lastFrame = this.copyImageData(currentImageData);

        if (diff > this.motionThreshold) {
            this.stats.motionDetected++;
            return true;
        }

        return false;
    }

    calculateFrameDifference(frame1, frame2) {
        const data1 = frame1.data;
        const data2 = frame2.data;
        let totalDiff = 0;
        let pixelCount = 0;

        // Sample every 4th pixel for performance (RGBA = 4 values per pixel)
        for (let i = 0; i < data1.length; i += 16) {
            const r1 = data1[i];
            const g1 = data1[i + 1];
            const b1 = data1[i + 2];
            
            const r2 = data2[i];
            const g2 = data2[i + 1];
            const b2 = data2[i + 2];

            // Calculate luminance difference
            const lum1 = 0.299 * r1 + 0.587 * g1 + 0.114 * b1;
            const lum2 = 0.299 * r2 + 0.587 * g2 + 0.114 * b2;
            
            totalDiff += Math.abs(lum1 - lum2);
            pixelCount++;
        }

        return pixelCount > 0 ? (totalDiff / pixelCount) / 255 : 0;
    }

    assessImageQuality(imageData) {
        // Calculate image sharpness using edge detection
        const sharpness = this.calculateSharpness(imageData);
        
        // Calculate brightness to avoid too dark/bright images
        const brightness = this.calculateBrightness(imageData);
        
        // Quality score based on sharpness and brightness
        const qualityScore = (sharpness * 0.7) + (brightness * 0.3);
        
        return qualityScore > this.qualityThreshold;
    }

    calculateSharpness(imageData) {
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        let sharpness = 0;
        let count = 0;

        // Sobel edge detection (simplified)
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x += 4) { // Sample every 4th pixel
                const idx = (y * width + x) * 4;
                
                // Get luminance values for 3x3 grid
                const tl = this.getLuminance(data, idx - width * 4 - 4);
                const tm = this.getLuminance(data, idx - width * 4);
                const tr = this.getLuminance(data, idx - width * 4 + 4);
                const ml = this.getLuminance(data, idx - 4);
                const mm = this.getLuminance(data, idx);
                const mr = this.getLuminance(data, idx + 4);
                const bl = this.getLuminance(data, idx + width * 4 - 4);
                const bm = this.getLuminance(data, idx + width * 4);
                const br = this.getLuminance(data, idx + width * 4 + 4);

                // Sobel operators
                const gx = (-1 * tl) + (1 * tr) + (-2 * ml) + (2 * mr) + (-1 * bl) + (1 * br);
                const gy = (-1 * tl) + (-2 * tm) + (-1 * tr) + (1 * bl) + (2 * bm) + (1 * br);
                
                sharpness += Math.sqrt(gx * gx + gy * gy);
                count++;
            }
        }

        return count > 0 ? (sharpness / count) / 255 : 0;
    }

    calculateBrightness(imageData) {
        const data = imageData.data;
        let totalBrightness = 0;
        let count = 0;

        // Sample every 16th pixel for performance
        for (let i = 0; i < data.length; i += 64) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Calculate luminance
            const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
            totalBrightness += luminance;
            count++;
        }

        const avgBrightness = count > 0 ? totalBrightness / count : 0;
        
        // Normalize brightness score (optimal range: 50-200)
        if (avgBrightness < 50) return avgBrightness / 50 * 0.5;
        if (avgBrightness > 200) return Math.max(0, 1 - (avgBrightness - 200) / 55);
        return 1; // Optimal brightness range
    }

    getLuminance(data, index) {
        if (index < 0 || index >= data.length - 2) return 0;
        return 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
    }

    copyImageData(imageData) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        
        const newImageData = ctx.createImageData(imageData.width, imageData.height);
        newImageData.data.set(imageData.data);
        
        return newImageData;
    }

    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    updateSettings(settings) {
        if (settings.motionThreshold !== undefined) {
            this.motionThreshold = settings.motionThreshold;
        }
        if (settings.qualityThreshold !== undefined) {
            this.qualityThreshold = settings.qualityThreshold;
        }
        if (settings.scanInterval !== undefined) {
            this.scanInterval = settings.scanInterval;
        }
    }

    getStats() {
        const efficiency = this.stats.framesAnalyzed > 0 ? 
            (this.stats.framesSkipped / this.stats.framesAnalyzed * 100).toFixed(1) : 0;
        
        return {
            ...this.stats,
            efficiency: `${efficiency}%`,
            motionRate: this.stats.framesAnalyzed > 0 ? 
                (this.stats.motionDetected / this.stats.framesAnalyzed * 100).toFixed(1) : 0,
            qualityRate: this.stats.framesAnalyzed > 0 ? 
                (this.stats.qualityPassed / this.stats.framesAnalyzed * 100).toFixed(1) : 0
        };
    }

    reset() {
        this.lastFrame = null;
        this.lastScanTime = 0;
        this.stats = {
            framesAnalyzed: 0,
            framesSkipped: 0,
            motionDetected: 0,
            qualityPassed: 0
        };
    }
}

// Export for global use
window.SmartDetection = SmartDetection;
