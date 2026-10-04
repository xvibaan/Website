import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy outlining data collection and usage.",
  alternates: {
    canonical: "https://hostmarketplace.store/privacy",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 sm:px-6">
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-10 shadow-[0_0_15px_rgba(0,194,255,0.1)]">
        <p className="text-primary font-bold text-center text-sm md:text-base">
          This policy is a structural placeholder and must be replaced with the marketplace owner&apos;s final legal/business policy before production use.
        </p>
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-8 tracking-tight">Privacy Policy</h1>
      
      <div className="prose prose-invert max-w-none text-gray-300 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">1. Introduction</h2>
          <p>
            At [INSERT_LEGAL_COMPANY_NAME], we are committed to protecting your privacy. This policy outlines how we collect, use, and safeguard your data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">2. Information Collection</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-gray-400">
            <li>We collect information you provide directly to us, such as when you create an account, make a purchase, or contact support.</li>
            <li><strong>Company Name:</strong> [INSERT_LEGAL_COMPANY_NAME]</li>
            <li><strong>Contact Email for Privacy Inquiries:</strong> [INSERT_SUPPORT_EMAIL]</li>
            <li><strong>Governing Law/Jurisdiction:</strong> [INSERT_GOVERNING_LAW_JURISDICTION]</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">3. Data Usage</h2>
          <p>
            We use the information we collect to operate our platform, process transactions, provide customer support, and improve our services.
          </p>
        </section>
      </div>
    </div>
  );
}
