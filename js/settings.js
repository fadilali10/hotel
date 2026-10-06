document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    console.log("=================================");
    console.log("STAR HOTELS - SETTINGS.JS");
    console.log("=================================");


    /* =====================================================
       SUPABASE
    ===================================================== */

    const supabase = window.supabaseClient;

    const $ = (id) => {
        return document.getElementById(id);
    };


    if (!supabase) {

        console.error(
            "SETTINGS.JS: Supabase client is not initialized."
        );

        return;
    }


    console.log(
        "✓ SETTINGS.JS: Supabase client ready"
    );


    /* =====================================================
       STATE
    ===================================================== */

    let hotelId = null;
    let currentUser = null;
    let currentProfile = null;
    let originalHotel = null;

    let isHotelSaving = false;
    let isRegionalSaving = false;
    let isLoggingOut = false;


    /* =====================================================
       HELPERS
    ===================================================== */

    function showMessage(
        elementId,
        message,
        isError = false
    ) {

        const element = $(elementId);

        if (!element) {
            return;
        }


        if (!message) {

            element.textContent = "";
            element.className = "settings-message";

            return;
        }


        element.textContent = message;

        element.className =
            "settings-message " +
            (
                isError
                    ? "error"
                    : "success"
            );
    }


    /* -----------------------------------------------------
       SET BUTTON BUSY
    ----------------------------------------------------- */

    function setButtonBusy(
        button,
        busy,
        normalText
    ) {

        if (!button) {
            return;
        }


        button.disabled = busy;

        button.textContent =
            busy
                ? "Saving..."
                : normalText;
    }


    /* -----------------------------------------------------
       SET FIELD
       
       IMPORTANT:
       Supports:
       INPUT
       TEXTAREA
       SELECT
       STRONG
       SPAN
       P
       DIV
    ----------------------------------------------------- */

    function setField(
        id,
        value
    ) {

        const element = $(id);

        if (!element) {
            console.warn(
                `SETTINGS.JS: Element not found: ${id}`
            );

            return;
        }


        const newValue =
            value ?? "";


        /*
         * Form elements
         */
        if (
            element.tagName === "INPUT" ||
            element.tagName === "TEXTAREA" ||
            element.tagName === "SELECT"
        ) {

            element.value =
                newValue;

            return;
        }


        /*
         * Normal HTML text elements
         */
        element.textContent =
            newValue;
    }


    /* -----------------------------------------------------
       GET FORM FIELD VALUE
    ----------------------------------------------------- */

    function getFieldValue(id) {

        const element = $(id);

        if (!element) {
            return "";
        }


        return String(
            element.value ?? ""
        ).trim();
    }


    /* -----------------------------------------------------
       NORMALIZE ROLE
    ----------------------------------------------------- */

    function normalizeRole(role) {

        if (!role) {
            return "USER";
        }


        return String(role)
            .replace(/_/g, " ")
            .toUpperCase();
    }


    /* -----------------------------------------------------
       GET USER INITIALS
    ----------------------------------------------------- */

    function getInitials(name) {

        if (!name) {
            return "U";
        }


        const words =
            String(name)
                .trim()
                .split(/\s+/)
                .filter(Boolean);


        if (words.length === 0) {
            return "U";
        }


        if (words.length === 1) {

            return words[0]
                .substring(0, 2)
                .toUpperCase();
        }


        return (
            words[0][0] +
            words[words.length - 1][0]
        ).toUpperCase();
    }


    /* -----------------------------------------------------
       UPDATE HOTEL NAME EVERYWHERE
    ----------------------------------------------------- */

    function updateHotelName(
        hotelName
    ) {

        const name =
            hotelName ||
            "Hotel";


        document
            .querySelectorAll(
                "[data-hotel-name]"
            )
            .forEach(element => {

                element.textContent =
                    name;
            });


        const preview =
            $("settingsHotelPreviewName");


        if (preview) {

            preview.textContent =
                name;
        }


        const accountHotel =
            $("settingAccountHotel");


        if (accountHotel) {

            accountHotel.textContent =
                name;
        }
    }


    /* =====================================================
       FILL HOTEL FIELDS
    ===================================================== */

    function fillHotelFields(hotel) {

        if (!hotel) {
            return;
        }


        setField(
            "settingHotelName",
            hotel.name
        );


        setField(
            "settingHotelPhone",
            hotel.phone
        );


        setField(
            "settingHotelEmail",
            hotel.email
        );


        setField(
            "settingHotelWebsite",
            hotel.website
        );


        setField(
            "settingHotelAddress",
            hotel.address
        );


        setField(
            "settingHotelCity",
            hotel.city
        );


        setField(
            "settingHotelState",
            hotel.state
        );


        setField(
            "settingHotelCountry",
            hotel.country
        );


        setField(
            "settingHotelTax",
            hotel.tax_number
        );


        setField(
            "settingCurrency",
            hotel.currency || "INR"
        );


        updateHotelName(
            hotel.name
        );
    }


    /* =====================================================
       LOAD SETTINGS
    ===================================================== */

    async function loadSettings() {

        console.log(
            "SETTINGS.JS: Loading settings..."
        );


        /* =================================================
           1. CURRENT AUTH USER
        ================================================= */

        const {
            data: authData,
            error: authError
        } =
            await supabase.auth.getUser();


        if (authError) {

            console.error(
                "SETTINGS.JS: Auth error:",
                authError
            );

            throw authError;
        }


        if (!authData?.user) {

            console.warn(
                "SETTINGS.JS: No logged-in user."
            );


            window.location.href =
                "login.html";

            return;
        }


        currentUser =
            authData.user;


        console.log(
            "✓ Logged in user:",
            currentUser.email
        );


        /* =================================================
           2. LOAD USER PROFILE
        ================================================= */

        const {
            data: profile,
            error: profileError
        } =
            await supabase
                .from("profiles")
                .select(`
                    id,
                    hotel_id,
                    full_name,
                    phone,
                    role
                `)
                .eq(
                    "id",
                    currentUser.id
                )
                .maybeSingle();


        if (profileError) {

            console.error(
                "SETTINGS.JS: Profile error:",
                profileError
            );

            throw profileError;
        }


        if (!profile) {

            throw new Error(
                "Your user profile was not found."
            );
        }


        if (!profile.hotel_id) {

            throw new Error(
                "Your account is not linked to a hotel."
            );
        }


        currentProfile =
            profile;


        hotelId =
            Number(profile.hotel_id);


        if (
            !Number.isFinite(hotelId) ||
            hotelId <= 0
        ) {

            throw new Error(
                "Invalid hotel ID in your user profile."
            );
        }


        console.log(
            "✓ Hotel ID:",
            hotelId
        );


        /* =================================================
           3. LOAD HOTEL
        ================================================= */

        const {
            data: hotel,
            error: hotelError
        } =
            await supabase
                .from("hotels")
                .select(`
                    id,
                    name,
                    logo_url,
                    address,
                    city,
                    state,
                    country,
                    phone,
                    email,
                    website,
                    currency,
                    tax_number,
                    created_at,
                    updated_at
                `)
                .eq(
                    "id",
                    hotelId
                )
                .maybeSingle();


        if (hotelError) {

            console.error(
                "SETTINGS.JS: Hotel error:",
                hotelError
            );

            throw hotelError;
        }


        if (!hotel) {

            throw new Error(
                "Hotel profile could not be found."
            );
        }


        originalHotel = {
            ...hotel
        };


        console.log(
            "✓ Hotel loaded:",
            hotel.name
        );


        /* =================================================
           4. FILL HOTEL SETTINGS
        ================================================= */

        fillHotelFields(
            originalHotel
        );


        /* =================================================
           5. ACCOUNT INFORMATION

           IMPORTANT:
           These are <strong> elements,
           so textContent is used.
        ================================================= */

        const accountName =
            profile.full_name ||
            currentUser.user_metadata?.full_name ||
            currentUser.email ||
            "User";


        const accountEmail =
            currentUser.email ||
            "";


        const accountRole =
            normalizeRole(
                profile.role
            );


        setField(
            "settingAccountName",
            accountName
        );


        setField(
            "settingAccountEmail",
            accountEmail
        );


        setField(
            "settingAccountRole",
            accountRole
        );


        setField(
            "settingAccountHotel",
            hotel.name || "Hotel"
        );


        console.log(
            "✓ Account information loaded"
        );


        /* =================================================
           6. TOPBAR USER
        ================================================= */

        setField(
            "topUserName",
            accountName
        );


        setField(
            "topUserAvatar",
            getInitials(accountName)
        );


        /* =================================================
           7. DOCUMENT TITLE
        ================================================= */

        document.title =
            hotel.name
                ? `${hotel.name} - Settings`
                : "Settings - Star Hotels";


        console.log(
            "================================="
        );

        console.log(
            "✓ SETTINGS LOADED SUCCESSFULLY"
        );

        console.log(
            "User:",
            accountName
        );

        console.log(
            "Email:",
            accountEmail
        );

        console.log(
            "Role:",
            accountRole
        );

        console.log(
            "Hotel:",
            hotel.name
        );

        console.log(
            "================================="
        );
    }


    /* =====================================================
       HOTEL PROFILE SAVE
    ===================================================== */

    const hotelForm =
        $("hotelSettingsForm");


    if (hotelForm) {

        hotelForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                if (isHotelSaving) {
                    return;
                }


                if (!hotelId) {

                    showMessage(
                        "hotelSettingsMessage",
                        "Hotel profile is not loaded. Please refresh the page.",
                        true
                    );

                    return;
                }


                const hotelName =
                    getFieldValue(
                        "settingHotelName"
                    );


                if (!hotelName) {

                    showMessage(
                        "hotelSettingsMessage",
                        "Hotel name is required.",
                        true
                    );

                    return;
                }


                const phone =
                    getFieldValue(
                        "settingHotelPhone"
                    );


                const email =
                    getFieldValue(
                        "settingHotelEmail"
                    );


                const website =
                    getFieldValue(
                        "settingHotelWebsite"
                    );


                const address =
                    getFieldValue(
                        "settingHotelAddress"
                    );


                const city =
                    getFieldValue(
                        "settingHotelCity"
                    );


                const state =
                    getFieldValue(
                        "settingHotelState"
                    );


                const country =
                    getFieldValue(
                        "settingHotelCountry"
                    );


                const taxNumber =
                    getFieldValue(
                        "settingHotelTax"
                    );


                const saveButton =
                    $("saveHotelSettings");


                isHotelSaving = true;


                setButtonBusy(
                    saveButton,
                    true,
                    "Save Changes"
                );


                showMessage(
                    "hotelSettingsMessage",
                    ""
                );


                try {

                    const updatedHotel = {

                        name:
                            hotelName,

                        phone:
                            phone || null,

                        email:
                            email || null,

                        website:
                            website || null,

                        address:
                            address || null,

                        city:
                            city || null,

                        state:
                            state || null,

                        country:
                            country || null,

                        tax_number:
                            taxNumber || null,

                        updated_at:
                            new Date().toISOString()
                    };


                    const {
                        data,
                        error
                    } =
                        await supabase
                            .from("hotels")
                            .update(
                                updatedHotel
                            )
                            .eq(
                                "id",
                                hotelId
                            )
                            .select(`
                                id,
                                name,
                                logo_url,
                                address,
                                city,
                                state,
                                country,
                                phone,
                                email,
                                website,
                                currency,
                                tax_number,
                                created_at,
                                updated_at
                            `)
                            .maybeSingle();


                    if (error) {
                        throw error;
                    }


                    if (!data) {

                        throw new Error(
                            "Hotel profile was not updated. Check your Supabase permissions."
                        );
                    }


                    originalHotel = {
                        ...data
                    };


                    fillHotelFields(
                        originalHotel
                    );


                    document.title =
                        data.name
                            ? `${data.name} - Settings`
                            : "Settings - Star Hotels";


                    showMessage(
                        "hotelSettingsMessage",
                        "Hotel profile saved successfully."
                    );


                    console.log(
                        "✓ HOTEL PROFILE UPDATED"
                    );


                } catch (error) {

                    console.error(
                        "SETTINGS.JS: Hotel save error:",
                        error
                    );


                    showMessage(
                        "hotelSettingsMessage",
                        error?.message ||
                        "Could not save hotel profile.",
                        true
                    );

                } finally {

                    isHotelSaving = false;


                    setButtonBusy(
                        saveButton,
                        false,
                        "Save Changes"
                    );
                }
            }
        );
    }


    /* =====================================================
       HOTEL FORM RESET
    ===================================================== */

    if (hotelForm) {

        hotelForm.addEventListener(
            "reset",
            () => {

                setTimeout(
                    () => {

                        if (originalHotel) {

                            fillHotelFields(
                                originalHotel
                            );
                        }


                        showMessage(
                            "hotelSettingsMessage",
                            ""
                        );

                    },
                    0
                );
            }
        );
    }


    /* =====================================================
       REGIONAL SETTINGS
    ===================================================== */

    const regionalForm =
        $("regionalSettingsForm");


    if (regionalForm) {

        regionalForm.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                if (isRegionalSaving) {
                    return;
                }


                if (!hotelId) {

                    showMessage(
                        "regionalSettingsMessage",
                        "Hotel profile is not loaded.",
                        true
                    );

                    return;
                }


                const currency =
                    getFieldValue(
                        "settingCurrency"
                    );


                if (!currency) {

                    showMessage(
                        "regionalSettingsMessage",
                        "Please select a currency.",
                        true
                    );

                    return;
                }


                const saveButton =
                    $("saveRegionalSettings");


                isRegionalSaving = true;


                setButtonBusy(
                    saveButton,
                    true,
                    "Save Preferences"
                );


                showMessage(
                    "regionalSettingsMessage",
                    ""
                );


                try {

                    const {
                        data,
                        error
                    } =
                        await supabase
                            .from("hotels")
                            .update({
                                currency,
                                updated_at:
                                    new Date().toISOString()
                            })
                            .eq(
                                "id",
                                hotelId
                            )
                            .select(`
                                id,
                                currency
                            `)
                            .maybeSingle();


                    if (error) {
                        throw error;
                    }


                    if (!data) {

                        throw new Error(
                            "Currency could not be updated."
                        );
                    }


                    if (originalHotel) {

                        originalHotel.currency =
                            data.currency;
                    }


                    showMessage(
                        "regionalSettingsMessage",
                        "Regional preferences saved successfully."
                    );


                    console.log(
                        "✓ CURRENCY UPDATED:",
                        data.currency
                    );


                } catch (error) {

                    console.error(
                        "SETTINGS.JS: Regional settings error:",
                        error
                    );


                    showMessage(
                        "regionalSettingsMessage",
                        error?.message ||
                        "Could not save regional preferences.",
                        true
                    );

                } finally {

                    isRegionalSaving = false;


                    setButtonBusy(
                        saveButton,
                        false,
                        "Save Preferences"
                    );
                }
            }
        );
    }


    /* =====================================================
       SETTINGS TABS
    ===================================================== */

    const settingsTabs =
        document.querySelectorAll(
            "[data-settings-tab]"
        );


    const settingsPanels =
        document.querySelectorAll(
            ".settings-panel"
        );


    settingsTabs.forEach(
        button => {

            button.addEventListener(
                "click",
                () => {

                    const target =
                        button.dataset.settingsTab;


                    settingsTabs.forEach(
                        tab => {

                            tab.classList.toggle(
                                "active",
                                tab === button
                            );
                        }
                    );


                    settingsPanels.forEach(
                        panel => {

                            panel.classList.remove(
                                "active"
                            );
                        }
                    );


                    const panels = {

                        hotel:
                            "hotelSettingsPanel",

                        regional:
                            "regionalSettingsPanel",

                        account:
                            "accountSettingsPanel"
                    };


                    const panelId =
                        panels[target];


                    if (panelId) {

                        const panel =
                            $(panelId);


                        if (panel) {

                            panel.classList.add(
                                "active"
                            );
                        }
                    }
                }
            );
        }
    );


    /* =====================================================
       LOGOUT
    ===================================================== */

    async function logout() {

        if (isLoggingOut) {
            return;
        }


        const confirmed =
            confirm(
                "Are you sure you want to log out?"
            );


        if (!confirmed) {
            return;
        }


        isLoggingOut = true;


        const buttons = [
            $("settingsLogoutButton"),
            $("settingsLogoutButtonAccount")
        ];


        buttons.forEach(
            button => {

                if (!button) {
                    return;
                }


                button.disabled = true;

                button.textContent =
                    "Logging out...";
            }
        );


        try {

            const {
                error
            } =
                await supabase.auth.signOut();


            if (error) {
                throw error;
            }


            window.location.href =
                "login.html";


        } catch (error) {

            console.error(
                "SETTINGS.JS: Logout error:",
                error
            );


            alert(
                "Logout failed: " +
                (
                    error?.message ||
                    "Unknown error"
                )
            );


            isLoggingOut = false;


            buttons.forEach(
                button => {

                    if (!button) {
                        return;
                    }


                    button.disabled = false;

                    button.textContent =
                        "Logout";
                }
            );
        }
    }


    const logoutButton =
        $("settingsLogoutButton");


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            logout
        );
    }


    const logoutAccountButton =
        $("settingsLogoutButtonAccount");


    if (logoutAccountButton) {

        logoutAccountButton.addEventListener(
            "click",
            logout
        );
    }


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    const mobileMenu =
        $("mobileMenu");


    const sidebar =
        $("sidebar");


    const sidebarBackdrop =
        $("sidebarBackdrop");


    function openMobileSidebar() {

        if (sidebar) {
            sidebar.classList.add("open");
        }


        if (sidebarBackdrop) {
            sidebarBackdrop.classList.add("show");
        }
    }


    function closeMobileSidebar() {

        if (sidebar) {
            sidebar.classList.remove("open");
        }


        if (sidebarBackdrop) {
            sidebarBackdrop.classList.remove("show");
        }
    }


    if (mobileMenu) {

        mobileMenu.addEventListener(
            "click",
            openMobileSidebar
        );
    }


    if (sidebarBackdrop) {

        sidebarBackdrop.addEventListener(
            "click",
            closeMobileSidebar
        );
    }


    document
        .querySelectorAll(
            ".sidebar .nav-item"
        )
        .forEach(link => {

            link.addEventListener(
                "click",
                closeMobileSidebar
            );
        });


    /* =====================================================
       AUTH STATE
    ===================================================== */

    supabase.auth.onAuthStateChange(
        (event) => {

            console.log(
                "SETTINGS AUTH EVENT:",
                event
            );


            if (
                event === "SIGNED_OUT"
            ) {

                window.location.href =
                    "login.html";
            }
        }
    );


    /* =====================================================
       INITIALIZE
    ===================================================== */

    loadSettings()
        .catch(error => {

            console.error(
                "SETTINGS.JS: Initialization error:",
                error
            );


            showMessage(
                "hotelSettingsMessage",
                error?.message ||
                "Could not load hotel settings.",
                true
            );
        });

});