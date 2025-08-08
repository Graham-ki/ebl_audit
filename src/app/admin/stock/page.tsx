'use client';

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function LedgerPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-4 md:p-6">
      {/* Modern header with gradient and better spacing */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-500 to-teal-400 bg-clip-text text-transparent">
          Stock Management Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Manage your inventory, materials, and beverage stock with ease
        </p>
      </div>

      {/* Enhanced card grid with icons and better visual hierarchy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Materials Card */}
        <Card 
          className="cursor-pointer border border-gray-100 hover:border-blue-200 bg-white hover:bg-blue-50 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out"
          onClick={() => router.push('/admin/stock/materials')}
        >
          <CardHeader className="flex flex-row items-center space-x-4">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <span className="text-xl">📦</span>
            </div>
            <CardTitle className="text-lg font-semibold text-gray-800">Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Track materials used in production</p>
          </CardContent>
        </Card>

        {/* Categories Card */}
        <Card 
          className="cursor-pointer border border-gray-100 hover:border-green-200 bg-white hover:bg-green-50 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out"
          onClick={() => router.push('/admin/stock/categories')}
        >
          <CardHeader className="flex flex-row items-center space-x-4">
            <div className="p-2 rounded-lg bg-green-100 text-green-600">
              <span className="text-xl">🗂️</span>
            </div>
            <CardTitle className="text-lg font-semibold text-gray-800">Beverage Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Track beverage categories available for sale</p>
          </CardContent>
        </Card>

        {/* Beverages Card */}
        <Card 
          className="cursor-pointer border border-gray-100 hover:border-purple-200 bg-white hover:bg-purple-50 shadow-sm hover:shadow-md transition-all duration-200 ease-in-out"
          onClick={() => router.push('/admin/stock/products')}
        >
          <CardHeader className="flex flex-row items-center space-x-4">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <span className="text-xl">🍷</span>
            </div>
            <CardTitle className="text-lg font-semibold text-gray-800">Beverages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Track beverages available in stock</p>
          </CardContent>
        </Card>

       
      </div>

      {/* Optional onboarding tip - can be removed later */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100 max-w-2xl mx-auto">
        <h3 className="font-medium text-blue-800 mb-2">💡 Quick Tip</h3>
        <p className="text-blue-700 text-sm">
          Click on any card above to manage that section of your inventory. Each section is organized for easy navigation.
        </p>
      </div>
    </div>
  );
}
