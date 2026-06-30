const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration. Check your .env file.');
  process.exit(1);
}

// Admin client — service role key, ONLY for DB queries. Never call auth.signIn* on this.
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Anon client — used exclusively for auth.signInWithPassword so the admin client's
// session state stays as service_role (avoids RLS infinite recursion on user_profiles).
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Create a client with user's JWT token for RLS-enforced operations
const createUserClient = (token) =>
  createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false }
  });

module.exports = { supabaseAdmin, supabaseAnon, createUserClient };
