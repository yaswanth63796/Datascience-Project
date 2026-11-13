import React from 'react';
import { CheckCircle2, AlertCircle, Clock, FileQuestion, XCircle, ArrowUpRight } from 'lucide-react';

const StatusBadge = ({ status }) => {
  const normStatus = (status || '').toUpperCase();

  switch (normStatus) {
    case 'ASSESSED':
      return (
        <span className="badge badge-supportive">
          <CheckCircle2 size={12} /> Assessed
        </span>
      );
    case 'REVIEWED_SUPPORTIVE':
      return (
        <span className="badge badge-supportive" style={{ backgroundColor: '#c8e6c9', color: '#1b5e20' }}>
          <ArrowUpRight size={12} /> Officer Supported
        </span>
      );
    case 'AWAITING_REVIEW':
    case 'SUBMITTED':
      return (
        <span className="badge badge-review">
          <Clock size={12} /> Pending Review
        </span>
      );
    case 'INFORMATION_REQUESTED':
      return (
        <span className="badge badge-review" style={{ backgroundColor: '#ffe0b2', color: '#b78103' }}>
          <FileQuestion size={12} /> Info Requested
        </span>
      );
    case 'REVIEWED_REJECTED':
      return (
        <span className="badge badge-danger">
          <XCircle size={12} /> Officer Rejected
        </span>
      );
    case 'INSUFFICIENT_DATA':
      return (
        <span className="badge badge-insufficient">
          <AlertCircle size={12} /> Insufficient Data
        </span>
      );
    default:
      return (
        <span className="badge badge-insufficient">
          {status || 'Unknown'}
        </span>
      );
  }
};

export default StatusBadge;
