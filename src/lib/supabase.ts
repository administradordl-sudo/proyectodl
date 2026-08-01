import { createClient } from '@supabase/supabase-js';

// En un entorno de producción, asegúrate de tener estas variables de entorno configuradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey);
