"""
Agricultural Subsidy Service
Handles classification, policy verification, and separation of subsidy cash flows.
Prevents double-counting and ensures unapproved subsidies are never treated as guaranteed cash.
"""
from typing import Dict, Any, Tuple

# Well-known Indian central and state agricultural support schemes for reference validation
RECOGNIZED_SCHEMES = {
    "PM_KISAN": {
        "display_name": "PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)",
        "annual_benefit_inr": 6000.0,
        "type": "Direct Income Support",
        "reliability": "high",
    },
    "PMFBY": {
        "display_name": "PMFBY (Pradhan Mantri Fasal Bima Yojana)",
        "type": "Crop Insurance Claim Subsidy",
        "reliability": "conditional_on_damage",
    },
    "SMAM": {
        "display_name": "Sub-Mission on Agricultural Mechanization (SMAM)",
        "type": "Machinery Capital Subsidy",
        "reliability": "capital_reimbursement",
    },
    "DRIP_IRRIGATION": {
        "display_name": "Per Drop More Crop (Micro Irrigation Scheme)",
        "type": "Input Subsidy",
        "reliability": "vendor_credited",
    },
    "STATE_DIRECT": {
        "display_name": "State Government Direct Farmer Income Support",
        "type": "State Support",
        "reliability": "seasonal",
    },
    "OTHER": {
        "display_name": "Other Documented Agricultural Scheme",
        "type": "General Support",
        "reliability": "requires_verification",
    },
}

class SubsidyService:
    @staticmethod
    def audit_subsidy_profile(
        scheme_name: str,
        received_inr: float,
        pending_approved_inr: float,
        applied_unapproved_inr: float,
    ) -> Dict[str, Any]:
        """
        Validates subsidy amounts and ensures strict accounting separation.
        """
        received = max(0.0, float(received_inr or 0.0))
        pending_approved = max(0.0, float(pending_approved_inr or 0.0))
        applied_unapproved = max(0.0, float(applied_unapproved_inr or 0.0))

        # Check for potential data-entry confusion or unrealistic values
        warnings = []
        if applied_unapproved > 0:
            warnings.append(
                f"₹{applied_unapproved:,.2f} applied-for subsidy is unapproved and strictly excluded from guaranteed cash-flow calculations."
            )
        
        if pending_approved > 0:
            warnings.append(
                f"₹{pending_approved:,.2f} approved subsidy is pending disbursement. Tracked as contingent receivable, not immediate operational liquidity."
            )

        if received > 200000.0:
            warnings.append(
                f"Reported confirmed subsidy of ₹{received:,.2f} is substantial for seasonal operations. Official sanction certificate must be verified."
            )

        return {
            "scheme_name": scheme_name or "Not Specified",
            "confirmed_cash_received": received,
            "contingent_approved_pending": pending_approved,
            "unapproved_speculative": applied_unapproved,
            "warnings": warnings,
            "counted_in_liquid_cashflow": received,  # ONLY confirmed cash counts in deterministic liquid cash flow
        }
