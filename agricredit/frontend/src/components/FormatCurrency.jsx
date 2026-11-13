import React from 'react';

export const formatINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '₹ 0';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const FormatCurrency = ({ amount, showDecimals = false }) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return <span>₹ 0</span>;
  }

  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);

  return <span className="currency-inr">{formatted}</span>;
};

export default FormatCurrency;
