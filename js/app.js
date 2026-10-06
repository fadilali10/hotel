document.addEventListener("DOMContentLoaded", async function () {

    "use strict";

    console.log("=================================");
    console.log("STAR HOTELS - DASHBOARD");
    console.log("=================================");


    // =====================================================
    // SUPABASE
    // =====================================================

    const supabase = window.supabaseClient;

    if (!supabase) {

        console.error(
            "❌ Supabase client not initialized."
        );

        showConnectionError(
            "Supabase connection is not available. Check config.js and supabase.js."
        );

        return;
    }

    console.log("✓ Supabase client connected.");


    // =====================================================
    // STATE
    // =====================================================

    let currentUser = null;
    let currentProfile = null;
    let currentHotel = null;

    let dashboardLoading = false;


    // =====================================================
    // ELEMENT HELPER
    // =====================================================

    function $(id) {

        return document.getElementById(id);
    }


    // =====================================================
    // HTML ESCAPE
    // =====================================================

    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    // =====================================================
    // INITIALS
    // =====================================================

    function getInitials(name) {

        if (!name) {
            return "U";
        }

        const cleanName =
            String(name).trim();

        if (!cleanName) {
            return "U";
        }

        const parts =
            cleanName.split(/\s+/);

        if (parts.length === 1) {

            return parts[0]
                .substring(0, 2)
                .toUpperCase();
        }

        return (
            parts[0][0] +
            parts[parts.length - 1][0]
        ).toUpperCase();
    }


    // =====================================================
    // FORMAT CURRENCY
    // =====================================================

    function formatCurrency(value) {

        const amount =
            Number(value || 0);

        const currency =
            currentHotel?.currency ||
            "INR";

        try {

            return new Intl.NumberFormat(
                "en-IN",
                {
                    style: "currency",
                    currency: currency,
                    maximumFractionDigits: 2
                }
            ).format(amount);

        } catch (error) {

            return "₹" +
                amount.toLocaleString(
                    "en-IN",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                );
        }
    }


    // =====================================================
    // SET NUMBER
    // =====================================================

    function setNumber(id, value) {

        const element = $(id);

        if (!element) {
            return;
        }

        element.textContent =
            Number(value || 0)
                .toLocaleString("en-IN");
    }


    // =====================================================
    // SET CURRENCY
    // =====================================================

    function setCurrency(id, value) {

        const element = $(id);

        if (!element) {
            return;
        }

        element.textContent =
            formatCurrency(value);
    }


    // =====================================================
    // CONNECTION ERROR
    // =====================================================

    function showConnectionError(message) {

        console.error(message);


        const subtitle =
            $("pageSubtitle");

        if (subtitle) {

            subtitle.textContent =
                "Connection problem";
        }


        const statusText =
            document.querySelector(
                ".hotel-status strong"
            );

        const statusSmall =
            document.querySelector(
                ".hotel-status small"
            );

        const statusDot =
            document.querySelector(
                ".status-dot"
            );


        if (statusText) {

            statusText.textContent =
                "Connection Error";
        }


        if (statusSmall) {

            statusSmall.textContent =
                "Check Supabase connection";
        }


        if (statusDot) {

            statusDot.style.background =
                "#ef4444";
        }
    }


    // =====================================================
    // CHECK LOGIN
    // =====================================================

    async function checkLogin() {

        try {

            const {
                data,
                error
            } = await supabase.auth.getSession();


            if (error) {

                console.error(
                    "Session error:",
                    error
                );

                return null;
            }


            currentUser =
                data?.session?.user || null;


            console.log(
                "Current user:",
                currentUser
                    ? currentUser.email
                    : "Not logged in"
            );


            return currentUser;

        } catch (error) {

            console.error(
                "Login check error:",
                error
            );

            return null;
        }
    }


    // =====================================================
    // REQUIRE LOGIN
    // =====================================================

    function requireLogin() {

        const answer =
            confirm(
                "Please login to continue.\n\n" +
                "You need a hotel account to use this feature.\n\n" +
                "Click OK to open the login page."
            );


        if (answer) {

            window.location.href =
                "login.html";
        }
    }


    // =====================================================
    // LOAD PROFILE + HOTEL
    // =====================================================

    async function loadUserInformation() {

        updateProfileDisplay(
            "Guest",
            "Please Login",
            "GUEST"
        );


        if (!currentUser) {

            currentProfile = null;
            currentHotel = null;

            updateHotelDisplay(null);

            return false;
        }


        try {

            // =================================================
            // PROFILE
            // =================================================

            const {
                data: profile,
                error: profileError
            } = await supabase
                .from("profiles")
                .select(
                    "id, hotel_id, full_name, phone, role"
                )
                .eq(
                    "id",
                    currentUser.id
                )
                .maybeSingle();


            if (profileError) {

                console.error(
                    "Profile loading error:",
                    profileError
                );

                currentProfile = null;

            } else {

                currentProfile =
                    profile || null;
            }


            // =================================================
            // HOTEL
            // =================================================

            currentHotel = null;


            if (currentProfile?.hotel_id) {

                const {
                    data: hotel,
                    error: hotelError
                } = await supabase
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
                        currentProfile.hotel_id
                    )
                    .maybeSingle();


                if (hotelError) {

                    console.error(
                        "Hotel loading error:",
                        hotelError
                    );

                } else {

                    currentHotel =
                        hotel || null;
                }
            }


            // =================================================
            // USER DISPLAY
            // =================================================

            const name =
                currentProfile?.full_name ||
                currentUser.user_metadata?.full_name ||
                currentUser.email ||
                "User";


            const role =
                currentProfile?.role ||
                "OWNER";


            updateProfileDisplay(
                name,
                role,
                "LOGGED IN"
            );


            // =================================================
            // HOTEL DISPLAY
            // =================================================

            updateHotelDisplay(
                currentHotel
            );


            return true;

        } catch (error) {

            console.error(
                "User information error:",
                error
            );

            return false;
        }
    }


    // =====================================================
    // UPDATE TOP PROFILE
    // =====================================================

    function updateProfileDisplay(
        name,
        role,
        status
    ) {

        const profile =
            document.querySelector(
                ".user-profile"
            );


        if (!profile) {
            return;
        }


        const avatar =
            profile.querySelector(
                ".avatar"
            );


        const nameElement =
            profile.querySelector(
                "strong"
            );


        const roleElement =
            profile.querySelector(
                "span"
            );


        if (avatar) {

            avatar.textContent =
                getInitials(name);
        }


        if (nameElement) {

            nameElement.textContent =
                name;
        }


        if (roleElement) {

            roleElement.textContent =
                status === "LOGGED IN"
                    ? role
                    : "Please Login";
        }
    }


    // =====================================================
    // UPDATE HOTEL DISPLAY
    // =====================================================

    function updateHotelDisplay(hotel) {

        const subtitle =
            $("pageSubtitle");


        const heading =
            document.querySelector(
                ".welcome-card h2"
            );


        if (!hotel) {

            if (subtitle) {

                subtitle.textContent =
                    "Welcome to Star Hotels";
            }


            if (heading) {

                heading.textContent =
                    "Welcome to Star Hotels 👋";
            }


            document.title =
                "Star Hotels - Dashboard";


            return;
        }


        const hotelName =
            hotel.name ||
            "Star Hotels";


        if (subtitle) {

            subtitle.textContent =
                "Welcome to " +
                hotelName;
        }


        if (heading) {

            heading.textContent =
                hotelName +
                " Dashboard";
        }


        document.title =
            hotelName +
            " - Hotel Management";
    }


    // =====================================================
    // RESET DASHBOARD
    // =====================================================

    function resetDashboardStatistics() {

        // Top statistics

        setNumber(
            "totalBookings",
            0
        );

        setNumber(
            "availableRooms",
            0
        );

        setNumber(
            "activeGuests",
            0
        );

        setCurrency(
            "todayRevenue",
            0
        );


        // Room status

        setNumber(
            "roomAvailableCount",
            0
        );

        setNumber(
            "roomReservedCount",
            0
        );

        setNumber(
            "roomOccupiedCount",
            0
        );

        setNumber(
            "roomCleaningCount",
            0
        );

        setNumber(
            "roomMaintenanceCount",
            0
        );
    }


    // =====================================================
    // LOAD BOOKINGS THIS MONTH
    // =====================================================

    async function loadBookingsCount(
        hotelId
    ) {

        const now =
            new Date();


        const startOfMonth =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                1,
                0,
                0,
                0,
                0
            ).toISOString();


        const startOfNextMonth =
            new Date(
                now.getFullYear(),
                now.getMonth() + 1,
                1,
                0,
                0,
                0,
                0
            ).toISOString();


        const {
            count,
            error
        } = await supabase
            .from("bookings")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "hotel_id",
                hotelId
            )
            .gte(
                "created_at",
                startOfMonth
            )
            .lt(
                "created_at",
                startOfNextMonth
            );


        if (error) {

            console.error(
                "Bookings count error:",
                error
            );

            return 0;
        }


        return count || 0;
    }


    // =====================================================
    // LOAD ROOM COUNTS
    // =====================================================

    async function loadRoomCounts(
        hotelId
    ) {

        const statuses = [
            "AVAILABLE",
            "RESERVED",
            "OCCUPIED",
            "CLEANING",
            "MAINTENANCE"
        ];


        const counts = {

            total: 0,

            AVAILABLE: 0,

            RESERVED: 0,

            OCCUPIED: 0,

            CLEANING: 0,

            MAINTENANCE: 0
        };


        // =================================================
        // TOTAL
        // =================================================

        const {
            count: total,
            error: totalError
        } = await supabase
            .from("rooms")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "hotel_id",
                hotelId
            );


        if (totalError) {

            console.error(
                "Total rooms error:",
                totalError
            );

        } else {

            counts.total =
                total || 0;
        }


        // =================================================
        // STATUS COUNTS
        // =================================================

        for (
            const status of statuses
        ) {

            const {
                count,
                error
            } = await supabase
                .from("rooms")
                .select(
                    "id",
                    {
                        count: "exact",
                        head: true
                    }
                )
                .eq(
                    "hotel_id",
                    hotelId
                )
                .eq(
                    "status",
                    status
                );


            if (error) {

                console.error(
                    `${status} rooms error:`,
                    error
                );

                continue;
            }


            counts[status] =
                count || 0;
        }


        return counts;
    }


    // =====================================================
    // LOAD ACTIVE GUESTS
    // =====================================================

    async function loadActiveGuests(
        hotelId
    ) {

        const {
            count,
            error
        } = await supabase
            .from("stays")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "hotel_id",
                hotelId
            )
            .eq(
                "status",
                "ACTIVE"
            );


        if (error) {

            console.error(
                "Active stays error:",
                error
            );

            return 0;
        }


        return count || 0;
    }


    // =====================================================
    // LOAD TODAY REVENUE
    // =====================================================

    async function loadTodayRevenue(
        hotelId
    ) {

        const now =
            new Date();


        const startOfDay =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                0,
                0,
                0,
                0
            ).toISOString();


        const startOfNextDay =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() + 1,
                0,
                0,
                0,
                0
            ).toISOString();


        /*
         * We intentionally select only columns known to exist
         * in the current payments table.
         *
         * Do NOT add received_by here because the current
         * project schema previously showed that column missing.
         */

        const {
            data,
            error
        } = await supabase
            .from("payments")
            .select(
                "amount, payment_date, created_at"
            )
            .eq(
                "hotel_id",
                hotelId
            )
            .gte(
                "created_at",
                startOfDay
            )
            .lt(
                "created_at",
                startOfNextDay
            );


        if (error) {

            console.error(
                "Today's revenue error:",
                error
            );

            return 0;
        }


        return (data || [])
            .reduce(
                function (
                    total,
                    payment
                ) {

                    return total +
                        Number(
                            payment.amount || 0
                        );

                },
                0
            );
    }


    // =====================================================
    // LOAD DASHBOARD STATISTICS
    // =====================================================

    async function loadDashboardStatistics() {

        if (dashboardLoading) {
            return;
        }


        dashboardLoading = true;


        if (!currentUser) {

            resetDashboardStatistics();

            dashboardLoading = false;

            return;
        }


        if (!currentProfile?.hotel_id) {

            console.warn(
                "No hotel_id found for current profile."
            );

            resetDashboardStatistics();

            dashboardLoading = false;

            return;
        }


        const hotelId =
            currentProfile.hotel_id;


        try {

            // =================================================
            // LOAD ALL DASHBOARD DATA
            // =================================================

            const [
                bookingCount,
                roomCounts,
                activeGuests,
                todayRevenue
            ] = await Promise.all([

                loadBookingsCount(
                    hotelId
                ),

                loadRoomCounts(
                    hotelId
                ),

                loadActiveGuests(
                    hotelId
                ),

                loadTodayRevenue(
                    hotelId
                )
            ]);


            // =================================================
            // TOP STATISTICS
            // =================================================

            setNumber(
                "totalBookings",
                bookingCount
            );


            setNumber(
                "availableRooms",
                roomCounts.AVAILABLE
            );


            setNumber(
                "activeGuests",
                activeGuests
            );


            setCurrency(
                "todayRevenue",
                todayRevenue
            );


            // =================================================
            // ROOM STATUS
            // =================================================

            setNumber(
                "roomAvailableCount",
                roomCounts.AVAILABLE
            );


            setNumber(
                "roomReservedCount",
                roomCounts.RESERVED
            );


            setNumber(
                "roomOccupiedCount",
                roomCounts.OCCUPIED
            );


            setNumber(
                "roomCleaningCount",
                roomCounts.CLEANING
            );


            setNumber(
                "roomMaintenanceCount",
                roomCounts.MAINTENANCE
            );


            console.log(
                "✓ Dashboard statistics loaded",
                {
                    hotelId,
                    bookingCount,
                    roomCounts,
                    activeGuests,
                    todayRevenue
                }
            );

        } catch (error) {

            console.error(
                "Dashboard statistics error:",
                error
            );

        } finally {

            dashboardLoading = false;
        }
    }


    // =====================================================
    // REFRESH DASHBOARD
    // =====================================================

    async function refreshDashboard() {

        if (!currentUser) {

            resetDashboardStatistics();

            return;
        }


        if (!currentProfile?.hotel_id) {

            resetDashboardStatistics();

            return;
        }


        await loadDashboardStatistics();
    }


    // =====================================================
    // PROFILE DROPDOWN
    // =====================================================

    function setupProfile() {

        const profile =
            document.querySelector(
                ".user-profile"
            );


        if (!profile) {
            return;
        }


        profile.style.cursor =
            "pointer";


        profile.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();


                let dropdown =
                    document.querySelector(
                        ".profile-dropdown"
                    );


                if (!dropdown) {

                    dropdown =
                        document.createElement(
                            "div"
                        );

                    dropdown.className =
                        "profile-dropdown";


                    const parent =
                        profile.parentElement;


                    if (parent) {

                        parent.style.position =
                            "relative";


                        parent.appendChild(
                            dropdown
                        );
                    }
                }


                renderProfileDropdown(
                    dropdown
                );


                dropdown.classList.toggle(
                    "show"
                );
            }
        );


        document.addEventListener(
            "click",
            function () {

                const dropdown =
                    document.querySelector(
                        ".profile-dropdown"
                    );


                if (dropdown) {

                    dropdown.classList.remove(
                        "show"
                    );
                }
            }
        );
    }


    // =====================================================
    // RENDER PROFILE DROPDOWN
    // =====================================================

    function renderProfileDropdown(
        dropdown
    ) {

        if (!currentUser) {

            dropdown.innerHTML = `

                <div class="profile-header">

                    <div class="profile-big-avatar">
                        G
                    </div>

                    <div class="profile-header-info">

                        <strong>
                            Guest
                        </strong>

                        <span>
                            Please login to continue
                        </span>

                    </div>

                </div>

                <div class="login-profile">

                    <button
                        type="button"
                        id="profileLoginButton"
                    >
                        🔐 Login to your account
                    </button>

                </div>
            `;


            const loginButton =
                $("profileLoginButton");


            if (loginButton) {

                loginButton.onclick =
                    function () {

                        window.location.href =
                            "login.html";
                    };
            }


            return;
        }


        const name =
            currentProfile?.full_name ||
            currentUser.user_metadata?.full_name ||
            currentUser.email ||
            "User";


        const role =
            currentProfile?.role ||
            "OWNER";


        const hotelName =
            currentHotel?.name ||
            "My Hotel";


        const email =
            currentUser.email ||
            "";


        dropdown.innerHTML = `

            <div class="profile-header">

                <div class="profile-big-avatar">
                    ${escapeHtml(
                        getInitials(name)
                    )}
                </div>

                <div class="profile-header-info">

                    <strong>
                        ${escapeHtml(name)}
                    </strong>

                    <span>
                        ${escapeHtml(role)}
                    </span>

                </div>

            </div>


            <div class="profile-hotel">

                <strong>
                    🏨
                    ${escapeHtml(hotelName)}
                </strong>

                <span>
                    ${escapeHtml(email)}
                </span>

            </div>


            <div class="profile-menu">

                <button
                    type="button"
                    class="profile-menu-item"
                    id="profileDetailsButton"
                >

                    <span class="profile-menu-icon">
                        👤
                    </span>

                    <span>
                        My Profile
                    </span>

                </button>


                <button
                    type="button"
                    class="profile-menu-item"
                    id="hotelSettingsButton"
                >

                    <span class="profile-menu-icon">
                        🏨
                    </span>

                    <span>
                        Hotel Settings
                    </span>

                </button>


                <button
                    type="button"
                    class="profile-menu-item"
                    id="accountSettingsButton"
                >

                    <span class="profile-menu-icon">
                        ⚙
                    </span>

                    <span>
                        Account Settings
                    </span>

                </button>


                <div class="profile-divider"></div>


                <button
                    type="button"
                    class="profile-menu-item profile-logout"
                    id="logoutButton"
                >

                    <span class="profile-menu-icon">
                        🚪
                    </span>

                    <span>
                        Logout
                    </span>

                </button>

            </div>
        `;


        // =================================================
        // MY PROFILE
        // =================================================

        const profileButton =
            $("profileDetailsButton");


        if (profileButton) {

            profileButton.onclick =
                function (event) {

                    event.stopPropagation();


                    dropdown.classList.remove(
                        "show"
                    );


                    openProfileDrawer();
                };
        }


        // =================================================
        // HOTEL SETTINGS
        // =================================================

        const hotelButton =
            $("hotelSettingsButton");


        if (hotelButton) {

            hotelButton.onclick =
                function (event) {

                    event.stopPropagation();

                    window.location.href =
                        "settings.html";
                };
        }


        // =================================================
        // ACCOUNT SETTINGS
        // =================================================

        const accountButton =
            $("accountSettingsButton");


        if (accountButton) {

            accountButton.onclick =
                function (event) {

                    event.stopPropagation();

                    window.location.href =
                        "settings.html";
                };
        }


        // =================================================
        // LOGOUT
        // =================================================

        const logoutButton =
            $("logoutButton");


        if (logoutButton) {

            logoutButton.onclick =
                async function (event) {

                    event.stopPropagation();

                    dropdown.classList.remove(
                        "show"
                    );


                    await logoutUser();
                };
        }
    }


    // =====================================================
    // PROFILE DRAWER
    // =====================================================

    function openProfileDrawer() {

        if (!currentUser) {

            requireLogin();

            return;
        }


        const drawer =
            $("profileDrawer");


        const overlay =
            $("profileOverlay");


        if (!drawer) {

            console.warn(
                "Profile drawer not found."
            );

            return;
        }


        fillProfileDrawer();


        drawer.classList.add(
            "show"
        );


        if (overlay) {

            overlay.classList.add(
                "show"
            );
        }
    }


    function closeProfileDrawer() {

        const drawer =
            $("profileDrawer");


        const overlay =
            $("profileOverlay");


        if (drawer) {

            drawer.classList.remove(
                "show"
            );
        }


        if (overlay) {

            overlay.classList.remove(
                "show"
            );
        }
    }


    // =====================================================
    // SET VALUE
    // =====================================================

    function setValue(
        id,
        value
    ) {

        const element =
            $(id);


        if (element) {

            element.value =
                value ?? "";
        }
    }


    // =====================================================
    // GET VALUE
    // =====================================================

    function getValue(id) {

        const element =
            $(id);


        if (!element) {
            return "";
        }


        return element.value.trim();
    }


    // =====================================================
    // FILL PROFILE DRAWER
    // =====================================================

    function fillProfileDrawer() {

        if (!currentUser) {
            return;
        }


        const name =
            currentProfile?.full_name ||
            currentUser.user_metadata?.full_name ||
            currentUser.email ||
            "User";


        const role =
            currentProfile?.role ||
            "OWNER";


        const hotel =
            currentHotel || {};


        // USER

        setText(
            "drawerAvatar",
            getInitials(name)
        );


        setText(
            "drawerUserName",
            name
        );


        setText(
            "drawerUserEmail",
            currentUser.email || ""
        );


        setText(
            "drawerUserRole",
            role
        );


        // HOTEL

        setValue(
            "profileHotelName",
            hotel.name || ""
        );


        setValue(
            "profilePhone",
            hotel.phone || ""
        );


        setValue(
            "profileHotelEmail",
            hotel.email ||
            currentUser.email ||
            ""
        );


        setValue(
            "profileWebsite",
            hotel.website || ""
        );


        setValue(
            "profileAddress",
            hotel.address || ""
        );


        setValue(
            "profileCity",
            hotel.city || ""
        );


        setValue(
            "profileState",
            hotel.state || ""
        );


        setValue(
            "profileCountry",
            hotel.country || "India"
        );


        setValue(
            "profileTaxNumber",
            hotel.tax_number || ""
        );
    }


    // =====================================================
    // SET TEXT
    // =====================================================

    function setText(
        id,
        value
    ) {

        const element =
            $(id);


        if (element) {

            element.textContent =
                value ?? "";
        }
    }


    // =====================================================
    // PROFILE DRAWER EVENTS
    // =====================================================

    function setupProfileDrawer() {

        const closeButton =
            $("closeProfileDrawer");


        const overlay =
            $("profileOverlay");


        const saveButton =
            $("saveProfileButton");


        const logoutButton =
            $("drawerLogoutButton");


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeProfileDrawer
            );
        }


        if (overlay) {

            overlay.addEventListener(
                "click",
                closeProfileDrawer
            );
        }


        if (saveButton) {

            saveButton.addEventListener(
                "click",
                saveHotelProfile
            );
        }


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                logoutUser
            );
        }
    }


    // =====================================================
    // SAVE HOTEL PROFILE
    // =====================================================

    async function saveHotelProfile() {

        if (!currentUser) {

            requireLogin();

            return;
        }


        if (!currentHotel?.id) {

            alert(
                "Hotel information was not found."
            );

            return;
        }


        const saveButton =
            $("saveProfileButton");


        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.textContent =
                "Saving...";
        }


        try {

            const hotelName =
                getValue(
                    "profileHotelName"
                );


            if (!hotelName) {

                alert(
                    "Hotel name is required."
                );

                return;
            }


            const updatedHotel = {

                name:
                    hotelName,

                phone:
                    getValue(
                        "profilePhone"
                    ),

                email:
                    getValue(
                        "profileHotelEmail"
                    ),

                website:
                    getValue(
                        "profileWebsite"
                    ),

                address:
                    getValue(
                        "profileAddress"
                    ),

                city:
                    getValue(
                        "profileCity"
                    ),

                state:
                    getValue(
                        "profileState"
                    ),

                country:
                    getValue(
                        "profileCountry"
                    ),

                tax_number:
                    getValue(
                        "profileTaxNumber"
                    ),

                updated_at:
                    new Date().toISOString()
            };


            const {
                data,
                error
            } = await supabase
                .from("hotels")
                .update(
                    updatedHotel
                )
                .eq(
                    "id",
                    currentHotel.id
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
                .single();


            if (error) {
                throw error;
            }


            currentHotel =
                data;


            updateHotelDisplay(
                currentHotel
            );


            fillProfileDrawer();


            alert(
                "Hotel profile saved successfully."
            );


            closeProfileDrawer();

        } catch (error) {

            console.error(
                "Hotel profile save error:",
                error
            );


            alert(
                "Could not save hotel profile.\n\n" +
                error.message
            );

        } finally {

            if (saveButton) {

                saveButton.disabled =
                    false;

                saveButton.textContent =
                    "Save Changes";
            }
        }
    }


    // =====================================================
    // LOGOUT
    // =====================================================

    async function logoutUser() {

        const confirmed =
            confirm(
                "Are you sure you want to logout?"
            );


        if (!confirmed) {
            return;
        }


        try {

            const {
                error
            } = await supabase.auth.signOut();


            if (error) {
                throw error;
            }


            currentUser = null;
            currentProfile = null;
            currentHotel = null;


            resetDashboardStatistics();


            window.location.href =
                "login.html";

        } catch (error) {

            console.error(
                "Logout error:",
                error
            );


            alert(
                "Logout failed.\n\n" +
                error.message
            );
        }
    }


    // =====================================================
    // MOBILE MENU
    // =====================================================

    function setupMobileMenu() {

        const mobileMenu =
            $("mobileMenu");


        const sidebar =
            document.querySelector(
                ".sidebar"
            );


        if (
            !mobileMenu ||
            !sidebar
        ) {
            return;
        }


        mobileMenu.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                event.stopPropagation();


                sidebar.classList.toggle(
                    "show"
                );
            }
        );


        const navLinks =
            sidebar.querySelectorAll(
                "a"
            );


        navLinks.forEach(
            function (link) {

                link.addEventListener(
                    "click",
                    function () {

                        sidebar.classList.remove(
                            "show"
                        );
                    }
                );
            }
        );
    }


    // =====================================================
    // AUTH STATE
    // =====================================================

    supabase.auth.onAuthStateChange(
        function (
            event,
            session
        ) {

            console.log(
                "Auth event:",
                event
            );


            currentUser =
                session?.user || null;


            if (!currentUser) {

                currentProfile = null;

                currentHotel = null;


                updateProfileDisplay(
                    "Guest",
                    "Please Login",
                    "GUEST"
                );


                updateHotelDisplay(
                    null
                );


                resetDashboardStatistics();


                return;
            }


            if (
                event === "SIGNED_IN" ||
                event === "TOKEN_REFRESHED" ||
                event === "INITIAL_SESSION"
            ) {

                setTimeout(
                    async function () {

                        try {

                            await loadUserInformation();

                            await refreshDashboard();

                        } catch (error) {

                            console.error(
                                "Auth refresh error:",
                                error
                            );
                        }

                    },
                    0
                );
            }
        }
    );


    // =====================================================
    // INITIALIZE
    // =====================================================

    const user =
        await checkLogin();


    setupProfile();

    setupProfileDrawer();

    setupMobileMenu();


    if (!user) {

        updateProfileDisplay(
            "Guest",
            "Please Login",
            "GUEST"
        );


        resetDashboardStatistics();


        console.log(
            "Dashboard ready - guest mode."
        );


        return;
    }


    const loaded =
        await loadUserInformation();


    if (loaded) {

        await refreshDashboard();

    } else {

        resetDashboardStatistics();
    }


    console.log(
        "================================="
    );

    console.log(
        "✓ STAR HOTELS DASHBOARD READY"
    );

    console.log(
        "================================="
    );

});