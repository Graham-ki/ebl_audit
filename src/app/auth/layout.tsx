//import { ADMIN } from '@/constants/contants';
import { createClient } from '@/supabase/server';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';

export default async function AuthLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const supabase = await createClient();

  // Step 1: Get the authenticated user
  const { data: authData } = await supabase.auth.getUser();

  // Step 2: Check if the user is authenticated
  if (authData?.user) {
    // Step 3: Fetch user details (including user type)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    // Step 4: If there's an error fetching the user data, log it and return
    if (error || !data) {
      console.log('Error fetching user data', error);
      return;
    }

    // Step 5: Check if the user is an 'ADMIN'
    if (data.type !== 'ADMIN') {
      // If the user is an admin, allow access to the admin panel
      return <>{children}</>;
    } else {
      // If not an admin, redirect them to a different page (home or error page)
      return redirect('/');
    }
  }

  // Step 6: If the user is not authenticated, redirect to the login page
  // We only redirect if the current request path isn't '/auth'
  if (typeof window !== 'undefined' && window.location.pathname !== '/auth') {
    return redirect('/auth');
  }

  // Render the children (login form) when user is unauthenticated and on the correct page
  return <>{children}</>;
}
