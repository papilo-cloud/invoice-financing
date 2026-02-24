import { CheckCircle, Shield, Loader2 } from 'lucide-react';

export const VerificationToast = ({ status, riskScore, invoiceId }) => {
  if (status === 'pending') {
    return (
      <div className="flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        <div>
          <p className="font-semibold">Verifying Invoice #{invoiceId}</p>
          <p className="text-sm text-gray-400">Chainlink is processing...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="flex items-center gap-3">
        <CheckCircle className="w-5 h-5 text-green-400" />
        <div>
          <p className="font-semibold">Invoice #{invoiceId} Verified!</p>
          <p className="text-sm text-gray-400">
            Risk Score: <span className="text-green-400 font-bold">{riskScore}/100</span>
          </p>
        </div>
      </div>
    );
  }

  return null;
};