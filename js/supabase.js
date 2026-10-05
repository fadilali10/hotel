// ==========================================
// STAR HOTELS
// SUPABASE CLIENT
// ==========================================

(function () {

    console.log("==========================================");
    console.log("STAR HOTELS - SUPABASE INITIALIZATION");
    console.log("==========================================");


    // ==========================================
    // 1. CHECK SUPABASE LIBRARY
    // ==========================================

    if (!window.supabase) {

        console.error(
            "❌ Supabase JavaScript library was not loaded."
        );

        console.error(
            "Check the Supabase CDN script in index.html."
        );

        return;
    }


    // ==========================================
    // 2. CHECK SUPABASE URL
    // ==========================================

    if (!window.SUPABASE_URL) {

        console.error(
            "❌ SUPABASE_URL is missing."
        );

        console.error(
            "Check js/config.js"
        );

        return;
    }


    // ==========================================
    // 3. CHECK SUPABASE KEY
    // ==========================================

    if (!window.SUPABASE_KEY) {

        console.error(
            "❌ SUPABASE_KEY is missing."
        );

        console.error(
            "Check js/config.js"
        );

        return;
    }


    // ==========================================
    // 4. DISPLAY CONFIGURATION STATUS
    // ==========================================

    console.log(
        "✓ Supabase JavaScript library loaded"
    );

    console.log(
        "✓ Supabase URL:",
        window.SUPABASE_URL
    );

    console.log(
        "✓ Supabase key loaded"
    );


    // ==========================================
    // 5. CREATE SUPABASE CLIENT
    // ==========================================

    try {

        const supabaseClient =
            window.supabase.createClient(
                window.SUPABASE_URL,
                window.SUPABASE_KEY
            );


        // ==========================================
        // 6. MAKE CLIENT AVAILABLE GLOBALLY
        // ==========================================

        window.supabaseClient =
            supabaseClient;


        // ==========================================
        // 7. SUCCESS MESSAGE
        // ==========================================

        console.log(
            "✓ Supabase client initialized"
        );

        console.log(
            "✓ window.supabaseClient is ready"
        );

        console.log("==========================================");

    } catch (error) {

        console.error(
            "❌ Failed to initialize Supabase client."
        );

        console.error(
            "Error:",
            error
        );

        window.supabaseClient = null;
    }

})();