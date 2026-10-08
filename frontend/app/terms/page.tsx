import { Metadata } from "next";
import { buildMetadata, LEGAL_PAGES_FINALIZED } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of Service",
  description: "Terms of Service and conditions for using the marketplace.",
  path: "/terms",
  noindex: !LEGAL_PAGES_FINALIZED,
});

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-4xl py-12 px-4 sm:px-6">
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-10 shadow-[0_0_15px_rgba(0,194,255,0.1)]">
        <p className="text-primary font-bold text-center text-sm md:text-base">
          This policy is a structural placeholder and must be replaced with the marketplace owner&apos;s final legal/business policy before production use.
        </p>
      </div>

      <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-8 tracking-tight">Terms of Service</h1>
      
      <div className="prose prose-invert max-w-none text-gray-300 space-y-8">
        <section>
          <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">1. Introduction</h2>
          <p>
            Welcome to Host Market Place. By accessing our website, you agree to these Terms of Service.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">2. Business Information</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-gray-400">
            <li><strong className="text-gray-200">Brand / Business Name:</strong> Host Market Place</li>
            <li><strong className="text-gray-200">Owner / Operator:</strong> Host</li>
            <li><strong className="text-gray-200">Legal Entity:</strong> No registered company/legal entity is publicly claimed under the name Host Market Place.</li>
            <li><strong className="text-gray-200">Registered Address:</strong> No registered office address is currently published.</li>
            <li><strong className="text-gray-200">Contact Email:</strong> supporthostmarket@gmail.com</li>
            <li><strong className="text-gray-200">Governing Law/Jurisdiction:</strong> India, Punjab</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-white mb-4 border-b border-white/10 pb-2">3. General Conditions</h2>
          <p>
            We reserve the right to refuse service to anyone for any reason at any time. You understand that your content (not including credit card information), may be transferred unencrypted and involve (a) transmissions over various networks; and (b) changes to conform and adapt to technical requirements of connecting networks or devices.
          </p>
        </section>
      </div>
    </div>
  );
}
