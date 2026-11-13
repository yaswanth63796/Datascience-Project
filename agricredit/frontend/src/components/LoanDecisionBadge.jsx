import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { formatINR } from './FormatCurrency';

const LoanDecisionBadge = ({ decision, showMaxAmount = true }) => {
  if (!decision) {
    return (
      <span className="badge" style={{ backgroundColor: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
        Pending Assessment
      </span>
    );
  }

  const canGive = decision.can_give_loan;
  const maxAmt = decision.max_recommended_loan_amount;

  if (canGive === 'YES') {
    return (
      <div>
        <span
          className="badge"
          style={{
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            fontWeight: '750',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <CheckCircle2 size={13} color="#059669" />
          <span>YES (Eligible)</span>
        </span>
        {showMaxAmount && maxAmt !== null && maxAmt !== undefined && (
          <div style={{ fontSize: '0.76rem', color: '#047857', fontWeight: '650', marginTop: '2px' }}>
            Max: {formatINR(maxAmt)}
          </div>
        )}
      </div>
    );
  }

  if (canGive === 'NO') {
    return (
      <div>
        <span
          className="badge"
          style={{
            backgroundColor: '#fef2f2',
            color: '#991b1b',
            border: '1px solid #fecaca',
            fontWeight: '750',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <XCircle size={13} color="#dc2626" />
          <span>NO (Not Advised)</span>
        </span>
        {showMaxAmount && (
          <div style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: '2px' }}>
            High Default Risk
          </div>
        )}
      </div>
    );
  }

  if (canGive === 'CONDITIONAL') {
    return (
      <div>
        <span
          className="badge"
          style={{
            backgroundColor: '#fffbeb',
            color: '#92400e',
            border: '1px solid #fde68a',
            fontWeight: '750',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <AlertTriangle size={13} color="#d97706" />
          <span>CONDITIONAL</span>
        </span>
        {showMaxAmount && maxAmt !== null && maxAmt !== undefined && (
          <div style={{ fontSize: '0.76rem', color: '#b45309', fontWeight: '650', marginTop: '2px' }}>
            Cap: {formatINR(maxAmt)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <span
        className="badge"
        style={{
          backgroundColor: '#f1f5f9',
          color: '#475569',
          border: '1px solid #cbd5e1',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        <HelpCircle size={13} color="#64748b" />
        <span>Pending Disclosures</span>
      </span>
    </div>
  );
};

export default LoanDecisionBadge;
