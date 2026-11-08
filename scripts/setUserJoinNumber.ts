// Script to update a user's join_number (displayed as user number) in the Supabase profiles table.
// Run with: `npm run set-join-number -- <user-id> <new-number>`
// Ensure you have the appropriate Supabase credentials in your environment (.env).

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase credentials not found in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error("Usage: npm run set-join-number -- <user-id> <new-number>");
    process.exit(1);
  }
  const [userId, newNumberStr] = args;
  const newNumber = Number(newNumberStr);
  if (isNaN(newNumber) || newNumber <= 0) {
    console.error("New number must be a positive integer.");
    process.exit(1);
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ join_number: newNumber })
    .eq("id", userId);

  if (error) {
    console.error("Failed to update join_number:", error);
    process.exit(1);
  }
  console.log(`Successfully set join_number of user ${userId} to ${newNumber}.`);
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});
