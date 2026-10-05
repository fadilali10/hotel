// ==========================================
// SUPABASE CLIENT
// ==========================================

if (!window.supabase) {

    console.error(
        "Supabase JavaScript library was not loaded."
    );

} else {

    const supabaseClient =
        window.supabase.createClient(
            window.SUPABASE_URL,
            window.SUPABASE_KEY
        );

    window.supabaseClient =
        supabaseClient;

    console.log(
        "✓ Supabase client initialized"
    );
}