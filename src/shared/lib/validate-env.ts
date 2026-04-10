const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

export function validateEnv(): void {
  const missing = requiredEnvVars.filter(
    (key) =>
      !import.meta.env[key] ||
      import.meta.env[key] === `your-${key.toLowerCase().replace(/_/g, '-')}`
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        `Check your .env.local file against .env.example.`
    );
  }
}
