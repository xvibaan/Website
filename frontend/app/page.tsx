import React from "react";
import { ArrowRight, Code2, ShieldCheck, Zap } from "lucide-react";

// Explicit TypeScript Interface for props
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
}

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-6xl mb-6">
          The Next-Gen <span className="text-primary">Digital Product</span> Marketplace
        </h1>
        <p className="text-lg text-slate-400 mb-10">
          Secure, fast, and scalable platform for creators and resellers. Start selling your software, APIs, and digital assets today.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-full font-medium flex items-center justify-center gap-2 transition-all">
            Explore Products <ArrowRight className="w-4 h-4" />
          </button>
          <button className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-full font-medium transition-all">
            Become a Reseller
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mt-24">
        {/* Fixed JSX Syntax and removed undefined props */}
        <FeatureCard 
          icon={<ShieldCheck className="w-8 h-8 text-emerald-400" />}
          title="Secure API Integration"
          desc="Multi-reseller JWT authentication and rate-limited API gateways."
        />
        <FeatureCard 
          icon={<Zap className="w-8 h-8 text-yellow-400" />}
          title="Scalable Architecture"
          desc="Powered by FastAPI & PostgreSQL to handle thousands of transactions."
        />
        <FeatureCard 
          icon={<Code2 className="w-8 h-8 text-purple-400" />}
          title="Developer First"
          desc="Clean modular code, ready for wallet and payment integrations."
        />
      </div>
    </div>
  );
}

// Clean implementation matching FeatureCardProps
function FeatureCard({ icon, title, desc }: FeatureCardProps) {
  return (
    <div className="bg-card p-6 rounded-2xl border border-slate-700 hover:border-slate-500 transition-colors">
      <div className="bg-slate-900/50 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{desc}</p>
    </div>
  );
}
