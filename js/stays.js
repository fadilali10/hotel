document.addEventListener("DOMContentLoaded", async () => {

    console.log("Check-in & Stays module loaded");

    /* =========================================================
       SUPABASE
    ========================================================= */

    if (!window.supabaseClient) {
        console.error("Supabase client not initialized.");
        return;
    }

    const supabase = window.supabaseClient;

    let currentHotelId = null;

    let stays = [];
    let bookings = [];
    let guests = [];
    let rooms = [];

    let isProcessing = false;


    /* =========================================================
       ELEMENTS
    ========================================================= */

    const staySearch =
        document.getElementById("staySearch");

    const staysTableBody =
        document.getElementById("staysTableBody");

    const readyBookingsTableBody =
        document.getElementById("readyBookingsTableBody");

    const checkInBtn =
        document.getElementById("checkInBtn");

    const activeStaysCount =
        document.getElementById("activeStaysCount");

    const readyForCheckInCount =
        document.getElementById("readyForCheckInCount");

    const checkedInTodayCount =
        document.getElementById("checkedInTodayCount");

    const occupiedRoomsCount =
        document.getElementById("occupiedRoomsCount");

    const readyForCheckInHeaderCount =
        document.getElementById(
            "readyForCheckInHeaderCount"
        );


    /* =========================================================
       HELPERS
    ========================================================= */

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


    function getToday() {

        const date = new Date();

        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    function formatDate(value) {

        if (!value) {
            return "-";
        }

        const parts =
            String(value)
                .substring(0, 10)
                .split("-");

        if (parts.length !== 3) {
            return String(value);
        }

        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }


    function formatDateTime(value) {

        if (!value) {
            return "-";
        }

        const date =
            new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString(
            "en-IN",
            {
                dateStyle: "medium",
                timeStyle: "short"
            }
        );
    }


    function getGuestById(id) {

        return guests.find(
            guest =>
                String(guest.id) ===
                String(id)
        ) || null;
    }


    function getRoomById(id) {

        return rooms.find(
            room =>
                String(room.id) ===
                String(id)
        ) || null;
    }


    function getBookingById(id) {

        return bookings.find(
            booking =>
                String(booking.id) ===
                String(id)
        ) || null;
    }


    function getStayById(id) {

        return stays.find(
            stay =>
                String(stay.id) ===
                String(id)
        ) || null;
    }


    function getGuestName(guest) {

        if (!guest) {
            return "Unknown Guest";
        }

        if (
            guest.full_name &&
            String(guest.full_name).trim()
        ) {
            return String(
                guest.full_name
            ).trim();
        }

        const name = [
            guest.first_name,
            guest.last_name
        ]
            .filter(
                value =>
                    value &&
                    String(value).trim()
            )
            .join(" ")
            .trim();

        return name || "Unknown Guest";
    }


    function getRoomName(room) {

        if (!room) {
            return "Unknown Room";
        }

        if (
            room.room_number !== null &&
            room.room_number !== undefined
        ) {
            return `Room ${room.room_number}`;
        }

        return "Unknown Room";
    }


    function generateStayNumber() {

        const date =
            getToday().replace(/-/g, "");

        const random =
            Math.floor(
                1000 +
                Math.random() * 9000
            );

        return `ST-${date}-${random}`;
    }


    function showError(message) {

        console.error(message);

        alert(message);
    }


    function setButtonBusy(
        button,
        busy,
        busyText = "Processing..."
    ) {

        if (!button) {
            return;
        }

        if (busy) {

            if (
                !button.dataset.originalText
            ) {
                button.dataset.originalText =
                    button.innerHTML;
            }

            button.disabled = true;
            button.innerHTML = busyText;

        } else {

            button.disabled = false;

            if (
                button.dataset.originalText
            ) {
                button.innerHTML =
                    button.dataset.originalText;

                delete button.dataset.originalText;
            }
        }
    }


    /* =========================================================
       LOAD CURRENT HOTEL
    ========================================================= */

    async function loadCurrentHotel() {

        const {
            data: {
                user
            } = {},
            error: userError
        } = await supabase.auth.getUser();


        if (userError) {

            console.error(
                "Auth user error:",
                userError
            );

            showError(
                "Unable to verify your login."
            );

            return false;
        }


        if (!user) {

            window.location.href =
                "login.html";

            return false;
        }


        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("profiles")
            .select(`
                id,
                hotel_id,
                full_name,
                role
            `)
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


        if (profileError) {

            console.error(
                "Profile loading error:",
                profileError
            );

            showError(
                "Unable to load your hotel profile."
            );

            return false;
        }


        if (
            !profile ||
            !profile.hotel_id
        ) {

            showError(
                "Your account is not connected to a hotel."
            );

            return false;
        }


        currentHotelId =
            profile.hotel_id;


        const topUserName =
            document.getElementById(
                "topUserName"
            );

        const topUserInitial =
            document.getElementById(
                "topUserInitial"
            );


        if (topUserName) {

            topUserName.textContent =
                profile.full_name ||
                user.email?.split("@")[0] ||
                "User";
        }


        if (topUserInitial) {

            const name =
                profile.full_name ||
                user.email ||
                "U";

            topUserInitial.textContent =
                name
                    .trim()
                    .charAt(0)
                    .toUpperCase();
        }


        console.log(
            "Current hotel:",
            currentHotelId
        );

        return true;
    }


    /* =========================================================
       LOAD GUESTS
    ========================================================= */

    async function loadGuests() {

        const {
            data,
            error
        } = await supabase
            .from("guests")
            .select(`
                id,
                hotel_id,
                first_name,
                last_name,
                full_name,
                phone,
                email
            `)
            .eq(
                "hotel_id",
                currentHotelId
            )
            .order(
                "id",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "Guests loading error:",
                error
            );

            guests = [];

            return false;
        }


        guests =
            data || [];

        return true;
    }


    /* =========================================================
       LOAD ROOMS
    ========================================================= */

    async function loadRooms() {

        const {
            data,
            error
        } = await supabase
            .from("rooms")
            .select(`
                id,
                hotel_id,
                room_number,
                room_type_id,
                floor,
                status,
                price,
                notes,
                created_at,
                updated_at
            `)
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
                "Rooms loading error:",
                error
            );

            rooms = [];

            return false;
        }


        rooms =
            data || [];

        return true;
    }


    /* =========================================================
       LOAD BOOKINGS
    ========================================================= */

    async function loadBookings() {

        const {
            data,
            error
        } = await supabase
            .from("bookings")
            .select(`
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
            `)
            .eq(
                "hotel_id",
                currentHotelId
            )
            .order(
                "check_in_date",
                {
                    ascending: true
                }
            );


        if (error) {

            console.error(
                "Bookings loading error:",
                error
            );

            bookings = [];

            if (readyBookingsTableBody) {

                readyBookingsTableBody.innerHTML = `
                    <tr>
                        <td colspan="7"
                            class="empty-table">
                            Failed to load bookings.
                        </td>
                    </tr>
                `;
            }

            return false;
        }


        bookings =
            data || [];


        console.log(
            "Bookings loaded:",
            bookings.length
        );

        return true;
    }


    /* =========================================================
       LOAD STAYS
    ========================================================= */

    async function loadStays() {

        const {
            data,
            error
        } = await supabase
            .from("stays")
            .select(`
                id,
                hotel_id,
                stay_number,
                booking_id,
                guest_id,
                room_id,
                actual_check_in,
                expected_check_out,
                actual_check_out,
                adults,
                children,
                status,
                notes,
                created_at,
                updated_at
            `)
            .eq(
                "hotel_id",
                currentHotelId
            )
            .order(
                "actual_check_in",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "Stays loading error:",
                error
            );

            stays = [];

            if (staysTableBody) {

                staysTableBody.innerHTML = `
                    <tr>
                        <td colspan="8"
                            class="empty-table">
                            Failed to load stays.
                        </td>
                    </tr>
                `;
            }

            return false;
        }


        stays =
            data || [];


        console.log(
            "Stays loaded:",
            stays.length
        );

        return true;
    }


    /* =========================================================
       READY BOOKINGS
    ========================================================= */

    function getReadyBookings() {

        const today =
            getToday();


        return bookings.filter(
            booking => {

                if (!booking) {
                    return false;
                }


                if (
                    booking.status !==
                    "CONFIRMED"
                ) {
                    return false;
                }


                if (
                    booking.check_in_date &&
                    booking.check_in_date >
                    today
                ) {
                    return false;
                }


                const alreadyCheckedIn =
                    stays.some(
                        stay =>
                            String(
                                stay.booking_id
                            ) ===
                            String(
                                booking.id
                            ) &&
                            stay.status ===
                            "ACTIVE"
                    );


                if (alreadyCheckedIn) {
                    return false;
                }


                if (!booking.room_id) {
                    return false;
                }


                const room =
                    getRoomById(
                        booking.room_id
                    );


                if (!room) {
                    return false;
                }


                if (
                    room.status === "OCCUPIED" ||
                    room.status === "CLEANING" ||
                    room.status === "MAINTENANCE"
                ) {
                    return false;
                }


                return true;
            }
        );
    }


    /* =========================================================
       RENDER READY BOOKINGS
    ========================================================= */

    function renderReadyBookings() {

        if (!readyBookingsTableBody) {
            return;
        }


        const readyBookings =
            getReadyBookings();


        if (readyForCheckInCount) {

            readyForCheckInCount.textContent =
                readyBookings.length;
        }


        if (readyForCheckInHeaderCount) {

            readyForCheckInHeaderCount.textContent =
                readyBookings.length;
        }


        if (!readyBookings.length) {

            readyBookingsTableBody.innerHTML = `
                <tr>
                    <td colspan="7"
                        class="empty-table">
                        No bookings are ready for check-in.
                    </td>
                </tr>
            `;

            return;
        }


        readyBookingsTableBody.innerHTML =
            readyBookings.map(
                booking => {

                    const guest =
                        getGuestById(
                            booking.guest_id
                        );

                    const room =
                        getRoomById(
                            booking.room_id
                        );


                    const totalGuests =
                        Number(
                            booking.adults || 0
                        ) +
                        Number(
                            booking.children || 0
                        );


                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${escapeHtml(
                                        booking.booking_number || "-"
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHtml(
                                    getGuestName(guest)
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getRoomName(room)
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    booking.check_in_date
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    booking.check_out_date
                                )}
                            </td>

                            <td>
                                ${totalGuests}
                            </td>

                            <td>

                                <button
                                    type="button"
                                    class="small-btn primary-btn stay-checkin-btn"
                                    data-id="${escapeHtml(
                                        booking.id
                                    )}">

                                    Check-in

                                </button>

                            </td>

                        </tr>
                    `;
                }
            ).join("");
    }


    /* =========================================================
       RENDER ACTIVE STAYS
    ========================================================= */

    function renderStays() {

        if (!staysTableBody) {
            return;
        }


        const search =
            staySearch
                ? staySearch.value
                    .trim()
                    .toLowerCase()
                : "";


        const activeStays =
            stays.filter(
                stay =>
                    stay.status ===
                    "ACTIVE"
            );


        const filtered =
            activeStays.filter(
                stay => {

                    const guest =
                        getGuestById(
                            stay.guest_id
                        );

                    const room =
                        getRoomById(
                            stay.room_id
                        );

                    const booking =
                        getBookingById(
                            stay.booking_id
                        );


                    const guestName =
                        getGuestName(
                            guest
                        ).toLowerCase();


                    const roomNumber =
                        room
                            ? String(
                                room.room_number || ""
                            ).toLowerCase()
                            : "";


                    const stayNumber =
                        String(
                            stay.stay_number || ""
                        ).toLowerCase();


                    const bookingNumber =
                        booking
                            ? String(
                                booking.booking_number || ""
                            ).toLowerCase()
                            : "";


                    return (
                        !search ||
                        guestName.includes(search) ||
                        roomNumber.includes(search) ||
                        stayNumber.includes(search) ||
                        bookingNumber.includes(search)
                    );
                }
            );


        if (activeStaysCount) {

            activeStaysCount.textContent =
                activeStays.length;
        }


        if (!filtered.length) {

            staysTableBody.innerHTML = `
                <tr>
                    <td colspan="8"
                        class="empty-table">
                        No active stays found.
                    </td>
                </tr>
            `;

            return;
        }


        staysTableBody.innerHTML =
            filtered.map(
                stay => {

                    const guest =
                        getGuestById(
                            stay.guest_id
                        );

                    const room =
                        getRoomById(
                            stay.room_id
                        );


                    const totalGuests =
                        Number(
                            stay.adults || 0
                        ) +
                        Number(
                            stay.children || 0
                        );


                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${escapeHtml(
                                        stay.stay_number || "-"
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHtml(
                                    getGuestName(guest)
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getRoomName(room)
                                )}
                            </td>

                            <td>
                                ${formatDateTime(
                                    stay.actual_check_in
                                )}
                            </td>

                            <td>
                                ${formatDate(
                                    stay.expected_check_out
                                )}
                            </td>

                            <td>
                                ${totalGuests}
                            </td>

                            <td>
                                <span class="booking-status active">
                                    ACTIVE
                                </span>
                            </td>

                            <td>

                                <button
                                    type="button"
                                    class="small-btn danger-btn stay-checkout-btn"
                                    data-id="${escapeHtml(
                                        stay.id
                                    )}">

                                    Checkout

                                </button>

                            </td>

                        </tr>
                    `;
                }
            ).join("");
    }


    /* =========================================================
       SUMMARY
    ========================================================= */

    function updateSummary() {

        const today =
            getToday();


        const ready =
            getReadyBookings();


        const active =
            stays.filter(
                stay =>
                    stay.status ===
                    "ACTIVE"
            );


        const checkedInToday =
            stays.filter(
                stay => {

                    if (
                        !stay.actual_check_in
                    ) {
                        return false;
                    }

                    return (
                        String(
                            stay.actual_check_in
                        ).substring(0, 10) ===
                        today
                    );
                }
            );


        const occupiedRooms =
            rooms.filter(
                room =>
                    room.status ===
                    "OCCUPIED"
            );


        if (readyForCheckInCount) {

            readyForCheckInCount.textContent =
                ready.length;
        }


        if (readyForCheckInHeaderCount) {

            readyForCheckInHeaderCount.textContent =
                ready.length;
        }


        if (activeStaysCount) {

            activeStaysCount.textContent =
                active.length;
        }


        if (checkedInTodayCount) {

            checkedInTodayCount.textContent =
                checkedInToday.length;
        }


        if (occupiedRoomsCount) {

            occupiedRoomsCount.textContent =
                occupiedRooms.length;
        }
    }


    /* =========================================================
       CHECK-IN
    ========================================================= */

    async function checkInBooking(
        bookingId,
        button = null
    ) {

        if (isProcessing) {
            return;
        }


        const booking =
            getBookingById(
                bookingId
            );


        if (!booking) {

            showError(
                "Booking not found."
            );

            return;
        }


        if (
            booking.status !==
            "CONFIRMED"
        ) {

            showError(
                `This booking cannot be checked in because its status is ${booking.status || "UNKNOWN"}.`
            );

            return;
        }


        const existingStay =
            stays.find(
                stay =>
                    String(
                        stay.booking_id
                    ) ===
                    String(
                        booking.id
                    ) &&
                    stay.status ===
                    "ACTIVE"
            );


        if (existingStay) {

            showError(
                "This booking is already checked in."
            );

            return;
        }


        const room =
            getRoomById(
                booking.room_id
            );


        if (!room) {

            showError(
                "Room not found for this booking."
            );

            return;
        }


        if (
            room.status === "OCCUPIED" ||
            room.status === "CLEANING" ||
            room.status === "MAINTENANCE"
        ) {

            showError(
                `Room ${room.room_number} is currently ${room.status}.`
            );

            return;
        }


        const guest =
            getGuestById(
                booking.guest_id
            );


        if (!guest) {

            showError(
                "Guest information could not be found."
            );

            return;
        }


        const confirmed =
            confirm(
                `Check-in ${getGuestName(guest)} to Room ${room.room_number}?`
            );


        if (!confirmed) {
            return;
        }


        isProcessing = true;

        setButtonBusy(
            button,
            true,
            "Checking-in..."
        );


        try {

            /* -----------------------------------------
               RE-CHECK ROOM
            ----------------------------------------- */

            const {
                data: latestRoom,
                error: latestRoomError
            } = await supabase
                .from("rooms")
                .select(`
                    id,
                    hotel_id,
                    room_number,
                    status
                `)
                .eq(
                    "id",
                    booking.room_id
                )
                .eq(
                    "hotel_id",
                    currentHotelId
                )
                .maybeSingle();


            if (latestRoomError) {
                throw new Error(
                    latestRoomError.message
                );
            }


            if (!latestRoom) {
                throw new Error(
                    "Room no longer exists."
                );
            }


            if (
                latestRoom.status === "OCCUPIED" ||
                latestRoom.status === "CLEANING" ||
                latestRoom.status === "MAINTENANCE"
            ) {

                throw new Error(
                    `Room ${latestRoom.room_number} is currently ${latestRoom.status}.`
                );
            }


            /* -----------------------------------------
               DUPLICATE CHECK
            ----------------------------------------- */

            const {
                data: duplicateStay,
                error: duplicateError
            } = await supabase
                .from("stays")
                .select("id, status")
                .eq(
                    "hotel_id",
                    currentHotelId
                )
                .eq(
                    "booking_id",
                    booking.id
                )
                .eq(
                    "status",
                    "ACTIVE"
                )
                .maybeSingle();


            if (duplicateError) {
                throw new Error(
                    duplicateError.message
                );
            }


            if (duplicateStay) {
                throw new Error(
                    "This booking is already checked in."
                );
            }


            const now =
                new Date().toISOString();


            const stayNumber =
                generateStayNumber();


            /* -----------------------------------------
               CREATE STAY
            ----------------------------------------- */

            const stayData = {

                hotel_id:
                    currentHotelId,

                stay_number:
                    stayNumber,

                booking_id:
                    booking.id,

                guest_id:
                    booking.guest_id,

                room_id:
                    booking.room_id,

                actual_check_in:
                    now,

                expected_check_out:
                    booking.check_out_date,

                adults:
                    Number(
                        booking.adults || 1
                    ),

                children:
                    Number(
                        booking.children || 0
                    ),

                status:
                    "ACTIVE",

                notes:
                    booking.notes ||
                    null,

                updated_at:
                    now
            };


            const {
                data: insertedStay,
                error: stayError
            } = await supabase
                .from("stays")
                .insert(stayData)
                .select(`
                    id,
                    hotel_id,
                    stay_number,
                    booking_id,
                    guest_id,
                    room_id,
                    actual_check_in,
                    expected_check_out,
                    adults,
                    children,
                    status,
                    notes,
                    created_at,
                    updated_at
                `)
                .single();


            if (stayError) {

                throw new Error(
                    stayError.message
                );
            }


            console.log(
                "Stay created:",
                insertedStay
            );


            /* -----------------------------------------
               UPDATE BOOKING
            ----------------------------------------- */

            const {
                error: bookingError
            } = await supabase
                .from("bookings")
                .update({
                    status:
                        "CHECKED_IN",
                    updated_at:
                        now
                })
                .eq(
                    "id",
                    booking.id
                )
                .eq(
                    "hotel_id",
                    currentHotelId
                );


            if (bookingError) {

                await supabase
                    .from("stays")
                    .delete()
                    .eq(
                        "id",
                        insertedStay.id
                    )
                    .eq(
                        "hotel_id",
                        currentHotelId
                    );

                throw new Error(
                    `Booking status could not be updated: ${bookingError.message}`
                );
            }


            /* -----------------------------------------
               UPDATE ROOM
            ----------------------------------------- */

            const {
                error: roomError
            } = await supabase
                .from("rooms")
                .update({
                    status:
                        "OCCUPIED",
                    updated_at:
                        now
                })
                .eq(
                    "id",
                    booking.room_id
                )
                .eq(
                    "hotel_id",
                    currentHotelId
                );


            if (roomError) {

                await supabase
                    .from("bookings")
                    .update({
                        status:
                            "CONFIRMED",
                        updated_at:
                            now
                    })
                    .eq(
                        "id",
                        booking.id
                    )
                    .eq(
                        "hotel_id",
                        currentHotelId
                    );


                await supabase
                    .from("stays")
                    .delete()
                    .eq(
                        "id",
                        insertedStay.id
                    )
                    .eq(
                        "hotel_id",
                        currentHotelId
                    );


                throw new Error(
                    `Room status could not be updated: ${roomError.message}`
                );
            }


            await reloadAll();


            alert(
                `Check-in successful.\n\nStay Number: ${stayNumber}`
            );

        } catch (error) {

            console.error(
                "Check-in error:",
                error
            );

            showError(
                `Failed to check-in:\n${error.message}`
            );

        } finally {

            isProcessing = false;

            setButtonBusy(
                button,
                false
            );
        }
    }


    /* =========================================================
       CHECKOUT
    ========================================================= */

    async function checkoutStay(
        stayId,
        button = null
    ) {

        if (isProcessing) {
            return;
        }


        const stay =
            getStayById(
                stayId
            );


        if (!stay) {

            showError(
                "Stay not found."
            );

            return;
        }


        if (
            stay.status !==
            "ACTIVE"
        ) {

            showError(
                "This stay is no longer active."
            );

            return;
        }


        const guest =
            getGuestById(
                stay.guest_id
            );


        const room =
            getRoomById(
                stay.room_id
            );


        const confirmed =
            confirm(
                `Checkout ${getGuestName(guest)} from ${getRoomName(room)}?`
            );


        if (!confirmed) {
            return;
        }


        isProcessing = true;

        setButtonBusy(
            button,
            true,
            "Checking out..."
        );


        try {

            const now =
                new Date().toISOString();


            /* -----------------------------------------
               UPDATE STAY
            ----------------------------------------- */

            const {
                error: stayError
            } = await supabase
                .from("stays")
                .update({

                    actual_check_out:
                        now,

                    status:
                        "CHECKED_OUT",

                    updated_at:
                        now

                })
                .eq(
                    "id",
                    stay.id
                )
                .eq(
                    "hotel_id",
                    currentHotelId
                );


            if (stayError) {

                throw new Error(
                    stayError.message
                );
            }


            /* -----------------------------------------
               UPDATE BOOKING
            ----------------------------------------- */

            if (stay.booking_id) {

                const {
                    error: bookingError
                } = await supabase
                    .from("bookings")
                    .update({

                        status:
                            "CHECKED_OUT",

                        updated_at:
                            now

                    })
                    .eq(
                        "id",
                        stay.booking_id
                    )
                    .eq(
                        "hotel_id",
                        currentHotelId
                    );


                if (bookingError) {

                    await supabase
                        .from("stays")
                        .update({
                            status:
                                "ACTIVE",
                            actual_check_out:
                                null,
                            updated_at:
                                now
                        })
                        .eq(
                            "id",
                            stay.id
                        )
                        .eq(
                            "hotel_id",
                            currentHotelId
                        );


                    throw new Error(
                        `Booking checkout update failed: ${bookingError.message}`
                    );
                }
            }


            /* -----------------------------------------
               ROOM -> CLEANING
            ----------------------------------------- */

            const {
                error: roomError
            } = await supabase
                .from("rooms")
                .update({

                    status:
                        "CLEANING",

                    updated_at:
                        now

                })
                .eq(
                    "id",
                    stay.room_id
                )
                .eq(
                    "hotel_id",
                    currentHotelId
                );


            if (roomError) {

                if (stay.booking_id) {

                    await supabase
                        .from("bookings")
                        .update({
                            status:
                                "CHECKED_IN",
                            updated_at:
                                now
                        })
                        .eq(
                            "id",
                            stay.booking_id
                        )
                        .eq(
                            "hotel_id",
                            currentHotelId
                        );
                }


                await supabase
                    .from("stays")
                    .update({
                        status:
                            "ACTIVE",
                        actual_check_out:
                            null,
                        updated_at:
                            now
                    })
                    .eq(
                        "id",
                        stay.id
                    )
                    .eq(
                        "hotel_id",
                        currentHotelId
                    );


                throw new Error(
                    `Room could not be moved to CLEANING: ${roomError.message}`
                );
            }


            await reloadAll();


            alert(
                "Guest checked out successfully.\n\nRoom moved to CLEANING."
            );

        } catch (error) {

            console.error(
                "Checkout error:",
                error
            );

            showError(
                `Failed to checkout:\n${error.message}`
            );

        } finally {

            isProcessing = false;

            setButtonBusy(
                button,
                false
            );
        }
    }


    /* =========================================================
       RELOAD EVERYTHING
    ========================================================= */

    async function reloadAll() {

        await loadGuests();

        await loadRooms();

        await loadBookings();

        await loadStays();

        renderStays();

        renderReadyBookings();

        updateSummary();
    }


    /* =========================================================
       SEARCH
    ========================================================= */

    if (staySearch) {

        staySearch.addEventListener(
            "input",
            () => {
                renderStays();
            }
        );
    }


    /* =========================================================
       TOP CHECK-IN BUTTON
    ========================================================= */

    if (checkInBtn) {

        checkInBtn.addEventListener(
            "click",
            () => {

                const ready =
                    getReadyBookings();


                if (!ready.length) {

                    alert(
                        "There are no bookings ready for check-in."
                    );

                    return;
                }


                const first =
                    ready[0];


                const button =
                    readyBookingsTableBody
                        ?.querySelector(
                            `.stay-checkin-btn[data-id="${first.id}"]`
                        );


                if (button) {

                    button.scrollIntoView({
                        behavior: "smooth",
                        block: "center"
                    });

                    setTimeout(
                        () => {
                            checkInBooking(
                                first.id,
                                button
                            );
                        },
                        300
                    );

                } else {

                    alert(
                        "Please use the Check-in button beside the booking."
                    );
                }
            }
        );
    }


    /* =========================================================
       READY BOOKING ACTION
    ========================================================= */

    if (readyBookingsTableBody) {

        readyBookingsTableBody.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        ".stay-checkin-btn"
                    );


                if (!button) {
                    return;
                }


                const id =
                    button.dataset.id;


                if (!id) {
                    return;
                }


                checkInBooking(
                    id,
                    button
                );
            }
        );
    }


    /* =========================================================
       ACTIVE STAY ACTION
    ========================================================= */

    if (staysTableBody) {

        staysTableBody.addEventListener(
            "click",
            event => {

                const button =
                    event.target.closest(
                        ".stay-checkout-btn"
                    );


                if (!button) {
                    return;
                }


                const id =
                    button.dataset.id;


                if (!id) {
                    return;
                }


                checkoutStay(
                    id,
                    button
                );
            }
        );
    }


    /* =========================================================
       MOBILE MENU
    ========================================================= */

    const mobileMenu =
        document.getElementById(
            "mobileMenu"
        );

    const sidebar =
        document.getElementById(
            "sidebar"
        );

    const sidebarBackdrop =
        document.getElementById(
            "sidebarBackdrop"
        );


    function closeMobileMenu() {

        sidebar?.classList.remove(
            "show"
        );

        sidebarBackdrop?.classList.remove(
            "show"
        );
    }


    if (mobileMenu) {

        mobileMenu.addEventListener(
            "click",
            () => {

                sidebar?.classList.toggle(
                    "show"
                );

                sidebarBackdrop?.classList.toggle(
                    "show"
                );
            }
        );
    }


    if (sidebarBackdrop) {

        sidebarBackdrop.addEventListener(
            "click",
            closeMobileMenu
        );
    }


    document
        .querySelectorAll(".nav-item")
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {
                        closeMobileMenu();
                    }
                );
            }
        );


    /* =========================================================
       AUTH STATE
    ========================================================= */

    supabase.auth.onAuthStateChange(
        event => {

            if (
                event ===
                "SIGNED_OUT"
            ) {

                window.location.href =
                    "login.html";
            }
        }
    );


    /* =========================================================
       INITIALIZE
    ========================================================= */

    const hotelLoaded =
        await loadCurrentHotel();


    if (!hotelLoaded) {
        return;
    }


    await reloadAll();


    console.log(
        "Check-in & Stays module initialized successfully."
    );

});