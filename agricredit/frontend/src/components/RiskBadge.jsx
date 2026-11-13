import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

const RiskBadge = ({ riskClass, probability }) => {
  const normClass = (riskClass || '').toUpperCase();

  let badgeStyle = {
    padding: '0.25rem 0.65rem',
    borderRadius: '9999px',
    fontSize: '0.78rem',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    textTransform: 'uppercase',
  };

  let icon = null;
  let text = normClass;

  if (normClass === 'LOW_RISK') {
    badgeStyle.backgroundColor = '#dcfce7';
    badgeStyle.color = '#15803d';
    badgeStyle.border = '1px solid #86efac';
    icon = <ShieldCheck size={13} />;
    text = 'Low Risk';
  } else if (normClass === 'MODERATE_RISK') {
    badgeStyle.backgroundColor = '#fef3c7';
    badgeStyle.color = '#b45309';
    badgeStyle.border = '1px solid #fde68a';
    icon = <AlertTriangle size={13} />;
    text = 'Moderate Risk';
  } else if (normClass === 'ELEVATED_RISK') {
    badgeStyle.backgroundColor = '#fee2e2';
    badgeStyle.color = '#b91c1c';
    badgeStyle.border = '1px solid #fca5a5';
    icon = <ShieldAlert size={13} />;
    text = 'Elevated Risk';
  } else {
    badgeStyle.backgroundColor = '#f3f4f6';
    badgeStyle.color = '#4b5563';
    badgeStyle.border = '1px solid #e5e7eb';
    text = riskClass || 'Unassessed';
  }

  return (
    <span style={badgeStyle}>
      {icon}
      <span>{text}</span>
      {probability !== undefined && probability !== null && (
        <span style={{ opacity: 0.85, fontWeight: '500' }}>
          ({(probability * 100).toFixed(1)}%)
        </span>
      )}
    </span>
  );
};

export default RiskBadge;
