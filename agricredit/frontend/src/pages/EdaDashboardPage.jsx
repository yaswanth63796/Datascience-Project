import React, { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';
import {
  BarChart3,
  RefreshCw,
  AlertCircle,
  Wheat,
  Coins,
  Scale,
  Sprout,
  CheckCircle2,
  Activity,
  TrendingUp,
  FileSpreadsheet,
  Filter,
  Info,
  Database,
  SlidersHorizontal,
} from 'lucide-react';
import { api } from '../api/client';
import '../styles/eda-dashboard.css';

// Chart color palette aligned with AgriCredit theme
const COLORS = {
  forestDark: '#1b4332',
  forestMain: '#2d6a4f',
  forestLight: '#52b788',
  forestSoft: '#74c69d',
  wheatGold: '#e9c46a',
  harvestAmber: '#f4a261',
  terracotta: '#e76f51',
  clayBrown: '#6b4c35',
  slateDark: '#1e293b',
  riskLow: '#2d6a4f',
  riskHigh: '#e76f51',
};

const PIE_COLORS = ['#2d6a4f', '#e76f51', '#e9c46a', '#52b788', '#f4a261', '#3b82f6'];

// Custom Tooltip for Recharts
const CustomChartTooltip = ({ active, payload, label, unit = '', prefix = '' }) => {
  if (active && payload && payload.length) {
    return (
      <div className="eda-custom-tooltip">
        {label && <div className="eda-tooltip-title">{label}</div>}
        {payload.map((entry, index) => (
          <div key={`tooltip-${index}`} className="eda-tooltip-row">
            <span className="eda-tooltip-label" style={{ color: entry.color || '#cbd5cb' }}>
              {entry.name || 'Value'}:
            </span>
            <span className="eda-tooltip-val">
              {prefix}
              {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}{' '}
              {unit}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Custom Scatter Tooltip
const ScatterCustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="eda-custom-tooltip">
        <div className="eda-tooltip-title">
          {data.crop} ({data.season})
        </div>
        <div className="eda-tooltip-row">
          <span className="eda-tooltip-label">Cultivated Area:</span>
          <span className="eda-tooltip-val">{data.cultivated_area} Acres</span>
        </div>
        <div className="eda-tooltip-row">
          <span className="eda-tooltip-label">Requested Loan:</span>
          <span className="eda-tooltip-val">₹{data.loan_amount?.toLocaleString()}</span>
        </div>
        <div className="eda-tooltip-row">
          <span className="eda-tooltip-label">Risk Category:</span>
          <span
            className="eda-tooltip-val"
            style={{ color: data.risk_flag === 1 ? '#f87171' : '#86efac' }}
          >
            {data.risk_flag === 1 ? 'High Risk / Distress' : 'Low Risk / Timely'}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const EdaDashboardPage = () => {
  // Filters & State
  const [selectedSource, setSelectedSource] = useState('benchmark');
  const [selectedCrop, setSelectedCrop] = useState('all');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [revenueMetricView, setRevenueMetricView] = useState('financial'); // 'financial' or 'yield'

  // Data State
  const [overview, setOverview] = useState(null);
  const [distributions, setDistributions] = useState(null);
  const [correlation, setCorrelation] = useState(null);
  const [missingValues, setMissingValues] = useState(null);
  const [numericalSummary, setNumericalSummary] = useState(null);
  const [filterOptions, setFilterOptions] = useState({ crops: [], seasons: [], data_sources: [] });

  // UI state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());
  const [activeHeatmapCell, setActiveHeatmapCell] = useState(null);

  // Load filter options once or when source changes
  const loadFilters = useCallback(async () => {
    try {
      const res = await api.getEdaFilters({ source: selectedSource });
      if (res.data) {
        setFilterOptions(res.data);
      }
    } catch (err) {
      console.warn('Failed to load filter options:', err);
    }
  }, [selectedSource]);

  // Load all dashboard analytics
  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const params = {
      source: selectedSource,
      crop: selectedCrop !== 'all' ? selectedCrop : undefined,
      season: selectedSeason !== 'all' ? selectedSeason : undefined,
    };

    try {
      const [ovRes, distRes, corrRes, missRes, numRes] = await Promise.all([
        api.getEdaOverview(params),
        api.getEdaDistributions(params),
        api.getEdaCorrelation(params),
        api.getEdaMissingValues({ source: selectedSource }),
        api.getEdaNumericalSummary(params),
      ]);

      setOverview(ovRes.data);
      setDistributions(distRes.data);
      setCorrelation(corrRes.data);
      setMissingValues(missRes.data);
      setNumericalSummary(numRes.data);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching EDA dashboard analytics:', err);
      setError(
        err.response?.data?.error ||
          'Failed to connect to AgriCredit analytics API. Please ensure the backend server is running.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSource, selectedCrop, selectedSeason]);

  // Initialize
  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleResetFilters = () => {
    setSelectedCrop('all');
    setSelectedSeason('all');
  };

  // Color generator for heatmap cell
  const getHeatmapColor = (value) => {
    if (value === undefined || value === null) return '#f1f5f2';
    // Value is from -1.0 to +1.0
    if (value > 0.6) return '#1b4332';
    if (value > 0.35) return '#2d6a4f';
    if (value > 0.15) return '#52b788';
    if (value > 0.05) return '#b7e4c7';
    if (value >= -0.05) return '#f1f5f2';
    if (value >= -0.2) return '#fde68a';
    if (value >= -0.45) return '#f4a261';
    return '#e76f51';
  };

  const getHeatmapTextColor = (value) => {
    if (value === undefined || value === null) return '#14241b';
    if (value > 0.35 || value < -0.45) return '#ffffff';
    return '#14241b';
  };

  return (
    <div className="eda-dashboard-page">
      {/* -------------------------------------------------------------
          Header Section
          ------------------------------------------------------------- */}
      <header className="eda-header">
        <div className="eda-header-left">
          <div className="eda-badge-row">
            <span
              className={`eda-badge ${
                selectedSource === 'benchmark' ? 'eda-badge-benchmark' : 'eda-badge-database'
              }`}
            >
              <Database size={13} />
              {selectedSource === 'benchmark'
                ? 'Agro-Economic Benchmark Dataset'
                : 'Live Database Applications'}
            </span>
            {overview?.meta?.is_synthetic && (
              <span className="eda-badge eda-badge-synthetic">
                <Info size={13} />
                Empirically Grounded Synthetic Data (NABARD / KCC Norms)
              </span>
            )}
          </div>
          <h1 className="eda-page-title">Exploratory Data Analysis (EDA) Dashboard</h1>
          <p className="eda-page-subtitle">
            Comprehensive statistical analysis of agricultural loan applications, crop-level
            economics, capital distributions, and repayment risk correlations.
          </p>
        </div>

        <div className="eda-header-actions">
          <button
            onClick={() => fetchDashboardData(true)}
            className="btn-refresh"
            disabled={loading || refreshing}
            title="Reload analysis"
          >
            <RefreshCw size={16} className={refreshing ? 'spin-icon' : ''} />
            <span>{refreshing ? 'Recalculating...' : 'Refresh Analytics'}</span>
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------
          Filter Controls Bar
          ------------------------------------------------------------- */}
      <section className="eda-filters-card">
        <div className="eda-filters-content">
          <div className="eda-filters-group">
            <div className="eda-filter-label-group">
              <Filter size={15} />
              <span>Filters</span>
            </div>

            {/* Data Source Selector */}
            <div className="eda-filter-item">
              <span>Source:</span>
              <select
                className="eda-select"
                value={selectedSource}
                onChange={(e) => {
                  setSelectedSource(e.target.value);
                  setSelectedCrop('all');
                  setSelectedSeason('all');
                }}
              >
                <option value="benchmark">Benchmark Dataset (3,000 Records)</option>
                <option value="database">Live Bank Applications (DB)</option>
              </select>
            </div>

            {/* Crop Filter */}
            <div className="eda-filter-item">
              <span>Crop:</span>
              <select
                className="eda-select"
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
              >
                <option value="all">All Crops ({filterOptions.crops?.length || 0})</option>
                {filterOptions.crops?.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Season Filter */}
            <div className="eda-filter-item">
              <span>Season:</span>
              <select
                className="eda-select"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
              >
                <option value="all">All Seasons</option>
                {filterOptions.seasons?.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {(selectedCrop !== 'all' || selectedSeason !== 'all') && (
              <button onClick={handleResetFilters} className="btn-reset-filters">
                Reset Filters
              </button>
            )}
          </div>

          <div className="eda-data-status-info">
            {overview?.meta?.filtered_records !== undefined && (
              <span>
                Analyzing <strong>{overview.meta.filtered_records.toLocaleString()}</strong> of{' '}
                <strong>{overview.meta.total_unfiltered_records?.toLocaleString()}</strong> total
                records • Refreshed at {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="eda-error-banner">
          <div className="eda-error-content">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button onClick={() => fetchDashboardData(true)} className="btn-refresh">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="eda-loading-container">
          <RefreshCw size={36} className="spin-icon" color="#2d6a4f" />
          <div className="eda-loading-text">
            Crunching agro-economic statistics & compiling interactive charts...
          </div>
        </div>
      ) : (
        <>
          {/* =============================================================
              SECTION A: Dataset Overview Summary Cards
              ============================================================= */}
          <section className="eda-overview-section">
            <div className="eda-overview-grid">
              {/* Total Applications */}
              <div className="eda-stat-card">
                <div className="eda-stat-icon">
                  <FileSpreadsheet size={24} />
                </div>
                <div className="eda-stat-content">
                  <span className="eda-stat-label">Loan Applications</span>
                  <span className="eda-stat-value">
                    {overview?.total_applications?.toLocaleString() || 0}
                  </span>
                  <span className="eda-stat-subtext">Configured evaluation records</span>
                </div>
              </div>

              {/* Total Crop Types */}
              <div className="eda-stat-card">
                <div className="eda-stat-icon">
                  <Wheat size={24} />
                </div>
                <div className="eda-stat-content">
                  <span className="eda-stat-label">Crop Types</span>
                  <span className="eda-stat-value">{overview?.total_crops || 0}</span>
                  <span className="eda-stat-subtext">Agro-climatic crop profiles</span>
                </div>
              </div>

              {/* Average Requested Loan Amount */}
              <div className="eda-stat-card">
                <div className="eda-stat-icon">
                  <Coins size={24} />
                </div>
                <div className="eda-stat-content">
                  <span className="eda-stat-label">Avg Requested Loan</span>
                  <span className="eda-stat-value">
                    ₹{overview?.avg_loan_amount ? Math.round(overview.avg_loan_amount).toLocaleString() : 0}
                  </span>
                  <span className="eda-stat-subtext">Per applicant credit demand</span>
                </div>
              </div>

              {/* Average Cultivated Land Area */}
              <div className="eda-stat-card">
                <div className="eda-stat-icon">
                  <Scale size={24} />
                </div>
                <div className="eda-stat-content">
                  <span className="eda-stat-label">Avg Cultivated Area</span>
                  <span className="eda-stat-value">
                    {overview?.avg_cultivated_area ? overview.avg_cultivated_area.toFixed(2) : '0.00'}{' '}
                    <small style={{ fontSize: '0.85rem' }}>Acres</small>
                  </span>
                  <span className="eda-stat-subtext">Current season operational land</span>
                </div>
              </div>

              {/* Average Expected Crop Yield */}
              <div className="eda-stat-card">
                <div className="eda-stat-icon">
                  <Sprout size={24} />
                </div>
                <div className="eda-stat-content">
                  <span className="eda-stat-label">Avg Expected Yield</span>
                  <span className="eda-stat-value">
                    {overview?.yield_available && overview?.avg_expected_yield !== null ? (
                      <>
                        {overview.avg_expected_yield.toFixed(1)}{' '}
                        <small style={{ fontSize: '0.8rem' }}>Qtl/Acre</small>
                      </>
                    ) : (
                      <span style={{ fontSize: '1.05rem', color: '#94a3b8' }}>N/A (Derived)</span>
                    )}
                  </span>
                  <span className="eda-stat-subtext">Quintals per operational acre</span>
                </div>
              </div>

              {/* Missing Values Count */}
              <div className="eda-stat-card">
                <div className="eda-stat-icon">
                  <CheckCircle2 size={24} />
                </div>
                <div className="eda-stat-content">
                  <span className="eda-stat-label">Missing Values</span>
                  <span
                    className="eda-stat-value"
                    style={{
                      color: overview?.missing_values_count > 0 ? '#b91c1c' : '#15803d',
                    }}
                  >
                    {overview?.missing_values_count || 0}
                  </span>
                  <span className="eda-stat-subtext">
                    {overview?.missing_values_count === 0
                      ? '100% Complete Dataset'
                      : 'Null cells detected'}
                  </span>
                </div>
              </div>

              {/* Outliers Flagged (IQR) */}
              <div className="eda-stat-card">
                <div className="eda-stat-icon">
                  <Activity size={24} />
                </div>
                <div className="eda-stat-content">
                  <span className="eda-stat-label">IQR Outliers</span>
                  <span className="eda-stat-value">{overview?.outliers_count || 0}</span>
                  <span className="eda-stat-subtext">
                    {overview?.outliers_percentage || 0}% of records flagged
                  </span>
                </div>
              </div>

              {/* Distress Risk Benchmark Rate */}
              <div className="eda-stat-card">
                <div className="eda-stat-icon">
                  <TrendingUp size={24} />
                </div>
                <div className="eda-stat-content">
                  <span className="eda-stat-label">Distress Rate</span>
                  <span className="eda-stat-value">
                    {overview?.eligibility_summary?.distress_rate !== undefined
                      ? `${overview.eligibility_summary.distress_rate}%`
                      : 'N/A'}
                  </span>
                  <span className="eda-stat-subtext">
                    {overview?.eligibility_summary?.low_risk_rate !== undefined
                      ? `${overview.eligibility_summary.low_risk_rate}% Low Risk / Eligible`
                      : 'Outcome benchmark'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* =============================================================
              SECTION B: 10 Interactive Data Distribution Charts
              ============================================================= */}
          <div className="eda-section-header">
            <div>
              <h2 className="eda-section-title">
                <BarChart3 size={22} />
                Data Distribution & Exploratory Visualizations
              </h2>
              <p className="eda-section-desc">
                Interactive distributions across agronomic profiles, capital requests, operational
                acreage, yield performance, and repayment outcomes.
              </p>
            </div>
          </div>

          <div className="eda-charts-grid">
            {/* 1. Crop Type Distribution — Bar Chart */}
            <div className="eda-chart-card">
              <div className="eda-chart-header">
                <div>
                  <h3 className="eda-chart-title">1. Crop Type Distribution</h3>
                  <p className="eda-chart-subtitle">
                    Application frequency and representation across agricultural crops
                  </p>
                </div>
                <span className="eda-chart-badge">Bar Chart</span>
              </div>
              <div className="eda-chart-container">
                {distributions?.crop_distribution?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={distributions.crop_distribution}
                      margin={{ top: 10, right: 15, left: 0, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e0" />
                      <XAxis
                        dataKey="crop"
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 11, fill: '#475569' }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip
                        content={<CustomChartTooltip unit="Applications" />}
                      />
                      <Bar
                        dataKey="count"
                        name="Applications"
                        fill={COLORS.forestMain}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="eda-empty-state">
                    <Wheat size={32} className="eda-empty-icon" />
                    <div className="eda-empty-title">No Crop Data Available</div>
                    <div className="eda-empty-desc">
                      No applications found matching the selected filter criteria.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Requested Loan Amount Distribution — Histogram */}
            <div className="eda-chart-card">
              <div className="eda-chart-header">
                <div>
                  <h3 className="eda-chart-title">2. Requested Loan Amount Distribution</h3>
                  <p className="eda-chart-subtitle">
                    Credit capital demand binned from minimum to maximum loan size
                  </p>
                </div>
                <span className="eda-chart-badge">Histogram</span>
              </div>
              <div className="eda-chart-container">
                {distributions?.loan_amount_distribution?.bins?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={distributions.loan_amount_distribution.bins}
                      margin={{ top: 10, right: 15, left: 0, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e0" />
                      <XAxis
                        dataKey="bin_label"
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 10, fill: '#475569' }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip
                        content={<CustomChartTooltip unit="Applications" />}
                      />
                      <Bar
                        dataKey="count"
                        name="Applications"
                        fill={COLORS.forestLight}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="eda-empty-state">
                    <Coins size={32} className="eda-empty-icon" />
                    <div className="eda-empty-title">No Loan Data Available</div>
                    <div className="eda-empty-desc">
                      Loan amount records not found in current dataset filter.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 3. Cultivated Land Area Distribution — Histogram */}
            <div className="eda-chart-card">
              <div className="eda-chart-header">
                <div>
                  <h3 className="eda-chart-title">3. Cultivated Land Area Distribution</h3>
                  <p className="eda-chart-subtitle">
                    Operational landholding distribution in acres per applicant
                  </p>
                </div>
                <span className="eda-chart-badge">Histogram (Acres)</span>
              </div>
              <div className="eda-chart-container">
                {distributions?.cultivated_area_distribution?.bins?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={distributions.cultivated_area_distribution.bins}
                      margin={{ top: 10, right: 15, left: 0, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e0" />
                      <XAxis
                        dataKey="bin_label"
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 10, fill: '#475569' }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip
                        content={<CustomChartTooltip unit="Applications" />}
                      />
                      <Bar
                        dataKey="count"
                        name="Applications"
                        fill={COLORS.harvestAmber}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="eda-empty-state">
                    <Scale size={32} className="eda-empty-icon" />
                    <div className="eda-empty-title">No Acreage Data Available</div>
                    <div className="eda-empty-desc">
                      Cultivated land area values are missing in this dataset subset.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 4. Expected Crop Yield Distribution — Histogram */}
            <div className="eda-chart-card">
              <div className="eda-chart-header">
                <div>
                  <h3 className="eda-chart-title">4. Expected Crop Yield Distribution</h3>
                  <p className="eda-chart-subtitle">
                    Agronomic expected productivity in <strong>Quintals per Acre</strong>
                  </p>
                </div>
                <span className="eda-chart-badge">Histogram (Qtl/Acre)</span>
              </div>
              <div className="eda-chart-container">
                {distributions?.expected_yield_distribution?.available &&
                distributions?.expected_yield_distribution?.bins?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={distributions.expected_yield_distribution.bins}
                      margin={{ top: 10, right: 15, left: 0, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e0" />
                      <XAxis
                        dataKey="bin_label"
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 10, fill: '#475569' }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip
                        content={<CustomChartTooltip unit="Applications" />}
                      />
                      <Bar
                        dataKey="count"
                        name="Applications"
                        fill={COLORS.wheatGold}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="eda-empty-state">
                    <Sprout size={32} className="eda-empty-icon" />
                    <div className="eda-empty-title">Yield Field Not Recorded Directly</div>
                    <div className="eda-empty-desc">
                      {distributions?.expected_yield_distribution?.explanation ||
                        'Expected yield per acre is not available as a direct column in this view.'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Crop-wise Average Loan Amount — Bar Chart */}
            <div className="eda-chart-card">
              <div className="eda-chart-header">
                <div>
                  <h3 className="eda-chart-title">5. Crop-wise Average Loan Amount</h3>
                  <p className="eda-chart-subtitle">
                    Scale of finance comparison across crop types (Average vs Median)
                  </p>
                </div>
                <span className="eda-chart-badge">Bar Chart (₹)</span>
              </div>
              <div className="eda-chart-container">
                {distributions?.crop_wise_loan_amount?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={distributions.crop_wise_loan_amount}
                      margin={{ top: 10, right: 15, left: 10, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e0" />
                      <XAxis
                        dataKey="crop"
                        angle={-25}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 11, fill: '#475569' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#475569' }}
                        tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${v / 1000}k`}`}
                      />
                      <Tooltip
                        content={<CustomChartTooltip prefix="₹" />}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar
                        dataKey="avg_loan"
                        name="Average Loan (₹)"
                        fill={COLORS.forestDark}
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="median_loan"
                        name="Median Loan (₹)"
                        fill={COLORS.wheatGold}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="eda-empty-state">
                    <Coins size={32} className="eda-empty-icon" />
                    <div className="eda-empty-title">No Crop-Loan Data</div>
                    <div className="eda-empty-desc">
                      Cannot calculate crop-wise loan averages.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 6. Loan Amount vs Cultivated Area — Scatter Plot */}
            <div className="eda-chart-card">
              <div className="eda-chart-header">
                <div>
                  <h3 className="eda-chart-title">6. Loan Amount vs Cultivated Area</h3>
                  <p className="eda-chart-subtitle">
                    Credit request correlation with cultivated acreage (colored by risk outcome)
                  </p>
                </div>
                <span className="eda-chart-badge">Scatter Plot</span>
              </div>
              <div className="eda-chart-container">
                {distributions?.loan_vs_cultivated_area?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart
                      margin={{ top: 15, right: 20, bottom: 20, left: 15 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e0" />
                      <XAxis
                        type="number"
                        dataKey="cultivated_area"
                        name="Cultivated Area"
                        unit=" ac"
                        tick={{ fontSize: 11, fill: '#475569' }}
                        label={{
                          value: 'Cultivated Land Area (Acres)',
                          position: 'insideBottom',
                          offset: -10,
                          fontSize: 11,
                          fill: '#64748b',
                        }}
                      />
                      <YAxis
                        type="number"
                        dataKey="loan_amount"
                        name="Loan Amount"
                        unit=" ₹"
                        tick={{ fontSize: 11, fill: '#475569' }}
                        tickFormatter={(v) => `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${v / 1000}k`}`}
                      />
                      <ZAxis range={[25, 25]} />
                      <Tooltip content={<ScatterCustomTooltip />} />
                      <Legend verticalAlign="top" height={36} />
                      <Scatter
                        name="Low Risk / Eligible"
                        data={distributions.loan_vs_cultivated_area.filter(
                          (p) => p.risk_flag === 0
                        )}
                        fill={COLORS.riskLow}
                        opacity={0.8}
                      />
                      <Scatter
                        name="Elevated Risk / Distress"
                        data={distributions.loan_vs_cultivated_area.filter(
                          (p) => p.risk_flag === 1
                        )}
                        fill={COLORS.riskHigh}
                        opacity={0.8}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="eda-empty-state">
                    <Scale size={32} className="eda-empty-icon" />
                    <div className="eda-empty-title">Insufficient Scatter Data</div>
                    <div className="eda-empty-desc">
                      Cannot plot loan vs cultivated area points.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 7. Crop-wise Revenue or Yield Comparison — Grouped Bar Chart */}
            <div className="eda-chart-card eda-chart-card-full">
              <div className="eda-chart-header">
                <div>
                  <h3 className="eda-chart-title">
                    7. Crop-wise Agricultural Economics & Yield Comparison
                  </h3>
                  <p className="eda-chart-subtitle">
                    Comparative seasonal revenue, cultivation costs, net surplus, and average yields
                    per crop
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setRevenueMetricView('financial')}
                    className="eda-chart-badge"
                    style={{
                      cursor: 'pointer',
                      background: revenueMetricView === 'financial' ? '#1b4332' : '#f1f5f2',
                      color: revenueMetricView === 'financial' ? '#ffffff' : '#475569',
                    }}
                  >
                    Financials (₹)
                  </button>
                  <button
                    onClick={() => setRevenueMetricView('yield')}
                    className="eda-chart-badge"
                    style={{
                      cursor: 'pointer',
                      background: revenueMetricView === 'yield' ? '#1b4332' : '#f1f5f2',
                      color: revenueMetricView === 'yield' ? '#ffffff' : '#475569',
                    }}
                  >
                    Average Yield (Qtl/Ac)
                  </button>
                </div>
              </div>
              <div className="eda-chart-container eda-chart-container-tall">
                {distributions?.crop_wise_revenue_or_yield?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={distributions.crop_wise_revenue_or_yield}
                      margin={{ top: 15, right: 20, left: 20, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e0" />
                      <XAxis
                        dataKey="crop"
                        tick={{ fontSize: 11, fill: '#475569' }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#475569' }}
                        tickFormatter={(v) =>
                          revenueMetricView === 'financial'
                            ? `₹${v >= 100000 ? `${(v / 100000).toFixed(1)}L` : `${v / 1000}k`}`
                            : `${v} Qtl`
                        }
                      />
                      <Tooltip
                        content={
                          <CustomChartTooltip
                            prefix={revenueMetricView === 'financial' ? '₹' : ''}
                            unit={revenueMetricView === 'yield' ? 'Qtl/Acre' : ''}
                          />
                        }
                      />
                      <Legend verticalAlign="top" height={36} />
                      {revenueMetricView === 'financial' ? (
                        <>
                          <Bar
                            dataKey="avg_revenue"
                            name="Avg Seasonal Revenue (₹)"
                            fill={COLORS.forestMain}
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="avg_cost"
                            name="Avg Cultivation Expenses (₹)"
                            fill={COLORS.terracotta}
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar
                            dataKey="avg_surplus"
                            name="Avg Estimated Surplus (₹)"
                            fill={COLORS.forestLight}
                            radius={[4, 4, 0, 0]}
                          />
                        </>
                      ) : (
                        <Bar
                          dataKey="avg_yield"
                          name="Avg Expected Yield (Quintals/Acre)"
                          fill={COLORS.wheatGold}
                          radius={[4, 4, 0, 0]}
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="eda-empty-state">
                    <Wheat size={32} className="eda-empty-icon" />
                    <div className="eda-empty-title">No Comparison Data</div>
                    <div className="eda-empty-desc">
                      Agricultural financial measures are not available in current dataset.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 8. Correlation Heatmap */}
            <div className="eda-chart-card eda-chart-card-full">
              <div className="eda-chart-header">
                <div>
                  <h3 className="eda-chart-title">8. Numerical Feature Correlation Heatmap</h3>
                  <p className="eda-chart-subtitle">
                    Pearson correlation coefficients across financial obligations, land area,
                    revenues, and risk drivers (-1.00 to +1.00)
                  </p>
                </div>
                <span className="eda-chart-badge">Correlation Matrix</span>
              </div>

              {correlation?.features?.length > 1 ? (
                <div className="eda-heatmap-wrapper">
                  <table className="eda-heatmap-table">
                    <thead>
                      <tr>
                        <th className="eda-heatmap-corner"></th>
                        {correlation.features.map((feat) => (
                          <th
                            key={feat.id}
                            className="eda-heatmap-col-header"
                            title={feat.label}
                          >
                            {feat.label.split(' ')[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {correlation.features.map((rowFeat) => (
                        <tr key={rowFeat.id}>
                          <th className="eda-heatmap-row-header" title={rowFeat.label}>
                            {rowFeat.label}
                          </th>
                          {correlation.features.map((colFeat) => {
                            const val = correlation.matrix[rowFeat.id]?.[colFeat.id];
                            const cellBg = getHeatmapColor(val);
                            const textColor = getHeatmapTextColor(val);
                            return (
                              <td
                                key={`${rowFeat.id}-${colFeat.id}`}
                                className="eda-heatmap-cell"
                                style={{ backgroundColor: cellBg, color: textColor }}
                                onClick={() =>
                                  setActiveHeatmapCell({
                                    xLabel: colFeat.label,
                                    yLabel: rowFeat.label,
                                    val: val,
                                  })
                                }
                                title={`${rowFeat.label} ↔ ${colFeat.label}: ${val?.toFixed(2)}`}
                              >
                                {val !== undefined ? val.toFixed(2) : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="eda-heatmap-legend">
                    <span>Negative (-1.0)</span>
                    <div className="eda-heatmap-gradient-bar"></div>
                    <span>Positive (+1.0)</span>
                  </div>

                  {activeHeatmapCell && (
                    <div
                      style={{
                        marginTop: '12px',
                        padding: '10px 14px',
                        backgroundColor: '#f1f5f2',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span>
                        <strong>{activeHeatmapCell.yLabel}</strong> ↔{' '}
                        <strong>{activeHeatmapCell.xLabel}</strong>: correlation ={' '}
                        <span style={{ fontWeight: 700, color: '#1b4332' }}>
                          {activeHeatmapCell.val > 0 ? '+' : ''}
                          {activeHeatmapCell.val?.toFixed(3)}
                        </span>{' '}
                        (
                        {Math.abs(activeHeatmapCell.val) >= 0.7
                          ? 'Strong'
                          : Math.abs(activeHeatmapCell.val) >= 0.35
                          ? 'Moderate'
                          : Math.abs(activeHeatmapCell.val) >= 0.1
                          ? 'Weak'
                          : 'Negligible'}{' '}
                        {activeHeatmapCell.val > 0 ? 'Positive' : 'Negative'} Relationship)
                      </span>
                      <button
                        onClick={() => setActiveHeatmapCell(null)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="eda-empty-state">
                  <Activity size={32} className="eda-empty-icon" />
                  <div className="eda-empty-title">Insufficient Numerical Variables</div>
                  <div className="eda-empty-desc">
                    At least two numerical variables with variation are required to compute a
                    correlation matrix.
                  </div>
                </div>
              )}
            </div>

            {/* 9. Missing Values Analysis — Bar Chart */}
            <div className="eda-chart-card">
              <div className="eda-chart-header">
                <div>
                  <h3 className="eda-chart-title">9. Missing Values Analysis</h3>
                  <p className="eda-chart-subtitle">
                    Missing value audit and data completeness across all dataset features
                  </p>
                </div>
                <span className="eda-chart-badge">Data Quality</span>
              </div>
              <div className="eda-chart-container">
                {missingValues?.total_missing === 0 ? (
                  <div className="eda-empty-state" style={{ borderColor: '#86efac', background: '#f0fdf4' }}>
                    <CheckCircle2 size={36} color="#15803d" style={{ marginBottom: '10px' }} />
                    <div className="eda-empty-title" style={{ color: '#14532d' }}>
                      100% Data Completeness
                    </div>
                    <div className="eda-empty-desc" style={{ color: '#166534' }}>
                      Zero missing or null cells detected across all {missingValues.columns?.length || 0}{' '}
                      dataset columns ({missingValues.total_cells?.toLocaleString()} total data
                      cells). Ready for production ML modeling.
                    </div>
                  </div>
                ) : missingValues?.columns?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={missingValues.columns}
                      margin={{ top: 10, right: 15, left: 0, bottom: 35 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8e0" />
                      <XAxis
                        dataKey="column"
                        angle={-35}
                        textAnchor="end"
                        interval={0}
                        tick={{ fontSize: 9, fill: '#475569' }}
                      />
                      <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
                      <Tooltip
                        content={<CustomChartTooltip unit="Missing Rows" />}
                      />
                      <Bar
                        dataKey="missing_count"
                        name="Missing Values"
                        fill={COLORS.terracotta}
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="eda-empty-state">
                    <Info size={32} className="eda-empty-icon" />
                    <div className="eda-empty-title">Missing Values Audit Unavailable</div>
                    <div className="eda-empty-desc">Could not inspect dataset columns.</div>
                  </div>
                )}
              </div>
            </div>

            {/* 10. Loan Eligibility & Repayment Risk — Pie/Donut Chart */}
            <div className="eda-chart-card">
              <div className="eda-chart-header">
                <div>
                  <h3 className="eda-chart-title">10. Loan Eligibility / Risk Distribution</h3>
                  <p className="eda-chart-subtitle">
                    Credit risk classification outcome distribution across evaluation records
                  </p>
                </div>
                <span className="eda-chart-badge">Donut Chart</span>
              </div>
              <div className="eda-chart-container">
                {distributions?.eligibility_distribution?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributions.eligibility_distribution}
                        dataKey="value"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={4}
                      >
                        {distributions.eligibility_distribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={<CustomChartTooltip unit="Applications" />}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="eda-empty-state">
                    <TrendingUp size={32} className="eda-empty-icon" />
                    <div className="eda-empty-title">No Outcome Labels Recorded</div>
                    <div className="eda-empty-desc">
                      Loan eligibility or repayment risk target not found in current dataset.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* =============================================================
              SECTION C: Numerical Statistical Summary & Outlier Exploration
              ============================================================= */}
          <section className="eda-table-card">
            <div className="eda-section-header">
              <div>
                <h3 className="eda-section-title">
                  <SlidersHorizontal size={20} />
                  Numerical Feature Statistical Summary & Outlier Exploration
                </h3>
                <p className="eda-section-desc">
                  Summary statistics for all quantitative agricultural variables including count,
                  mean, standard deviation, median, IQR, and detected outliers.
                </p>
              </div>
            </div>

            {numericalSummary?.rows?.length > 0 ? (
              <>
                <div className="eda-table-wrapper">
                  <table className="eda-data-table">
                    <thead>
                      <tr>
                        <th>Feature Name</th>
                        <th>Count</th>
                        <th>Mean</th>
                        <th>Median</th>
                        <th>Std Dev</th>
                        <th>Min</th>
                        <th>Q1 (25%)</th>
                        <th>Q3 (75%)</th>
                        <th>Max</th>
                        <th>IQR Outliers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {numericalSummary.rows.map((row) => (
                        <tr key={row.feature}>
                          <td className="eda-table-feature-cell">{row.label}</td>
                          <td>{row.count?.toLocaleString()}</td>
                          <td>{row.mean?.toLocaleString()}</td>
                          <td>{row.median?.toLocaleString()}</td>
                          <td>{row.std?.toLocaleString()}</td>
                          <td>{row.min?.toLocaleString()}</td>
                          <td>{row.q25?.toLocaleString()}</td>
                          <td>{row.q75?.toLocaleString()}</td>
                          <td>{row.max?.toLocaleString()}</td>
                          <td>
                            {row.outlier_count > 0 ? (
                              <span className="eda-outlier-pill">
                                {row.outlier_count} ({row.outlier_percentage}%)
                              </span>
                            ) : (
                              <span className="eda-clean-pill">0 (Clean)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="eda-table-note">
                  <strong>* Outlier Policy Note:</strong> Outliers are identified using the standard
                  Interquartile Range method (<code>values &lt; Q1 - 1.5×IQR</code> or{' '}
                  <code>values &gt; Q3 + 1.5×IQR</code>). In agricultural lending, extreme values
                  frequently represent valid economic reality (e.g. large-scale commercial acreage
                  or capital-intensive sugarcane/cotton farming) rather than measurement errors, and
                  are deliberately preserved rather than deleted.
                </p>
              </>
            ) : (
              <div className="eda-empty-state">
                <Info size={32} className="eda-empty-icon" />
                <div className="eda-empty-title">Numerical Summary Unavailable</div>
                <div className="eda-empty-desc">
                  No quantitative features available for summary calculation.
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default EdaDashboardPage;
