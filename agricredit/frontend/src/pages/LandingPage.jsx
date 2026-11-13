import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  TrendingUp,
  ShieldCheck,
  Calculator,
  Scale,
  BrainCircuit,
  ArrowRight,
  FileCheck2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';
import AlertBanner from '../components/AlertBanner';
import '../styles/landing.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      {/* Prototype Disclaimer Banner */}
      <AlertBanner type="prototype" title="Educational & Decision-Support Prototype">
        AgriCredit is a specialized financial data science decision-support tool designed for agricultural lenders.
        It evaluates farm economics, seasonal crop cycles, and subsidies. Final lending decisions remain strictly
        subject to human officer review, field inspection, and institutional lender credit policy.
      </AlertBanner>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="hero-badge">
          <Sprout size={16} />
          <span>Agricultural Credit & Risk Assessment Platform</span>
        </div>
        <h1 className="hero-title">
          Credit Decisions Grounded in Real Farming Economics
        </h1>
        <p className="hero-description">
          Evaluate agricultural loan eligibility using cultivated acreage, crop season cash-flows,
          transparent debt service coverage (DSCR), and machine learning risk indicators.
          Replace generic consumer credit scoring with authentic agronomic assessment.
        </p>
        <div className="hero-actions">
          <Link to="/apply" className="btn btn-lg btn-secondary">
            <span>New Farmer Application</span>
            <ArrowRight size={18} />
          </Link>
          <Link to="/eligibility" className="btn btn-lg btn-outline" style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.6)', backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <Calculator size={18} />
            <span>Loan Eligibility Prediction</span>
          </Link>
          <Link to="/dashboard" className="btn btn-lg btn-outline" style={{ color: '#ffffff', borderColor: 'rgba(255,255,255,0.4)' }}>
            <span>View Dashboard</span>
          </Link>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="workflow-section">
        <div className="section-header">
          <h2 className="section-title">How AgriCredit Works</h2>
          <p className="section-subtitle">
            A transparent 4-stage pipeline connecting farmer disclosures to rigorous credit analysis
          </p>
        </div>

        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">Phase 1</div>
            <h3 className="step-heading">Farmer & Land Profile</h3>
            <p className="step-description">
              Captures verified district, state, land ownership (owned/leased), and total vs active seasonal acreage.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">Phase 2</div>
            <h3 className="step-heading">Multi-Crop Agronomy</h3>
            <p className="step-description">
              Itemizes seasonal crops, yields, market prices, and comprehensive input costs (seeds, fertilizer, labor, irrigation).
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">Phase 3</div>
            <h3 className="step-heading">Cash Flow & ML Engine</h3>
            <p className="step-description">
              Computes operating surplus, DSCR, and amortized debt obligations, coupled with a transparent repayment risk classifier.
            </p>
          </div>

          <div className="step-card">
            <div className="step-number">Phase 4</div>
            <h3 className="step-heading">Officer Human Review</h3>
            <p className="step-description">
              Presents explainable factors, missing documents, and enables credit officers to record audited human decisions.
            </p>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <div className="section-header" style={{ marginBottom: '1.75rem' }}>
        <h2 className="section-title">Built Exclusively for Agricultural Lending</h2>
        <p className="section-subtitle">
          Engineered to overcome the limitations of urban credit models in rural farming contexts
        </p>
      </div>

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon-wrapper">
            <Calculator size={24} />
          </div>
          <h3 className="feature-title">Multi-Crop Seasonal Surplus</h3>
          <p className="feature-text">
            Calculates gross harvest revenue and cultivation costs across Kharif, Rabi, and Zaid seasons without double-counting land or seasonal cycles.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper">
            <Scale size={24} />
          </div>
          <h3 className="feature-title">Separated Subsidy Accounting</h3>
          <p className="feature-text">
            Strictly separates received cash subsidies (e.g. PM-KISAN) from pending approved schemes. Never counts unapproved subsidies as guaranteed liquidity.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper">
            <TrendingUp size={24} />
          </div>
          <h3 className="feature-title">Debt Service Coverage (DSCR)</h3>
          <p className="feature-text">
            Aligns monthly and seasonal repayment periods with clear illustrative interest rates (e.g. 7.0% KCC subvention benchmark) and debt coverage indicators.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper">
            <BrainCircuit size={24} />
          </div>
          <h3 className="feature-title">Documented ML Risk Pipeline</h3>
          <p className="feature-text">
            Random Forest classifier trained on documented agricultural economics data. Provides feature importance, fallback modes, and transparent disclaimers.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper">
            <FileCheck2 size={24} />
          </div>
          <h3 className="feature-title">Evidence & Verification Trail</h3>
          <p className="feature-text">
            Tracks land ownership records (Patta/Chitta), sowing certificates, and subsidy receipts, flagging unverified records for officer verification.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon-wrapper">
            <ShieldCheck size={24} />
          </div>
          <h3 className="feature-title">Farmer Privacy Safeguards</h3>
          <p className="feature-text">
            No Aadhaar or sensitive demographic data collection. Protects farmers against arbitrary acreage-based auto-rejection rules.
          </p>
        </div>
      </div>

      {/* Comparison Section */}
      <div className="card" style={{ marginBottom: '3rem', backgroundColor: 'var(--forest-50)', borderColor: 'var(--forest-200)' }}>
        <h3 style={{ fontSize: '1.25rem', color: 'var(--forest-900)', marginBottom: '1rem' }}>
          Agricultural Credit vs. Generic Consumer Scoring
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ color: '#991b1b', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <AlertTriangle size={16} /> Generic Consumer Credit Models
            </h4>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.88rem', color: '#475569', lineHeight: '1.6' }}>
              <li>Assumes fixed monthly salary slips</li>
              <li>Ignores harvest seasonal liquidity lumps</li>
              <li>Penalizes absence of urban credit bureau footprints</li>
              <li>Blind to acreage, crop selection, and input subsidies</li>
            </ul>
          </div>
          <div style={{ background: '#ffffff', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--forest-300)' }}>
            <h4 style={{ color: 'var(--forest-700)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Sprout size={16} /> AgriCredit Approach
            </h4>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.88rem', color: '#1b4332', lineHeight: '1.6' }}>
              <li>Evaluates seasonal farm operating surplus & yields</li>
              <li>Synchronizes repayment with crop harvest calendars</li>
              <li>Integrates PM-KISAN and documented state subsidies</li>
              <li>Explains risk drivers and missing documentation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
