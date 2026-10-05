// =====================================================
// STAR HOTELS - SUPABASE CONFIGURATION
// =====================================================

// Supabase project URL
window.SUPABASE_URL = "https://hrnstfsldgrwkyporytg.supabase.co";

// Supabase Publishable Key
window.SUPABASE_KEY = "sb_publishable_qRadst_H3W0sWwVKOrl3Eg_jYIbigZi";


// =====================================================
// CONFIGURATION CHECK
// =====================================================

console.log("=================================");
console.log("STAR HOTELS - CONFIG.JS");
console.log("=================================");

console.log("✓ SUPABASE_URL:", window.SUPABASE_URL);

if (window.SUPABASE_KEY) {
    console.log("✓ SUPABASE_KEY: Loaded");
} else {
    console.error("❌ SUPABASE_KEY: Missing");
}

console.log("✓ CONFIG.JS LOADED");
console.log("=================================");