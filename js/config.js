// Backend configuration.
// Leave supabaseUrl / supabaseAnonKey empty to run in local-only mode
// (progress is kept in this browser; Google login is disabled).
// The anon key is designed to be public; access is protected by the
// Row Level Security policies in supabase/schema.sql.
export const CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  // Namespaces the derived password for name+PIN accounts. Not a secret.
  pinPepper: 'swf-v1-',
  // Name+PIN lockout (client-side convenience; real limits are enforced by Supabase).
  maxPinTries: 5,
  lockMinutes: 5,
};
