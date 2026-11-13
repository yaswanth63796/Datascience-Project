import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sprout, LayoutDashboard, PlusCircle, BrainCircuit, ShieldCheck, LogOut, User, Calculator, BarChart3 } from 'lucide-react';
import '../styles/navbar.css';

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('agricredit_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    }
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem('agricredit_token');
    localStorage.removeItem('agricredit_user');
    setUser(null);
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="brand-logo-icon">
            <Sprout size={24} color="#ffffff" />
          </div>
          <div className="brand-text">
            <span className="brand-title">AgriCredit</span>
            <span className="brand-subtitle">Agricultural Credit Assessment</span>
          </div>
        </Link>

        <nav className="navbar-nav">
          <Link to="/dashboard" className={`nav-link ${isActive('/dashboard') ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </Link>
          <Link to="/eda" className={`nav-link ${isActive('/eda') ? 'active' : ''}`}>
            <BarChart3 size={18} />
            <span>EDA Dashboard</span>
          </Link>
          <Link to="/eligibility" className={`nav-link ${isActive('/eligibility') ? 'active' : ''}`}>
            <Calculator size={18} />
            <span>Loan Eligibility Prediction</span>
          </Link>
          <Link to="/apply" className={`nav-link ${isActive('/apply') ? 'active' : ''}`}>
            <PlusCircle size={18} />
            <span>New Application</span>
          </Link>
          <Link to="/model-info" className={`nav-link ${isActive('/model-info') ? 'active' : ''}`}>
            <BrainCircuit size={18} />
            <span>Model & Data</span>
          </Link>
          <Link to="/admin" className={`nav-link ${isActive('/admin') ? 'active' : ''}`}>
            <ShieldCheck size={18} />
            <span>Admin Review</span>
          </Link>
        </nav>

        <div className="navbar-actions">
          {user ? (
            <div className="user-badge-wrapper">
              <span className="user-role-badge">
                <User size={14} />
                <span>{user.username} ({user.role})</span>
              </span>
              <button onClick={handleLogout} className="btn-icon-logout" title="Sign Out">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-sm btn-secondary">
              Officer Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
