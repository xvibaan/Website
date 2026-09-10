import Link from 'next/link';
import { ShoppingCart, User, Menu } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="border-b border-slate-800 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left Section: Logo & Brand */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center font-bold text-white">M</div>
            <Link href="/" className="text-xl font-bold tracking-tight text-white">
              Marketplace
            </Link>
          </div>
          
          {/* Middle Section: Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/products" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Products</Link>
            <Link href="/resellers" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">Reseller API</Link>
          </div>

          {/* Right Section: Actions */}
          <div className="flex items-center space-x-4">
            <button className="p-2 text-slate-400 hover:text-white transition-colors" aria-label="Cart">
              <ShoppingCart className="w-5 h-5" />
            </button>
            
            {/* Updated Auth Links */}
            <Link href="/login" className="hidden md:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all">
              <User className="w-4 h-4" />
              <span>Login</span>
            </Link>
            
            <Link href="/register" className="hidden md:flex items-center gap-2 bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-primary/20">
              <span>Sign Up</span>
            </Link>

            {/* Mobile Menu Toggle */}
            <button className="md:hidden p-2 text-slate-400 hover:text-white" aria-label="Menu">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
