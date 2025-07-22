'use server';

import { createClient } from '@/supabase/server';

export const authenticate = async (email: string, password: string) => {
  const supabase = createClient();
  try {
    // Authenticate the user with email and password
    const { data: authData, error: authError } = await (await supabase).auth.signInWithPassword({
      email,
      password,
    });

    // Handle authentication error
    if (authError) throw authError;

    // Fetch user data to check role
    const { data: userData, error: userError } = await (await supabase)
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    // Handle user data errors
    if (userError || !userData) {
      throw new Error('User data not found or error fetching user data');
    }

    // Check if user is an admin
    if (userData.type !== 'ADMIN') {
      alert('Access denied: User is not an admin');
      return;
    }

    // Return user data for further use (optional)
    return userData;
  } catch (error) {
    console.log('AUTHENTICATION ERROR', error);
    throw error;
  }
};
export const getLatestUsers = async () => {
  const supabase =  createClient();
  const { data, error } = await (await supabase)
    .from('users')
    .select('id, email, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw new Error(`Error fetching latest users: ${error.message}`);

  return data.map(
    (user: { id: string; email: string; created_at: string | null }) => ({
      id: user.id,
      email: user.email,
      date: user.created_at,
    })
  );
};
