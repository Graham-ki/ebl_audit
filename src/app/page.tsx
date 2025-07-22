"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion"; // For animations

const DashboardPage = () => {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-6">
      {/* Logo and Welcome Text */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center mb-8"
      >
        <Image
          src="/images/logo.png"
          alt="Company Logo"
          width={120}
          height={120}
          className="rounded-full border-4 border-white shadow-lg"
        />
        <h1 className="text-3xl font-bold text-gray-800 mt-4">Welcome to the Dashboard</h1>
        <p className="text-gray-600 text-center mt-2">Click to continue</p>
      </motion.div>

      {/* Cards Container */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-1 gap-6"
      >
        {/* Admin Card */}
        <Card className="w-80 shadow-lg hover:shadow-xl transition-shadow bg-white">
          <CardHeader>
            <CardTitle className="text-center text-xl font-bold text-gray-800">
              Admin Panel
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600 mb-4">Manage users, orders, and system settings.</p>
            <Link href="/admin">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-black font-semibold py-2 rounded-lg transition-colors">
                Go to Admin
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-8 text-center text-gray-500"
      >
        <p>© 2025 E.B.L. All rights reserved.</p>
      </motion.div>
    </div>
  );
};

export default DashboardPage;