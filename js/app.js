document.addEventListener("DOMContentLoaded", async function () {

    console.log("=================================");
    console.log("HOTEL MANAGEMENT APP STARTED");
    console.log("=================================");


    // =====================================================
    // SUPABASE
    // =====================================================

    const supabase = window.supabaseClient;


    if (!supabase) {

        console.error(
            "Supabase client not found."
        );

        return;
    }


    console.log(
        "Supabase client connected."
    );


    // =====================================================
    // GLOBAL USER DATA
    // =====================================================

    let currentUser = null;

    let currentProfile = null;

    let currentHotel = null;


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
                data.session
                    ? data.session.user
                    : null;


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

        const answer = confirm(
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
    // LOAD USER INFORMATION
    // =====================================================

    async function loadUserInformation() {

        // ---------------------------------------------
        // DEFAULT GUEST DISPLAY
        // ---------------------------------------------

        updateProfileDisplay(
            "Guest",
            "Please Login",
            "GUEST"
        );


        if (!currentUser) {

            currentProfile = null;
            currentHotel = null;

            console.log(
                "No logged-in user."
            );

            return;
        }


        try {

            // -----------------------------------------
            // GET PROFILE
            // -----------------------------------------

            const {
                data: profile,
                error: profileError
            } = await supabase
                .from("profiles")
                .select("*")
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

            }


            currentProfile =
                profile || null;


            console.log(
                "Profile loaded:",
                currentProfile
            );


            // -----------------------------------------
            // GET HOTEL
            // -----------------------------------------

            currentHotel = null;


            if (
                currentProfile &&
                currentProfile.hotel_id
            ) {

                const {
                    data: hotel,
                    error: hotelError
                } = await supabase
                    .from("hotels")
                    .select("*")
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


            console.log(
                "Hotel loaded:",
                currentHotel
            );


            // -----------------------------------------
            // USER DISPLAY
            // -----------------------------------------

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


            // -----------------------------------------
            // HOTEL DISPLAY
            // -----------------------------------------

            if (currentHotel) {

                updateHotelDisplay(
                    currentHotel
                );

            }


        } catch (error) {

            console.error(
                "User information error:",
                error
            );

        }

    }


    // =====================================================
    // UPDATE TOP-RIGHT PROFILE
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


        if (!profile) return;


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
                "small"
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

            if (
                status === "LOGGED IN"
            ) {

                roleElement.textContent =
                    role;

            } else {

                roleElement.textContent =
                    "Please Login";

            }

        }

    }


    // =====================================================
    // UPDATE HOTEL DISPLAY
    // =====================================================

    function updateHotelDisplay(
        hotel
    ) {

        if (!hotel) return;


        const hotelName =
            hotel.name ||
            "HOTEL MANAGEMENT";


        // -----------------------------------------
        // PAGE SUBTITLE
        // -----------------------------------------

        const subtitle =
            document.getElementById(
                "pageSubtitle"
            );


        if (subtitle) {

            subtitle.textContent =
                "Welcome to " +
                hotelName;

        }


        // -----------------------------------------
        // DASHBOARD HEADING
        // -----------------------------------------

        const dashboardHeading =
            document.querySelector(
                "#dashboardPage .welcome-card h2"
            );


        if (dashboardHeading) {

            dashboardHeading.textContent =
                hotelName +
                " Dashboard";

        }


        // -----------------------------------------
        // BROWSER TITLE
        // -----------------------------------------

        document.title =
            hotelName +
            " - Hotel Management";

    }


    // =====================================================
    // DASHBOARD STATISTICS
    // =====================================================

    async function loadDashboardStatistics() {

        if (!currentUser) {

            console.log(
                "Dashboard stats skipped - user not logged in."
            );

            resetDashboardStatistics();

            return;
        }


        if (!currentProfile?.hotel_id) {

            console.log(
                "Dashboard stats skipped - hotel_id not found."
            );

            resetDashboardStatistics();

            return;
        }


        const hotelId =
            currentProfile.hotel_id;


        console.log(
            "Loading dashboard statistics for hotel:",
            hotelId
        );


        try {

            // =================================================
            // CURRENT MONTH
            // =================================================

            const now =
                new Date();


            const monthStart =
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    1,
                    0,
                    0,
                    0,
                    0
                );


            const monthStartISO =
                monthStart.toISOString();


            // =================================================
            // TODAY
            // =================================================

            const todayStart =
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate(),
                    0,
                    0,
                    0,
                    0
                );


            const tomorrowStart =
                new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate() + 1,
                    0,
                    0,
                    0,
                    0
                );


            const todayISO =
                todayStart.toISOString();


            const tomorrowISO =
                tomorrowStart.toISOString();


            // =================================================
            // 1. TOTAL BOOKINGS
            // =================================================

            const {
                count: bookingCount,
                error: bookingError
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
                    monthStartISO
                );


            if (bookingError) {

                console.error(
                    "Booking count error:",
                    bookingError
                );

            }


            // =================================================
            // 2. AVAILABLE ROOMS
            // =================================================

            const {
                count: availableRoomCount,
                error: availableRoomError
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
                    "AVAILABLE"
                );


            if (availableRoomError) {

                console.error(
                    "Available room count error:",
                    availableRoomError
                );

            }


            // =================================================
            // 3. ACTIVE GUESTS
            // =================================================

            const {
                count: activeGuestCount,
                error: activeGuestError
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


            if (activeGuestError) {

                console.error(
                    "Active guest count error:",
                    activeGuestError
                );

            }


            // =================================================
            // 4. TODAY'S REVENUE
            // =================================================

            const {
                data: payments,
                error: paymentError
            } = await supabase
                .from("payments")
                .select(
                    "amount"
                )
                .eq(
                    "hotel_id",
                    hotelId
                )
                .gte(
                    "created_at",
                    todayISO
                )
                .lt(
                    "created_at",
                    tomorrowISO
                );


            if (paymentError) {

                console.error(
                    "Today's revenue error:",
                    paymentError
                );

            }


            let todayRevenue = 0;


            if (
                !paymentError &&
                payments
            ) {

                todayRevenue =
                    payments.reduce(
                        function (
                            total,
                            payment
                        ) {

                            return (
                                total +
                                Number(
                                    payment.amount || 0
                                )
                            );

                        },
                        0
                    );

            }


            // =================================================
            // UPDATE CARDS
            // =================================================

            updateDashboardNumber(
                "totalBookings",
                bookingCount || 0
            );


            updateDashboardNumber(
                "availableRooms",
                availableRoomCount || 0
            );


            updateDashboardNumber(
                "activeGuests",
                activeGuestCount || 0
            );


            updateDashboardCurrency(
                "todayRevenue",
                todayRevenue
            );


            console.log(
                "Dashboard statistics:",
                {
                    hotelId: hotelId,

                    totalBookings:
                        bookingCount || 0,

                    availableRooms:
                        availableRoomCount || 0,

                    activeGuests:
                        activeGuestCount || 0,

                    todayRevenue:
                        todayRevenue
                }
            );


        } catch (error) {

            console.error(
                "Dashboard statistics error:",
                error
            );

        }

    }


    // =====================================================
    // UPDATE DASHBOARD NUMBER
    // =====================================================

    function updateDashboardNumber(
        elementId,
        value
    ) {

        const element =
            document.getElementById(
                elementId
            );


        if (!element) {

            console.warn(
                "Dashboard element not found:",
                elementId
            );

            return;
        }


        element.textContent =
            Number(
                value || 0
            ).toLocaleString(
                "en-IN"
            );

    }


    // =====================================================
    // UPDATE DASHBOARD CURRENCY
    // =====================================================

    function updateDashboardCurrency(
        elementId,
        value
    ) {

        const element =
            document.getElementById(
                elementId
            );


        if (!element) {

            console.warn(
                "Dashboard currency element not found:",
                elementId
            );

            return;
        }


        element.textContent =
            "₹" +
            Number(
                value || 0
            ).toLocaleString(
                "en-IN",
                {
                    maximumFractionDigits: 2
                }
            );

    }


    // =====================================================
    // RESET DASHBOARD
    // =====================================================

    function resetDashboardStatistics() {

        updateDashboardNumber(
            "totalBookings",
            0
        );


        updateDashboardNumber(
            "availableRooms",
            0
        );


        updateDashboardNumber(
            "activeGuests",
            0
        );


        updateDashboardCurrency(
            "todayRevenue",
            0
        );


        const recentBookings =
            document.getElementById(
                "recentBookings"
            );


        if (recentBookings) {

            recentBookings.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="empty-state"
                    >
                        No bookings yet
                    </td>

                </tr>

            `;

        }

    }


    // =====================================================
    // LOAD RECENT BOOKINGS
    // =====================================================

    async function loadRecentBookings() {

        const tableBody =
            document.getElementById(
                "recentBookings"
            );


        if (!tableBody) {

            return;
        }


        if (!currentUser) {

            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="empty-state"
                    >
                        Please login to view bookings.
                    </td>

                </tr>

            `;

            return;
        }


        if (!currentProfile?.hotel_id) {

            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="empty-state"
                    >
                        Hotel information not found.
                    </td>

                </tr>

            `;

            return;
        }


        const hotelId =
            currentProfile.hotel_id;


        try {

            // =================================================
            // GET RECENT BOOKINGS
            // =================================================

            const {
                data: bookings,
                error: bookingsError
            } = await supabase
                .from("bookings")
                .select("*")
                .eq(
                    "hotel_id",
                    hotelId
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                )
                .limit(5);


            if (bookingsError) {

                throw bookingsError;

            }


            // =================================================
            // NO BOOKINGS
            // =================================================

            if (
                !bookings ||
                bookings.length === 0
            ) {

                tableBody.innerHTML = `

                    <tr>

                        <td
                            colspan="6"
                            class="empty-state"
                        >
                            No bookings yet
                        </td>

                    </tr>

                `;

                return;

            }


            // =================================================
            // GET GUEST IDS
            // =================================================

            const guestIds =
                [
                    ...new Set(
                        bookings
                            .map(
                                booking =>
                                    booking.guest_id
                            )
                            .filter(Boolean)
                    )
                ];


            // =================================================
            // GET ROOM IDS
            // =================================================

            const roomIds =
                [
                    ...new Set(
                        bookings
                            .map(
                                booking =>
                                    booking.room_id
                            )
                            .filter(Boolean)
                    )
                ];


            // =================================================
            // LOAD GUESTS
            // =================================================

            let guests = [];


            if (
                guestIds.length > 0
            ) {

                const {
                    data,
                    error
                } = await supabase
                    .from("guests")
                    .select(
                        "id, first_name, last_name, full_name"
                    )
                    .eq(
                        "hotel_id",
                        hotelId
                    )
                    .in(
                        "id",
                        guestIds
                    );


                if (error) {

                    console.error(
                        "Recent booking guest error:",
                        error
                    );

                } else {

                    guests =
                        data || [];

                }

            }


            // =================================================
            // LOAD ROOMS
            // =================================================

            let rooms = [];


            if (
                roomIds.length > 0
            ) {

                const {
                    data,
                    error
                } = await supabase
                    .from("rooms")
                    .select(
                        "id, room_number"
                    )
                    .eq(
                        "hotel_id",
                        hotelId
                    )
                    .in(
                        "id",
                        roomIds
                    );


                if (error) {

                    console.error(
                        "Recent booking room error:",
                        error
                    );

                } else {

                    rooms =
                        data || [];

                }

            }


            // =================================================
            // CREATE GUEST MAP
            // =================================================

            const guestMap =
                new Map();


            guests.forEach(
                function (guest) {

                    const guestName =
                        guest.full_name ||
                        [
                            guest.first_name,
                            guest.last_name
                        ]
                            .filter(Boolean)
                            .join(" ") ||
                        "Guest";


                    guestMap.set(
                        String(guest.id),
                        guestName
                    );

                }
            );


            // =================================================
            // CREATE ROOM MAP
            // =================================================

            const roomMap =
                new Map();


            rooms.forEach(
                function (room) {

                    roomMap.set(
                        String(room.id),
                        room.room_number ||
                        "-"
                    );

                }
            );


            // =================================================
            // RENDER BOOKINGS
            // =================================================

            tableBody.innerHTML =
                bookings
                    .map(
                        function (booking) {

                            const guestName =
                                guestMap.get(
                                    String(
                                        booking.guest_id
                                    )
                                ) ||
                                "Guest";


                            const roomNumber =
                                roomMap.get(
                                    String(
                                        booking.room_id
                                    )
                                ) ||
                                "-";


                            const bookingNumber =
                                booking.booking_number ||
                                booking.booking_no ||
                                booking.id;


                            const checkIn =
                                booking.check_in_date ||
                                booking.check_in ||
                                booking.arrival_date ||
                                booking.arrival;


                            const checkOut =
                                booking.check_out_date ||
                                booking.check_out ||
                                booking.departure_date ||
                                booking.departure;


                            const status =
                                booking.status ||
                                "PENDING";


                            return `

                                <tr>

                                    <td>
                                        ${escapeHtml(
                                            bookingNumber
                                        )}
                                    </td>


                                    <td>
                                        ${escapeHtml(
                                            guestName
                                        )}
                                    </td>


                                    <td>
                                        ${escapeHtml(
                                            roomNumber
                                        )}
                                    </td>


                                    <td>
                                        ${formatDate(
                                            checkIn
                                        )}
                                    </td>


                                    <td>
                                        ${formatDate(
                                            checkOut
                                        )}
                                    </td>


                                    <td>

                                        <span
                                            class="status-badge"
                                        >
                                            ${escapeHtml(
                                                status
                                            )}
                                        </span>

                                    </td>

                                </tr>

                            `;

                        }
                    )
                    .join("");


        } catch (error) {

            console.error(
                "Recent bookings error:",
                error
            );


            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="6"
                        class="empty-state"
                    >
                        Unable to load recent bookings.
                    </td>

                </tr>

            `;

        }

    }


    // =====================================================
    // FORMAT DATE
    // =====================================================

    function formatDate(
        value
    ) {

        if (!value) {

            return "-";

        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return "-";

        }


        return date.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

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

            console.warn(
                "Cannot refresh dashboard - hotel_id missing."
            );

            resetDashboardStatistics();

            return;
        }


        console.log(
            "Refreshing dashboard..."
        );


        await Promise.all([
            loadDashboardStatistics(),
            loadRecentBookings()
        ]);

    }


    // =====================================================
    // NAVIGATION
    // =====================================================

    function setupNavigation() {

        const clickableItems =
            document.querySelectorAll(
                "[data-page]"
            );


        console.log(
            "Navigation items found:",
            clickableItems.length
        );


        clickableItems.forEach(
            function (item) {

                item.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();


                        const pageName =
                            item.getAttribute(
                                "data-page"
                            );


                        if (!pageName) {

                            return;

                        }


                        console.log(
                            "Clicked page:",
                            pageName
                        );


                        // ---------------------------------
                        // DASHBOARD IS PUBLIC
                        // ---------------------------------

                        if (
                            pageName !== "dashboard" &&
                            !currentUser
                        ) {

                            requireLogin();

                            return;

                        }


                        showPage(
                            pageName
                        );


                        // ---------------------------------
                        // REFRESH DASHBOARD
                        // ---------------------------------

                        if (
                            pageName === "dashboard" &&
                            currentUser
                        ) {

                            refreshDashboard();

                        }

                    }
                );

            }
        );

    }


    // =====================================================
    // SHOW PAGE
    // =====================================================

    function showPage(
        pageName
    ) {

        const navItems =
            document.querySelectorAll(
                ".nav-item"
            );


        const pages =
            document.querySelectorAll(
                ".page"
            );


        const pageTitle =
            document.getElementById(
                "pageTitle"
            );


        const pageSubtitle =
            document.getElementById(
                "pageSubtitle"
            );


        // ---------------------------------------------
        // REMOVE ACTIVE NAV
        // ---------------------------------------------

        navItems.forEach(
            function (nav) {

                nav.classList.remove(
                    "active"
                );

            }
        );


        // ---------------------------------------------
        // ADD ACTIVE NAV
        // ---------------------------------------------

        navItems.forEach(
            function (nav) {

                if (
                    nav.getAttribute(
                        "data-page"
                    ) === pageName
                ) {

                    nav.classList.add(
                        "active"
                    );

                }

            }
        );


        // ---------------------------------------------
        // HIDE ALL PAGES
        // ---------------------------------------------

        pages.forEach(
            function (page) {

                page.classList.remove(
                    "active-page"
                );

            }
        );


        // ---------------------------------------------
        // SHOW SELECTED PAGE
        // ---------------------------------------------

        const selectedPage =
            document.getElementById(
                pageName + "Page"
            );


        if (selectedPage) {

            selectedPage.classList.add(
                "active-page"
            );

        }


        // ---------------------------------------------
        // PAGE TITLES
        // ---------------------------------------------

        const hotelName =
            currentHotel?.name ||
            "your hotel";


        const titles = {

            dashboard: [
                "Dashboard",
                "Welcome to " + hotelName
            ],

            bookings: [
                "Bookings",
                "Manage hotel reservations"
            ],

            guests: [
                "Guests",
                "Manage hotel guests"
            ],

            rooms: [
                "Rooms",
                "Manage hotel rooms"
            ],

            restaurant: [
                "Restaurant",
                "Manage restaurant"
            ],

            orders: [
                "Orders",
                "Manage restaurant orders"
            ],

            billing: [
                "Billing",
                "Guest billing and checkout"
            ],

            invoices: [
                "Invoices",
                "Manage invoices"
            ],

            settings: [
                "Settings",
                "Hotel settings"
            ]

        };


        if (titles[pageName]) {

            if (pageTitle) {

                pageTitle.textContent =
                    titles[pageName][0];

            }


            if (pageSubtitle) {

                pageSubtitle.textContent =
                    titles[pageName][1];

            }

        }

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

            console.warn(
                "Profile element not found."
            );

            return;

        }


        profile.style.cursor =
            "pointer";


        // -----------------------------------------
        // CREATE DROPDOWN
        // -----------------------------------------

        const dropdown =
            document.createElement(
                "div"
            );


        dropdown.className =
            "profile-dropdown";


        profile.parentElement.appendChild(
            dropdown
        );


        // -----------------------------------------
        // PROFILE CLICK
        // -----------------------------------------

        profile.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();


                renderProfileDropdown(
                    dropdown
                );


                dropdown.classList.toggle(
                    "show"
                );

            }
        );


        // -----------------------------------------
        // DROPDOWN CLICK
        // -----------------------------------------

        dropdown.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();

            }
        );


        // -----------------------------------------
        // OUTSIDE CLICK
        // -----------------------------------------

        document.addEventListener(
            "click",
            function () {

                dropdown.classList.remove(
                    "show"
                );

            }
        );

    }


    // =====================================================
    // RENDER PROFILE DROPDOWN
    // =====================================================

    function renderProfileDropdown(
        dropdown
    ) {

        // -----------------------------------------
        // GUEST
        // -----------------------------------------

        if (!currentUser) {

            dropdown.innerHTML = `

                <div class="profile-header">

                    <div class="profile-big-avatar">
                        U
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
                        id="profileLoginButton"
                    >
                        🔐 Login to your account
                    </button>

                </div>

            `;


            const loginButton =
                document.getElementById(
                    "profileLoginButton"
                );


            if (loginButton) {

                loginButton.addEventListener(
                    "click",
                    function () {

                        window.location.href =
                            "login.html";

                    }
                );

            }


            return;

        }


        // -----------------------------------------
        // LOGGED-IN USER
        // -----------------------------------------

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

                    ${getInitials(name)}

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
                    class="profile-menu-item"
                    id="profileDetailsButton"
                >

                    <span
                        class="profile-menu-icon"
                    >
                        👤
                    </span>

                    <span>
                        My Profile
                    </span>

                </button>


                <button
                    class="profile-menu-item"
                    id="hotelSettingsButton"
                >

                    <span
                        class="profile-menu-icon"
                    >
                        🏨
                    </span>

                    <span>
                        Hotel Settings
                    </span>

                </button>


                <button
                    class="profile-menu-item"
                    id="accountSettingsButton"
                >

                    <span
                        class="profile-menu-icon"
                    >
                        ⚙
                    </span>

                    <span>
                        Account Settings
                    </span>

                </button>


                <div
                    class="profile-divider"
                ></div>


                <button
                    class="profile-menu-item profile-logout"
                    id="logoutButton"
                >

                    <span
                        class="profile-menu-icon"
                    >
                        🚪
                    </span>

                    <span>
                        Logout
                    </span>

                </button>

            </div>

        `;


        // -----------------------------------------
        // MY PROFILE
        // -----------------------------------------

        const profileButton =
            document.getElementById(
                "profileDetailsButton"
            );


        if (profileButton) {

            profileButton.addEventListener(
                "click",
                function () {

                    dropdown.classList.remove(
                        "show"
                    );


                    openProfileDrawer();

                }
            );

        }


        // -----------------------------------------
        // HOTEL SETTINGS
        // -----------------------------------------

        const hotelButton =
            document.getElementById(
                "hotelSettingsButton"
            );


        if (hotelButton) {

            hotelButton.addEventListener(
                "click",
                function () {

                    dropdown.classList.remove(
                        "show"
                    );


                    showPage(
                        "settings"
                    );

                }
            );

        }


        // -----------------------------------------
        // ACCOUNT SETTINGS
        // -----------------------------------------

        const accountButton =
            document.getElementById(
                "accountSettingsButton"
            );


        if (accountButton) {

            accountButton.addEventListener(
                "click",
                function () {

                    dropdown.classList.remove(
                        "show"
                    );


                    showPage(
                        "settings"
                    );

                }
            );

        }


        // -----------------------------------------
        // LOGOUT
        // -----------------------------------------

        const logoutButton =
            document.getElementById(
                "logoutButton"
            );


        if (logoutButton) {

            logoutButton.addEventListener(
                "click",
                async function () {

                    dropdown.classList.remove(
                        "show"
                    );


                    await logoutUser();

                }
            );

        }

    }


    // =====================================================
    // OPEN PROFILE DRAWER
    // =====================================================

    function openProfileDrawer() {

        if (!currentUser) {

            window.location.href =
                "login.html";

            return;

        }


        const drawer =
            document.getElementById(
                "profileDrawer"
            );


        const overlay =
            document.getElementById(
                "profileOverlay"
            );


        if (!drawer) {

            console.warn(
                "Profile drawer not found in index.html"
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


    // =====================================================
    // CLOSE PROFILE DRAWER
    // =====================================================

    function closeProfileDrawer() {

        const drawer =
            document.getElementById(
                "profileDrawer"
            );


        const overlay =
            document.getElementById(
                "profileOverlay"
            );


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
    // FILL PROFILE DRAWER
    // =====================================================

    function fillProfileDrawer() {

        if (!currentUser) return;


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


        // -----------------------------------------
        // USER
        // -----------------------------------------

        const drawerAvatar =
            document.getElementById(
                "drawerAvatar"
            );


        const drawerUserName =
            document.getElementById(
                "drawerUserName"
            );


        const drawerUserEmail =
            document.getElementById(
                "drawerUserEmail"
            );


        const drawerUserRole =
            document.getElementById(
                "drawerUserRole"
            );


        if (drawerAvatar) {

            drawerAvatar.textContent =
                getInitials(name);

        }


        if (drawerUserName) {

            drawerUserName.textContent =
                name;

        }


        if (drawerUserEmail) {

            drawerUserEmail.textContent =
                currentUser.email || "";

        }


        if (drawerUserRole) {

            drawerUserRole.textContent =
                role;

        }


        // -----------------------------------------
        // HOTEL FIELDS
        // -----------------------------------------

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
    // SET INPUT VALUE
    // =====================================================

    function setValue(
        id,
        value
    ) {

        const element =
            document.getElementById(
                id
            );


        if (element) {

            element.value =
                value;

        }

    }


    // =====================================================
    // GET INPUT VALUE
    // =====================================================

    function getValue(
        id
    ) {

        const element =
            document.getElementById(
                id
            );


        if (!element) {

            return "";

        }


        return element.value.trim();

    }


    // =====================================================
    // PROFILE DRAWER EVENTS
    // =====================================================

    function setupProfileDrawer() {

        const closeButton =
            document.getElementById(
                "closeProfileDrawer"
            );


        const overlay =
            document.getElementById(
                "profileOverlay"
            );


        const saveButton =
            document.getElementById(
                "saveProfileButton"
            );


        const logoutButton =
            document.getElementById(
                "drawerLogoutButton"
            );


        // -----------------------------------------
        // CLOSE
        // -----------------------------------------

        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeProfileDrawer
            );

        }


        // -----------------------------------------
        // OVERLAY
        // -----------------------------------------

        if (overlay) {

            overlay.addEventListener(
                "click",
                closeProfileDrawer
            );

        }


        // -----------------------------------------
        // SAVE
        // -----------------------------------------

        if (saveButton) {

            saveButton.addEventListener(
                "click",
                saveHotelProfile
            );

        }


        // -----------------------------------------
        // LOGOUT
        // -----------------------------------------

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

            window.location.href =
                "login.html";

            return;

        }


        if (!currentHotel) {

            alert(
                "Hotel information was not found."
            );

            return;

        }


        const saveButton =
            document.getElementById(
                "saveProfileButton"
            );


        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.textContent =
                "Saving...";

        }


        try {

            const updatedHotel = {

                name:
                    getValue(
                        "profileHotelName"
                    ),

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


            console.log(
                "Saving hotel:",
                updatedHotel
            );


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
                        currentHotel.id
                    )
                    .select()
                    .single();


            if (error) {

                throw error;

            }


            currentHotel =
                data;


            updateHotelDisplay(
                currentHotel
            );


            alert(
                "Hotel profile saved successfully."
            );


            closeProfileDrawer();


        } catch (error) {

            console.error(
                "Profile save error:",
                error
            );


            alert(
                "Could not save hotel profile.\n\n" +
                error.message
            );

        }


        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save Changes";

        }

    }


    // =====================================================
    // LOGOUT
    // =====================================================

    async function logoutUser() {

        const confirmLogout =
            confirm(
                "Are you sure you want to logout?"
            );


        if (!confirmLogout) {

            return;

        }


        try {

            const {
                error
            } =
                await supabase.auth.signOut();


            if (error) {

                throw error;

            }


            currentUser =
                null;

            currentProfile =
                null;

            currentHotel =
                null;


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
            document.getElementById(
                "mobileMenu"
            );


        const sidebar =
            document.querySelector(
                ".sidebar"
            );


        if (
            mobileMenu &&
            sidebar
        ) {

            mobileMenu.addEventListener(
                "click",
                function () {

                    sidebar.classList.toggle(
                        "show"
                    );

                }
            );

        }

    }


    // =====================================================
    // SUPABASE AUTH STATE
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
                session
                    ? session.user
                    : null;


            if (!currentUser) {

                currentProfile = null;
                currentHotel = null;


                updateProfileDisplay(
                    "Guest",
                    "Please Login",
                    "GUEST"
                );


                resetDashboardStatistics();

                return;

            }


            // -------------------------------------------------
            // IMPORTANT:
            // Don't perform awaited Supabase calls directly
            // inside onAuthStateChange.
            //
            // Schedule them after the auth callback finishes.
            // -------------------------------------------------

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
    // INITIALIZE APPLICATION
    // =====================================================

    await checkLogin();


    setupNavigation();


    setupProfile();


    setupProfileDrawer();


    setupMobileMenu();


    await loadUserInformation();


    // =====================================================
    // LOAD DASHBOARD
    // =====================================================

    if (currentUser) {

        await refreshDashboard();

    } else {

        resetDashboardStatistics();

    }


    console.log(
        "================================="
    );

    console.log(
        "HOTEL MANAGEMENT DASHBOARD READY"
    );

    console.log(
        "================================="
    );

});


// =========================================================
// GET INITIALS
// =========================================================

function getInitials(
    name
) {

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


    if (
        parts.length === 1
    ) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();

}


// =========================================================
// HTML ESCAPE
// =========================================================

function escapeHtml(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "";

    }


    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}