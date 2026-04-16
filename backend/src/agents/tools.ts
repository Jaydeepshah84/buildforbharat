import { DynamicTool } from "@langchain/core/tools";
import { supabase } from "../config/supabase";

export const dbRead = (table: string, userId?: boolean) =>
  new DynamicTool({
    name: `get_${table}`,
    description: `Get ${table} data. Input: user ID or course ID.`,
    func: async (id: string) => {
      const { data } = await supabase
        .from(table)
        .select("*")
        .eq(userId ? "user_id" : "id", id.trim())
        .limit(20);
      return JSON.stringify(data || []);
    },
  });

export const dbWrite = (table: string) =>
  new DynamicTool({
    name: `save_${table}`,
    description: `Save data to ${table}. Input: JSON string.`,
    func: async (input: string) => {
      const { data, error } = await supabase
        .from(table)
        .insert(JSON.parse(input))
        .select()
        .single();
      return JSON.stringify(error ? { error: error.message } : data);
    },
  });
