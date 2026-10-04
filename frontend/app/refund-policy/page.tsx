import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Refund policy and guidelines for purchases.",
  alternates: {
    canonical: "https://hostmarketplace.store/refund-policy",
  },
};

export default function RefundPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 sm:px-6">
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-10 shadow-[0_0_15px_rgba(0,194,255,0.1)]">
        <p className="text-primary font-bold text-center text-sm md:text-base">
          This policy is a structural placeholder and must be replaced with the marketplace owner's final legal/business policy before production use.
        </p>
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-8 tracking-tight">Refund Policy</h1>
      
      <div className="prose prose-invert max-w-none text-gray-300 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">1. Introduction</h2>
          <p>
            At [INSERT_LEGAL_COMPANY_NAME], we want to ensure your satisfaction with our products. This document outlines our refund eligibility.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">2. Refund Conditions</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-gray-400">
            <li><strong>Refund Timeframe:</strong> [INSERT_REFUND_TIMEFRAME]</li>
            <li>Digital goods may have specific non-refundable conditions depending on the nature of the product.</li>
            <li><strong>Company Name:</strong> [INSERT_LEGAL_COMPANY_NAME]</li>
            <li><strong>Contact Support for Refunds:</strong> [INSERT_SUPPORT_EMAIL]</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">3. Process for Requesting a Refund</h2>
          <p>
            To initiate a refund, please contact us at [INSERT_SUPPORT_EMAIL] within the designated [INSERT_REFUND_TIMEFRAME]. Ensure you provide your order number and the reason for the request.
          </p>
        </section>
      </div>
    </div>
  );
}
