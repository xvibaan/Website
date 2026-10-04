import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with support for any inquiries.",
  alternates: {
    canonical: "https://hostmarketplace.store/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 sm:px-6">
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-10 shadow-[0_0_15px_rgba(0,194,255,0.1)]">
        <p className="text-primary font-bold text-center text-sm md:text-base">
          This policy is a structural placeholder and must be replaced with the marketplace owner&apos;s final legal/business policy before production use.
        </p>
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-8 tracking-tight">Contact Us</h1>
      
      <div className="prose prose-invert max-w-none text-gray-300 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">1. Support</h2>
          <p>
            If you have any questions or need assistance, please feel free to reach out to our support team.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">2. Business Contact Information</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-gray-400">
            <li><strong>Company Name:</strong> [INSERT_LEGAL_COMPANY_NAME]</li>
            <li><strong>Registered Address:</strong> [INSERT_REGISTERED_ADDRESS]</li>
            <li><strong>Email:</strong> [INSERT_SUPPORT_EMAIL]</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
