import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ open, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white text-gray-900 border border-gray-200 rounded-lg shadow-lg max-w-lg w-full p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close About"
        >
          ×
        </button>
        <Card className="bg-white text-gray-900">
          <CardHeader>
            <CardTitle>About ReferralGuard</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-gray-900">
            <p>
              <b>ReferralGuard</b> is an advanced healthcare analytics dashboard designed to help provider networks, health systems, and payers identify, quantify, and mitigate referral leakage and market risk. It leverages real claims and provider data, machine learning, and industry best practices to surface actionable insights for network optimization and revenue recovery.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <b>Provider Risk Scores:</b> Each provider is scored based on their risk of leakage, market share, and other key factors. Higher scores indicate greater risk and higher potential impact from interventions.
              </li>
              <li>
                <b>Recovery Plan:</b> Quantifies the potential revenue recovery, implementation cost, ROI, and payback period if targeted interventions are applied to high-risk providers.
              </li>
              <li>
                <b>AI Recommendations:</b> Actionable, data-driven suggestions for each provider, tailored to their specialty, risk profile, and market context.
              </li>
              <li>
                <b>Intervention History:</b> Track past and ongoing engagement with providers, including contract renewals, negotiations, and meetings.
              </li>
              <li>
                <b>Performance Analytics:</b> View machine learning model performance, including precision, recall, F1, AUC, and confusion matrix, to understand the reliability of predictions.
              </li>
            </ul>
            <p>
              <b>How to Use:</b> Click on any provider to view detailed risk factors, recommendations, and trends. Use the Recovery Plan to estimate financial impact. Refer to Performance Analytics for model transparency.
            </p>
            <p>
              <b>Interpreting Scores:</b> Higher risk scores and revenue at risk indicate greater urgency for intervention. Recommendations are prioritized by impact and feasibility.
            </p>
            <p>
              <b>Data Sources:</b> CMS Medicare claims, NPPES, and proprietary network data. All data is de-identified and aggregated for privacy.
            </p>
            <p>
              <b>Intended Audience:</b> Healthcare executives, network managers, analysts, and anyone seeking to optimize provider networks and reduce leakage.
            </p>
            <p className="text-xs text-gray-400 pt-2">
              For questions or support, contact your ReferralGuard administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AboutModal; 