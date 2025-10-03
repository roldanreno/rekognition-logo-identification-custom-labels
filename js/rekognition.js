// AWS Rekognition Custom Labels Integration with Amplify Auth
import { Amplify } from 'aws-amplify';
import { fetchAuthSession } from 'aws-amplify/auth';
import awsExports from '../src/aws-exports.js';

Amplify.configure(awsExports);

class RekognitionService {
    constructor() {
        this.rekognition = null;
        this.isInitialized = false;
        this.modelArn = CONFIG.AWS.MODEL_ARN;
        this.confidenceThreshold = CONFIG.DETECTION.CONFIDENCE_THRESHOLD;
        this.maxRetries = CONFIG.DETECTION.MAX_RETRIES;
        
        // Statistics
        this.stats = {
            apiCalls: 0,
            detections: 0,
            errors: 0,
            avgConfidence: 0
        };
        
        // Detection cache
        this.detectionCache = new Map();
        this.cacheTimeout = CONFIG.DETECTION.CACHE_DURATION;
    }

    async initialize() {
        try {
            // Get credentials from Amplify Auth
            const session = await fetchAuthSession();
            const credentials = session.credentials;
            
            // Configure AWS SDK with Amplify credentials
            AWS.config.update({
                region: CONFIG.AWS.REGION,
                credentials: credentials
            });

            this.rekognition = new AWS.Rekognition();
            this.isInitialized = true;
            
            console.log('Rekognition service initialized with Amplify Auth');
            return true;
        } catch (error) {
            console.error('Failed to initialize Rekognition:', error);
            throw new Error('AWS Rekognition initialization failed. Please check your Amplify configuration.');
        }
    }

    async detectLogo(imageDataUrl, retryCount = 0) {
        if (!this.isInitialized) {
            throw new Error('Rekognition service not initialized');
        }

        try {
            // Check cache first
            const cacheKey = this.generateCacheKey(imageDataUrl);
            const cachedResult = this.getFromCache(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }

            // Convert data URL to bytes
            const imageBytes = this.dataUrlToBytes(imageDataUrl);
            
            // Prepare detection parameters
            const params = {
                Image: {
                    Bytes: imageBytes
                },
                ModelArn: this.modelArn,
                MinConfidence: this.confidenceThreshold * 100 // AWS expects 0-100 range
            };

            this.stats.apiCalls++;

            // Call Rekognition Custom Labels
            const result = await this.rekognition.detectCustomLabels(params).promise();
            
            // Process results
            const detections = this.processDetectionResults(result);
            
            // Cache successful results
            if (detections.length > 0) {
                this.cacheResult(cacheKey, detections);
                this.stats.detections++;
                
                // Update average confidence
                const totalConfidence = detections.reduce((sum, det) => sum + det.confidence, 0);
                this.stats.avgConfidence = totalConfidence / detections.length;
            }

            return detections;

        } catch (error) {
            console.error('Rekognition detection error:', error);
            this.stats.errors++;

            // Retry logic for transient errors
            if (retryCount < this.maxRetries && this.isRetryableError(error)) {
                console.log(`Retrying detection (${retryCount + 1}/${this.maxRetries})`);
                await this.delay(1000 * (retryCount + 1)); // Exponential backoff
                return this.detectLogo(imageDataUrl, retryCount + 1);
            }

            throw this.handleRekognitionError(error);
        }
    }

    processDetectionResults(result) {
        if (!result.CustomLabels || result.CustomLabels.length === 0) {
            return [];
        }

        return result.CustomLabels.map(label => ({
            name: label.Name,
            confidence: label.Confidence / 100, // Convert to 0-1 range
            boundingBox: label.Geometry && label.Geometry.BoundingBox ? {
                left: label.Geometry.BoundingBox.Left,
                top: label.Geometry.BoundingBox.Top,
                width: label.Geometry.BoundingBox.Width,
                height: label.Geometry.BoundingBox.Height
            } : null,
            timestamp: Date.now()
        }));
    }

    dataUrlToBytes(dataUrl) {
        // Remove data URL prefix
        const base64Data = dataUrl.replace(/^data:image\/[a-z]+;base64,/, '');
        
        // Convert base64 to binary
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        return bytes;
    }

    generateCacheKey(imageDataUrl) {
        // Simple hash function for cache key
        let hash = 0;
        const str = imageDataUrl.substring(0, 1000); // Use first 1000 chars for performance
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        return hash.toString();
    }

    getFromCache(key) {
        const cached = this.detectionCache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        
        // Remove expired cache entry
        if (cached) {
            this.detectionCache.delete(key);
        }
        
        return null;
    }

    cacheResult(key, data) {
        // Limit cache size to prevent memory issues
        if (this.detectionCache.size > 50) {
            const firstKey = this.detectionCache.keys().next().value;
            this.detectionCache.delete(firstKey);
        }
        
        this.detectionCache.set(key, {
            data: data,
            timestamp: Date.now()
        });
    }

    isRetryableError(error) {
        // Check for retryable error codes
        const retryableCodes = [
            'ThrottlingException',
            'InternalServerError',
            'ServiceUnavailableException',
            'RequestTimeout'
        ];
        
        return retryableCodes.includes(error.code) || 
               error.statusCode >= 500 ||
               error.code === 'NetworkingError';
    }

    handleRekognitionError(error) {
        let message = 'Detection failed';
        
        switch (error.code) {
            case 'InvalidParameterException':
                message = 'Invalid image format or parameters';
                break;
            case 'ResourceNotFoundException':
                message = 'Custom Labels model not found or not running';
                break;
            case 'AccessDeniedException':
                message = 'Access denied. Check AWS credentials and permissions';
                break;
            case 'ThrottlingException':
                message = 'Too many requests. Please wait and try again';
                break;
            case 'LimitExceededException':
                message = 'Service limit exceeded';
                break;
            case 'InternalServerError':
                message = 'AWS service error. Please try again';
                break;
            default:
                message = `AWS Error: ${error.message || error.code}`;
        }
        
        return new Error(message);
    }

    setConfidenceThreshold(threshold) {
        this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
    }

    getStats() {
        return {
            ...this.stats,
            cacheSize: this.detectionCache.size,
            successRate: this.stats.apiCalls > 0 ? 
                ((this.stats.apiCalls - this.stats.errors) / this.stats.apiCalls * 100).toFixed(1) : 0
        };
    }

    clearCache() {
        this.detectionCache.clear();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    reset() {
        this.stats = {
            apiCalls: 0,
            detections: 0,
            errors: 0,
            avgConfidence: 0
        };
        this.clearCache();
    }
}

// Export for global use
window.RekognitionService = RekognitionService;
export { RekognitionService };
