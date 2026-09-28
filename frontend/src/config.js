// Supabase project used for sign-in, data and statement files.
// The publishable key is designed to be public: it only allows what the row-level security
// rules in supabase/migrations allow (each user can reach only their own data).
// VITE_SUPABASE_URL / VITE_SUPABASE_KEY override these, e.g. for a separate test project.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://nuuvborfqcgfkmpxogrj.supabase.co';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_kBoCITEW9_EZo_LYBKrbfA_gnk0PBgi';

export const MAX_STATEMENTS_PER_UPLOAD = 5;
