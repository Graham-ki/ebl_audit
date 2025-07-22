'use client';

import { authenticate } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { motion } from 'framer-motion'; // For animations
import Image from 'next/image'; // For logo

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' }),
});

export default function Auth() {
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const router = useRouter();

  const onSubmit = async ({ email, password }: z.infer<typeof loginSchema>) => {
    setIsAuthenticating(true);

    try {
      // Authenticate user and check role
      const user = await authenticate(email, password);

      // Redirect to the admin dashboard if user is an admin
      if (user?.type === 'ADMIN') {
        router.push('/admin');
      }
    } catch (error) {
      console.log('Error during authentication', error);
      // Handle errors (e.g., show an error message)
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="flex h-svh items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto w-[350px] rounded-lg bg-white p-8 shadow-lg"
      >
        {/* Logo and Welcome Text */}
        <div className="mb-6 flex flex-col items-center">
          <Image
            src="/images/logo.png" // Replace with your logo path
            alt="Company Logo"
            width={80}
            height={80}
            className="rounded-full border-4 border-white shadow-md"
          />
          <h1 className="mt-4 text-2xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-600">Sign in to continue</p>
        </div>

        {/* Login Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <FormLabel htmlFor="email">Email</FormLabel>
                  <FormControl>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      {...field}
                      disabled={isAuthenticating}
                      className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="grid gap-2">
                  <div className="flex items-center">
                    <FormLabel htmlFor="password">Password</FormLabel>
                  </div>
                  <FormControl>
                    <Input
                      disabled={isAuthenticating}
                      id="password"
                      type="password"
                      {...field}
                      className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </FormControl>
                  <FormMessage className="text-red-500" />
                </FormItem>
              )}
            />
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                disabled={isAuthenticating}
                type="submit"
                className="w-full rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700"
              >
                {isAuthenticating ? 'Logging in...' : 'Login'}
              </Button>
            </motion.div>
          </form>
        </Form>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>© 2025 E.B.L. All rights reserved.</p>
        </div>
      </motion.div>
    </div>
  );
}