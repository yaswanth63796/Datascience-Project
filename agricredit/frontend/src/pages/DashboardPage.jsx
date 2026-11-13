import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertOctagon,
  IndianRupee,
  Layers,
  Search,
  PlusCircle,
  Database,
  BarChart3,
  PieChart as PieIcon,
  Eye,
  ExternalLink,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { api } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import RiskBadge from '../components/RiskBadge';
import LoanDecisionBadge from '../components/LoanDecisionBadge';
import { formatINR } from '../components/FormatCurrency';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBanner from '../components/AlertBanner';
import '../styles/dashboard.css';

const PIE_COLORS = ['#2D6A4F', '#52B788', '#F4A261', '#E76F51', '#457B9D', '#64748B'];

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const res = await api.getDashboardSummary();
      setData(res.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to connect to AgriCredit backend. Ensure Flask server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleSeedDemoData = async () => {
    try {
      setSeeding(true);
      const res = await api.seedDemoData();
      setSeedSuccess(res.data.message || 'Demo applications seeded successfully.');
      await fetchSummary();
      setTimeout(() => setSeedSuccess(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Failed to seed demo applications.');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Calculating live agricultural portfolio metrics..." />;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem 0' }}>
        <AlertBanner type="error" title="Backend Connection Error" message={error} />
        <button onClick={fetchSummary} className="btn btn-primary">
          Retry Connection
        </button>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const recentApps = data?.recent_applications || [];
  const cropsSummary = data?.crops_summary || [];
  const statusDist = data?.status_distribution || [];

  // Filter recent applications
  const filteredApps = recentApps.filter((app) => {
    const matchesStatus = statusFilter === 'ALL' || app.status === statusFilter;
    const matchesSearch =
      searchTerm === '' ||
      app.farmer?.farmer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.application_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.farmer?.district?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title-group">
          <h1>Agricultural Loan Portfolio</h1>
          <p>Real-time farm economics, seasonal credit exposure, and assessment monitoring</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={handleSeedDemoData}
            disabled={seeding}
            className="btn btn-outline"
            title="Populate test applications with diverse acreage and crops"
          >
            <Database size={16} />
            <span>{seeding ? 'Seeding...' : 'Seed Demo Data'}</span>
          </button>
          <Link to="/eligibility" className="btn btn-secondary" title="Fast 6-input CCE loan eligibility assessment">
            <Calculator size={18} />
            <span>Loan Eligibility Prediction</span>
          </Link>
          <Link to="/apply" className="btn btn-primary">
            <PlusCircle size={18} />
            <span>New Application</span>
          </Link>
        </div>
      </div>

      {seedSuccess && (
        <AlertBanner type="success" title="Demonstration Data Loaded" message={seedSuccess} />
      )}

      {/* Feature Card: Loan Eligibility Prediction */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, #f2f9f5 0%, #ffffff 100%)',
          border: '1px solid var(--forest-200)',
          padding: '1.25rem 1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'var(--forest-100)',
              color: 'var(--forest-800)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Calculator size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--forest-900)', marginBottom: '0.2rem' }}>
              Agricultural Loan Eligibility Prediction
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>
              Fast screening of farmer eligibility with 6 essential inputs and empirical Crop Cutting Experiment (CCE) benchmarks.
            </p>
          </div>
        </div>
        <Link to="/eligibility" className="btn btn-primary btn-sm">
          <span>Check Eligibility Now</span>
          <ArrowRight size={15} />
        </Link>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Applications</span>
            <div className="metric-icon-box">
              <FileText size={18} />
            </div>
          </div>
          <div className="metric-value">{metrics.total_submitted_applications || 0}</div>
          <div className="metric-subtext">Registered agricultural credit files</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Awaiting Officer Review</span>
            <div className="metric-icon-box" style={{ backgroundColor: '#fff3cd', color: '#856404' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="metric-value">{metrics.awaiting_review || metrics.assessed_pending_officer_action || 0}</div>
          <div className="metric-subtext">Pending field or officer sign-off</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Completed Assessments</span>
            <div className="metric-icon-box" style={{ backgroundColor: '#d1e7dd', color: '#0f5132' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="metric-value">{metrics.completed_assessments || 0}</div>
          <div className="metric-subtext">Evaluated with DSCR & ML indicator</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Insufficient Information</span>
            <div className="metric-icon-box" style={{ backgroundColor: '#f8d7da', color: '#842029' }}>
              <AlertOctagon size={18} />
            </div>
          </div>
          <div className="metric-value">{metrics.insufficient_information || 0}</div>
          <div className="metric-subtext">Missing essential crop revenue data</div>
        </div>

        <div className="metric-card" style={{ gridColumn: 'span 1' }}>
          <div className="metric-header">
            <span className="metric-label">Total Requested Credit</span>
            <div className="metric-icon-box" style={{ backgroundColor: '#d8f3dc', color: 'var(--forest-800)' }}>
              <IndianRupee size={18} />
            </div>
          </div>
          <div className="metric-value" style={{ fontSize: '1.65rem' }}>
            {formatINR(metrics.aggregate_requested_loan_amount || 0)}
          </div>
          <div className="metric-subtext">
            Subsidy Tracked: {formatINR(metrics.total_subsidy_received || 0)} confirmed
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="charts-grid">
        <div className="chart-card">
          <h2 className="chart-title">
            <BarChart3 size={18} />
            <span>Cultivated Crop Acreage Distribution</span>
          </h2>
          {cropsSummary.length > 0 ? (
            <div style={{ height: '260px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cropsSummary} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <XAxis dataKey="crop_name" tick={{ fontSize: 12 }} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => [`${value} Acres`, 'Acreage']} />
                  <Bar dataKey="total_acres" fill="#2D6A4F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No crop distribution data recorded yet.
            </div>
          )}
        </div>

        <div className="chart-card">
          <h2 className="chart-title">
            <PieIcon size={18} />
            <span>Application Status Distribution</span>
          </h2>
          {statusDist.length > 0 ? (
            <div style={{ height: '260px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDist}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {statusDist.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No status distribution available.
            </div>
          )}
        </div>
      </div>

      {/* Applications Table Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">
            <Layers size={20} />
            <span>Recent Agricultural Loan Applications</span>
          </h2>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Showing {filteredApps.length} of {recentApps.length} recent applications
          </span>
        </div>

        {/* Toolbar: Search and Filter */}
        <div className="toolbar-card" style={{ marginBottom: '1.5rem', background: 'var(--bg-surface-subtle)' }}>
          <div className="search-input-wrapper">
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search farmer, district, or application #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="status-filter-buttons">
            {['ALL', 'SUBMITTED', 'ASSESSED', 'REVIEWED_SUPPORTIVE', 'REVIEWED_REJECTED', 'INFORMATION_REQUESTED'].map((st) => (
              <button
                key={st}
                className={`filter-btn ${statusFilter === st ? 'active' : ''}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {filteredApps.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Application Ref</th>
                  <th>Farmer Name</th>
                  <th>District / State</th>
                  <th>Crops & Area</th>
                  <th>Requested Amount</th>
                  <th>DSCR</th>
                  <th>Loan Decision (Can Give?)</th>
                  <th>ML Risk Tier</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredApps.map((app) => {
                  const cf = app.cashflow_assessment;
                  const ml = app.ml_assessment;
                  const cropNames = (app.crops || []).map((c) => c.crop_name).join(', ') || 'N/A';
                  const totalAcreage = (app.crops || []).reduce((acc, c) => acc + (c.cultivated_area_acres || 0), 0);

                  return (
                    <tr key={app.id}>
                      <td>
                        <Link
                          to={`/applications/${app.id}`}
                          style={{ fontWeight: '700', color: 'var(--forest-700)' }}
                        >
                          {app.application_number}
                        </Link>
                      </td>
                      <td style={{ fontWeight: '600' }}>{app.farmer?.farmer_name}</td>
                      <td>
                        {app.farmer?.district}, {app.farmer?.state}
                      </td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{cropNames}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {totalAcreage.toFixed(1)} Acres cultivated
                        </div>
                      </td>
                      <td style={{ fontWeight: '700' }}>
                        {formatINR(app.requested_loan_amount)}
                      </td>
                      <td>
                        {cf?.debt_service_coverage_ratio !== null && cf?.debt_service_coverage_ratio !== undefined ? (
                          <span
                            style={{
                              fontWeight: '700',
                              color: cf.debt_service_coverage_ratio >= 1.25 ? '#15803d' : '#b45309',
                            }}
                          >
                            {cf.debt_service_coverage_ratio}x
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>N/A</span>
                        )}
                      </td>
                      <td>
                        <LoanDecisionBadge decision={app.loan_decision} />
                      </td>
                      <td>
                        <RiskBadge riskClass={ml?.predicted_risk_class} />
                      </td>
                      <td>
                        <StatusBadge status={app.status} />
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <Link
                            to={`/applications/${app.id}`}
                            className="btn btn-sm btn-outline"
                            title="View Full Application Details"
                          >
                            <Eye size={14} />
                          </Link>
                          <Link
                            to={`/applications/${app.id}/assessment`}
                            className="btn btn-sm btn-secondary"
                            title="View Credit Assessment Report"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '3.5rem 1rem', textAlign: 'center' }}>
            <FileText size={36} color="var(--forest-400)" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ color: 'var(--forest-900)', marginBottom: '0.5rem' }}>No Applications Found</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
              No agricultural loan applications match the current filter or search criteria.
            </p>
            <button onClick={handleSeedDemoData} className="btn btn-primary">
              Load Seed Demo Applications
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
