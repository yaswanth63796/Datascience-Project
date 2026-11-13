import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Database,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Layers,
  Scale,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { api } from '../api/client';
import LoadingSpinner from '../components/LoadingSpinner';
import AlertBanner from '../components/AlertBanner';

const ModelInfoPage = () => {
  const [loading, setLoading] = useState(true);
  const [datasetInfo, setDatasetInfo] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [dRes, mRes] = await Promise.all([
          api.getDatasetInfo(),
          api.getModelInfo(),
        ]);
        setDatasetInfo(dRes.data.dataset_info);
        setModelInfo(mRes.data.model_info);
        setError(null);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch dataset provenance or model metrics.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading dataset provenance and machine learning metrics..." />;
  }

  if (error) {
    return (
      <div style={{ padding: '2rem 0' }}>
        <AlertBanner type="error" title="Data Unavailable" message={error} />
      </div>
    );
  }

  const baseline = modelInfo?.baseline_model || {};
  const candidate = modelInfo?.candidate_model || {};
  const featureImportances = modelInfo?.feature_importances || [];
  const cm = candidate.confusion_matrix || [[0, 0], [0, 0]];

  return (
    <div className="model-info-page">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--forest-900)' }}>
          Dataset Provenance & Machine Learning Architecture
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Transparent documentation of data sources, synthetic modeling assumptions, and model validation metrics.
        </p>
      </div>

      {/* Dataset Provenance Card */}
      <div className="card" style={{ marginBottom: '2rem', borderLeft: '6px solid var(--forest-600)' }}>
        <h2 className="card-title">
          <Database size={20} />
          <span>1. Dataset Provenance & Agricultural Data Architecture</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          <div>
            <div className="metric-row">
              <span style={{ color: 'var(--text-secondary)' }}>Dataset Name:</span>
              <strong>{datasetInfo.dataset_name}</strong>
            </div>
            <div className="metric-row">
              <span style={{ color: 'var(--text-secondary)' }}>Provenance Classification:</span>
              <strong style={{ color: '#b45309' }}>Empirically Grounded Synthetic</strong>
            </div>
            <div className="metric-row">
              <span style={{ color: 'var(--text-secondary)' }}>Total Observational Samples:</span>
              <strong>{datasetInfo.sample_count.toLocaleString()} Records</strong>
            </div>
            <div className="metric-row">
              <span style={{ color: 'var(--text-secondary)' }}>Feature Dimensions:</span>
              <strong>{datasetInfo.features_count} Columns</strong>
            </div>
            <div className="metric-row">
              <span style={{ color: 'var(--text-secondary)' }}>Target Distress Prevalence:</span>
              <strong>{datasetInfo.class_distribution?.['Distress Rate'] || '18.10%'}</strong>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '0.9rem', color: 'var(--forest-900)', marginBottom: '0.5rem' }}>
              Why Public Data Restrictions Apply
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              {datasetInfo.public_data_restrictions_explanation}
            </p>
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--forest-50)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--forest-800)' }}>
              <strong>Agronomic Parameters:</strong> Synthesized to match Indian agro-climatic zones, typical Kharif/Rabi cropping rotations (Paddy, Wheat, Cotton, Sugarcane, Maize, Mustard, Groundnut, Pulses), and KCC scale-of-finance guidelines.
            </div>
          </div>
        </div>
      </div>

      {/* Target Definition Card */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="card-title">
          <Scale size={20} />
          <span>2. Target Variable & Prediction Horizon</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '0.75rem' }}>
          <div style={{ background: 'var(--bg-surface-subtle)', padding: '1.25rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Target Variable</span>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--forest-900)', marginTop: '0.2rem' }}>
              <code>repayment_difficulty</code> (Binary 0 / 1)
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Positive Class (1): Borrower faced repayment distress, restructuring, or 90+ DPD overdue.<br />
              Negative Class (0): Borrower fulfilled seasonal credit commitments on schedule.
            </p>
          </div>

          <div style={{ background: 'var(--bg-surface-subtle)', padding: '1.25rem', borderRadius: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Evaluation Horizon</span>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--forest-900)', marginTop: '0.2rem' }}>
              12-Month Agricultural Crop Loan Cycle
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Evaluates cash sufficiency across both sowing and harvest periods, preventing post-outcome data leakage.
            </p>
          </div>
        </div>
      </div>

      {/* Model Performance Comparison Table */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="card-title">
          <BrainCircuit size={20} />
          <span>3. Model Comparison: Baseline vs. Candidate Architecture</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          Models evaluated via 5-Fold Stratified Cross-Validation on training data and an independent 20% held-out test split.
        </p>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Model Architecture</th>
                <th>Type</th>
                <th>5-Fold CV Mean F1</th>
                <th>5-Fold CV ROC-AUC</th>
                <th>Test Precision (Distress)</th>
                <th>Test Recall (Distress)</th>
                <th>Test F1 Score</th>
                <th>Test ROC-AUC</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Logistic Regression</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Balanced weights, Standardized</div>
                </td>
                <td>Baseline</td>
                <td>{(baseline.cv_mean_f1 || 0).toFixed(4)}</td>
                <td>{(baseline.cv_mean_roc_auc || 0).toFixed(4)}</td>
                <td>{(baseline.test_precision || 0).toFixed(4)}</td>
                <td>{(baseline.test_recall || 0).toFixed(4)}</td>
                <td>{(baseline.test_f1 || 0).toFixed(4)}</td>
                <td>{(baseline.test_roc_auc || 0).toFixed(4)}</td>
              </tr>
              <tr style={{ backgroundColor: 'var(--forest-50)', fontWeight: '600' }}>
                <td>
                  <strong style={{ color: 'var(--forest-800)' }}>Random Forest Classifier</strong>
                  <div style={{ fontSize: '0.78rem', color: 'var(--forest-600)' }}>100 Trees, Max Depth 8, Balanced</div>
                </td>
                <td>
                  <span className="badge badge-supportive">Selected Candidate</span>
                </td>
                <td style={{ color: 'var(--forest-800)' }}>{(candidate.cv_mean_f1 || 0).toFixed(4)}</td>
                <td style={{ color: 'var(--forest-800)' }}>{(candidate.cv_mean_roc_auc || 0).toFixed(4)}</td>
                <td style={{ color: 'var(--forest-800)' }}>{(candidate.test_precision || 0).toFixed(4)}</td>
                <td style={{ color: 'var(--forest-800)' }}>{(candidate.test_recall || 0).toFixed(4)}</td>
                <td style={{ color: 'var(--forest-800)' }}>{(candidate.test_f1 || 0).toFixed(4)}</td>
                <td style={{ color: 'var(--forest-800)' }}>{(candidate.test_roc_auc || 0).toFixed(4)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Confusion Matrix Visualizer */}
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1rem', color: 'var(--forest-900)', marginBottom: '0.75rem' }}>
            Confusion Matrix (Candidate Random Forest Test Partition)
          </h3>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem',
              maxWidth: '380px',
              width: '100%',
              textAlign: 'center',
            }}>
              <div style={{ background: '#dcfce7', padding: '1rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '700' }}>True Negatives (TN)</span>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#166534' }}>{cm[0]?.[0] || 0}</div>
                <span style={{ fontSize: '0.72rem', color: '#15803d' }}>Correctly Low Risk</span>
              </div>
              <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: '700' }}>False Positives (FP)</span>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#991b1b' }}>{cm[0]?.[1] || 0}</div>
                <span style={{ fontSize: '0.72rem', color: '#b91c1c' }}>False Alarm</span>
              </div>
              <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#991b1b', fontWeight: '700' }}>False Negatives (FN)</span>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#991b1b' }}>{cm[1]?.[0] || 0}</div>
                <span style={{ fontSize: '0.72rem', color: '#b91c1c' }}>Undetected Risk</span>
              </div>
              <div style={{ background: '#dcfce7', padding: '1rem', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: '700' }}>True Positives (TP)</span>
                <div style={{ fontSize: '1.35rem', fontWeight: '800', color: '#166534' }}>{cm[1]?.[1] || 0}</div>
                <span style={{ fontSize: '0.72rem', color: '#15803d' }}>Correctly Flagged Distress</span>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '260px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              <strong>Agronomic Evaluation Rationale:</strong> In agricultural lending, False Negatives (granting credit to an unviable farm operation without advisory restructuring) impose acute stress on rural households. Consequently, our pipeline prioritizes high <strong>Recall (79%+)</strong> for the distress class while maintaining strong Precision (68%+).
            </div>
          </div>
        </div>
      </div>

      {/* Feature Importance Chart */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="card-title">
          <BarChart3 size={20} />
          <span>4. Top Agricultural Risk Factor Importances</span>
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          Extracted feature importances (Gini Impurity reduction) from the fitted Random Forest classifier.
        </p>

        {featureImportances.length > 0 ? (
          <div style={{ height: '360px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={featureImportances.slice(0, 10).reverse()}
                margin={{ top: 10, right: 30, left: 160, bottom: 10 }}
              >
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="feature" type="category" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${(value * 100).toFixed(2)}%`, 'Importance Weight']} />
                <Bar dataKey="importance" fill="#2D6A4F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No feature importance data loaded.
          </div>
        )}
      </div>

      {/* Limitations & Ethical Safeguards */}
      <div className="card" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
        <h2 className="card-title" style={{ color: '#92400e' }}>
          <AlertTriangle size={20} />
          <span>5. Ethical Safeguards & Model Limitations</span>
        </h2>
        <ul style={{ paddingLeft: '1.5rem', fontSize: '0.9rem', color: '#92400e', lineHeight: '1.65', marginTop: '0.5rem' }}>
          {(modelInfo?.limitations || []).map((lim, idx) => (
            <li key={idx}>{lim}</li>
          ))}
          <li>
            <strong>Fairness Protection:</strong> Protected personal traits (caste, religion, gender) are excluded from model training to prevent discriminatory proxies.
          </li>
          <li>
            <strong>Scale Neutrality:</strong> Smallholder acreage is not used as an automated rejection barrier; debt coverage is evaluated relative to actual cultivation scale.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default ModelInfoPage;
