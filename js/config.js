// Configuration for FMF Logo AR Detection
const CONFIG = {
    // AWS Configuration
    AWS: {
        REGION: 'us-east-1',
        MODEL_ARN: 'arn:aws:rekognition:us-east-1:YOUR-ACCOUNT:project/YourProject/version/YourVersion/YOUR-VERSION-ID',
        // Credentials now handled by Amplify Auth
    },

    // Camera Settings
    CAMERA: {
        WIDTH: 640,
        HEIGHT: 480,
        FRAME_RATE: 30,
        FACING_MODE: 'environment' // Use back camera
    },

    // Smart Detection Settings
    DETECTION: {
        MOTION_THRESHOLD: 0.1,
        QUALITY_THRESHOLD: 0.7,
        SCAN_INTERVAL: 2000, // 2 seconds between scans
        CONFIDENCE_THRESHOLD: 0.8,
        CACHE_DURATION: 5000, // 5 seconds
        MAX_RETRIES: 3
    },

    // AR Settings
    AR: {
        BUTTON_POSITION: { x: 0, y: 0, z: -3 },
        BUTTON_SIZE: { width: 2, height: 0.8 },
        REDIRECT_URL: 'https://fmf.mx/'
    },

    // UI Settings
    UI: {
        BORDER_COLOR: '#4F46E5',
        BORDER_WIDTH: 3,
        ANIMATION_DURATION: 300
    }
};

// Export for use in other modules
window.CONFIG = CONFIG;
