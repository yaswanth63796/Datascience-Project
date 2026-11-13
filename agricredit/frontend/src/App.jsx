import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import NewApplicationPage from './pages/NewApplicationPage';
import ApplicationDetailPage from './pages/ApplicationDetailPage';
import AssessmentResultPage from './pages/AssessmentResultPage';
import ModelInfoPage from './pages/ModelInfoPage';
import AdminReviewPage from './pages/AdminReviewPage';
import LoginPage from './pages/LoginPage';
import AgriculturalLoanEligibilityPage from './pages/AgriculturalLoanEligibilityPage';
import EdaDashboardPage from './pages/EdaDashboardPage';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/eda" element={<EdaDashboardPage />} />
            <Route path="/apply" element={<NewApplicationPage />} />
            <Route path="/eligibility" element={<AgriculturalLoanEligibilityPage />} />
            <Route path="/predict-eligibility" element={<AgriculturalLoanEligibilityPage />} />
            <Route path="/applications/:id" element={<ApplicationDetailPage />} />
            <Route path="/applications/:id/assessment" element={<AssessmentResultPage />} />
            <Route path="/model-info" element={<ModelInfoPage />} />
            <Route path="/admin" element={<AdminReviewPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
