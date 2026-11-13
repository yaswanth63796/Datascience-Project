import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileCheck2,
  CheckCircle,
  XCircle,
  FileQuestion,
  User,
  IndianRupee,
  Calendar,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import LoanDecisionBadge from '../components/LoanDecisionBadge';
import { formatINR } from '../components/FormatCurrency';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBanner from '../components/AlertBanner';

const AdminReviewPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [decision, setDecision] = useState('SUPPORTED');
  const [officerNotes, setOfficerNotes] = useState('');
  const [recommendedAmount, setRecommendedAmount] = useState('');
  const [requestItems, setRequestItems] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('agricredit_token');
    const userStr = localStorage.getItem('agricredit_user');
    if (!token || !userStr) {
      navigate('/login');
      return;
    }
    try {
      setCurrentUser(JSON.parse(userStr));
    } catch {
      navigate('/login');
      return;
    }
    fetchApplications();
  }, [navigate]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await api.getApplications({ per_page: 50 });
      const apps = res.data.applications || [];
      setApplications(apps);
      if (apps.length > 0 && !selectedApp) {
        setSelectedApp(apps[0]);
        setRecommendedAmount(apps[0].requested_loan_amount);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch applications.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectApp = (app) => {
    setSelectedApp(app);
    setRecommendedAmount(app.requested_loan_amount);
    setOfficerNotes('');
    setRequestItems('');
    setMessage(null);
  };

  const handleSubmitDecision = async (e) => {
    e.preventDefault();
    if (!selectedApp) return;
    if (!officerNotes.trim()) {
      alert('Officer notes are required for audit compliance.');
      return;
    }

    try {
      setSubmittingReview(true);
      setError(null);
      await api.submitHumanReview(selectedApp.id, {
        review_decision: decision,
        officer_notes: officerNotes,
        recommended_loan_amount: Number(recommendedAmount),
      });

      setMessage(`Review recorded: Application marked as ${decision}.`);
      await fetchApplications();
      // Reload current app details
      const updatedRes = await api.getApplication(selectedApp.id);
      setSelectedApp(updatedRes.data.application);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleRequestInformation = async () => {
    if (!selectedApp) return;
    if (!requestItems.trim()) {
      alert('Please state which documents or disclosures are required.');
      return;
    }

    try {
      setSubmittingReview(true);
      setError(null);
      await api.requestInformation(selectedApp.id, requestItems);
      setMessage('Information request logged. Application status updated.');
      await fetchApplications();
      const updatedRes = await api.getApplication(selectedApp.id);
      setSelectedApp(updatedRes.data.application);
      setRequestItems('');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to request information.');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading credit officer review queue..." />;
  }

  return (
    <div className="admin-review-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', color: 'var(--forest-900)' }}>
            Credit Committee Review Portal
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
            Officer: <strong>{currentUser?.full_name || currentUser?.username}</strong> ({currentUser?.role})
          </p>
        </div>
        <Link to="/dashboard" className="btn btn-outline">
          Portfolio Dashboard
        </Link>
      </div>

      {message && <AlertBanner type="success" title="Success" message={message} />}
      {error && <AlertBanner type="error" title="Review Error" message={error} />}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(420px, 2fr)', gap: '1.5rem', alignItems: 'flex-start' }}>
        {/* Left Column: Applications Queue */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 className="card-title" style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>
            <Layers size={18} />
            <span>Applications Queue ({applications.length})</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '680px', overflowY: 'auto' }}>
            {applications.map((app) => {
              const isSelected = selectedApp?.id === app.id;
              return (
                <div
                  key={app.id}
                  onClick={() => handleSelectApp(app)}
                  style={{
                    padding: '0.85rem',
                    borderRadius: '8px',
                    border: `1.5px solid ${isSelected ? 'var(--forest-600)' : 'var(--border-subtle)'}`,
                    backgroundColor: isSelected ? 'var(--forest-50)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--forest-900)' }}>
                      {app.application_number}
                    </span>
                    <StatusBadge status={app.status} />
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {app.farmer?.farmer_name} • {app.farmer?.district}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '0.82rem' }}>
                    <span style={{ fontWeight: '600', color: 'var(--forest-800)' }}>
                      {formatINR(app.requested_loan_amount)}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {app.crops?.length || 0} Crops
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Application Review & Decision Form */}
        {selectedApp ? (
          <div>
            {/* Summary Banner of Selected App */}
            <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '6px solid var(--forest-700)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', color: 'var(--forest-900)', margin: '0 0 0.25rem' }}>
                    {selectedApp.farmer?.farmer_name} — {selectedApp.application_number}
                  </h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    District: <strong>{selectedApp.farmer?.district}, {selectedApp.farmer?.state}</strong> • Holding: <strong>{selectedApp.farmer?.total_landholding_acres} Acres</strong>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link to={`/applications/${selectedApp.id}/assessment`} className="btn btn-sm btn-secondary">
                    View Assessment
                  </Link>
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginTop: '1.25rem' }}>
                <div style={{ background: 'var(--bg-surface-subtle)', padding: '0.75rem', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Requested Loan</span>
                  <div style={{ fontWeight: '800', color: 'var(--forest-900)' }}>{formatINR(selectedApp.requested_loan_amount)}</div>
                </div>

                <div style={{ background: 'var(--bg-surface-subtle)', padding: '0.75rem', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DSCR Coverage</span>
                  <div style={{ fontWeight: '800', color: '#15803d' }}>
                    {selectedApp.cashflow_assessment?.debt_service_coverage_ratio !== null
                      ? `${selectedApp.cashflow_assessment?.debt_service_coverage_ratio}x`
                      : 'N/A'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-surface-subtle)', padding: '0.75rem', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ML Risk Tier</span>
                  <div><RiskBadge riskClass={selectedApp.ml_assessment?.predicted_risk_class} /></div>
                </div>

                <div style={{ background: 'var(--bg-surface-subtle)', padding: '0.75rem', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loan Decision</span>
                  <div><LoanDecisionBadge decision={selectedApp.loan_decision} /></div>
                </div>

                <div style={{ background: 'var(--bg-surface-subtle)', padding: '0.75rem', borderRadius: '6px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Status</span>
                  <div><StatusBadge status={selectedApp.status} /></div>
                </div>
              </div>
            </div>

            {/* Officer Human Decision Form */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2 className="card-title">
                <FileCheck2 size={18} />
                <span>Record Human Sanction / Review Decision</span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Credit decisions must be independently reasoned and recorded separately from the automated ML indicator.
              </p>

              <form onSubmit={handleSubmitDecision}>
                <div className="form-group">
                  <label className="form-label">Credit Decision</label>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.6rem 1rem',
                      borderRadius: '8px',
                      border: '1.5px solid #86efac',
                      background: decision === 'SUPPORTED' ? '#dcfce7' : '#ffffff',
                      cursor: 'pointer',
                      fontWeight: '600',
                      color: '#166534',
                    }}>
                      <input
                        type="radio"
                        name="decision"
                        value="SUPPORTED"
                        checked={decision === 'SUPPORTED'}
                        onChange={(e) => setDecision(e.target.value)}
                      />
                      <CheckCircle size={16} /> Support Sanction
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.6rem 1rem',
                      borderRadius: '8px',
                      border: '1.5px solid #fca5a5',
                      background: decision === 'REJECTED' ? '#fee2e2' : '#ffffff',
                      cursor: 'pointer',
                      fontWeight: '600',
                      color: '#991b1b',
                    }}>
                      <input
                        type="radio"
                        name="decision"
                        value="REJECTED"
                        checked={decision === 'REJECTED'}
                        onChange={(e) => setDecision(e.target.value)}
                      />
                      <XCircle size={16} /> Decline Application
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.6rem 1rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      background: decision === 'NOTE_ADDED' ? '#f1f5f9' : '#ffffff',
                      cursor: 'pointer',
                      fontWeight: '600',
                      color: '#334155',
                    }}>
                      <input
                        type="radio"
                        name="decision"
                        value="NOTE_ADDED"
                        checked={decision === 'NOTE_ADDED'}
                        onChange={(e) => setDecision(e.target.value)}
                      />
                      Add Audit Note Only
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Officially Recommended Amount (INR) — Separate from Requested Principal
                  </label>
                  <input
                    type="number"
                    step="1000"
                    className="form-input"
                    value={recommendedAmount}
                    onChange={(e) => setRecommendedAmount(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span className="form-help">
                      Requested: {formatINR(selectedApp.requested_loan_amount)}. Adjust if scale of finance or acreage warrants a modified sanction.
                    </span>
                    {selectedApp.loan_decision?.max_recommended_loan_amount !== null &&
                      selectedApp.loan_decision?.max_recommended_loan_amount !== undefined && (
                        <button
                          type="button"
                          onClick={() => setRecommendedAmount(selectedApp.loan_decision.max_recommended_loan_amount)}
                          className="btn btn-sm btn-outline"
                          style={{ fontSize: '0.78rem', padding: '0.25rem 0.6rem' }}
                        >
                          Use Safe Limit: {formatINR(selectedApp.loan_decision.max_recommended_loan_amount)}
                        </button>
                      )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Credit Officer Notes & Findings <span className="required">*</span>
                  </label>
                  <textarea
                    rows={4}
                    className="form-textarea"
                    placeholder="Document your evaluation of crop yields, field inspection verification, irrigation source, and DSCR buffer..."
                    value={officerNotes}
                    onChange={(e) => setOfficerNotes(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                >
                  {submittingReview ? 'Submitting Review...' : 'Commit Human Review Decision to Audit Trail'}
                </button>
              </form>
            </div>

            {/* Request Additional Information Action */}
            <div className="card">
              <h2 className="card-title">
                <FileQuestion size={18} />
                <span>Request Additional Disclosures or Evidence</span>
              </h2>
              <div className="form-group" style={{ marginTop: '0.75rem' }}>
                <label className="form-label">Specify Required Documents or Clarifications</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sowing certificate signed by Village Agricultural Assistant (VAA), or Patta passbook"
                  value={requestItems}
                  onChange={(e) => setRequestItems(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={handleRequestInformation}
                disabled={submittingReview}
                className="btn btn-secondary"
              >
                Send Information Request to Applicant
              </button>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>No application selected for review.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminReviewPage;
