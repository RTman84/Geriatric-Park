export interface AccountConfig {
  supabaseUrl: string;
  supabasePublishableKey: string;
}

function readEnv(name: string): string {
  const value = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[name];
  return typeof value === 'string' ? value.trim() : '';
}

const supabaseUrl = readEnv('VITE_SUPABASE_URL');
const supabasePublishableKey = readEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

export const accountConfig: AccountConfig | null =
  supabaseUrl && supabasePublishableKey
    ? { supabaseUrl, supabasePublishableKey }
    : null;
