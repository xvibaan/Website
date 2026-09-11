import Link from "next/link";
import { 
  Package, 
  CheckCircle, 
  Layers, 
  Key, 
  Settings, 
  PlusCircle, 
  Database, 
  ArrowRight,
  Activity
} from "lucide-react";

export default function AdminDashboardPage() {
  // Static placeholders for statistics until the backend API is implemented
  const stats = [
    { name: "Total Products", value: "—", icon: Package, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { name: "Active Products", value: "—", icon: CheckCircle, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20" },
    { name: "Total Variants", value: "—", icon: Layers, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20" },
    { name: "Available Stock", value: "—", icon: Key, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20" },
  ];

  const quickActions = [
    { 
      name: "Manage Products", 
      description: "View, edit, and delete existing marketplace products.",
      href: "/admin/products", 
      icon: Settings 
    },
    { 
      name: "Add New Product", 
      description: "Create a new digital product listing for the marketplace.",
      href: "/admin/products/new", 
      icon: PlusCircle 
    },
    { 
      name: "Manage Stock", 
      description: "Manage product variants, pricing tiers, and license keys.",
      href: "/admin/products/variants", 
      icon: Database 
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            Admin Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
            Welcome to the administrative control panel. Monitor marketplace metrics, manage product listings, and maintain digital stock inventory.
          </p>
        </div>

        {/* Overview / Stats Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Overview</h2>
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700">
              Data Pending API Integration
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div 
                key={stat.name} 
                className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4"
              >
                <div className={`w-14 h-14 ${stat.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <stat.icon className={`w-7 h-7 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions Section */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action) => (
              <Link 
                key={action.name} 
                href={action.href}
                className="group bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all flex flex-col h-full"
              >
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                  <action.icon className="w-6 h-6 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {action.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex-grow">
                  {action.description}
                </p>
                <div className="mt-6 flex items-center text-sm font-medium text-blue-600 dark:text-blue-400">
                  Access Tool <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
