// =========================================================
// STAR HOTELS
// SUPABASE CLIENT
// js/supabase.js
// =========================================================

(function () {

    "use strict";


    // =====================================================
    // START
    // =====================================================

    console.log("==========================================");
    console.log("STAR HOTELS - SUPABASE INITIALIZATION");
    console.log("==========================================");


    // =====================================================
    // 1. CHECK SUPABASE LIBRARY
    // =====================================================

    if (
        !window.supabase ||
        typeof window.supabase.createClient !== "function"
    ) {

        console.error(
            "❌ Supabase JavaScript library was not loaded."
        );

        console.error(
            "Make sure this script is loaded before supabase.js:"
        );

        console.error(
            "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"
        );


        window.supabaseClient = null;


        return;

    }


    console.log(
        "✓ Supabase JavaScript library detected."
    );


    // =====================================================
    // 2. CHECK SUPABASE URL
    // =====================================================

    if (
        typeof window.SUPABASE_URL !== "string" ||
        !window.SUPABASE_URL.trim()
    ) {

        console.error(
            "❌ SUPABASE_URL is missing."
        );

        console.error(
            "Please check: js/config.js"
        );


        window.supabaseClient = null;


        return;

    }


    const supabaseUrl =
        window.SUPABASE_URL.trim();


    // =====================================================
    // 3. VALIDATE SUPABASE URL
    // =====================================================

    try {

        const url =
            new URL(
                supabaseUrl
            );


        if (
            url.protocol !== "https:"
        ) {

            console.error(
                "❌ SUPABASE_URL must use HTTPS."
            );


            window.supabaseClient = null;


            return;

        }

    } catch (error) {

        console.error(
            "❌ SUPABASE_URL is not a valid URL."
        );

        console.error(
            "Current value:",
            supabaseUrl
        );


        window.supabaseClient = null;


        return;

    }


    // =====================================================
    // 4. CHECK SUPABASE KEY
    // =====================================================

    if (
        typeof window.SUPABASE_KEY !== "string" ||
        !window.SUPABASE_KEY.trim()
    ) {

        console.error(
            "❌ SUPABASE_KEY is missing."
        );

        console.error(
            "Please check: js/config.js"
        );


        window.supabaseClient = null;


        return;

    }


    const supabaseKey =
        window.SUPABASE_KEY.trim();


    // =====================================================
    // 5. PREVENT DUPLICATE INITIALIZATION
    // =====================================================

    if (
        window.supabaseClient &&
        typeof window.supabaseClient.from === "function"
    ) {

        console.log(
            "✓ Supabase client already initialized."
        );

        console.log(
            "✓ Using existing window.supabaseClient."
        );

        console.log(
            "✓ No duplicate client created."
        );

        console.log("==========================================");


        return;

    }


    // =====================================================
    // 6. DISPLAY SAFE CONFIGURATION STATUS
    // =====================================================

    console.log(
        "✓ Supabase library loaded."
    );

    console.log(
        "✓ Supabase URL configured:",
        supabaseUrl
    );

    console.log(
        "✓ Supabase key detected."
    );

    /*
     * IMPORTANT:
     *
     * We intentionally do NOT print the actual
     * SUPABASE_KEY in the browser console.
     *
     * Only the publishable/anon key should be used
     * in frontend code.
     */


    // =====================================================
    // 7. CREATE SUPABASE CLIENT
    // =====================================================

    try {

        const client =
            window.supabase.createClient(
                supabaseUrl,
                supabaseKey
            );


        // =================================================
        // 8. BASIC CLIENT VALIDATION
        // =================================================

        if (
            !client ||
            typeof client.from !== "function" ||
            !client.auth
        ) {

            throw new Error(
                "Supabase client was created but is invalid."
            );

        }


        // =================================================
        // 9. MAKE CLIENT GLOBAL
        // =================================================

        window.supabaseClient =
            client;


        // =================================================
        // 10. SUCCESS
        // =================================================

        console.log(
            "✓ Supabase client initialized successfully."
        );

        console.log(
            "✓ window.supabaseClient is ready."
        );

        console.log(
            "✓ Authentication API is ready."
        );

        console.log(
            "✓ Database API is ready."
        );

        console.log(
            "✓ Separate-page architecture ready."
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


        window.supabaseClient =
            null;


        // =================================================
        // OPTIONAL USER-FACING MESSAGE
        // =================================================

        /*
         * Do not create an alert here.
         *
         * Individual pages such as login.html,
         * register.html and index.html can display
         * their own messages.
         */

    }

})();