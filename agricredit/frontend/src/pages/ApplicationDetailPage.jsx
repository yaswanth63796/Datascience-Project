import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FileText,
  User,
  Sprout,
  Calendar,
  Landmark,
  IndianRupee,
  Layers,
  History,
  FileCheck2,
  ExternalLink,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
} from 'lucide-react';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import LoanDecisionBadge from '../components/LoanDecisionBadge';
import { formatINR } from '../components/FormatCurrency';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBanner from '../components/AlertBanner';

const ApplicationDetailPage = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState(null);
  const [error, setError] = useState(null);

  // Document upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [docType, setDocType] = useState('land_record');
  const [uploading, setUploading] = useState(false);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const res = await api.getApplication(id);
      setAppData(res.data.application);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch agricultural loan application details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      alert('Please select a file to upload.');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_type', docType);

      await api.uploadDocument(id, formData);
      setUploadFile(null);
      await fetchApplication();
      alert('Document uploaded successfully.');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Document upload failed.');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Retrieving agricultural application details..." />;
  }

  if (error || !appData) {
    return (
      <div style={{ padding: '2rem 0' }}>
        <AlertBanner type="error" title="Not Found" message={error || 'Application does not exist.'} />
        <Link to="/dashboard" className="btn btn-outline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const farmer = appData.farmer || {};
  const crops = appData.crops || [];
  const documents = appData.documents || [];
  const cf = appData.cashflow_assessment;
  const ml = appData.ml_assessment;
  const humanReviews = appData.human_reviews || [];
  const historyEntries = appData.history_entries || [];

  return (
    <div className="application-detail-page">
      {/* Top Header Card */}
      <div className="card" style={{ marginBottom: '1.75rem', borderLeft: '6px solid var(--forest-700)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
              <h1 style={{ fontSize: '1.85rem', color: 'var(--forest-900)', margin: 0 }}>
                {appData.application_number}
              </h1>
              <StatusBadge status={appData.status} />
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Farmer: <strong>{farmer.farmer_name}</strong> • Location: <strong>{farmer.district}, {farmer.state}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Link to={`/applications/${id}/assessment`} className="btn btn-primary">
              <FileCheck2 size={16} />
              <span>View Credit Assessment</span>
            </Link>
            <Link to="/admin" className="btn btn-outline">
              <span>Admin Decision</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Loan Eligibility Decision Card */}
      {appData.loan_decision && (
        <div
          className="card"
          style={{
            marginBottom: '1.75rem',
            background:
              appData.loan_decision.can_give_loan === 'YES'
                ? '#f0fdf4'
                : appData.loan_decision.can_give_loan === 'NO'
                ? '#fef2f2'
                : appData.loan_decision.can_give_loan === 'CONDITIONAL'
                ? '#fffbeb'
                : '#f8fafc',
            border: `1.5px solid ${
              appData.loan_decision.can_give_loan === 'YES'
                ? '#86efac'
                : appData.loan_decision.can_give_loan === 'NO'
                ? '#fca5a5'
                : appData.loan_decision.can_give_loan === 'CONDITIONAL'
                ? '#fde68a'
                : '#cbd5e1'
            }`,
            padding: '1.25rem 1.5rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: '750', marginBottom: '0.25rem' }}>
                Automated Credit Assessment Sanction Verdict
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <LoanDecisionBadge decision={appData.loan_decision} showMaxAmount={false} />
                <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  {appData.loan_decision.headline}
                </span>
              </div>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {appData.loan_decision.verdict_summary}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ textAlign: 'right', background: '#ffffff', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600' }}>Max Supportable Limit</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--forest-800)' }}>
                  {appData.loan_decision.max_recommended_loan_amount !== null
                    ? formatINR(appData.loan_decision.max_recommended_loan_amount)
                    : 'N/A'}
                </div>
              </div>
              <Link to={`/applications/${id}/assessment`} className="btn btn-sm btn-secondary">
                Detailed Analysis →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Farmer Profile & Loan Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
        {/* Farmer Profile */}
        <div className="card">
          <h2 className="card-title">
            <User size={18} />
            <span>Farmer & Landholding Profile</span>
          </h2>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Full Name:</span>
            <strong>{farmer.farmer_name}</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>District & State:</span>
            <strong>{farmer.district}, {farmer.state}</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Farming Experience:</span>
            <strong>{farmer.farming_experience_years} Years</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Land Ownership:</span>
            <strong style={{ textTransform: 'capitalize' }}>{farmer.land_ownership}</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Total Landholding:</span>
            <strong>{farmer.total_landholding_acres} Acres</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Active Season Cultivation:</span>
            <strong>{farmer.cultivated_land_current_season_acres} Acres</strong>
          </div>
        </div>

        {/* Loan Request Details */}
        <div className="card">
          <h2 className="card-title">
            <IndianRupee size={18} />
            <span>Loan Facility & Debt Profile</span>
          </h2>
          <div className="metric-row highlight">
            <span>Requested Loan Amount:</span>
            <span style={{ fontSize: '1.15rem', color: 'var(--forest-800)' }}>
              {formatINR(appData.requested_loan_amount)}
            </span>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Purpose:</span>
            <strong style={{ textTransform: 'capitalize' }}>{appData.loan_purpose.replace('_', ' ')}</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Tenure & Frequency:</span>
            <strong>{appData.requested_loan_tenure_months} Months ({appData.repayment_frequency})</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Previous Credit History:</span>
            <strong style={{ textTransform: 'capitalize' }}>{appData.previous_loan_history.replace('_', ' ')}</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Existing Debt Burden:</span>
            <strong>{formatINR(appData.existing_outstanding_debt)}</strong>
          </div>
          <div className="metric-row">
            <span style={{ color: 'var(--text-secondary)' }}>Existing Periodic Installment:</span>
            <strong>{formatINR(appData.existing_periodic_repayment)}</strong>
          </div>
        </div>
      </div>

      {/* Multi-Crop Cultivation Economics Breakdown */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <h2 className="card-title">
          <Sprout size={18} />
          <span>Multi-Crop Cultivation Economics</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1rem' }}>
          Breakdown of expected yields, gross harvest revenues, and itemized cultivation input expenses.
        </p>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Crop & Season</th>
                <th>Area</th>
                <th>Expected Yield</th>
                <th>Price / Unit</th>
                <th>Cultivation Costs Breakdown</th>
                <th>Gross Revenue</th>
                <th>Estimated Surplus</th>
              </tr>
            </thead>
            <tbody>
              {crops.map((c) => {
                const totalCost = (c.seed_cost || 0) + (c.fertilizer_cost || 0) + (c.pesticide_cost || 0) + (c.labour_cost || 0) + (c.irrigation_cost || 0) + (c.machinery_cost || 0) + (c.other_cost || 0);
                const gross = (c.cultivated_area_acres || 0) * (c.expected_yield_per_acre || 0) * (c.expected_price_per_yield_unit || 0) * (c.cycles_count || 1);
                const surplus = gross - totalCost;

                return (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.crop_name}</strong>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.season}</div>
                    </td>
                    <td>{c.cultivated_area_acres} Acres</td>
                    <td>
                      {c.expected_yield_per_acre} {c.yield_unit}/acre
                    </td>
                    <td>{formatINR(c.expected_price_per_yield_unit)}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Seeds: {formatINR(c.seed_cost)} | Fert: {formatINR(c.fertilizer_cost)} | Labour: {formatINR(c.labour_cost)} | Mach: {formatINR(c.machinery_cost)} | Irrig: {formatINR(c.irrigation_cost)}
                      <div style={{ fontWeight: '600', color: 'var(--forest-900)', marginTop: '2px' }}>
                        Total Cost: {formatINR(totalCost)}
                      </div>
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--forest-800)' }}>
                      {formatINR(gross)}
                    </td>
                    <td style={{ fontWeight: '700', color: surplus >= 0 ? '#15803d' : '#b91c1c' }}>
                      {formatINR(surplus)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Subsidies Breakdown */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <h2 className="card-title">
          <Landmark size={18} />
          <span>Agricultural Subsidy Accounting</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginTop: '1rem' }}>
          <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
            <span style={{ fontSize: '0.8rem', color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Confirmed Cash Received</span>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#166534', marginTop: '0.25rem' }}>
              {formatINR(appData.subsidy_received)}
            </div>
            <span style={{ fontSize: '0.78rem', color: '#15803d' }}>Counted in liquid seasonal cash flow</span>
          </div>

          <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '8px', border: '1px solid #fde68a' }}>
            <span style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: '700', textTransform: 'uppercase' }}>Approved Pending Disbursement</span>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#92400e', marginTop: '0.25rem' }}>
              {formatINR(appData.subsidy_pending_approved)}
            </div>
            <span style={{ fontSize: '0.78rem', color: '#b45309' }}>Tracked as contingent buffer</span>
          </div>

          <div style={{ background: '#fef2f2', padding: '1rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
            <span style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: '700', textTransform: 'uppercase' }}>Applied-For (Unapproved)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#991b1b', marginTop: '0.25rem' }}>
              {formatINR(appData.subsidy_applied_unapproved)}
            </div>
            <span style={{ fontSize: '0.78rem', color: '#b91c1c' }}>Excluded from guaranteed cash flow</span>
          </div>
        </div>
      </div>

      {/* Supporting Documents & Verification Evidence */}
      <div className="card" style={{ marginBottom: '1.75rem' }}>
        <h2 className="card-title">
          <Upload size={18} />
          <span>Supporting Documents & Verification Evidence</span>
        </h2>

        {documents.length > 0 ? (
          <div className="table-container" style={{ margin: '1rem 0' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Document Name</th>
                  <th>File Size</th>
                  <th>Verification Status</th>
                  <th>Download</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: '600' }}>{doc.document_type.replace('_', ' ')}</td>
                    <td>{doc.original_filename}</td>
                    <td>{(doc.file_size_bytes / 1024).toFixed(1)} KB</td>
                    <td>
                      {doc.is_verified ? (
                        <span className="badge badge-supportive">
                          <CheckCircle2 size={12} /> Verified
                        </span>
                      ) : (
                        <span className="badge badge-insufficient">
                          Pending Field Verification
                        </span>
                      )}
                    </td>
                    <td>
                      <a
                        href={api.getDocumentDownloadUrl(appData.id, doc.id)}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-sm btn-outline"
                      >
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '1rem 0' }}>
            No documents uploaded yet.
          </p>
        )}

        {/* Upload Form */}
        <form onSubmit={handleDocumentUpload} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', marginTop: '1rem' }}>
          <div style={{ minWidth: '200px' }}>
            <label className="form-label">Attach Additional Evidence</label>
            <select
              className="form-select"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
            >
              <option value="land_record">Land Ownership (Patta / 7-12)</option>
              <option value="crop_record">Crop / Sowing Certificate</option>
              <option value="subsidy_receipt">Subsidy Sanction Order</option>
              <option value="repayment_record">Prior Bank Repayment Record</option>
              <option value="other">Other Agricultural Record</option>
            </select>
          </div>
          <div>
            <input
              type="file"
              className="form-input"
              accept=".pdf,.png,.jpg,.jpeg,.csv,.txt"
              onChange={(e) => setUploadFile(e.target.files[0] || null)}
            />
          </div>
          <button type="submit" disabled={uploading} className="btn btn-secondary">
            {uploading ? 'Uploading...' : 'Upload File'}
          </button>
        </form>
      </div>

      {/* Human Review Notes & History */}
      <div className="card">
        <h2 className="card-title">
          <History size={18} />
          <span>Audit Trail & Human Review Decisions</span>
        </h2>

        {humanReviews.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--forest-900)', marginBottom: '0.75rem' }}>Credit Officer Decisions</h3>
            {humanReviews.map((rev) => (
              <div key={rev.id} style={{ background: 'var(--forest-50)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--forest-200)', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <strong>{rev.officer_name}</strong>
                  <span className="badge badge-review">{rev.review_decision}</span>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', margin: '0.25rem 0' }}>{rev.officer_notes}</p>
                {rev.recommended_loan_amount && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--forest-800)', fontWeight: '600' }}>
                    Recommended Amount: {formatINR(rev.recommended_loan_amount)}
                  </p>
                )}
                {rev.requested_additional_information && (
                  <p style={{ fontSize: '0.82rem', color: '#b45309' }}>
                    Requested info: {rev.requested_additional_information}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <h3 style={{ fontSize: '1rem', color: 'var(--forest-900)', marginBottom: '0.75rem' }}>System Event History</h3>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Action</th>
                <th>Logged By</th>
                <th>Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {historyEntries.map((h) => (
                <tr key={h.id}>
                  <td style={{ fontWeight: '600' }}>{h.action}</td>
                  <td>{h.performed_by}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{h.details}</td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{h.created_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetailPage;
