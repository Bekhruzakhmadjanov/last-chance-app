import React, { useState, useEffect } from 'react';
import WebApp from '@twa-dev/sdk';
import './App.css';

// Simple 3-segment wheel: 0%, 25%, 50%
// const WHEEL_SEGMENTS = [
//   { label: '0%', value: 0, color: '#1F2937', weight: 70 },    // Dark gray - 70% chance
//   { label: '25%', value: 25, color: '#F59E0B', weight: 25 },  // Amber - 25% chance  
//   { label: '50%', value: 50, color: '#FBBF24', weight: 5 }    // Gold - 5% chance
// ];

const WHEEL_SEGMENTS = [
  { label: '0%', value: 0, color: '#1F2937', weight: 97 },    // 97% chance
  { label: '25%', value: 25, color: '#F59E0B', weight: 2.5 }, // 2.5% chance  
  { label: '50%', value: 50, color: '#FBBF24', weight: 0.5 }  // 0.5% chance
];

function App() {
  const [txAddress, setTxAddress] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    // Check if running inside Telegram
    if (WebApp.initData) {
      // Initialize Telegram Web App
      WebApp.ready();
      WebApp.expand();
      
      // Get user data if available
      if (WebApp.initDataUnsafe.user) {
        console.log('User:', WebApp.initDataUnsafe.user);
      }
    } else {
      console.log('Running outside Telegram - some features disabled');
    }
  }, []);

  // Generate a device fingerprint
  const getDeviceFingerprint = () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      window.screen.width + 'x' + window.screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');
    
    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString();
  };

  const checkDeviceCooldown = () => {
    const deviceId = getDeviceFingerprint();
    const lastDeviceSpin = localStorage.getItem(`lastDeviceSpin_${deviceId}`);
    if (lastDeviceSpin) {
      const timeDiff = Date.now() - parseInt(lastDeviceSpin);
      const twentyFourHours = 24 * 60 * 60 * 1000;
      return timeDiff < twentyFourHours;
    }
    return false;
  };

  const checkCooldown = (txAddress) => {
    const lastSpin = localStorage.getItem(`lastSpin_${txAddress}`);
    if (lastSpin) {
      const timeDiff = Date.now() - parseInt(lastSpin);
      const twentyFourHours = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      return timeDiff < twentyFourHours;
    }
    return false;
  };

  // Weighted random selection for fair probability
  const getRandomPrize = () => {
    const totalWeight = WHEEL_SEGMENTS.reduce((sum, segment) => sum + segment.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const segment of WHEEL_SEGMENTS) {
      random -= segment.weight;
      if (random <= 0) {
        return segment;
      }
    }
    return WHEEL_SEGMENTS[0]; // Fallback to 0%
  };

  const showAlert = (message) => {
    if (WebApp.initData) {
      WebApp.showAlert(message);
    } else {
      alert(message); // Fallback for testing outside Telegram
    }
  };

  const spinWheel = async () => {
    if (!txAddress.trim()) {
      showAlert('Please enter a transaction address');
      return;
    }

    // Check device cooldown first
    if (checkDeviceCooldown()) {
      showAlert('You can only spin once in every 24 hours!');
      return;
    }

    // Check transaction cooldown
    if (checkCooldown(txAddress)) {
      showAlert('You can only spin once in every 24 hours!');
      return;
    }

    // TODO: Add transaction verification logic here
    // For now, we'll simulate verification
    setIsSpinning(true);
    
    // Get weighted random result
    const winnerSegment = getRandomPrize();
    
    // Calculate rotation based on exact segment positions
    let targetAngle;
    if (winnerSegment.value === 25) {
      // 25% segment: 0-90 degrees (from top clockwise)
      targetAngle = Math.random() * 90;
    } else if (winnerSegment.value === 50) {
      // 50% segment: 90-108 degrees (tiny 18-degree slice)
      targetAngle = 90 + Math.random() * 18;
    } else {
      // 0% segment: 108-360 degrees (rest of circle)
      targetAngle = 108 + Math.random() * 252;
    }
    
    const targetRotation = 1440 + (360 - targetAngle); // 4 full spins + stop at target
    setRotation(targetRotation);
    
    setTimeout(() => {
      setResult(winnerSegment);
      setIsSpinning(false);
      
      const deviceId = getDeviceFingerprint();
      
      // Set both cooldowns
      localStorage.setItem(`lastSpin_${txAddress}`, Date.now().toString());
      localStorage.setItem(`lastDeviceSpin_${deviceId}`, Date.now().toString());
      
      showAlert(`🎉 You won ${winnerSegment.label} from your transaction value!`);
    }, 3000);
  };

  const resetGame = () => {
    setResult(null);
    setTxAddress('');
    setRotation(0);
  };

  return (
    <div className="app">
      <div className="container">
        <h1>🎡 Lucky Transaction Wheel</h1>
        
        {!result ? (
          <>
            <div className="input-section">
              <div className="input-group">
                <label>Transaction Address:</label>
                <input
                  type="text"
                  value={txAddress}
                  onChange={(e) => setTxAddress(e.target.value)}
                  placeholder="0x..."
                  disabled={isSpinning}
                />
              </div>
            </div>

            <div className="wheel-container">
              <div 
                className="wheel-svg" 
                style={{ 
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning ? 'transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none'
                }}
              >
                <svg width="250" height="250" viewBox="0 0 250 250" className="wheel-svg-inner">
                  {/* 0% segment - 70% of circle - full background */}
                  <circle cx="125" cy="125" r="120" fill="#1F2937" stroke="#FBBF24" strokeWidth="2"/>
                  
                  {/* 25% segment - exactly 25% of circle (90 degrees) */}
                  <path
                    d="M 125 125 L 125 5 A 120 120 0 0 1 245 125 Z"
                    fill="#F59E0B"
                    stroke="#FBBF24"
                    strokeWidth="2"
                  />
                  
                  {/* 50% segment - only 5% of circle (18 degrees) - VERY small */}
                  <path
                    d="M 125 125 L 245 125 A 120 120 0 0 1 240 160 Z"
                    fill="#FBBF24"
                    stroke="#FBBF24"
                    strokeWidth="2"
                  />
                  
                  {/* Text labels positioned for readability */}
                  <text x="80" y="170" fill="#9CA3AF" fontSize="40" fontWeight="bold" textAnchor="middle">0%</text>
                  <text x="190" y="80" fill="#000" fontSize="20" fontWeight="bold" textAnchor="middle">25%</text>
                  <text x="220" y="142" fill="#000" fontSize="14" fontWeight="bold" textAnchor="middle">50%</text>
                </svg>
              </div>
              <div className="wheel-pointer"></div>
            </div>

            <button 
              className="spin-button"
              onClick={spinWheel}
              disabled={isSpinning}
            >
              {isSpinning ? '🎡 Spinning...' : '🎯 SPIN THE WHEEL'}
            </button>
          </>
        ) : (
          <div className="result-section">
            <h2>🎉 Spin Complete!</h2>
            <div className="result-display">
              <span className="multiplier-result">{result.label}</span>
            </div>
            <p>You {result.value === 0 ? "didn't win anything this time" : `won ${result.label} of your transaction value`}!</p>
            <button className="reset-button" onClick={resetGame}>
              🔄 Try Again Tomorrow
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;