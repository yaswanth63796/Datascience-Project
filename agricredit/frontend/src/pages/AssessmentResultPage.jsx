import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileCheck2,
  Printer,
  TrendingUp,
  BrainCircuit,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  IndianRupee,
  ShieldAlert,
  ArrowLeft,
  FileQuestion,
  Info,
} from 'lucide-react';
import { api } from '../api/client';
import RiskBadge from '../components/RiskBadge';
import { formatINR } from '../components/FormatCurrency';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBanner from '../components/AlertBanner';
import '../styles/assessment.css';

const AssessmentResultPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [error, setError] = useState(null);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      const [appRes, assessRes] = await Promise.all([
        api.getApplication(id),
        api.getAssessment(id),
      ]);
      setAppData(appRes.data.application);
      setAssessment(assessRes.data.assessment);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to generate or retrieve agricultural credit assessment report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <LoadingSpinner message="Synthesizing multi-crop cash flow and running ML risk pipeline..." />;
  }

  if (error || !appData || !assessment) {
    return (
      <div style={{ padding: '2rem 0' }}>
        <AlertBanner type="error" title="Assessment Failed" message={error || 'Could not load assessment.'} />
        <Link to="/dashboard" className="btn btn-outline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const cf = assessment.cashflow_assessment || {};
  const ml = assessment.ml_assessment || {};
  const farmer = appData.farmer || {};
  const nextStep = assessment.recommended_next_step || 'MANUAL_REVIEW';
  const missingDocs = assessment.missing_documents || [];
  const decision = assessment.loan_decision || appData.loan_decision || {};
  const canGive = decision.can_give_loan || 'PENDING';

  // Determine loan decision styling & messaging
  let decisionCardClass = 'decision-card-pending';
  let decisionTitle = decision.headline || 'CANNOT DETERMINE — INSUFFICIENT DATA';
  let decisionSubtitle = 'Additional crop cultivation acreage, yields, or revenue disclosures required';
  let decisionPillText = 'INSUFFICIENT DATA';
  let decisionPillClass = 'pill-pending';
  let DecisionIcon = HelpCircle;

  if (canGive === 'YES') {
    decisionCardClass = 'decision-card-yes';
    decisionTitle = 'YES — LOAN SANCTION RECOMMENDED';
    decisionSubtitle = 'Financially supportable based on seasonal farm operating surplus and healthy debt coverage';
    decisionPillText = 'YES (ELIGIBLE)';
    decisionPillClass = 'pill-yes';
    DecisionIcon = CheckCircle2;
  } else if (canGive === 'NO') {
    decisionCardClass = 'decision-card-no';
    decisionTitle = 'NO — LOAN NOT RECOMMENDED';
    decisionSubtitle = 'High default vulnerability: farm operating deficit, debt overload, or critical insolvency';
    decisionPillText = 'NO (DO NOT GIVE)';
    decisionPillClass = 'pill-no';
    DecisionIcon = XCircle;
  } else if (canGive === 'CONDITIONAL') {
    decisionCardClass = 'decision-card-conditional';
    decisionTitle = 'CONDITIONAL — SANCTION REDUCED LIMIT / COVENANTS';
    decisionSubtitle = 'Applicant can support a reduced loan limit or requires crop insurance and field inspection';
    decisionPillText = 'CONDITIONAL SANCTION';
    decisionPillClass = 'pill-conditional';
    DecisionIcon = AlertTriangle;
  }

  // Determine secondary recommendation styling
  let verdictClass = 'verdict-review';
  let verdictTitle = 'Manual Officer Review Recommended';
  let VerdictIcon = AlertTriangle;

  if (nextStep === 'ASSESSMENT_SUPPORTIVE') {
    verdictClass = 'verdict-supportive';
    verdictTitle = 'Assessment Financially Supportive';
    VerdictIcon = CheckCircle2;
  } else if (nextStep === 'INSUFFICIENT_DATA') {
    verdictClass = 'verdict-insufficient';
    verdictTitle = 'Insufficient Farming Data';
    VerdictIcon = HelpCircle;
  }

  return (
    <div className="assessment-container">
      {/* Print Actions Bar */}
      <div className="print-actions-bar print-hide">
        <Link to={`/applications/${id}`} className="btn btn-outline">
          <ArrowLeft size={16} /> Back to Application Details
        </Link>
        <button onClick={handlePrint} className="btn btn-secondary">
          <Printer size={16} /> Print Official Assessment Sheet
        </button>
      </div>

      {/* ========================================================
          PRIMARY DECISION: CAN WE GIVE LOAN OR NOT?
          ======================================================== */}
      <div className={`loan-decision-hero ${decisionCardClass}`}>
        <div className="decision-header-row">
          <div>
            <div className="decision-eyebrow">AGRICULTURAL CREDIT SANCTION DECISION</div>
            <div className="decision-title-group">
              <DecisionIcon size={40} className="decision-icon" />
              <div>
                <h1 className="decision-main-title">{decisionTitle}</h1>
                <div className="decision-subtitle">{decisionSubtitle}</div>
              </div>
            </div>
          </div>
          <div className="decision-badge-container">
            <span className={`decision-pill-badge ${decisionPillClass}`}>
              CAN WE GIVE LOAN? → {decisionPillText}
            </span>
            <div className="decision-ref-sub">
              Ref: {appData.application_number} • Farmer: {farmer.farmer_name}
            </div>
          </div>
        </div>

        <div className="decision-summary-text">
          <strong>Decision Summary: </strong>
          {decision.verdict_summary || assessment.recommendation_reason}
        </div>

        {/* 4 Financial Capacity & Headroom Metric Cards */}
        <div className="decision-metrics-grid">
          <div className="decision-stat-card">
            <span className="stat-label">Requested Loan Ask</span>
            <div className="stat-val">{formatINR(decision.requested_loan_amount || appData.requested_loan_amount)}</div>
            <span className="stat-hint">
              Tenure: {appData.requested_loan_tenure_months}M • {appData.repayment_frequency}
            </span>
          </div>

          <div className="decision-stat-card highlight-supportable">
            <span className="stat-label">Max Financially Supportable</span>
            <div className="stat-val">
              {decision.max_recommended_loan_amount !== null && decision.max_recommended_loan_amount !== undefined
                ? formatINR(decision.max_recommended_loan_amount)
                : 'N/A'}
            </div>
            <span className="stat-hint">Sustainable at DSCR ≥ 1.25x</span>
          </div>

          <div className="decision-stat-card">
            <span className="stat-label">Borrowing Capacity Headroom / Gap</span>
            <div
              className="stat-val"
              style={{
                color: (decision.surplus_or_shortfall_amount || 0) >= 0 ? '#15803d' : '#b91c1c',
              }}
            >
              {decision.surplus_or_shortfall_amount !== null && decision.surplus_or_shortfall_amount !== undefined ? (
                ((decision.surplus_or_shortfall_amount >= 0 ? '+' : '') +
                  formatINR(decision.surplus_or_shortfall_amount))
              ) : (
                'N/A'
              )}
            </div>
            <span className="stat-hint">
              {(decision.surplus_or_shortfall_amount || 0) >= 0 ? 'Surplus debt capacity headroom' : 'Over-leveraged deficit'}
            </span>
          </div>

          <div className="decision-stat-card">
            <span className="stat-label">Debt Service Coverage (DSCR)</span>
            <div
              className="stat-val"
              style={{
                color: (decision.dscr || cf.debt_service_coverage_ratio || 0) >= 1.25 ? '#15803d' : '#b45309',
              }}
            >
              {decision.dscr !== null && decision.dscr !== undefined
                ? `${decision.dscr}x`
                : cf.debt_service_coverage_ratio !== null && cf.debt_service_coverage_ratio !== undefined
                ? `${cf.debt_service_coverage_ratio}x`
                : 'N/A'}
            </div>
            <span className="stat-hint">Standard safety benchmark: ≥ 1.25x</span>
          </div>
        </div>

        {/* Reasons and Recommended Sanction Covenants */}
        <div className="decision-reasons-panel">
          <div className="reasons-column">
            <h3 className="reasons-heading">
              <CheckCircle2 size={16} />
              <span>Assessment Rationale & Agronomic Findings</span>
            </h3>
            <ul className="reasons-list">
              {(decision.reasons || [assessment.recommendation_reason]).map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>

          {decision.conditions && decision.conditions.length > 0 && (
            <div className="conditions-column">
              <h3 className="conditions-heading">
                <AlertTriangle size={16} />
                <span>Recommended Sanction Covenants & Requirements</span>
              </h3>
              <ul className="conditions-list">
                {decision.conditions.map((cond, idx) => (
                  <li key={idx}>{cond}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Dual Engine Side-by-Side Comparison */}
      <div className="assessment-dual-grid">
        {/* Box A: Deterministic Agricultural Cash-Flow Assessment */}
        <div className="assessment-box">
          <div className="assessment-box-header">
            <h2 className="assessment-box-title">
              <Calculator size={18} />
              <span>A. Agricultural Cash-Flow Assessment</span>
            </h2>
            <span
              className={`badge ${
                cf.cashflow_verdict === 'ASSESSMENT_SUPPORTIVE'
                  ? 'badge-supportive'
                  : cf.cashflow_verdict === 'INSUFFICIENT_DATA'
                  ? 'badge-insufficient'
                  : 'badge-review'
              }`}
            >
              {cf.cashflow_verdict || 'MANUAL_REVIEW'}
            </span>
          </div>

          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Seasonal Crop Harvest Revenue:</span>
            <strong>{formatINR(cf.total_seasonal_crop_revenue)}</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Seasonal Cultivation Costs:</span>
            <strong style={{ color: '#b91c1c' }}>- {formatINR(cf.total_seasonal_cultivation_cost)}</strong>
          </div>
          <div className="metric-row highlight">
            <span>Farming Operating Surplus:</span>
            <strong style={{ color: cf.estimated_agricultural_operating_surplus >= 0 ? '#15803d' : '#b91c1c' }}>
              {formatINR(cf.estimated_agricultural_operating_surplus)}
            </strong>
          </div>

          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Verified Non-Farm Income (6M):</span>
            <strong>+ {formatINR(cf.verified_other_income_period)}</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Confirmed Subsidy Received:</span>
            <strong>+ {formatINR(cf.confirmed_subsidy_period)}</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Existing Debt Repayments (6M):</span>
            <strong style={{ color: '#b91c1c' }}>- {formatINR(cf.existing_debt_service_period)}</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>
              Proposed Repayment (6M @ {cf.assumed_annual_interest_rate_pct}% p.a.):
            </span>
            <strong style={{ color: '#b91c1c' }}>- {formatINR(cf.proposed_debt_service_period)}</strong>
          </div>

          <div className="metric-row highlight" style={{ backgroundColor: 'var(--bg-surface-subtle)' }}>
            <span>Net Available Cash Flow (Surplus Buffer):</span>
            <strong style={{ color: cf.estimated_net_available_cashflow >= 0 ? '#15803d' : '#b91c1c' }}>
              {formatINR(cf.estimated_net_available_cashflow)}
            </strong>
          </div>

          <div className="metric-row highlight" style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
            <span style={{ color: '#166534', fontWeight: '700' }}>Debt Service Coverage Ratio (DSCR):</span>
            <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#166534' }}>
              {cf.debt_service_coverage_ratio !== null ? `${cf.debt_service_coverage_ratio}x` : 'N/A'}
            </span>
          </div>

          {/* Cashflow Notes */}
          <div style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <strong>Cash-Flow Audit Notes:</strong>
            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.35rem', lineHeight: '1.5' }}>
              {(cf.cashflow_notes || []).map((note, idx) => (
                <li key={idx}>{note}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Box B: Machine Learning Repayment Risk Indicator */}
        <div className="assessment-box">
          <div className="assessment-box-header">
            <h2 className="assessment-box-title">
              <BrainCircuit size={18} />
              <span>B. ML Repayment Risk Assessment</span>
            </h2>
            <RiskBadge riskClass={ml.predicted_risk_class} probability={ml.repayment_difficulty_probability} />
          </div>

          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Trained Model Algorithm:</span>
            <strong>{ml.model_name || 'Random Forest Classifier'}</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Pipeline Version:</span>
            <strong>{ml.model_version}</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Repayment Distress Probability:</span>
            <strong>
              {ml.repayment_difficulty_probability !== null && ml.repayment_difficulty_probability !== undefined
                ? `${(ml.repayment_difficulty_probability * 100).toFixed(2)}%`
                : 'Unavailable (Fallback Mode)'}
            </strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Fallback Mode Active:</span>
            <strong>{ml.is_fallback ? 'Yes (Honest Fallback)' : 'No (Genuine Model Fit)'}</strong>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <h4 style={{ fontSize: '0.88rem', color: 'var(--forest-900)', marginBottom: '0.4rem' }}>
              Key Agronomic Contributing Factors
            </h4>
            <ul style={{ paddingLeft: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.55' }}>
              {(ml.key_contributing_factors || []).map((factor, idx) => (
                <li key={idx}>{factor}</li>
              ))}
            </ul>
          </div>

          <div style={{
            marginTop: '1.5rem',
            padding: '0.85rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '0.78rem',
            color: '#64748b'
          }}>
            <ShieldAlert size={14} color="#b45309" style={{ display: 'inline', marginRight: '4px' }} />
            <strong>Model Governance & Privacy Disclaimer:</strong> {ml.limitations_disclaimer}
          </div>
        </div>
      </div>

      {/* Repayment Amortization & Assumptions Card */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <h2 className="card-title">
          <IndianRupee size={18} />
          <span>Amortization Schedule & Financing Assumptions</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1rem' }}>
          Configured under illustrative Kisan Credit Card (KCC) interest rate assumptions. Not a binding bank credit offer.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--bg-surface-subtle)', padding: '1rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Assumed Annual Rate</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--forest-900)' }}>
              {cf.assumed_annual_interest_rate_pct}% p.a.
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--forest-600)' }}>Priority sector benchmark</span>
          </div>

          <div style={{ background: 'var(--bg-surface-subtle)', padding: '1rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Monthly Installment (EMI)</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--forest-900)' }}>
              {formatINR(cf.proposed_loan_installment_monthly)}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Equal monthly equivalent</span>
          </div>

          <div style={{ background: 'var(--bg-surface-subtle)', padding: '1rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Seasonal Debt Service (6M)</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--forest-900)' }}>
              {formatINR(cf.proposed_debt_service_period)}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Due during active crop season</span>
          </div>

          <div style={{ background: 'var(--bg-surface-subtle)', padding: '1rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Combined Debt Service (6M)</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--forest-900)' }}>
              {formatINR(cf.total_debt_service_period)}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Existing debt + Proposed loan</span>
          </div>
        </div>
      </div>

      {/* Missing Documents & Verification Checklist */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <h2 className="card-title">
          <FileQuestion size={18} />
          <span>Documentation & Evidence Checklist</span>
        </h2>
        {missingDocs.length > 0 ? (
          <div>
            <p style={{ color: '#b45309', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              The following agricultural verification items are unattached or require field inspection before final disbursement:
            </p>
            <ul style={{ paddingLeft: '1.2rem', color: '#b45309', fontSize: '0.88rem', lineHeight: '1.6' }}>
              {missingDocs.map((item, idx) => (
                <li key={idx}>{item}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontSize: '0.9rem' }}>
            <CheckCircle2 size={18} />
            <span>All primary recommended agricultural documentation categories are attached on record.</span>
          </div>
        )}
      </div>

      {/* Regulatory Disclaimers Footer */}
      <div className="alert-banner alert-prototype-disclaimer">
        <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.82rem', lineHeight: '1.5' }}>
          <strong>Legal & Compliance Protocol:</strong> {assessment.disclaimer} Final sanctioning requires physical
          field inspection, soil/irrigation survey, Patta land title verification with state revenue portals, and sanction by the designated Credit Sanction Committee.
        </div>
      </div>
    </div>
  );
};

export default AssessmentResultPage;
