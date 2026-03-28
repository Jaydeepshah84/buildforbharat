import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "./env";

export const supabase: SupabaseClient = createClient(config.supabaseUrl, config.supabaseServiceKey);
export const supabaseAnon: SupabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey);
