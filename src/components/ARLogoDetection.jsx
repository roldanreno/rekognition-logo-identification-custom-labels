import React, { useEffect, useRef, useState } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { RekognitionClient, DetectCustomLabelsCommand } from '@aws-sdk/client-rekognition';

const CONFIG = {
  AWS: {
    REGION: 'us-east-1',
    MODEL_ARN: 'arn:aws:rekognition:us-east-1:339712848072:project/FMFLogo/version/FMFLogo.2025-09-24T16.07.58/1758751678692',
  },
  CAMERA: {
    WIDTH: 640,
    HEIGHT: 480,
    FACING_MODE: 'environment'
  },
  AR: {
    REDIRECT_URL: 'https://example.com/'
  }
};

function ARLogoDetection({ user }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [status, setStatus] = useState('Ready to start');
  const [stats, setStats] = useState({ frames: 0, detections: 0, apiCalls: 0 });
  const [rekognition, setRekognition] = useState(null);
  const [showARButton, setShowARButton] = useState(false);

  // Initialize AWS Rekognition with Amplify credentials
  useEffect(() => {
    const initializeRekognition = async () => {
      try {
        const session = await fetchAuthSession();
        const credentials = session.credentials;
        
        console.log('Amplify credentials:', {
          accessKeyId: credentials?.accessKeyId?.substring(0, 10) + '...',
          region: CONFIG.AWS.REGION,
          hasCredentials: !!credentials
        });
        
        const rekognitionClient = new RekognitionClient({
          region: CONFIG.AWS.REGION,
          credentials: credentials
        });

        setRekognition(rekognitionClient);
        setStatus('AWS Rekognition initialized');
      } catch (error) {
        console.error('Failed to initialize Rekognition:', error);
        setStatus(`Failed to initialize AWS: ${error.message}`);
      }
    };

    initializeRekognition();
  }, [user]);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: CONFIG.CAMERA.WIDTH },
          height: { ideal: CONFIG.CAMERA.HEIGHT },
          facingMode: CONFIG.CAMERA.FACING_MODE
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStatus('Camera started');
      }
    } catch (error) {
      console.error('Camera error:', error);
      setStatus('Camera access denied');
    }
  };

  // Detect logo in frame
  const detectLogo = async () => {
    console.log('detectLogo called, rekognition:', !!rekognition, 'video ready:', !!videoRef.current);
    
    if (!rekognition || !videoRef.current) {
      console.log('Skipping detection - missing rekognition or video');
      return;
    }

    console.log('Starting logo detection...');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    console.log('Canvas size:', canvas.width, 'x', canvas.height);
    
    ctx.drawImage(videoRef.current, 0, 0);
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    
    console.log('Image captured, size:', dataURL.length, 'characters');
    
    // Convert to bytes for AWS
    const base64Data = dataURL.replace(/^data:image\/[a-z]+;base64,/, '');
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('Image converted to bytes, length:', bytes.length);

    try {
      const command = new DetectCustomLabelsCommand({
        Image: { Bytes: bytes },
        ProjectVersionArn: CONFIG.AWS.MODEL_ARN,
        MinConfidence: 30  // Set to 30% confidence threshold
      });

      console.log('Sending command with ProjectVersionArn:', CONFIG.AWS.MODEL_ARN);
      const result = await rekognition.send(command);
      
      console.log('Rekognition result:', result);
      
      setStats(prev => ({ ...prev, apiCalls: prev.apiCalls + 1 }));
      
      if (result.CustomLabels && result.CustomLabels.length > 0) {
        const detection = result.CustomLabels[0];
        console.log('Logo detected!', detection);
        setStats(prev => ({ ...prev, detections: prev.detections + 1 }));
        setStatus(`Logo detected! Confidence: ${detection.Confidence.toFixed(1)}%`);
        setShowARButton(true);
        
        // Draw bounding box
        if (detection.Geometry && detection.Geometry.BoundingBox) {
          drawBoundingBox(detection.Geometry.BoundingBox);
        }
        
        // Hide button after 5 seconds
        setTimeout(() => setShowARButton(false), 5000);
      } else {
        console.log('No logo detected in this frame');
        setShowARButton(false);
      }
    } catch (error) {
      console.error('Detection error:', error);
      setStatus(`Detection failed: ${error.message}`);
    }
  };

  // Draw bounding box on canvas
  const drawBoundingBox = (boundingBox) => {
    if (!canvasRef.current || !videoRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = videoRef.current.offsetWidth;
    canvas.height = videoRef.current.offsetHeight;
    
    const x = boundingBox.Left * canvas.width;
    const y = boundingBox.Top * canvas.height;
    const width = boundingBox.Width * canvas.width;
    const height = boundingBox.Height * canvas.height;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#4F46E5';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(x, y, width, height);
  };

  // Detection loop
  useEffect(() => {
    let interval;
    if (isDetecting) {
      interval = setInterval(() => {
        setStats(prev => ({ ...prev, frames: prev.frames + 1 }));
        detectLogo();
      }, 2000); // Every 2 seconds for cost optimization
    }
    return () => clearInterval(interval);
  }, [isDetecting, rekognition]);

  const handleARButtonClick = () => {
    window.open(CONFIG.AR.REDIRECT_URL, '_blank');
  };

  return (
    <main className="container mx-auto p-4">
      {/* Camera Container */}
      <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl mb-6">
        <video 
          ref={videoRef}
          className="w-full h-96 object-cover"
          autoPlay 
          muted 
          playsInline
        />
        
        {/* Detection Canvas Overlay */}
        <canvas 
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
        
        {/* AR Button */}
        {showARButton && (
          <button
            onClick={handleARButtonClick}
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                     bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-xl font-bold
                     animate-pulse shadow-lg z-10"
          >
            🚀 Click me!
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Status</h3>
          <p className="text-sm text-green-400">{status}</p>
        </div>

        {/* Stats */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Stats</h3>
          <div className="space-y-1 text-sm">
            <div>Frames: {stats.frames}</div>
            <div>API Calls: {stats.apiCalls}</div>
            <div>Detections: {stats.detections}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Controls</h3>
          <div className="space-y-2">
            <button 
              onClick={startCamera}
              className="w-full bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-sm font-medium"
            >
              Start Camera
            </button>
            <button 
              onClick={() => setIsDetecting(!isDetecting)}
              className={`w-full px-4 py-2 rounded text-sm font-medium ${
                isDetecting 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isDetecting ? 'Stop Detection' : 'Start Detection'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default ARLogoDetection;
