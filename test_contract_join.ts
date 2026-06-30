import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { data, error } = await supabase
    .from("contracten")
    .select(`
      id, organisatie_id,
      organisaties:organisatie_id (id, name, type, parent_id, parent:parent_id (id, name))
    `)
    .limit(3);
  console.log(JSON.stringify({ data, error }, null, 2));
}
main();
