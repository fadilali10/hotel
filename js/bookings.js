/* =========================================================
   STAR HOTELS
   BOOKINGS MODULE
   ========================================================= */

(function () {

    "use strict";


    /* =====================================================
       STATE
       ===================================================== */

    let currentHotelId = null;

    let currentUser = null;

    let currentProfile = null;

    let bookings = [];

    let guests = [];

    let rooms = [];

    let editingBookingId = null;


    /* =====================================================
       DOM READY
       ===================================================== */

    document.addEventListener("DOMContentLoaded", async function () {

        console.log("====================================");
        console.log("STAR HOTELS - BOOKINGS");
        console.log("====================================");


        if (!window.supabaseClient) {

            console.error(
                "Supabase client is not available."
            );

            showPageError(
                "Supabase is not connected. Please check config.js and supabase.js."
            );

            return;
        }


        try {

            await initializeBookings();

        } catch (error) {

            console.error(
                "Bookings initialization error:",
                error
            );

            showPageError(
                error.message ||
                "Unable to load bookings."
            );

        }

    });


    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function initializeBookings() {

        setupUI();

        await loadCurrentHotel();

        await Promise.all([
            loadGuests(),
            loadRooms()
        ]);

        populateBookingDefaults();

        await loadBookings();

        console.log(
            "✓ Bookings module initialized"
        );

    }


    /* =====================================================
       SETUP UI
       ===================================================== */

    function setupUI() {

        const newBookingBtn =
            document.getElementById("newBookingBtn");

        const emptyNewBookingBtn =
            document.getElementById("emptyNewBookingBtn");

        const closeBookingDrawer =
            document.getElementById("closeBookingDrawer");

        const cancelBookingButton =
            document.getElementById("cancelBookingButton");

        const saveBookingButton =
            document.getElementById("saveBookingButton");

        const drawerOverlay =
            document.getElementById("bookingDrawerOverlay");

        const search =
            document.getElementById("bookingSearch");

        const statusFilter =
            document.getElementById("bookingStatusFilter");

        const dateFilter =
            document.getElementById("bookingDateFilter");

        const clearFilters =
            document.getElementById("clearBookingFilters");

        const bookingForm =
            document.getElementById("bookingForm");

        const tableBody =
            document.getElementById("bookingsTableBody");


        /* -----------------------------------------------
           New booking
           ----------------------------------------------- */

        if (newBookingBtn) {

            newBookingBtn.addEventListener(
                "click",
                openNewBooking
            );

        }


        if (emptyNewBookingBtn) {

            emptyNewBookingBtn.addEventListener(
                "click",
                openNewBooking
            );

        }


        /* -----------------------------------------------
           Drawer
           ----------------------------------------------- */

        if (closeBookingDrawer) {

            closeBookingDrawer.addEventListener(
                "click",
                closeDrawer
            );

        }


        if (cancelBookingButton) {

            cancelBookingButton.addEventListener(
                "click",
                closeDrawer
            );

        }


        if (drawerOverlay) {

            drawerOverlay.addEventListener(
                "click",
                closeDrawer
            );

        }


        /* -----------------------------------------------
           Save
           ----------------------------------------------- */

        if (saveBookingButton) {

            saveBookingButton.addEventListener(
                "click",
                saveBooking
            );

        }


        if (bookingForm) {

            bookingForm.addEventListener(
                "submit",
                function (event) {

                    event.preventDefault();

                    saveBooking();

                }
            );

        }


        /* -----------------------------------------------
           Search
           ----------------------------------------------- */

        if (search) {

            search.addEventListener(
                "input",
                renderBookings
            );

        }


        if (statusFilter) {

            statusFilter.addEventListener(
                "change",
                renderBookings
            );

        }


        if (dateFilter) {

            dateFilter.addEventListener(
                "change",
                renderBookings
            );

        }


        if (clearFilters) {

            clearFilters.addEventListener(
                "click",
                clearBookingFilters
            );

        }


        /* -----------------------------------------------
           Table actions
           ----------------------------------------------- */

        if (tableBody) {

            tableBody.addEventListener(
                "click",
                handleTableAction
            );

        }


        /* -----------------------------------------------
           Mobile sidebar
           ----------------------------------------------- */

        setupMobileMenu();


        /* -----------------------------------------------
           Escape key
           ----------------------------------------------- */

        document.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Escape") {

                    closeDrawer();

                    closeMobileMenu();

                }

            }
        );


        /* -----------------------------------------------
           Date change
           ----------------------------------------------- */

        const checkIn =
            document.getElementById("bookingCheckIn");

        const checkOut =
            document.getElementById("bookingCheckOut");


        if (checkIn) {

            checkIn.addEventListener(
                "change",
                function () {

                    if (checkOut) {

                        checkOut.min =
                            checkIn.value || getTomorrow();

                    }

                }
            );

        }

    }


    /* =====================================================
       CURRENT HOTEL
       ===================================================== */

    async function loadCurrentHotel() {

        const {
            data: {
                user
            },
            error: userError
        } = await window.supabaseClient.auth.getUser();


        if (userError) {

            throw userError;

        }


        if (!user) {

            window.location.href = "login.html";

            return;

        }


        currentUser = user;


        const {
            data: profile,
            error: profileError
        } = await window.supabaseClient
            .from("profiles")
            .select(
                "id, hotel_id, full_name, phone, role"
            )
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


        if (profileError) {

            throw profileError;

        }


        if (!profile || !profile.hotel_id) {

            throw new Error(
                "Your account is not connected to a hotel."
            );

        }


        currentProfile = profile;

        currentHotelId = profile.hotel_id;


        updateTopbar();

    }


    /* =====================================================
       TOPBAR
       ===================================================== */

    function updateTopbar() {

        const userName =
            document.getElementById("topUserName");

        const userInitial =
            document.getElementById("topUserInitial");

        const hotelName =
            document.getElementById("topHotelName");


        const name =
            currentProfile?.full_name ||
            currentUser?.email ||
            "User";


        if (userName) {

            userName.textContent =
                name;

        }


        if (userInitial) {

            userInitial.textContent =
                name
                    .trim()
                    .charAt(0)
                    .toUpperCase();

        }


        if (hotelName) {

            loadHotelName(hotelName);

        }

    }


    async function loadHotelName(element) {

        if (!currentHotelId) {

            return;

        }


        const {
            data,
            error
        } = await window.supabaseClient
            .from("hotels")
            .select("name")
            .eq(
                "id",
                currentHotelId
            )
            .maybeSingle();


        if (!error && data?.name) {

            element.textContent =
                data.name;

        } else {

            element.textContent =
                "Hotel";

        }

    }


    /* =====================================================
       LOAD GUESTS
       ===================================================== */

    async function loadGuests() {

        if (!currentHotelId) {

            return;

        }


        const {
            data,
            error
        } = await window.supabaseClient
            .from("guests")
            .select(
                `
                id,
                first_name,
                last_name,
                full_name,
                phone,
                email
                `
            )
            .eq(
                "hotel_id",
                currentHotelId
            )
            .order(
                "first_name",
                {
                    ascending: true
                }
            );


        if (error) {

            console.error(
                "Guest loading error:",
                error
            );

            throw error;

        }


        guests = data || [];

        populateGuestSelect();

    }


    /* =====================================================
       GUEST SELECT
       ===================================================== */

    function populateGuestSelect() {

        const select =
            document.getElementById(
                "bookingGuest"
            );


        if (!select) {

            return;

        }


        select.innerHTML =
            `<option value="">Select Guest</option>`;


        guests.forEach(function (guest) {

            const fullName =
                getGuestName(guest);


            const option =
                document.createElement("option");


            option.value =
                guest.id;


            option.textContent =
                guest.phone
                    ? `${fullName} — ${guest.phone}`
                    : fullName;


            select.appendChild(option);

        });

    }


    /* =====================================================
       LOAD ROOMS
       ===================================================== */

    async function loadRooms() {

        if (!currentHotelId) {

            return;

        }


        const {
            data,
            error
        } = await window.supabaseClient
            .from("rooms")
            .select(
                `
                id,
                hotel_id,
                room_number,
                room_type_id,
                floor,
                status,
                price,
                notes,
                room_types (
                    id,
                    name,
                    max_guests,
                    price_per_night,
                    base_price
                )
                `
            )
            .eq(
                "hotel_id",
                currentHotelId
            )
            .order(
                "room_number",
                {
                    ascending: true
                }
            );


        if (error) {

            console.error(
                "Room loading error:",
                error
            );

            throw error;

        }


        rooms = data || [];

        populateRoomSelect();

    }


    /* =====================================================
       ROOM SELECT
       ===================================================== */

    function populateRoomSelect() {

        const select =
            document.getElementById(
                "bookingRoom"
            );


        if (!select) {

            return;

        }


        select.innerHTML =
            `<option value="">Select Room</option>`;


        rooms.forEach(function (room) {

            const option =
                document.createElement("option");


            option.value =
                room.id;


            const typeName =
                room.room_types?.name ||
                "Room";


            const status =
                String(
                    room.status || "AVAILABLE"
                ).toUpperCase();


            const roomText =
                `Room ${room.room_number} — ${typeName} — ${formatRoomStatus(status)}`;


            option.textContent =
                roomText;


            /*
             * Do not disable the room when editing
             * the current booking's room.
             */

            const unavailableStatuses = [
                "OCCUPIED",
                "CLEANING",
                "MAINTENANCE"
            ];


            if (
                unavailableStatuses.includes(status) &&
                String(room.id) !==
                String(getCurrentBookingRoomId())
            ) {

                option.disabled = true;

            }


            select.appendChild(option);

        });

    }


    function getCurrentBookingRoomId() {

        if (!editingBookingId) {

            return null;

        }


        const booking =
            bookings.find(function (item) {

                return String(item.id) ===
                    String(editingBookingId);

            });


        return booking?.room_id || null;

    }


    /* =====================================================
       LOAD BOOKINGS
       ===================================================== */

    async function loadBookings() {

        if (!currentHotelId) {

            return;

        }


        setTableLoading();


        const {
            data,
            error
        } = await window.supabaseClient
            .from("bookings")
            .select(
                `
                id,
                hotel_id,
                booking_number,
                guest_id,
                room_id,
                check_in_date,
                check_out_date,
                adults,
                children,
                status,
                source,
                special_requests,
                notes,
                created_at,
                updated_at
                `
            )
            .eq(
                "hotel_id",
                currentHotelId
            )
            .order(
                "check_in_date",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "Bookings loading error:",
                error
            );

            showTableError(
                error.message
            );

            return;

        }


        bookings = data || [];


        updateStatistics();

        renderBookings();

    }


    /* =====================================================
       RENDER BOOKINGS
       ===================================================== */

    function renderBookings() {

        const tbody =
            document.getElementById(
                "bookingsTableBody"
            );


        const emptyState =
            document.getElementById(
                "bookingEmptyState"
            );


        const countElement =
            document.getElementById(
                "bookingResultCount"
            );


        if (!tbody) {

            return;

        }


        const searchInput =
            document.getElementById(
                "bookingSearch"
            );


        const statusFilter =
            document.getElementById(
                "bookingStatusFilter"
            );


        const dateFilter =
            document.getElementById(
                "bookingDateFilter"
            );


        const search =
            String(
                searchInput?.value || ""
            )
                .trim()
                .toLowerCase();


        const status =
            String(
                statusFilter?.value || ""
            )
                .toUpperCase();


        const dateType =
            String(
                dateFilter?.value || ""
            )
                .toUpperCase();


        const today =
            getToday();


        const filtered =
            bookings.filter(function (booking) {


                /* Search */

                if (search) {

                    const guest =
                        findGuest(
                            booking.guest_id
                        );


                    const room =
                        findRoom(
                            booking.room_id
                        );


                    const searchable = [

                        booking.booking_number,

                        getGuestName(guest),

                        guest?.phone,

                        room?.room_number,

                        booking.source,

                        booking.status

                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();


                    if (
                        !searchable.includes(search)
                    ) {

                        return false;

                    }

                }


                /* Status */

                if (
                    status &&
                    String(
                        booking.status || ""
                    ).toUpperCase() !== status
                ) {

                    return false;

                }


                /* Date */

                if (dateType === "TODAY") {

                    if (
                        booking.check_in_date !==
                        today
                    ) {

                        return false;

                    }

                }


                if (dateType === "UPCOMING") {

                    if (
                        !booking.check_in_date ||
                        booking.check_in_date < today
                    ) {

                        return false;

                    }

                }


                if (dateType === "PAST") {

                    if (
                        !booking.check_out_date ||
                        booking.check_out_date >= today
                    ) {

                        return false;

                    }

                }


                return true;

            });


        if (countElement) {

            countElement.textContent =
                `${filtered.length} ${
                    filtered.length === 1
                        ? "booking"
                        : "bookings"
                }`;

        }


        if (!filtered.length) {

            tbody.innerHTML = "";

            if (emptyState) {

                emptyState.classList.remove(
                    "hidden"
                );

            }

            return;

        }


        if (emptyState) {

            emptyState.classList.add(
                "hidden"
            );

        }


        tbody.innerHTML =
            filtered
                .map(renderBookingRow)
                .join("");

    }


    /* =====================================================
       BOOKING ROW
       ===================================================== */

    function renderBookingRow(booking) {

        const guest =
            findGuest(
                booking.guest_id
            );


        const room =
            findRoom(
                booking.room_id
            );


        const guestName =
            getGuestName(guest);


        const roomNumber =
            room?.room_number ||
            "—";


        const totalGuests =
            Number(
                booking.adults || 0
            ) +
            Number(
                booking.children || 0
            );


        const status =
            String(
                booking.status ||
                "PENDING"
            ).toUpperCase();


        const bookingNumber =
            booking.booking_number ||
            `#${booking.id}`;


        return `

            <tr data-booking-id="${escapeHtml(booking.id)}">

                <td>

                    <div class="booking-number-cell">

                        <strong>
                            ${escapeHtml(bookingNumber)}
                        </strong>

                        <small>
                            ${formatSource(booking.source)}
                        </small>

                    </div>

                </td>


                <td>

                    <div class="guest-cell">

                        <div class="table-avatar">
                            ${escapeHtml(
                                getInitials(guestName)
                            )}
                        </div>

                        <div>

                            <strong>
                                ${escapeHtml(guestName)}
                            </strong>

                            <small>
                                ${escapeHtml(
                                    guest?.phone || ""
                                )}
                            </small>

                        </div>

                    </div>

                </td>


                <td>

                    <div class="room-cell">

                        <strong>
                            ${escapeHtml(roomNumber)}
                        </strong>

                        <small>
                            ${escapeHtml(
                                room?.room_types?.name ||
                                "Room"
                            )}
                        </small>

                    </div>

                </td>


                <td>
                    <span class="date-cell">
                        ${formatDate(
                            booking.check_in_date
                        )}
                    </span>
                </td>


                <td>
                    <span class="date-cell">
                        ${formatDate(
                            booking.check_out_date
                        )}
                    </span>
                </td>


                <td>

                    <span class="guest-count">
                        ${escapeHtml(totalGuests)}
                    </span>

                </td>


                <td>

                    <span class="status-badge ${getStatusClass(status)}">
                        ${formatStatus(status)}
                    </span>

                </td>


                <td>

                    <div class="table-actions">

                        <button
                            type="button"
                            class="table-action edit-booking"
                            data-id="${escapeHtml(booking.id)}"
                            title="Edit booking"
                        >
                            Edit
                        </button>

                        ${
                            status !== "CANCELLED" &&
                            status !== "CHECKED_OUT"
                                ? `
                                    <button
                                        type="button"
                                        class="table-action danger cancel-booking"
                                        data-id="${escapeHtml(booking.id)}"
                                        title="Cancel booking"
                                    >
                                        Cancel
                                    </button>
                                  `
                                : ""
                        }

                    </div>

                </td>

            </tr>

        `;

    }


    /* =====================================================
       NEW BOOKING
       ===================================================== */

    function openNewBooking() {

        editingBookingId = null;


        const form =
            document.getElementById(
                "bookingForm"
            );


        if (form) {

            form.reset();

        }


        document.getElementById(
            "bookingId"
        ).value = "";


        document.getElementById(
            "bookingDrawerTitle"
        ).textContent =
            "New Booking";


        const saveText =
            document.getElementById(
                "saveBookingButtonText"
            );


        if (saveText) {

            saveText.textContent =
                "Save Booking";

        }


        document.getElementById(
            "bookingNumber"
        ).value =
            generateBookingNumber();


        document.getElementById(
            "bookingCheckIn"
        ).value =
            getToday();


        document.getElementById(
            "bookingCheckOut"
        ).value =
            getTomorrow();


        document.getElementById(
            "bookingAdults"
        ).value = 1;


        document.getElementById(
            "bookingChildren"
        ).value = 0;


        document.getElementById(
            "bookingStatus"
        ).value =
            "CONFIRMED";


        document.getElementById(
            "bookingSource"
        ).value =
            "DIRECT";


        populateRoomSelect();

        openDrawer();

    }


    /* =====================================================
       EDIT BOOKING
       ===================================================== */

    function openEditBooking(bookingId) {

        const booking =
            bookings.find(function (item) {

                return String(item.id) ===
                    String(bookingId);

            });


        if (!booking) {

            alert(
                "Booking not found."
            );

            return;

        }


        editingBookingId =
            booking.id;


        document.getElementById(
            "bookingId"
        ).value =
            booking.id;


        document.getElementById(
            "bookingDrawerTitle"
        ).textContent =
            "Edit Booking";


        const saveText =
            document.getElementById(
                "saveBookingButtonText"
            );


        if (saveText) {

            saveText.textContent =
                "Update Booking";

        }


        document.getElementById(
            "bookingNumber"
        ).value =
            booking.booking_number || "";


        document.getElementById(
            "bookingGuest"
        ).value =
            booking.guest_id || "";


        /*
         * Rebuild room options so the current
         * room is selectable even if occupied.
         */

        populateRoomSelect();


        document.getElementById(
            "bookingRoom"
        ).value =
            booking.room_id || "";


        document.getElementById(
            "bookingCheckIn"
        ).value =
            booking.check_in_date || "";


        document.getElementById(
            "bookingCheckOut"
        ).value =
            booking.check_out_date || "";


        document.getElementById(
            "bookingAdults"
        ).value =
            booking.adults ?? 1;


        document.getElementById(
            "bookingChildren"
        ).value =
            booking.children ?? 0;


        document.getElementById(
            "bookingStatus"
        ).value =
            booking.status || "PENDING";


        document.getElementById(
            "bookingSource"
        ).value =
            booking.source || "DIRECT";


        document.getElementById(
            "bookingSpecialRequests"
        ).value =
            booking.special_requests || "";


        document.getElementById(
            "bookingNotes"
        ).value =
            booking.notes || "";


        openDrawer();

    }


    /* =====================================================
       OPEN DRAWER
       ===================================================== */

    function openDrawer() {

        const drawer =
            document.getElementById(
                "bookingDrawer"
            );


        const overlay =
            document.getElementById(
                "bookingDrawerOverlay"
            );


        if (!drawer) {

            return;

        }


        drawer.classList.add("show");

        drawer.setAttribute(
            "aria-hidden",
            "false"
        );


        if (overlay) {

            overlay.classList.add("show");

        }


        document.body.classList.add(
            "drawer-open"
        );


        setTimeout(function () {

            const guest =
                document.getElementById(
                    "bookingGuest"
                );


            if (guest) {

                guest.focus();

            }

        }, 300);

    }


    /* =====================================================
       CLOSE DRAWER
       ===================================================== */

    function closeDrawer() {

        const drawer =
            document.getElementById(
                "bookingDrawer"
            );


        const overlay =
            document.getElementById(
                "bookingDrawerOverlay"
            );


        if (drawer) {

            drawer.classList.remove(
                "show"
            );

            drawer.setAttribute(
                "aria-hidden",
                "true"
            );

        }


        if (overlay) {

            overlay.classList.remove(
                "show"
            );

        }


        document.body.classList.remove(
            "drawer-open"
        );


        editingBookingId = null;

    }


    /* =====================================================
       SAVE BOOKING
       ===================================================== */

    async function saveBooking() {

        if (!currentHotelId) {

            alert(
                "Hotel information is not available."
            );

            return;

        }


        const guestId =
            document.getElementById(
                "bookingGuest"
            ).value;


        const roomId =
            document.getElementById(
                "bookingRoom"
            ).value;


        const checkIn =
            document.getElementById(
                "bookingCheckIn"
            ).value;


        const checkOut =
            document.getElementById(
                "bookingCheckOut"
            ).value;


        const adults =
            Number(
                document.getElementById(
                    "bookingAdults"
                ).value || 1
            );


        const children =
            Number(
                document.getElementById(
                    "bookingChildren"
                ).value || 0
            );


        const status =
            document.getElementById(
                "bookingStatus"
            ).value;


        const source =
            document.getElementById(
                "bookingSource"
            ).value;


        const specialRequests =
            document.getElementById(
                "bookingSpecialRequests"
            ).value.trim();


        const notes =
            document.getElementById(
                "bookingNotes"
            ).value.trim();


        /* -----------------------------------------------
           Validation
           ----------------------------------------------- */

        if (!guestId) {

            alert(
                "Please select a guest."
            );

            return;

        }


        if (!roomId) {

            alert(
                "Please select a room."
            );

            return;

        }


        if (!checkIn) {

            alert(
                "Please select check-in date."
            );

            return;

        }


        if (!checkOut) {

            alert(
                "Please select check-out date."
            );

            return;

        }


        if (checkOut <= checkIn) {

            alert(
                "Check-out date must be after check-in date."
            );

            return;

        }


        if (adults < 1) {

            alert(
                "At least one adult is required."
            );

            return;

        }


        if (children < 0) {

            alert(
                "Children count cannot be negative."
            );

            return;

        }


        /* -----------------------------------------------
           Check room
           ----------------------------------------------- */

        const selectedRoom =
            findRoom(roomId);


        if (!selectedRoom) {

            alert(
                "Selected room could not be found."
            );

            return;

        }


        const roomStatus =
            String(
                selectedRoom.status ||
                "AVAILABLE"
            ).toUpperCase();


        const isEditing =
            Boolean(editingBookingId);


        const originalBooking =
            isEditing
                ? bookings.find(function (item) {

                    return String(item.id) ===
                        String(editingBookingId);

                })
                : null;


        const originalRoomId =
            originalBooking?.room_id || null;


        /*
         * Do not allow unavailable rooms for
         * a new booking.
         */

        const unavailableStatuses = [
            "OCCUPIED",
            "CLEANING",
            "MAINTENANCE"
        ];


        if (
            !isEditing &&
            unavailableStatuses.includes(roomStatus)
        ) {

            alert(
                `Room ${selectedRoom.room_number} is currently ${formatRoomStatus(roomStatus)}. Please select another room.`
            );

            return;

        }


        /*
         * If editing and changing room,
         * check the new room too.
         */

        if (
            isEditing &&
            String(originalRoomId) !==
            String(roomId) &&
            unavailableStatuses.includes(roomStatus)
        ) {

            alert(
                `Room ${selectedRoom.room_number} is currently ${formatRoomStatus(roomStatus)}. Please select another room.`
            );

            return;

        }


        /* -----------------------------------------------
           Date conflict
           ----------------------------------------------- */

        const conflict =
            await hasBookingConflict(
                roomId,
                checkIn,
                checkOut,
                editingBookingId
            );


        if (conflict) {

            alert(
                "This room already has another booking during the selected dates."
            );

            return;

        }


        /* -----------------------------------------------
           Button loading
           ----------------------------------------------- */

        const saveButton =
            document.getElementById(
                "saveBookingButton"
            );


        const saveText =
            document.getElementById(
                "saveBookingButtonText"
            );


        if (saveButton) {

            saveButton.disabled = true;

        }


        if (saveText) {

            saveText.textContent =
                isEditing
                    ? "Updating..."
                    : "Saving...";

        }


        try {

            const bookingNumber =
                document.getElementById(
                    "bookingNumber"
                ).value ||
                generateBookingNumber();


            const bookingData = {

                hotel_id:
                    currentHotelId,

                booking_number:
                    bookingNumber,

                guest_id:
                    guestId,

                room_id:
                    roomId,

                check_in_date:
                    checkIn,

                check_out_date:
                    checkOut,

                adults:
                    adults,

                children:
                    children,

                status:
                    status,

                source:
                    source,

                special_requests:
                    specialRequests || null,

                notes:
                    notes || null,

                updated_at:
                    new Date().toISOString()

            };


            let savedBooking = null;


            /* -------------------------------------------
               UPDATE
               ------------------------------------------- */

            if (isEditing) {

                const {
                    data,
                    error
                } = await window.supabaseClient
                    .from("bookings")
                    .update(
                        bookingData
                    )
                    .eq(
                        "id",
                        editingBookingId
                    )
                    .eq(
                        "hotel_id",
                        currentHotelId
                    )
                    .select()
                    .single();


                if (error) {

                    throw error;

                }


                savedBooking = data;

            }


            /* -------------------------------------------
               INSERT
               ------------------------------------------- */

            else {

                const {
                    data,
                    error
                } = await window.supabaseClient
                    .from("bookings")
                    .insert(
                        bookingData
                    )
                    .select()
                    .single();


                if (error) {

                    throw error;

                }


                savedBooking = data;

            }


            /* -------------------------------------------
               Room status
               ------------------------------------------- */

            await synchronizeBookingRooms(
                savedBooking,
                originalBooking
            );


            closeDrawer();


            await loadRooms();

            await loadBookings();


            showSuccessMessage(
                isEditing
                    ? "Booking updated successfully."
                    : "Booking created successfully."
            );

        } catch (error) {

            console.error(
                "Save booking error:",
                error
            );


            alert(
                getFriendlyError(
                    error
                )
            );

        } finally {

            if (saveButton) {

                saveButton.disabled =
                    false;

            }


            if (saveText) {

                saveText.textContent =
                    isEditing
                        ? "Update Booking"
                        : "Save Booking";

            }

        }

    }


    /* =====================================================
       BOOKING CONFLICT
       ===================================================== */

    async function hasBookingConflict(
        roomId,
        checkIn,
        checkOut,
        excludeBookingId
    ) {

        let query =
            window.supabaseClient
                .from("bookings")
                .select(
                    "id, room_id, check_in_date, check_out_date, status"
                )
                .eq(
                    "hotel_id",
                    currentHotelId
                )
                .eq(
                    "room_id",
                    roomId
                )
                .in(
                    "status",
                    [
                        "PENDING",
                        "CONFIRMED",
                        "CHECKED_IN"
                    ]
                )
                .lt(
                    "check_in_date",
                    checkOut
                )
                .gt(
                    "check_out_date",
                    checkIn
                );


        if (excludeBookingId) {

            query =
                query.neq(
                    "id",
                    excludeBookingId
                );

        }


        const {
            data,
            error
        } = await query;


        if (error) {

            console.error(
                "Conflict check error:",
                error
            );

            throw error;

        }


        return Boolean(
            data &&
            data.length
        );

    }


    /* =====================================================
       ROOM STATUS SYNCHRONIZATION
       ===================================================== */

    async function synchronizeBookingRooms(
        savedBooking,
        originalBooking
    ) {

        const roomIds = [];


        if (savedBooking?.room_id) {

            roomIds.push(
                savedBooking.room_id
            );

        }


        if (
            originalBooking?.room_id &&
            !roomIds.includes(
                originalBooking.room_id
            )
        ) {

            roomIds.push(
                originalBooking.room_id
            );

        }


        for (const roomId of roomIds) {

            await synchronizeRoomStatus(
                roomId,
                savedBooking
            );

        }

    }


    async function synchronizeRoomStatus(
        roomId,
        savedBooking
    ) {

        if (!roomId) {

            return;

        }


        const room =
            findRoom(roomId);


        if (!room) {

            return;

        }


        const {
            data: activeBookings,
            error
        } = await window.supabaseClient
            .from("bookings")
            .select(
                `
                id,
                room_id,
                status,
                check_in_date,
                check_out_date
                `
            )
            .eq(
                "hotel_id",
                currentHotelId
            )
            .eq(
                "room_id",
                roomId
            )
            .in(
                "status",
                [
                    "PENDING",
                    "CONFIRMED",
                    "CHECKED_IN"
                ]
            );


        if (error) {

            throw error;

        }


        const hasCheckedIn =
            (activeBookings || [])
                .some(function (booking) {

                    return String(
                        booking.status
                    ).toUpperCase() ===
                        "CHECKED_IN";

                });


        const hasReservation =
            (activeBookings || [])
                .some(function (booking) {

                    return [
                        "PENDING",
                        "CONFIRMED"
                    ].includes(
                        String(
                            booking.status
                        ).toUpperCase()
                    );

                });


        let desiredStatus = null;


        if (hasCheckedIn) {

            desiredStatus =
                "OCCUPIED";

        } else if (hasReservation) {

            desiredStatus =
                "RESERVED";

        } else if (
            savedBooking &&
            String(
                savedBooking.room_id
            ) === String(roomId) &&
            String(
                savedBooking.status
            ).toUpperCase() ===
            "CHECKED_OUT"
        ) {

            desiredStatus =
                "CLEANING";

        } else if (
            String(
                room.status
            ).toUpperCase() ===
            "RESERVED"
        ) {

            desiredStatus =
                "AVAILABLE";

        }


        if (!desiredStatus) {

            return;

        }


        if (
            String(
                room.status
            ).toUpperCase() ===
            desiredStatus
        ) {

            return;

        }


        /*
         * Never automatically overwrite
         * maintenance rooms.
         */

        if (
            String(
                room.status
            ).toUpperCase() ===
            "MAINTENANCE"
        ) {

            return;

        }


        const {
            error: updateError
        } = await window.supabaseClient
            .from("rooms")
            .update({

                status:
                    desiredStatus,

                updated_at:
                    new Date().toISOString()

            })
            .eq(
                "id",
                roomId
            )
            .eq(
                "hotel_id",
                currentHotelId
            );


        if (updateError) {

            throw updateError;

        }

    }


    /* =====================================================
       CANCEL BOOKING
       ===================================================== */

    async function cancelBooking(
        bookingId
    ) {

        const booking =
            bookings.find(function (item) {

                return String(item.id) ===
                    String(bookingId);

            });


        if (!booking) {

            return;

        }


        const confirmed =
            window.confirm(
                `Cancel booking ${booking.booking_number || "#" + booking.id}?`
            );


        if (!confirmed) {

            return;

        }


        try {

            const {
                data,
                error
            } = await window.supabaseClient
                .from("bookings")
                .update({

                    status:
                        "CANCELLED",

                    updated_at:
                        new Date().toISOString()

                })
                .eq(
                    "id",
                    bookingId
                )
                .eq(
                    "hotel_id",
                    currentHotelId
                )
                .select()
                .single();


            if (error) {

                throw error;

            }


            await synchronizeRoomStatus(
                booking.room_id,
                data
            );


            await loadRooms();

            await loadBookings();


            showSuccessMessage(
                "Booking cancelled successfully."
            );

        } catch (error) {

            console.error(
                "Cancel booking error:",
                error
            );


            alert(
                getFriendlyError(
                    error
                )
            );

        }

    }


    /* =====================================================
       TABLE ACTIONS
       ===================================================== */

    function handleTableAction(event) {

        const editButton =
            event.target.closest(
                ".edit-booking"
            );


        if (editButton) {

            openEditBooking(
                editButton.dataset.id
            );

            return;

        }


        const cancelButton =
            event.target.closest(
                ".cancel-booking"
            );


        if (cancelButton) {

            cancelBooking(
                cancelButton.dataset.id
            );

        }

    }


    /* =====================================================
       DEFAULTS
       ===================================================== */

    function populateBookingDefaults() {

        const checkIn =
            document.getElementById(
                "bookingCheckIn"
            );


        const checkOut =
            document.getElementById(
                "bookingCheckOut"
            );


        if (checkIn) {

            checkIn.value =
                getToday();

        }


        if (checkOut) {

            checkOut.value =
                getTomorrow();

        }

    }


    /* =====================================================
       STATISTICS
       ===================================================== */

    function updateStatistics() {

        const total =
            bookings.length;


        const confirmed =
            bookings.filter(function (booking) {

                return String(
                    booking.status || ""
                ).toUpperCase() ===
                    "CONFIRMED";

            }).length;


        const today =
            getToday();


        const checkIns =
            bookings.filter(function (booking) {

                return (
                    booking.check_in_date ===
                    today &&
                    [
                        "PENDING",
                        "CONFIRMED"
                    ].includes(
                        String(
                            booking.status || ""
                        ).toUpperCase()
                    )
                );

            }).length;


        const checkOuts =
            bookings.filter(function (booking) {

                return (
                    booking.check_out_date ===
                    today &&
                    String(
                        booking.status || ""
                    ).toUpperCase() ===
                    "CHECKED_IN"
                );

            }).length;


        setText(
            "totalBookingsCount",
            total
        );


        setText(
            "confirmedBookingsCount",
            confirmed
        );


        setText(
            "checkInsTodayCount",
            checkIns
        );


        setText(
            "checkOutsTodayCount",
            checkOuts
        );

    }


    /* =====================================================
       FILTERS
       ===================================================== */

    function clearBookingFilters() {

        const search =
            document.getElementById(
                "bookingSearch"
            );


        const status =
            document.getElementById(
                "bookingStatusFilter"
            );


        const date =
            document.getElementById(
                "bookingDateFilter"
            );


        if (search) {

            search.value = "";

        }


        if (status) {

            status.value = "";

        }


        if (date) {

            date.value = "";

        }


        renderBookings();

    }


    /* =====================================================
       MOBILE MENU
       ===================================================== */

    function setupMobileMenu() {

        const menu =
            document.getElementById(
                "mobileMenu"
            );


        const sidebar =
            document.getElementById(
                "sidebar"
            );


        const backdrop =
            document.getElementById(
                "sidebarBackdrop"
            );


        if (!menu || !sidebar) {

            return;

        }


        menu.addEventListener(
            "click",
            function () {

                sidebar.classList.toggle(
                    "show"
                );

                sidebar.classList.toggle(
                    "open"
                );


                if (backdrop) {

                    backdrop.classList.toggle(
                        "show"
                    );

                }

            }
        );


        if (backdrop) {

            backdrop.addEventListener(
                "click",
                closeMobileMenu
            );

        }


        sidebar
            .querySelectorAll("a")
            .forEach(function (link) {

                link.addEventListener(
                    "click",
                    closeMobileMenu
                );

            });

    }


    function closeMobileMenu() {

        const sidebar =
            document.getElementById(
                "sidebar"
            );


        const backdrop =
            document.getElementById(
                "sidebarBackdrop"
            );


        if (sidebar) {

            sidebar.classList.remove(
                "show",
                "open"
            );

        }


        if (backdrop) {

            backdrop.classList.remove(
                "show"
            );

        }

    }


    /* =====================================================
       HELPERS
       ===================================================== */

    function findGuest(id) {

        return guests.find(function (guest) {

            return String(guest.id) ===
                String(id);

        }) || null;

    }


    function findRoom(id) {

        return rooms.find(function (room) {

            return String(room.id) ===
                String(id);

        }) || null;

    }


    function getGuestName(guest) {

        if (!guest) {

            return "Unknown Guest";

        }


        if (guest.full_name) {

            return guest.full_name;

        }


        const name = [
            guest.first_name,
            guest.last_name
        ]
            .filter(Boolean)
            .join(" ")
            .trim();


        return name ||
            guest.email ||
            "Guest";

    }


    function getInitials(name) {

        if (!name) {

            return "G";

        }


        const parts =
            String(name)
                .trim()
                .split(/\s+/)
                .filter(Boolean);


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


    function formatDate(value) {

        if (!value) {

            return "—";

        }


        const date =
            new Date(
                `${value}T00:00:00`
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return value;

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


    function getToday() {

        const date =
            new Date();


        const year =
            date.getFullYear();


        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );


        return `${year}-${month}-${day}`;

    }


    function getTomorrow() {

        const date =
            new Date();


        date.setDate(
            date.getDate() + 1
        );


        const year =
            date.getFullYear();


        const month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );


        return `${year}-${month}-${day}`;

    }


    function generateBookingNumber() {

        const now =
            new Date();


        const year =
            now.getFullYear();


        const random =
            Math.floor(
                1000 +
                Math.random() * 9000
            );


        return `BK-${year}-${random}`;

    }


    function formatStatus(status) {

        const map = {

            PENDING:
                "Pending",

            CONFIRMED:
                "Confirmed",

            CHECKED_IN:
                "Checked In",

            CHECKED_OUT:
                "Checked Out",

            CANCELLED:
                "Cancelled",

            NO_SHOW:
                "No Show"

        };


        return map[status] ||
            String(status)
                .replaceAll("_", " ");

    }


    function getStatusClass(status) {

        const map = {

            PENDING:
                "status-pending",

            CONFIRMED:
                "status-confirmed",

            CHECKED_IN:
                "status-checked-in",

            CHECKED_OUT:
                "status-checked-out",

            CANCELLED:
                "status-cancelled",

            NO_SHOW:
                "status-no-show"

        };


        return map[status] ||
            "status-default";

    }


    function formatSource(source) {

        if (!source) {

            return "Direct";

        }


        const map = {

            DIRECT:
                "Direct",

            PHONE:
                "Phone",

            WEBSITE:
                "Website",

            OTA:
                "OTA",

            WALK_IN:
                "Walk-in",

            OTHER:
                "Other"

        };


        return map[source] ||
            String(source)
                .replaceAll("_", " ");

    }


    function formatRoomStatus(status) {

        const map = {

            AVAILABLE:
                "Available",

            RESERVED:
                "Reserved",

            OCCUPIED:
                "Occupied",

            CLEANING:
                "Cleaning",

            MAINTENANCE:
                "Maintenance"

        };


        return map[status] ||
            String(status)
                .replaceAll("_", " ");

    }


    function escapeHtml(value) {

        if (
            value === null ||
            value === undefined
        ) {

            return "";

        }


        return String(value)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

    }


    function setText(
        id,
        value
    ) {

        const element =
            document.getElementById(id);


        if (element) {

            element.textContent =
                value;

        }

    }


    /* =====================================================
       LOADING / ERROR
       ===================================================== */

    function setTableLoading() {

        const tbody =
            document.getElementById(
                "bookingsTableBody"
            );


        if (!tbody) {

            return;

        }


        tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="table-loading"
                >

                    <div class="loading-spinner"></div>

                    Loading bookings...

                </td>

            </tr>

        `;

    }


    function showTableError(message) {

        const tbody =
            document.getElementById(
                "bookingsTableBody"
            );


        if (!tbody) {

            return;

        }


        tbody.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="table-error"
                >

                    <div class="error-icon">
                        !
                    </div>

                    <strong>
                        Unable to load bookings
                    </strong>

                    <p>
                        ${escapeHtml(message)}
                    </p>

                    <button
                        type="button"
                        class="btn btn-light"
                        onclick="location.reload()"
                    >
                        Try Again
                    </button>

                </td>

            </tr>

        `;

    }


    function showPageError(message) {

        const tbody =
            document.getElementById(
                "bookingsTableBody"
            );


        if (tbody) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="8"
                        class="table-error"
                    >

                        <div class="error-icon">
                            !
                        </div>

                        <strong>
                            Something went wrong
                        </strong>

                        <p>
                            ${escapeHtml(message)}
                        </p>

                    </td>

                </tr>

            `;

        }

    }


    function showSuccessMessage(message) {

        /*
         * Use a lightweight temporary toast.
         */

        let toast =
            document.getElementById(
                "bookingToast"
            );


        if (!toast) {

            toast =
                document.createElement(
                    "div"
                );

            toast.id =
                "bookingToast";

            toast.className =
                "booking-toast";

            document.body.appendChild(
                toast
            );

        }


        toast.textContent =
            message;


        toast.classList.add(
            "show"
        );


        clearTimeout(
            toast._timer
        );


        toast._timer =
            setTimeout(
                function () {

                    toast.classList.remove(
                        "show"
                    );

                },
                3000
            );

    }


    function getFriendlyError(error) {

        if (!error) {

            return "Something went wrong.";

        }


        const message =
            String(
                error.message ||
                error.details ||
                error.hint ||
                error
            );


        if (
            message
                .toLowerCase()
                .includes(
                    "duplicate"
                )
        ) {

            return "This booking number already exists. Please try again.";

        }


        if (
            message
                .toLowerCase()
                .includes(
                    "permission"
                ) ||
            message
                .toLowerCase()
                .includes(
                    "row-level security"
                )
        ) {

            return "You do not have permission to perform this action.";

        }


        return message;

    }

})();