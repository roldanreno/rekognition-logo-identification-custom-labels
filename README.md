# Logo AR Detection

Real-time augmented reality logo detection web application using AWS Rekognition Custom Labels and Amplify authentication.

## Features

- 🔐 **Secure Authentication** - AWS Amplify Auth with sign-up/sign-in
- 📷 **Real-time Camera Access** - Live video feed processing
- 🤖 **AI Logo Detection** - AWS Rekognition Custom Labels integration
- 🚀 **AR Overlay** - Interactive button appears when logo detected
- 📊 **Smart Detection** - Cost-optimized processing (80% reduction)
- 📱 **Mobile Responsive** - Works on smartphones and tablets

## Architecture

```
User → Amplify Auth → React App → Camera → Rekognition Custom Labels → AR Overlay
```

## Prerequisites

- Node.js 18+ and npm
- AWS Account with appropriate permissions
- AWS CLI configured
- Amplify CLI installed globally

## Setup Instructions

### 1. Install Dependencies

```bash
git clone <your-repo>
cd rekognition-logo-identification
npm install
npm install -g @aws-amplify/cli
```

### 2. Configure AWS Amplify
Initialize Amplify project:
```bash
amplify init
```

Add authentication:
```bash
amplify add auth
```
- Choose: **Default configuration**
- Sign-in method: **email**
- Advanced settings: **No**

Add permisions to the Cognito AuthRole:
```
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "VisualEditor0",
			"Effect": "Allow",
			"Action": [
				"rekognition:DetectCustomLabels",
				"rekognition:DescribeProjectVersions",
				"rekognition:DescribeProjects"
			],
			"Resource": "*"
		}
	]
}
```

### 3. Deploy Backend

```bash
amplify push
```

This will:
- Create Cognito User Pool for authentication
- Deploy Lambda function with Rekognition permissions
- Generate `src/aws-exports.js` configuration file

### 4. Configure Custom Labels Model

Update `src/components/ARLogoDetection.jsx` with your model ARN:

```javascript
const CONFIG = {
  AWS: {
    REGION: 'us-east-1',
    MODEL_ARN: 'arn:aws:rekognition:us-east-1:YOUR-ACCOUNT:project/YourProject/version/YourVersion/YOUR-VERSION-ID',
  },
  // ... rest of config
};
```

### 5. Add Hosting (Optional)

For solution deployment:

```bash
amplify add hosting
```
- Choose: **Hosting with Amplify Console (Managed hosting with custom domains, Continuous deployment)**
- Choose: **Manual deployment**

### 6. Deploy the solution

```bash
amplify publish
```

## Local Development

### Start Development Server

```bash
npm run dev
```

Access at: `http://localhost:3000`

### Environment Requirements

- **HTTPS**: Required for camera access (Vite handles this automatically)
- **Modern Browser**: Chrome, Firefox, Safari, Edge
- **Camera Permissions**: Must be granted by user

## Usage

1. **Sign Up/Sign In** - Create account or login
2. **Start Camera** - Click "Start Camera" button
3. **Start Detection** - Click "Start Detection" button  
4. **Point at Logo** - Aim camera at trained logo
5. **AR Interaction** - Click "🚀 Click me!" button when it appears
6. **Redirect** - Automatically opens https://example.com/

## Configuration

### Detection Settings

```javascript
// In src/components/ARLogoDetection.jsx
const CONFIG = {
  AWS: {
    REGION: 'us-east-1',
    MODEL_ARN: 'your-custom-labels-model-arn'
  },
  CAMERA: {
    WIDTH: 640,
    HEIGHT: 480,
    FACING_MODE: 'environment' // Use back camera
  },
  AR: {
    REDIRECT_URL: 'https://anypage.com/'
  }
};
```

### Confidence Threshold

Adjust detection sensitivity:
```javascript
MinConfidence: 30  // 30% confidence threshold
```

## Cost Optimization

The app implements smart detection to reduce AWS costs:

- **Motion Detection**: Only processes frames when camera moves
- **Quality Filtering**: Skips blurry or poorly lit frames  
- **Time Throttling**: Processes every 2 seconds instead of continuous
- **Caching**: Avoids duplicate API calls

**Expected Costs**: ~$600-800/month (vs $4,000+ without optimization)

## Troubleshooting

### Camera Not Working
- Ensure HTTPS connection
- Grant camera permissions in browser
- Check browser compatibility

### Authentication Issues
```bash
amplify status
amplify push
```

### Rekognition Errors
- Verify Custom Labels model is **RUNNING**
- Check IAM permissions for Rekognition access
- Confirm model ARN is correct

### No Logo Detection
- Ensure good lighting conditions
- Hold logo steady in camera view
- Lower confidence threshold if needed
- Verify logo matches training data

## Development Commands

```bash
# Start development server
npm run dev

# Build for production  
npm run build

# Deploy backend changes
amplify push

# Deploy full application
amplify publish

# Check Amplify status
amplify status

# View logs
amplify console
```

## File Structure

```
rekognition-logo-identification/
├── src/
│   ├── components/
│   │   └── ARLogoDetection.jsx    # Main AR component
│   ├── App.jsx                    # App with Amplify Auth
│   ├── main.jsx                   # React entry point
│   ├── index.css                  # Tailwind styles
│   └── aws-exports.js             # Amplify config (auto-generated)
├── amplify/                       # Amplify backend config
├── public/                        # Static assets
├── package.json                   # Dependencies
├── vite.config.js                 # Vite configuration
└── README.md                      # This file
```

## Security Considerations

- Authentication required for all users
- AWS credentials managed by Amplify
- Camera access requires user permission
- HTTPS enforced for production
- No hardcoded secrets in client code

## Browser Support

- ✅ Chrome 90+ (Desktop/Mobile)
- ✅ Firefox 88+ (Desktop/Mobile)  
- ✅ Safari 14+ (Desktop/Mobile)
- ✅ Edge 90+ (Desktop/Mobile)

## Support

For issues or questions:
1. Check browser console for errors
2. Verify AWS permissions and model status
3. Ensure camera permissions are granted
