import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  Calculator,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HelpCircle,
  RotateCcw,
  ShieldCheck,
  Wheat,
  Scale,
  ArrowRight,
  TrendingUp,
  Percent,
  LandPlot,
  Info,
  ShieldAlert,
  FileCheck2,
} from 'lucide-react';
import { api } from '../api/client';
import { formatINR } from '../components/FormatCurrency';
import AlertBanner from '../components/AlertBanner';
import '../styles/eligibility.css';

const CROP_OPTIONS = [
  'Rice',
  'Wheat',
  'Maize',
  'Cotton',
  'Sugarcane',
  'Groundnut',
  'Other',
];

const INITIAL_FORM = {
  total_land_area: '',
  area_planted: '',
  crop_type: '',
  expected_crop_yield: '',
  crop_insurance_amount: '',
  cce_crop_yield: '',
};

const AgriculturalLoanEligibilityPage = () => {
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [result, setResult] = useState(null);

  // Client-side validation for single field
  const validateField = (name, value, currentData = formData) => {
    let error = null;

    if (name === 'total_land_area') {
      if (value === '' || value === null) {
        error = 'Total land area is required.';
      } else {
        const val = parseFloat(value);
        if (isNaN(val)) error = 'Must be a valid number.';
        else if (val <= 0) error = 'Total land area must be greater than 0.';
      }
    }

    if (name === 'area_planted') {
      if (value === '' || value === null) {
        error = 'Area planted is required.';
      } else {
        const val = parseFloat(value);
        if (isNaN(val)) error = 'Must be a valid number.';
        else if (val < 0) error = 'Area planted cannot be negative.';
        else {
          const totalVal = parseFloat(currentData.total_land_area);
          if (!isNaN(totalVal) && totalVal > 0 && val > totalVal) {
            error = `Planted area (${val} ac) cannot exceed total land (${totalVal} ac).`;
          }
        }
      }
    }

    if (name === 'crop_type') {
      if (!value || value.trim() === '') {
        error = 'Please select a crop type.';
      } else if (!CROP_OPTIONS.includes(value)) {
        error = 'Invalid crop type selected.';
      }
    }

    if (name === 'expected_crop_yield') {
      if (value === '' || value === null) {
        error = 'Expected crop yield is required.';
      } else {
        const val = parseFloat(value);
        if (isNaN(val)) error = 'Must be a valid number.';
        else if (val < 0) error = 'Expected yield cannot be negative.';
      }
    }

    if (name === 'crop_insurance_amount') {
      if (value === '' || value === null) {
        error = 'Crop insurance amount is required.';
      } else {
        const val = parseFloat(value);
        if (isNaN(val)) error = 'Must be a valid number.';
        else if (val < 0) error = 'Insurance amount cannot be negative.';
      }
    }

    if (name === 'cce_crop_yield') {
      if (value === '' || value === null) {
        error = 'CCE crop yield is required.';
      } else {
        const val = parseFloat(value);
        if (isNaN(val)) error = 'Must be a valid number.';
        else if (val < 0) error = 'CCE yield cannot be negative.';
      }
    }

    return error;
  };

  // Full validation before submission
  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach((field) => {
      const err = validateField(field, formData[field], formData);
      if (err) newErrors[field] = err;
    });

    // Cross-field validation: planted area vs total land
    const total = parseFloat(formData.total_land_area);
    const planted = parseFloat(formData.area_planted);
    if (!isNaN(total) && !isNaN(planted) && planted > total) {
      newErrors.area_planted = `Planted area (${planted} ac) cannot exceed total land area (${total} ac).`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const updated = { ...formData, [name]: value };
    setFormData(updated);

    // Dynamic field validation on change
    const fieldError = validateField(name, value, updated);
    setErrors((prev) => {
      const copy = { ...prev };
      if (fieldError) {
        copy[name] = fieldError;
      } else {
        delete copy[name];
      }

      // Re-validate area_planted if total_land_area changes
      if (name === 'total_land_area' && formData.area_planted !== '') {
        const plantedErr = validateField('area_planted', formData.area_planted, updated);
        if (plantedErr) copy.area_planted = plantedErr;
        else delete copy.area_planted;
      }

      return copy;
    });
  };

  const handleReset = () => {
    setFormData(INITIAL_FORM);
    setErrors({});
    setApiError(null);
    setResult(null);
  };

  // Preset scenarios to make testing intuitive
  const applyPreset = (preset) => {
    setFormData(preset);
    setErrors({});
    setApiError(null);
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        total_land_area: parseFloat(formData.total_land_area),
        area_planted: parseFloat(formData.area_planted),
        crop_type: formData.crop_type,
        expected_crop_yield: parseFloat(formData.expected_crop_yield),
        crop_insurance_amount: parseFloat(formData.crop_insurance_amount),
        cce_crop_yield: parseFloat(formData.cce_crop_yield),
      };

      const response = await api.predictEligibility(payload);
      if (response.data && response.data.success) {
        setResult(response.data);
      } else {
        setApiError(response.data?.error || 'Unable to complete eligibility assessment.');
      }
    } catch (err) {
      console.error('Prediction API Error:', err);
      const backendErr = err.response?.data?.error || err.response?.data?.message;
      const backendFieldErrors = err.response?.data?.field_errors;

      if (backendFieldErrors) {
        setErrors((prev) => ({ ...prev, ...backendFieldErrors }));
      }
      setApiError(
        backendErr ||
          'Failed to connect to AgriCredit eligibility prediction service. Ensure the Flask backend is running.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Determine styling based on assessment outcome
  const getOutcomeStyle = (assessment) => {
    if (assessment === 'Potentially Eligible') {
      return {
        className: 'status-eligible',
        badgeText: 'Preliminary Eligible',
        icon: CheckCircle2,
        tagline: 'Favorable Agronomic Indicators',
      };
    }
    if (assessment === 'Manual Review Required') {
      return {
        className: 'status-review',
        badgeText: 'Officer Review Required',
        icon: Clock,
        tagline: 'Agronomic Verification Recommended',
      };
    }
    return {
      className: 'status-ineligible',
      badgeText: 'Low Eligibility Probability',
      icon: AlertTriangle,
      tagline: 'High Operational Or Production Risk',
    };
  };

  return (
    <div className="eligibility-container">
      {/* Header Banner */}
      <div className="eligibility-header-card">
        <div className="eligibility-badge-row">
          <span className="eligibility-tag">
            <Sprout size={14} />
            <span>AgriCredit Fast Screener</span>
          </span>
          <span className="eligibility-tag">
            <Scale size={14} />
            <span>6 Essential Inputs</span>
          </span>
          <span className="eligibility-tag">
            <Wheat size={14} />
            <span>CCE Empirical Benchmark</span>
          </span>
        </div>
        <h1 className="eligibility-title">Agricultural Loan Eligibility Prediction</h1>
        <p className="eligibility-description">
          Evaluate a farmer's preliminary loan eligibility based on land utilization, crop variety,
          insurance risk protection, and harvest yield compared against Crop Cutting Experiment (CCE)
          field benchmarks.
        </p>
      </div>

      {apiError && (
        <AlertBanner type="error" title="Assessment Request Failed" message={apiError} />
      )}

      {/* Main 2-Column Section */}
      <div className="eligibility-grid">
        {/* Left Column: Form */}
        <div className="eligibility-form-card">
          <div className="form-header-bar">
            <div>
              <h2 className="form-header-title">
                <Calculator size={20} color="var(--forest-700)" />
                <span>Agricultural Indicators Form</span>
              </h2>
              <span className="form-subtext">No personal or financial liabilities required for screening</span>
            </div>
          </div>

          {/* Quick Presets for Demo / Testing */}
          <div className="presets-strip">
            <span className="presets-label">
              <Info size={14} />
              <span>Quick Test Presets:</span>
            </span>
            <button
              type="button"
              className="preset-btn"
              onClick={() =>
                applyPreset({
                  total_land_area: '10.0',
                  area_planted: '8.0',
                  crop_type: 'Rice',
                  expected_crop_yield: '16000',
                  crop_insurance_amount: '50000',
                  cce_crop_yield: '15000',
                })
              }
            >
              Eligible (Rice)
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() =>
                applyPreset({
                  total_land_area: '12.0',
                  area_planted: '10.0',
                  crop_type: 'Cotton',
                  expected_crop_yield: '12000',
                  crop_insurance_amount: '0',
                  cce_crop_yield: '11500',
                })
              }
            >
              Review (Uninsured Cotton)
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() =>
                applyPreset({
                  total_land_area: '15.0',
                  area_planted: '1.5',
                  crop_type: 'Wheat',
                  expected_crop_yield: '2000',
                  crop_insurance_amount: '10000',
                  cce_crop_yield: '2200',
                })
              }
            >
              Ineligible (Low Utilization)
            </button>
            <button
              type="button"
              className="preset-btn"
              onClick={() =>
                applyPreset({
                  total_land_area: '8.0',
                  area_planted: '6.0',
                  crop_type: 'Maize',
                  expected_crop_yield: '9000',
                  crop_insurance_amount: '20000',
                  cce_crop_yield: '0',
                })
              }
            >
              Zero CCE (Review)
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="inputs-grid">
              {/* 1. Total Land Area */}
              <div className="field-wrapper">
                <label className="field-label" htmlFor="total_land_area">
                  <span>
                    1. Total Land Area <span className="required">*</span>
                  </span>
                </label>
                <div className="input-container">
                  <span className="input-icon-left">
                    <LandPlot size={17} />
                  </span>
                  <input
                    id="total_land_area"
                    name="total_land_area"
                    type="number"
                    step="0.01"
                    min="0.1"
                    placeholder="e.g. 10.0"
                    value={formData.total_land_area}
                    onChange={handleInputChange}
                    className={`field-input has-unit ${errors.total_land_area ? 'is-invalid' : ''}`}
                  />
                  <span className="input-unit-badge">acres</span>
                </div>
                {errors.total_land_area ? (
                  <div className="field-error-msg">
                    <AlertTriangle size={13} />
                    <span>{errors.total_land_area}</span>
                  </div>
                ) : (
                  <span className="field-hint">Total agricultural land owned or operated</span>
                )}
              </div>

              {/* 2. Area Planted */}
              <div className="field-wrapper">
                <label className="field-label" htmlFor="area_planted">
                  <span>
                    2. Area Planted <span className="required">*</span>
                  </span>
                </label>
                <div className="input-container">
                  <span className="input-icon-left">
                    <Sprout size={17} />
                  </span>
                  <input
                    id="area_planted"
                    name="area_planted"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 7.5"
                    value={formData.area_planted}
                    onChange={handleInputChange}
                    className={`field-input has-unit ${errors.area_planted ? 'is-invalid' : ''}`}
                  />
                  <span className="input-unit-badge">acres</span>
                </div>
                {errors.area_planted ? (
                  <div className="field-error-msg">
                    <AlertTriangle size={13} />
                    <span>{errors.area_planted}</span>
                  </div>
                ) : (
                  <span className="field-hint">Actual area cultivated (cannot exceed total land)</span>
                )}
              </div>

              {/* 3. Crop Type */}
              <div className="field-wrapper">
                <label className="field-label" htmlFor="crop_type">
                  <span>
                    3. Crop Type <span className="required">*</span>
                  </span>
                </label>
                <div className="input-container">
                  <span className="input-icon-left">
                    <Wheat size={17} />
                  </span>
                  <select
                    id="crop_type"
                    name="crop_type"
                    value={formData.crop_type}
                    onChange={handleInputChange}
                    className={`field-select ${errors.crop_type ? 'is-invalid' : ''}`}
                  >
                    <option value="">-- Select Crop Type --</option>
                    {CROP_OPTIONS.map((crop) => (
                      <option key={crop} value={crop}>
                        {crop}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.crop_type ? (
                  <div className="field-error-msg">
                    <AlertTriangle size={13} />
                    <span>{errors.crop_type}</span>
                  </div>
                ) : (
                  <span className="field-hint">Primary cultivated crop for current season</span>
                )}
              </div>

              {/* 4. Expected Crop Yield */}
              <div className="field-wrapper">
                <label className="field-label" htmlFor="expected_crop_yield">
                  <span>
                    4. Expected Crop Yield <span className="required">*</span>
                  </span>
                </label>
                <div className="input-container">
                  <span className="input-icon-left">
                    <TrendingUp size={17} />
                  </span>
                  <input
                    id="expected_crop_yield"
                    name="expected_crop_yield"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="e.g. 15000"
                    value={formData.expected_crop_yield}
                    onChange={handleInputChange}
                    className={`field-input has-unit ${errors.expected_crop_yield ? 'is-invalid' : ''}`}
                  />
                  <span className="input-unit-badge">kg</span>
                </div>
                {errors.expected_crop_yield ? (
                  <div className="field-error-msg">
                    <AlertTriangle size={13} />
                    <span>{errors.expected_crop_yield}</span>
                  </div>
                ) : (
                  <span className="field-hint">Total production anticipated for planted area</span>
                )}
              </div>

              {/* 5. Crop Insurance Amount */}
              <div className="field-wrapper">
                <label className="field-label" htmlFor="crop_insurance_amount">
                  <span>
                    5. Crop Insurance Amount <span className="required">*</span>
                  </span>
                </label>
                <div className="input-container">
                  <span className="input-icon-left">
                    <ShieldCheck size={17} />
                  </span>
                  <input
                    id="crop_insurance_amount"
                    name="crop_insurance_amount"
                    type="number"
                    step="100"
                    min="0"
                    placeholder="e.g. 50000"
                    value={formData.crop_insurance_amount}
                    onChange={handleInputChange}
                    className={`field-input has-unit ${errors.crop_insurance_amount ? 'is-invalid' : ''}`}
                  />
                  <span className="input-unit-badge">₹ INR</span>
                </div>
                {errors.crop_insurance_amount ? (
                  <div className="field-error-msg">
                    <AlertTriangle size={13} />
                    <span>{errors.crop_insurance_amount}</span>
                  </div>
                ) : (
                  <span className="field-hint">PMFBY or insured coverage value for current crop</span>
                )}
              </div>

              {/* 6. CCE Crop Yield */}
              <div className="field-wrapper">
                <label className="field-label" htmlFor="cce_crop_yield">
                  <span>
                    6. CCE Crop Yield <span className="required">*</span>
                  </span>
                </label>
                <div className="input-container">
                  <span className="input-icon-left">
                    <Scale size={17} />
                  </span>
                  <input
                    id="cce_crop_yield"
                    name="cce_crop_yield"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="e.g. 14000 (or 0 if unrecorded)"
                    value={formData.cce_crop_yield}
                    onChange={handleInputChange}
                    className={`field-input has-unit ${errors.cce_crop_yield ? 'is-invalid' : ''}`}
                  />
                  <span className="input-unit-badge">kg</span>
                </div>
                {errors.cce_crop_yield ? (
                  <div className="field-error-msg">
                    <AlertTriangle size={13} />
                    <span>{errors.cce_crop_yield}</span>
                  </div>
                ) : (
                  <span className="field-hint">Crop Cutting Experiment reference yield (0 if none)</span>
                )}
              </div>
            </div>

            {/* Actions: Submit & Reset */}
            <div className="form-actions-row">
              <button
                type="submit"
                disabled={submitting}
                className="btn-predict"
                id="predict-eligibility-btn"
              >
                {submitting ? (
                  <>
                    <Sprout size={18} className="spin-icon" />
                    <span>Evaluating Agricultural Indicators...</span>
                  </>
                ) : (
                  <>
                    <Calculator size={18} />
                    <span>Predict Loan Eligibility</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={submitting}
                className="btn-reset"
              >
                <RotateCcw size={16} />
                <span>Reset Form</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: CCE Assessment Explanation */}
        <div className="cce-info-card">
          <div className="cce-badge">
            <Wheat size={14} />
            <span>Agronomic Methodology</span>
          </div>
          <h2 className="cce-title">
            <span>Crop Cutting Experiment (CCE)</span>
          </h2>
          <p className="cce-body-text">
            A <strong>Crop Cutting Experiment (CCE)</strong> is a standardized empirical method used by
            state agricultural departments, revenue authorities, and insurance underwriters to estimate
            crop yield using representative sample plots (typically 5m × 5m or standard triangular cuts)
            within an agro-climatic block or gram panchayat.
          </p>

          <div className="cce-formula-box">
            <div className="formula-label">Yield Variation Formula:</div>
            <code className="formula-code">
              Yield Variation (%) = ((Expected Yield − CCE Yield) / CCE Yield) × 100
            </code>
          </div>

          <ul className="cce-points-list">
            <li className="cce-point-item">
              <CheckCircle2 size={16} className="cce-point-icon" />
              <span>
                <strong>Empirical Benchmark:</strong> Used alongside the farmer's expected crop yield to
                assess whether production claims are grounded in local reality or overstated.
              </span>
            </li>
            <li className="cce-point-item">
              <CheckCircle2 size={16} className="cce-point-icon" />
              <span>
                <strong>Safe Zero Handling:</strong> If CCE yield is 0 or unrecorded for a specific
                plot, zero-division is avoided and a manual field inspection recommendation is triggered.
              </span>
            </li>
            <li className="cce-point-item">
              <CheckCircle2 size={16} className="cce-point-icon" />
              <span>
                <strong>Risk vs Capacity:</strong> Crop insurance protects against adverse shocks, but
                does not replace personal debt repayment capacity.
              </span>
            </li>
          </ul>

          <div className="cce-disclaimer-callout">
            <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Reference Measurement Only:</strong> CCE yield provides a comparative regional
              baseline and does not, by itself, determine or guarantee agricultural credit approval.
            </div>
          </div>
        </div>
      </div>

      {/* Result Panel (Rendered only after form submission) */}
      {result && (
        <section className="results-section" id="prediction-result-panel">
          <div className="result-card">
            {/* Outcome Header Banner */}
            {(() => {
              const meta = getOutcomeStyle(result.assessment);
              const OutcomeIcon = meta.icon;
              return (
                <div className={`outcome-header ${meta.className}`}>
                  <div className="outcome-meta">
                    <div className="outcome-icon-circle">
                      <OutcomeIcon size={32} color="#ffffff" />
                    </div>
                    <div className="outcome-title-box">
                      <span className="outcome-tagline">{meta.tagline}</span>
                      <h2 className="outcome-status-title">{result.assessment}</h2>
                      <p className="outcome-message">{result.message}</p>
                    </div>
                  </div>
                  <div className="outcome-timestamp-badge">
                    <FileCheck2 size={14} />
                    <span>Preliminary Assessment</span>
                  </div>
                </div>
              );
            })()}

            {/* Results Content Body */}
            <div className="result-content-body">
              {/* Derived Metrics Cards */}
              <div className="derived-metrics-grid">
                {/* 1. Planted Area Ratio */}
                <div className="metric-stat-card">
                  <div className="stat-card-label">
                    <span>Planted Area Ratio</span>
                    <Percent size={15} color="var(--forest-600)" />
                  </div>
                  <div className="stat-card-value">
                    {result.metrics?.planted_area_ratio !== undefined
                      ? `${result.metrics.planted_area_ratio}%`
                      : 'N/A'}
                  </div>
                  <div className="stat-card-subtext">
                    {result.metrics?.area_planted} of {result.metrics?.total_land_area} acres cultivated
                  </div>
                </div>

                {/* 2. Yield Variation vs CCE */}
                <div className="metric-stat-card">
                  <div className="stat-card-label">
                    <span>Yield Variation vs CCE</span>
                    <TrendingUp size={15} color="var(--forest-600)" />
                  </div>
                  <div
                    className="stat-card-value"
                    style={{
                      color:
                        result.metrics?.yield_variation_percent === null
                          ? 'var(--text-muted)'
                          : result.metrics?.yield_variation_percent > 35
                          ? '#b45309'
                          : result.metrics?.yield_variation_percent < -35
                          ? '#dc2626'
                          : 'var(--forest-800)',
                    }}
                  >
                    {result.metrics?.yield_variation_percent !== null &&
                    result.metrics?.yield_variation_percent !== undefined
                      ? `${result.metrics.yield_variation_percent > 0 ? '+' : ''}${
                          result.metrics.yield_variation_percent
                        }%`
                      : 'N/A (CCE 0)'}
                  </div>
                  <div className="stat-card-subtext">
                    {result.metrics?.yield_variation_percent !== null
                      ? 'Compared to CCE sample baseline'
                      : 'CCE unrecorded; regional verification needed'}
                  </div>
                </div>

                {/* 3. Crop Insurance Coverage */}
                <div className="metric-stat-card">
                  <div className="stat-card-label">
                    <span>Crop Insurance</span>
                    <ShieldCheck size={15} color="var(--forest-600)" />
                  </div>
                  <div className="stat-card-value">
                    {formatINR(result.metrics?.crop_insurance_amount || 0)}
                  </div>
                  <div className="stat-card-subtext">
                    {result.metrics?.crop_insurance_amount > 0
                      ? 'Risk buffer against yield shocks'
                      : 'Zero insurance coverage active'}
                  </div>
                </div>

                {/* 4. Expected Yield / Acre */}
                <div className="metric-stat-card">
                  <div className="stat-card-label">
                    <span>Yield Productivity</span>
                    <Scale size={15} color="var(--forest-600)" />
                  </div>
                  <div className="stat-card-value">
                    {result.metrics?.expected_yield_per_acre !== undefined
                      ? `${result.metrics.expected_yield_per_acre.toLocaleString()} kg/ac`
                      : `${result.metrics?.expected_crop_yield} kg`}
                  </div>
                  <div className="stat-card-subtext">
                    {result.metrics?.crop_type} crop intensity
                  </div>
                </div>
              </div>

              {/* Agronomic Observation Factors */}
              {result.reasons && result.reasons.length > 0 && (
                <div className="reasons-panel">
                  <h3 className="panel-title">
                    <Sprout size={18} color="var(--forest-700)" />
                    <span>Agronomic Assessment Factors</span>
                  </h3>
                  <ul className="reasons-ul">
                    {result.reasons.map((reason, idx) => {
                      let type = 'normal';
                      if (reason.toLowerCase().includes('low') || reason.toLowerCase().includes('severe') || reason.toLowerCase().includes('exceeds')) {
                        type = 'danger';
                      } else if (reason.toLowerCase().includes('review') || reason.toLowerCase().includes('absence') || reason.toLowerCase().includes('moderate')) {
                        type = 'warning';
                      }
                      return (
                        <li key={idx} className={`reason-li ${type}`}>
                          {type === 'danger' ? (
                            <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                          ) : type === 'warning' ? (
                            <Clock size={16} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                          ) : (
                            <CheckCircle2 size={16} color="var(--forest-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
                          )}
                          <span>{reason}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Regulatory & Institutional Disclaimer Box */}
              <div className="regulatory-disclaimer-box">
                <div className="disclaimer-icon-box">
                  <ShieldAlert size={22} />
                </div>
                <div>
                  <div className="disclaimer-heading">Preliminary Assessment Notice & Policy Disclaimer</div>
                  <p className="disclaimer-text">
                    {result.disclaimer ||
                      'This is a preliminary assessment, not a guarantee of loan approval. Actual loan approval requires verification of income, expenses, liabilities, repayment capacity, and the lender’s policies.'}
                  </p>
                </div>
              </div>

              {/* Actions Strip */}
              <div className="result-actions-strip">
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-outline"
                >
                  <RotateCcw size={16} />
                  <span>Check Another Applicant</span>
                </button>
                <Link to="/apply" className="btn btn-primary">
                  <span>Proceed to Full Loan Application</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default AgriculturalLoanEligibilityPage;
