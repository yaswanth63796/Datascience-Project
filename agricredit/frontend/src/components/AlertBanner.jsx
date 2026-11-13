import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const AlertBanner = ({ type = 'info', title, message, children }) => {
  let bg = '#eff6ff';
  let border = '#bfdbfe';
  let text = '#1e40af';
  let Icon = Info;

  if (type === 'warning' || type === 'prototype') {
    bg = '#fffbeb';
    border = '#fde68a';
    text = '#92400e';
    Icon = AlertTriangle;
  } else if (type === 'error' || type === 'danger') {
    bg = '#fef2f2';
    border = '#fecaca';
    text = '#991b1b';
    Icon = AlertCircle;
  } else if (type === 'success') {
    bg = '#f0fdf4';
    border = '#bbf7d0';
    text = '#166534';
    Icon = CheckCircle;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.85rem',
      padding: '0.9rem 1.15rem',
      backgroundColor: bg,
      border: `1px solid ${border}`,
      borderRadius: 'var(--radius-md)',
      color: text,
      marginBottom: '1.25rem',
      fontSize: '0.9rem',
    }}>
      <Icon size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        {title && <div style={{ fontWeight: '700', marginBottom: '0.2rem' }}>{title}</div>}
        {message && <div>{message}</div>}
        {children}
      </div>
    </div>
  );
};

export default AlertBanner;
