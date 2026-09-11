"use client";

import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { 
  User, 
  Shield, 
  Activity, 
  Calendar, 
  Wallet, 
  ShoppingBag, 
  LogOut,
  Clock
} from "lucide-react";

export default function DashboardPage() {
  const { user, logout } = useAuth();

  // Use optional chaining so TypeScript is happy, while relying on 
  // <ProtectedRoute> to handle the actual authentication barrier and loading states.
  const joinDate = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  return (
    <ProtectedRoute>
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Welcome back, <span className="font-medium text-gray-900 dark:text-gray-200">{user?.email}</span>
              </p>
            </div>
            <button
              onClick={async () => await logout()}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </button>
          </div>

          {/* User Profile Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Account</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white truncate" title={user?.email}>
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white capitalize">
                  {user?.role}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`w-2 h-2 rounded-full ${user?.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <p className="text-base font-semibold text-gray-900 dark:text-white">
                    {user?.is_active ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Member Since</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {joinDate}
                </p>
              </div>
            </div>
          </div>

          {/* Placeholders for Future Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            
            {/* Wallet Placeholder */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <Wallet className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Wallet</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                View your current balance, add funds, and review your transaction history.
              </p>
              <div className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-not-allowed">
                <Clock className="w-4 h-4 mr-2" />
                Coming Soon
              </div>
            </div>

            {/* Purchase History Placeholder */}
            <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Purchase History</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                Access your purchased digital products, view license keys, and download receipts.
              </p>
              <div className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg cursor-not-allowed">
                <Clock className="w-4 h-4 mr-2" />
                Coming Soon
              </div>
            </div>

          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
