/* ==========================================================
   MugArt Supabase Config
   Arquivo: js/supabase-config.js
========================================================== */

const MUGART_SUPABASE_URL = "https://qtchckrcwnsmcsbehjkq.supabase.co";
const MUGART_SUPABASE_KEY = "sb_publishable_Fqy0ZA9hRugZqT3QtFMKJA_T8FnbixR";

const mugartSupabase = window.supabase.createClient(
  MUGART_SUPABASE_URL,
  MUGART_SUPABASE_KEY
);
