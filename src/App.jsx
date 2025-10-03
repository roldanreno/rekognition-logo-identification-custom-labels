import React from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import awsExports from './aws-exports.js';
import ARLogoDetection from './components/ARLogoDetection';

Amplify.configure(awsExports);

function App() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="min-h-screen bg-gray-900 text-white">
          {/* Header */}
          <header className="bg-gray-800 p-4 shadow-lg">
            <div className="container mx-auto flex items-center justify-between">
              <h1 className="text-2xl font-bold text-blue-400">Logo AR Detection</h1>
              <div className="flex items-center space-x-4">
                <span className="text-sm">Welcome, {user.username}</span>
                <button 
                  onClick={signOut}
                  className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </header>

          {/* Main AR Detection Component */}
          <ARLogoDetection user={user} />
        </div>
      )}
    </Authenticator>
  );
}

export default App;
