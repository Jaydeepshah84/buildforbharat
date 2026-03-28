import { supabase } from "../config/supabase";

// Safe DB operations — return defaults instead of throwing

export async function getById(table: string, id: string) {
  try {
    const { data } = await supabase.from(table).select("*").eq("id", id).single();
    return data;
  } catch { return null; }
}

export async function getByUserId(table: string, userId: string) {
  try {
    const { data } = await supabase.from(table).select("*").eq("user_id", userId);
    return data || [];
  } catch { return []; }
}

export async function getAll(table: string, filters: Record<string, any> = {}, limit = 50) {
  try {
    let q = supabase.from(table).select("*");
    Object.entries(filters).forEach(([k, v]) => { if (v) q = q.eq(k, v); });
    const { data } = await q.order("created_at", { ascending: false }).limit(limit);
    return data || [];
  } catch { return []; }
}

export async function insert(table: string, row: any) {
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function upsert(table: string, row: any, conflict: string) {
  try {
    const { data } = await supabase.from(table).upsert(row, { onConflict: conflict }).select().single();
    return data;
  } catch { return null; }
}

export async function remove(table: string, id: string) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function getCourseWithModules(id: string) {
  try {
    const { data } = await supabase.from("courses")
      .select("*, modules(*, lessons(*, topics(*)))")
      .eq("id", id).single();

    // Sort by order_index
    if (data?.modules) {
      data.modules.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
      data.modules.forEach((m: any) => {
        if (m.lessons) {
          m.lessons.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
          m.lessons.forEach((l: any) => {
            if (l.topics) l.topics.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
          });
        }
      });
    }

    return data;
  } catch { return null; }
}

export async function getUserById(id: string) {
  try {
    const { data } = await supabase.from("users").select("*").eq("id", id).single();
    return data;
  } catch { return null; }
}

export async function createUser(userData: any) {
  try {
    const { data } = await supabase.from("users").insert(userData).select().single();
    return data;
  } catch { return null; }
}
