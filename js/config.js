// =====================================================
// STAR HOTELS
// SUPABASE CONFIGURATION
// js/config.js
// =====================================================

(function () {

    "use strict";


    // =====================================================
    // STAR HOTELS CONFIGURATION
    // =====================================================

    console.log("=================================");
    console.log("STAR HOTELS - CONFIG.JS");
    console.log("=================================");


    // =====================================================
    // 1. SUPABASE PROJECT URL
    // =====================================================

    const SUPABASE_URL =
        "https://hrnstfsldgrwkyporytg.supabase.co";


    // =====================================================
    // 2. SUPABASE PUBLISHABLE KEY
    // =====================================================

    const SUPABASE_KEY =
        "sb_publishable_qRadst_H3W0sWwVKOrl3Eg_jYIbigZi";


    // =====================================================
    // 3. MAKE CONFIGURATION AVAILABLE GLOBALLY
    // =====================================================

    window.SUPABASE_URL =
        SUPABASE_URL.trim();


    window.SUPABASE_KEY =
        SUPABASE_KEY.trim();


    // =====================================================
    // 4. VALIDATE SUPABASE URL
    // =====================================================

    let urlIsValid = false;


    try {

        const url =
            new URL(
                window.SUPABASE_URL
            );


        urlIsValid =
            url.protocol === "https:" &&
            Boolean(url.hostname);


    } catch (error) {

        urlIsValid = false;

    }


    if (urlIsValid) {

        console.log(
            "✓ SUPABASE_URL: Loaded"
        );

        console.log(
            "  →",
            window.SUPABASE_URL
        );

    } else {

        console.error(
            "❌ SUPABASE_URL: Invalid"
        );

    }


    // =====================================================
    // 5. VALIDATE SUPABASE KEY
    // =====================================================

    const keyIsValid =
        typeof window.SUPABASE_KEY === "string" &&
        window.SUPABASE_KEY.length > 0;


    if (keyIsValid) {

        console.log(
            "✓ SUPABASE_KEY: Loaded"
        );

        /*
         * Do NOT print the actual key.
         *
         * The key is intentionally hidden from
         * console output.
         */

    } else {

        console.error(
            "❌ SUPABASE_KEY: Missing or invalid"
        );

    }


    // =====================================================
    // 6. FINAL CONFIGURATION CHECK
    // =====================================================

    if (
        urlIsValid &&
        keyIsValid
    ) {

        console.log(
            "✓ Supabase configuration is ready."
        );

        window.STAR_HOTELS_CONFIG_READY =
            true;

    } else {

        console.error(
            "❌ Supabase configuration is incomplete."
        );

        window.STAR_HOTELS_CONFIG_READY =
            false;

    }


    // =====================================================
    // 7. CONFIGURATION INFORMATION
    // =====================================================

    window.STAR_HOTELS_CONFIG = {

        supabaseUrl:
            window.SUPABASE_URL,

        isReady:
            window.STAR_HOTELS_CONFIG_READY

    };


    // =====================================================
    // READY
    // =====================================================

    console.log(
        "✓ CONFIG.JS LOADED"
    );

    console.log(
        "================================="
    );


})();