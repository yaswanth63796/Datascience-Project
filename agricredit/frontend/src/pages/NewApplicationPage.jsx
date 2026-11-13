import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  IndianRupee,
  Sprout,
  Plus,
  Trash2,
  Upload,
  Check,
  ArrowRight,
  ArrowLeft,
  FileCheck2,
  AlertTriangle,
  Scale,
  Landmark,
} from 'lucide-react';
import { api } from '../api/client';
import { formatINR } from '../components/FormatCurrency';
import AlertBanner from '../components/AlertBanner';
import '../styles/application-form.css';

const STEPS = [
  { id: 1, label: 'Farmer Info', icon: User },
  { id: 2, label: 'Loan Details', icon: IndianRupee },
  { id: 3, label: 'Crop Agronomy', icon: Sprout },
  { id: 4, label: 'Income & Subsidy', icon: Landmark },
  { id: 5, label: 'Documents', icon: Upload },
  { id: 6, label: 'Review & Submit', icon: FileCheck2 },
];

const INITIAL_CROP = {
  crop_name: 'Paddy',
  season: 'Kharif',
  cultivated_area_acres: 3.0,
  expected_yield_per_acre: 18.0,
  yield_unit: 'Quintal',
  expected_price_per_yield_unit: 2200.0,
  seed_cost: 6000.0,
  fertilizer_cost: 9000.0,
  pesticide_cost: 4500.0,
  labour_cost: 15000.0,
  irrigation_cost: 5000.0,
  machinery_cost: 7000.0,
  other_cost: 2000.0,
  cycles_count: 1,
};

const NewApplicationPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Form State
  const [farmer, setFarmer] = useState({
    farmer_name: '',
    district: '',
    state: '',
    contact_number: '',
    farming_experience_years: 12,
    land_ownership: 'owned',
    total_landholding_acres: 5.0,
    cultivated_land_current_season_acres: 5.0,
  });

  const [loan, setLoan] = useState({
    requested_loan_amount: 120000.0,
    loan_purpose: 'crop_cultivation',
    requested_loan_tenure_months: 12,
    repayment_frequency: 'seasonal',
    previous_loan_history: 'clean',
    existing_outstanding_debt: 0.0,
    existing_periodic_repayment: 0.0,
  });

  const [crops, setCrops] = useState([INITIAL_CROP]);

  const [incomeSubsidy, setIncomeSubsidy] = useState({
    other_verified_annual_income: 30000.0,
    subsidy_scheme_name: 'PM-KISAN',
    subsidy_received: 6000.0,
    subsidy_pending_approved: 0.0,
    subsidy_applied_unapproved: 0.0,
    subsidy_reference_evidence: '',
    expected_harvest_month: 'November',
  });

  const [documents, setDocuments] = useState([]);
  const [selectedDocFile, setSelectedDocFile] = useState(null);
  const [selectedDocType, setSelectedDocType] = useState('land_record');

  // Input change handlers
  const handleFarmerChange = (field, value) => {
    setFarmer((prev) => ({ ...prev, [field]: value }));
  };

  const handleLoanChange = (field, value) => {
    setLoan((prev) => ({ ...prev, [field]: value }));
  };

  const handleCropChange = (index, field, value) => {
    setCrops((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addCrop = () => {
    setCrops((prev) => [
      ...prev,
      {
        ...INITIAL_CROP,
        crop_name: 'Wheat',
        season: 'Rabi',
        cultivated_area_acres: 2.0,
      },
    ]);
  };

  const removeCrop = (index) => {
    if (crops.length > 1) {
      setCrops((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleIncomeSubsidyChange = (field, value) => {
    setIncomeSubsidy((prev) => ({ ...prev, [field]: value }));
  };

  // Add document locally
  const handleAddDocument = () => {
    if (!selectedDocFile) {
      alert('Please select a file to attach.');
      return;
    }
    setDocuments((prev) => [
      ...prev,
      {
        file: selectedDocFile,
        name: selectedDocFile.name,
        type: selectedDocType,
        size: selectedDocFile.size,
      },
    ]);
    setSelectedDocFile(null);
  };

  const removeDocument = (index) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  // Validation per step
  const validateStep = (step) => {
    setErrorMessage(null);
    if (step === 1) {
      if (!farmer.farmer_name.trim() || !farmer.district.trim() || !farmer.state.trim()) {
        setErrorMessage('Farmer Name, District, and State are mandatory.');
        return false;
      }
      if (Number(farmer.total_landholding_acres) <= 0) {
        setErrorMessage('Total landholding must be greater than zero.');
        return false;
      }
    } else if (step === 2) {
      if (Number(loan.requested_loan_amount) <= 0) {
        setErrorMessage('Requested loan amount must be positive.');
        return false;
      }
    } else if (step === 3) {
      if (crops.length === 0) {
        setErrorMessage('At least one crop entry is required.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(6, prev + 1));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Calculations for Step 3 live preview
  const totalCropArea = crops.reduce((acc, c) => acc + Number(c.cultivated_area_acres || 0), 0);
  const reportedCultivatedArea = Number(farmer.cultivated_land_current_season_acres || 0);
  const areaExceeded = totalCropArea > reportedCultivatedArea && reportedCultivatedArea > 0;

  // Submit complete application
  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setErrorMessage(null);

      const payload = {
        farmer: {
          ...farmer,
          farming_experience_years: Number(farmer.farming_experience_years),
          total_landholding_acres: Number(farmer.total_landholding_acres),
          cultivated_land_current_season_acres: Number(farmer.cultivated_land_current_season_acres),
        },
        requested_loan_amount: Number(loan.requested_loan_amount),
        loan_purpose: loan.loan_purpose,
        requested_loan_tenure_months: Number(loan.requested_loan_tenure_months),
        repayment_frequency: loan.repayment_frequency,
        previous_loan_history: loan.previous_loan_history,
        existing_outstanding_debt: Number(loan.existing_outstanding_debt),
        existing_periodic_repayment: Number(loan.existing_periodic_repayment),
        crops: crops.map((c) => ({
          ...c,
          cultivated_area_acres: Number(c.cultivated_area_acres),
          expected_yield_per_acre: Number(c.expected_yield_per_acre),
          expected_price_per_yield_unit: Number(c.expected_price_per_yield_unit),
          seed_cost: Number(c.seed_cost),
          fertilizer_cost: Number(c.fertilizer_cost),
          pesticide_cost: Number(c.pesticide_cost),
          labour_cost: Number(c.labour_cost),
          irrigation_cost: Number(c.irrigation_cost),
          machinery_cost: Number(c.machinery_cost),
          other_cost: Number(c.other_cost),
          cycles_count: Number(c.cycles_count || 1),
        })),
        other_verified_annual_income: Number(incomeSubsidy.other_verified_annual_income),
        subsidy_scheme_name: incomeSubsidy.subsidy_scheme_name,
        subsidy_received: Number(incomeSubsidy.subsidy_received),
        subsidy_pending_approved: Number(incomeSubsidy.subsidy_pending_approved),
        subsidy_applied_unapproved: Number(incomeSubsidy.subsidy_applied_unapproved),
        subsidy_reference_evidence: incomeSubsidy.subsidy_reference_evidence,
        expected_harvest_month: incomeSubsidy.expected_harvest_month,
      };

      const res = await api.submitApplication(payload);
      const createdApp = res.data.application;

      // Upload attached documents if any
      if (documents.length > 0) {
        for (const doc of documents) {
          const formData = new FormData();
          formData.append('file', doc.file);
          formData.append('document_type', doc.type);
          try {
            await api.uploadDocument(createdApp.id, formData);
          } catch (uploadErr) {
            console.error('Document upload error:', uploadErr);
          }
        }
      }

      // Navigate to Assessment Results
      navigate(`/applications/${createdApp.id}/assessment`);
    } catch (err) {
      console.error(err);
      setErrorMessage(
        err.response?.data?.error || 'Failed to submit application. Please review all fields.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="new-application-page">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', color: 'var(--forest-900)' }}>
          Agricultural Loan Application
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>
          Complete the 6-step agronomic and financial disclosure for credit evaluation
        </p>
      </div>

      <div className="form-container-card">
        {/* Stepper Progress Header */}
        <div className="stepper-wrapper">
          <div className="stepper-progress-line">
            <div
              className="stepper-progress-fill"
              style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            return (
              <div
                key={step.id}
                className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                onClick={() => {
                  if (step.id < currentStep || validateStep(currentStep)) {
                    setCurrentStep(step.id);
                  }
                }}
              >
                <div className="step-circle">
                  {isCompleted ? <Check size={18} /> : <Icon size={18} />}
                </div>
                <span className="step-label">{step.label}</span>
              </div>
            );
          })}
        </div>

        {errorMessage && (
          <AlertBanner type="error" title="Validation Note" message={errorMessage} />
        )}

        {/* STEP 1: FARMER INFORMATION */}
        {currentStep === 1 && (
          <div className="step-content">
            <h2 className="card-title" style={{ marginBottom: '1.25rem' }}>
              <User size={20} />
              <span>Step 1: Farmer & Landholding Profile</span>
            </h2>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Farmer Full Name <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ramesh Chandra Patel"
                  value={farmer.farmer_name}
                  onChange={(e) => handleFarmerChange('farmer_name', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  District <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Anand"
                  value={farmer.district}
                  onChange={(e) => handleFarmerChange('district', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  State <span className="required">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Gujarat"
                  value={farmer.state}
                  onChange={(e) => handleFarmerChange('state', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contact Number (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="+91 98XXX XXXXX"
                  value={farmer.contact_number}
                  onChange={(e) => handleFarmerChange('contact_number', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Farming Experience (Years)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  className="form-input"
                  value={farmer.farming_experience_years}
                  onChange={(e) => handleFarmerChange('farming_experience_years', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Land Ownership Status</label>
                <select
                  className="form-select"
                  value={farmer.land_ownership}
                  onChange={(e) => handleFarmerChange('land_ownership', e.target.value)}
                >
                  <option value="owned">Solely Owned</option>
                  <option value="leased">Leased / Tenant Farming</option>
                  <option value="mixed">Mixed (Owned + Leased)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Total Landholding (Acres) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="form-input"
                  value={farmer.total_landholding_acres}
                  onChange={(e) => handleFarmerChange('total_landholding_acres', e.target.value)}
                />
                <span className="form-help">Total acreage held under title or registered agreement.</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Land Cultivated Current Season (Acres) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="form-input"
                  value={farmer.cultivated_land_current_season_acres}
                  onChange={(e) => handleFarmerChange('cultivated_land_current_season_acres', e.target.value)}
                />
                <span className="form-help">Active cropped area for the requested credit cycle.</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: AGRICULTURAL LOAN DETAILS */}
        {currentStep === 2 && (
          <div className="step-content">
            <h2 className="card-title" style={{ marginBottom: '1.25rem' }}>
              <IndianRupee size={20} />
              <span>Step 2: Agricultural Loan Requirements & Debt Obligations</span>
            </h2>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">
                  Requested Loan Amount (INR) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  step="1000"
                  min="5000"
                  className="form-input"
                  value={loan.requested_loan_amount}
                  onChange={(e) => handleLoanChange('requested_loan_amount', e.target.value)}
                />
                <span className="form-help">Ex: ₹1,50,000 for seasonal crop inputs or equipment.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Loan Purpose</label>
                <select
                  className="form-select"
                  value={loan.loan_purpose}
                  onChange={(e) => handleLoanChange('loan_purpose', e.target.value)}
                >
                  <option value="crop_cultivation">Crop Cultivation (General)</option>
                  <option value="seeds">Certified High-Yield Seeds</option>
                  <option value="fertilizer">Fertilizers & Nutrients</option>
                  <option value="irrigation">Drip / Micro Irrigation Installation</option>
                  <option value="equipment">Farm Machinery / Implements</option>
                  <option value="post_harvest">Post-Harvest Storage & Processing</option>
                  <option value="other">Other Agricultural Purpose</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Requested Tenure (Months)</label>
                <select
                  className="form-select"
                  value={loan.requested_loan_tenure_months}
                  onChange={(e) => handleLoanChange('requested_loan_tenure_months', e.target.value)}
                >
                  <option value="6">6 Months (Single Crop Season)</option>
                  <option value="12">12 Months (Annual Crop Cycle / KCC)</option>
                  <option value="18">18 Months (Sugarcane / Perennial)</option>
                  <option value="24">24 Months (Farm Equipment Medium Term)</option>
                  <option value="36">36 Months (3-Year Term Loan)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Proposed Repayment Frequency</label>
                <select
                  className="form-select"
                  value={loan.repayment_frequency}
                  onChange={(e) => handleLoanChange('repayment_frequency', e.target.value)}
                >
                  <option value="seasonal">Seasonal (At Harvest / Sale)</option>
                  <option value="monthly">Monthly Installments (EMI)</option>
                  <option value="harvest_bullet">Harvest Bullet (Principal + Interest at harvest)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Previous Loan Repayment History</label>
                <select
                  className="form-select"
                  value={loan.previous_loan_history}
                  onChange={(e) => handleLoanChange('previous_loan_history', e.target.value)}
                >
                  <option value="clean">Clean / Timely Repayment</option>
                  <option value="first_time_borrower">First-Time Institutional Borrower</option>
                  <option value="minor_delay">Minor Weather-Related Delays (Restructured)</option>
                  <option value="defaulted">Prior Default / Overdue</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Existing Outstanding Debt (INR)</label>
                <input
                  type="number"
                  step="500"
                  min="0"
                  className="form-input"
                  value={loan.existing_outstanding_debt}
                  onChange={(e) => handleLoanChange('existing_outstanding_debt', e.target.value)}
                />
                <span className="form-help">Balance on prior bank/cooperative agricultural loans.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Periodic Debt Repayment (INR)</label>
                <input
                  type="number"
                  step="500"
                  min="0"
                  className="form-input"
                  value={loan.existing_periodic_repayment}
                  onChange={(e) => handleLoanChange('existing_periodic_repayment', e.target.value)}
                />
                <span className="form-help">Current monthly or seasonal installment obligation.</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: MULTI-CROP & SEASONAL AGRONOMY */}
        {currentStep === 3 && (
          <div className="step-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 className="card-title" style={{ margin: 0 }}>
                <Sprout size={20} />
                <span>Step 3: Multi-Crop Details & Cultivation Economics</span>
              </h2>
              <button type="button" onClick={addCrop} className="btn btn-sm btn-secondary">
                <Plus size={16} />
                <span>Add Crop Entry</span>
              </button>
            </div>

            {areaExceeded && (
              <AlertBanner
                type="warning"
                title="Acreage Notice"
                message={`Total crop acreage (${totalCropArea.toFixed(1)} acres) exceeds your reported active cultivated acreage (${reportedCultivatedArea.toFixed(1)} acres). Please verify sequential cropping or intercropping.`}
              />
            )}

            {crops.map((crop, idx) => {
              const grossRev = Number(crop.cultivated_area_acres || 0) * Number(crop.expected_yield_per_acre || 0) * Number(crop.expected_price_per_yield_unit || 0) * Number(crop.cycles_count || 1);
              const totalCost = (Number(crop.seed_cost || 0) + Number(crop.fertilizer_cost || 0) + Number(crop.pesticide_cost || 0) + Number(crop.labour_cost || 0) + Number(crop.irrigation_cost || 0) + Number(crop.machinery_cost || 0) + Number(crop.other_cost || 0)) * Number(crop.cycles_count || 1);
              const surplus = grossRev - totalCost;

              return (
                <div key={idx} className="crop-card-entry">
                  <div className="crop-card-header">
                    <span style={{ fontWeight: '700', color: 'var(--forest-800)', fontSize: '1rem' }}>
                      Crop #{idx + 1}: {crop.crop_name} ({crop.season})
                    </span>
                    {crops.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCrop(idx)}
                        className="btn btn-sm btn-danger"
                        title="Remove crop"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Crop Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={crop.crop_name}
                        onChange={(e) => handleCropChange(idx, 'crop_name', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Season</label>
                      <select
                        className="form-select"
                        value={crop.season}
                        onChange={(e) => handleCropChange(idx, 'season', e.target.value)}
                      >
                        <option value="Kharif">Kharif (Monsoon)</option>
                        <option value="Rabi">Rabi (Winter)</option>
                        <option value="Zaid">Zaid (Summer)</option>
                        <option value="Perennial">Perennial / Annual</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Cultivated Area (Acres)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        className="form-input"
                        value={crop.cultivated_area_acres}
                        onChange={(e) => handleCropChange(idx, 'cultivated_area_acres', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Expected Yield Per Acre</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        className="form-input"
                        value={crop.expected_yield_per_acre}
                        onChange={(e) => handleCropChange(idx, 'expected_yield_per_acre', e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Yield Unit</label>
                      <select
                        className="form-select"
                        value={crop.yield_unit}
                        onChange={(e) => handleCropChange(idx, 'yield_unit', e.target.value)}
                      >
                        <option value="Quintal">Quintal (100 kg)</option>
                        <option value="Ton">Ton (1000 kg)</option>
                        <option value="Kg">Kilogram (kg)</option>
                        <option value="Bags">Bags / Crates</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Expected Price Per Unit (INR)</label>
                      <input
                        type="number"
                        step="50"
                        min="0"
                        className="form-input"
                        value={crop.expected_price_per_yield_unit}
                        onChange={(e) => handleCropChange(idx, 'expected_price_per_yield_unit', e.target.value)}
                      />
                    </div>
                  </div>

                  <h4 style={{ fontSize: '0.9rem', color: 'var(--forest-800)', margin: '1rem 0 0.5rem' }}>
                    Cultivation Expense Breakdown (INR)
                  </h4>
                  <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                    <div className="form-group">
                      <label className="form-label">Seed Expenses</label>
                      <input
                        type="number"
                        className="form-input"
                        value={crop.seed_cost}
                        onChange={(e) => handleCropChange(idx, 'seed_cost', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fertilizer Expenses</label>
                      <input
                        type="number"
                        className="form-input"
                        value={crop.fertilizer_cost}
                        onChange={(e) => handleCropChange(idx, 'fertilizer_cost', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Pesticides / Protection</label>
                      <input
                        type="number"
                        className="form-input"
                        value={crop.pesticide_cost}
                        onChange={(e) => handleCropChange(idx, 'pesticide_cost', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Labour Expenses</label>
                      <input
                        type="number"
                        className="form-input"
                        value={crop.labour_cost}
                        onChange={(e) => handleCropChange(idx, 'labour_cost', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Irrigation / Electricity</label>
                      <input
                        type="number"
                        className="form-input"
                        value={crop.irrigation_cost}
                        onChange={(e) => handleCropChange(idx, 'irrigation_cost', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Machinery & Fuel</label>
                      <input
                        type="number"
                        className="form-input"
                        value={crop.machinery_cost}
                        onChange={(e) => handleCropChange(idx, 'machinery_cost', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Other Cultivation Costs</label>
                      <input
                        type="number"
                        className="form-input"
                        value={crop.other_cost}
                        onChange={(e) => handleCropChange(idx, 'other_cost', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Live Crop Economics Calculation Preview */}
                  <div className="crop-preview-bar">
                    <div className="preview-stat">
                      Est. Harvest Revenue: <strong>{formatINR(grossRev)}</strong>
                    </div>
                    <div className="preview-stat">
                      Total Cultivation Cost: <strong>{formatINR(totalCost)}</strong>
                    </div>
                    <div className="preview-stat">
                      Estimated Crop Surplus:{' '}
                      <strong style={{ color: surplus >= 0 ? '#15803d' : '#b91c1c' }}>
                        {formatINR(surplus)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* STEP 4: INCOME & SUBSIDY */}
        {currentStep === 4 && (
          <div className="step-content">
            <h2 className="card-title" style={{ marginBottom: '1.25rem' }}>
              <Scale size={20} />
              <span>Step 4: Non-Farm Income & Government Agricultural Subsidies</span>
            </h2>

            <AlertBanner type="warning" title="Subsidy Policy Accounting">
              Under prudent agricultural credit assessment, applied-for but unapproved subsidies are strictly
              excluded from guaranteed cash flows. Approved pending subsidies are tracked separately as contingent receivables.
            </AlertBanner>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Other Verified Annual Income (INR)</label>
                <input
                  type="number"
                  step="1000"
                  min="0"
                  className="form-input"
                  value={incomeSubsidy.other_verified_annual_income}
                  onChange={(e) => handleIncomeSubsidyChange('other_verified_annual_income', e.target.value)}
                />
                <span className="form-help">Income from allied dairy, poultry, farm rent, or remittance.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Agricultural Subsidy Scheme Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. PM-KISAN, SMAM, Micro Irrigation"
                  value={incomeSubsidy.subsidy_scheme_name}
                  onChange={(e) => handleIncomeSubsidyChange('subsidy_scheme_name', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Subsidy Already Received in Cash (INR)</label>
                <input
                  type="number"
                  step="500"
                  min="0"
                  className="form-input"
                  value={incomeSubsidy.subsidy_received}
                  onChange={(e) => handleIncomeSubsidyChange('subsidy_received', e.target.value)}
                />
                <span className="form-help">Confirmed bank transfer received for this season.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Approved Pending Disbursement (INR)</label>
                <input
                  type="number"
                  step="500"
                  min="0"
                  className="form-input"
                  value={incomeSubsidy.subsidy_pending_approved}
                  onChange={(e) => handleIncomeSubsidyChange('subsidy_pending_approved', e.target.value)}
                />
                <span className="form-help">Sanctioned by department; tracked as contingent buffer.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Applied-For But Unapproved Subsidy (INR)</label>
                <input
                  type="number"
                  step="500"
                  min="0"
                  className="form-input"
                  value={incomeSubsidy.subsidy_applied_unapproved}
                  onChange={(e) => handleIncomeSubsidyChange('subsidy_applied_unapproved', e.target.value)}
                />
                <span className="form-help" style={{ color: '#b45309' }}>
                  Excluded from guaranteed cash-flow calculation.
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Expected Harvest Month</label>
                <select
                  className="form-select"
                  value={incomeSubsidy.expected_harvest_month}
                  onChange={(e) => handleIncomeSubsidyChange('expected_harvest_month', e.target.value)}
                >
                  <option value="October">October</option>
                  <option value="November">November</option>
                  <option value="December">December</option>
                  <option value="January">January</option>
                  <option value="February">February</option>
                  <option value="March">March</option>
                  <option value="April">April</option>
                  <option value="May">May</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: SUPPORTING DOCUMENTS */}
        {currentStep === 5 && (
          <div className="step-content">
            <h2 className="card-title" style={{ marginBottom: '1.25rem' }}>
              <Upload size={20} />
              <span>Step 5: Supporting Agricultural Verification Evidence</span>
            </h2>

            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Uploading documents is optional. Applications without verified documentation will be marked for field verification by loan officers.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
              <div style={{ flex: '1', minWidth: '220px' }}>
                <label className="form-label">Evidence Type</label>
                <select
                  className="form-select"
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                >
                  <option value="land_record">Land Record (Patta / 7-12 / Chitta)</option>
                  <option value="crop_record">Crop / Sowing Certificate</option>
                  <option value="subsidy_receipt">Subsidy Sanction / Passbook Entry</option>
                  <option value="repayment_record">Prior Bank Repayment Record</option>
                  <option value="other">Other Agricultural Evidence</option>
                </select>
              </div>

              <div style={{ flex: '2', minWidth: '250px' }}>
                <label className="form-label">Select File (PDF, PNG, JPG)</label>
                <input
                  type="file"
                  className="form-input"
                  accept=".pdf,.png,.jpg,.jpeg,.csv,.txt"
                  onChange={(e) => setSelectedDocFile(e.target.files[0] || null)}
                />
              </div>

              <button
                type="button"
                onClick={handleAddDocument}
                className="btn btn-secondary"
                style={{ height: '42px' }}
              >
                <Plus size={16} /> Attach Document
              </button>
            </div>

            {documents.length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Category</th>
                      <th>Size</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: '600' }}>{doc.name}</td>
                        <td>{doc.type.replace('_', ' ')}</td>
                        <td>{(doc.size / 1024).toFixed(1)} KB</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => removeDocument(idx)}
                            className="btn btn-sm btn-danger"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', background: 'var(--bg-surface-subtle)', borderRadius: '8px' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No supporting documents attached yet. You can proceed and submit unverified, or attach documentation above.
                </span>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: REVIEW & SUBMIT */}
        {currentStep === 6 && (
          <div className="step-content">
            <h2 className="card-title" style={{ marginBottom: '1.25rem' }}>
              <FileCheck2 size={20} />
              <span>Step 6: Review & Finalize Application</span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ color: 'var(--forest-800)', marginBottom: '0.75rem' }}>Farmer Details</h4>
                <p><strong>Name:</strong> {farmer.farmer_name}</p>
                <p><strong>Location:</strong> {farmer.district}, {farmer.state}</p>
                <p><strong>Experience:</strong> {farmer.farming_experience_years} Years</p>
                <p><strong>Ownership:</strong> {farmer.land_ownership}</p>
                <p><strong>Holding / Cultivated:</strong> {farmer.total_landholding_acres} / {farmer.cultivated_land_current_season_acres} Acres</p>
                <button type="button" onClick={() => setCurrentStep(1)} className="btn btn-sm btn-outline" style={{ marginTop: '0.75rem' }}>
                  Edit Farmer Info
                </button>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ color: 'var(--forest-800)', marginBottom: '0.75rem' }}>Loan Request</h4>
                <p><strong>Requested Amount:</strong> {formatINR(loan.requested_loan_amount)}</p>
                <p><strong>Purpose:</strong> {loan.loan_purpose.replace('_', ' ')}</p>
                <p><strong>Tenure:</strong> {loan.requested_loan_tenure_months} Months ({loan.repayment_frequency})</p>
                <p><strong>Prior Credit:</strong> {loan.previous_loan_history.replace('_', ' ')}</p>
                <p><strong>Existing Debt:</strong> {formatINR(loan.existing_outstanding_debt)}</p>
                <button type="button" onClick={() => setCurrentStep(2)} className="btn btn-sm btn-outline" style={{ marginTop: '0.75rem' }}>
                  Edit Loan Details
                </button>
              </div>

              <div className="card" style={{ padding: '1.25rem' }}>
                <h4 style={{ color: 'var(--forest-800)', marginBottom: '0.75rem' }}>Crops & Subsidies</h4>
                <p><strong>Crops Configured:</strong> {crops.map((c) => c.crop_name).join(', ')}</p>
                <p><strong>Total Crop Area:</strong> {totalCropArea.toFixed(1)} Acres</p>
                <p><strong>Other Annual Income:</strong> {formatINR(incomeSubsidy.other_verified_annual_income)}</p>
                <p><strong>Confirmed Subsidy:</strong> {formatINR(incomeSubsidy.subsidy_received)}</p>
                <p><strong>Pending Subsidy:</strong> {formatINR(incomeSubsidy.subsidy_pending_approved)}</p>
                <button type="button" onClick={() => setCurrentStep(3)} className="btn btn-sm btn-outline" style={{ marginTop: '0.75rem' }}>
                  Edit Crops / Subsidies
                </button>
              </div>
            </div>

            <AlertBanner type="prototype" title="Assessment Engine Trigger">
              Submitting this application will immediately calculate multi-crop operating surplus, seasonal debt service obligations,
              Debt Service Coverage Ratio (DSCR), and execute the machine learning repayment risk pipeline.
            </AlertBanner>
          </div>
        )}

        {/* Form Navigation Controls */}
        <div className="form-nav-footer">
          {currentStep > 1 ? (
            <button type="button" onClick={handlePrev} className="btn btn-outline">
              <ArrowLeft size={16} /> Previous
            </button>
          ) : (
            <div />
          )}

          {currentStep < 6 ? (
            <button type="button" onClick={handleNext} className="btn btn-primary">
              Continue <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="btn btn-lg btn-primary"
              style={{ backgroundColor: 'var(--forest-700)' }}
            >
              {submitting ? 'Assessing Application...' : 'Submit & Generate Credit Assessment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewApplicationPage;
