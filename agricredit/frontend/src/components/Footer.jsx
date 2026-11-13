import React from 'react';
import { ShieldAlert, BookOpen, ExternalLink } from 'lucide-react';

const Footer = () => {
  return (
    <footer style={{
      backgroundColor: 'var(--forest-900)',
      color: '#94a3b8',
      padding: '2.5rem 1.5rem',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      marginTop: 'auto',
      fontSize: '0.88rem'
    }}>
      <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '1.25rem'
        }}>
          <div>
            <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '1.05rem' }}>AgriCredit System</span>
            <p style={{ marginTop: '0.2rem', color: '#64748b', fontSize: '0.82rem' }}>
              Agricultural Credit Eligibility & Repayment Risk Assessment Decision-Support Prototype
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--forest-300)' }}>KCC Scale of Finance Norms</span>
            <span style={{ color: 'var(--forest-300)' }}>NABARD Rural Lending Guidelines</span>
            <span style={{ color: 'var(--forest-300)' }}>Scikit-Learn ML Risk Pipeline</span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          padding: '1rem',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <ShieldAlert size={18} color="var(--wheat-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <p style={{ fontSize: '0.8rem', lineHeight: '1.5', color: '#cbd5e1' }}>
            <strong>Regulatory & Transparency Disclaimer:</strong> AgriCredit is a decision-support and educational financial assessment platform.
            It does not constitute an automated bank credit sanction, rejection, or binding loan commitment. All final agricultural lending decisions remain
            subject to human review by qualified credit officers, physical farm inspection, official land record validation, and applicable institutional credit policies.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', color: '#64748b', fontSize: '0.78rem' }}>
          <span>© 2026 AgriCredit — Agricultural Credit & Risk Assessment Platform.</span>
          <span>Zero Aadhaar Collection Policy • Privacy First Agronomic Modeling</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
