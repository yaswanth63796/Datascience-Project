import React from 'react';
import { Sprout } from 'lucide-react';

const LoadingSpinner = ({ message = 'Loading agricultural assessment data...' }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '3.5rem 1.5rem',
      gap: '1rem',
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: 'var(--forest-100)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'pulse 1.5s infinite ease-in-out',
      }}>
        <Sprout size={26} color="var(--forest-700)" />
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', fontWeight: '500' }}>
        {message}
      </p>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.92); opacity: 0.7; }
          50% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(0.92); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;
