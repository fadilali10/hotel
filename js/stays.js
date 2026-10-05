document.addEventListener("DOMContentLoaded", async () => {

    console.log("Check-in & Stays module loaded");

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


    /* =========================================
       ELEMENTS
    ========================================= */

    const staySearch =
        document.getElementById("staySearch");

    const staysTableBody =
        document.getElementById("staysTableBody");

    const readyBookingsTableBody =
        document.getElementById(
            "readyBookingsTableBody"
        );


    /* =========================================
       HELPERS
    ========================================= */

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
            String(value).substring(0, 10)
                .split("-");

        if (parts.length !== 3) {
            return value;
        }

        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }


    function formatDateTime(value) {

        if (!value) {
            return "-";
        }

        const date =
            new Date(value);

        if (isNaN(date.getTime())) {
            return value;
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
        );
    }


    function getRoomById(id) {

        return rooms.find(
            room =>
                String(room.id) ===
                String(id)
        );
    }


    function getBookingById(id) {

        return bookings.find(
            booking =>
                String(booking.id) ===
                String(id)
        );
    }


    function getGuestName(guest) {

        if (!guest) {
            return "Unknown Guest";
        }

        if (guest.full_name) {
            return guest.full_name;
        }

        return [
            guest.first_name,
            guest.last_name
        ]
            .filter(Boolean)
            .join(" ");
    }


    function getRoomName(room) {

        if (!room) {
            return "Unknown Room";
        }

        return `Room ${room.room_number}`;
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


    function getStatusClass(status) {

        return String(status || "")
            .toLowerCase()
            .replace(/_/g, "-");
    }


    /* =========================================
       LOAD CURRENT HOTEL
    ========================================= */

    async function loadCurrentHotel() {

        const {
            data: {
                user
            },
            error: userError
        } = await supabase.auth.getUser();


        if (userError || !user) {

            console.log(
                "No logged-in user."
            );

            return false;
        }


        const {
            data: profile,
            error: profileError
        } = await supabase
            .from("profiles")
            .select("hotel_id")
            .eq("id", user.id)
            .single();


        if (profileError) {

            console.error(
                "Profile error:",
                profileError
            );

            return false;
        }


        currentHotelId =
            profile.hotel_id;


        console.log(
            "Current hotel:",
            currentHotelId
        );

        return true;
    }


    /* =========================================
       LOAD GUESTS
    ========================================= */

    async function loadGuests() {

        const {
            data,
            error
        } = await supabase
            .from("guests")
            .select(`
                id,
                first_name,
                last_name,
                full_name,
                phone,
                email
            `)
            .eq(
                "hotel_id",
                currentHotelId
            );


        if (error) {

            console.error(
                "Guests loading error:",
                error
            );

            return;
        }


        guests = data || [];
    }


    /* =========================================
       LOAD ROOMS
    ========================================= */

    async function loadRooms() {

        const {
            data,
            error
        } = await supabase
            .from("rooms")
            .select(`
                id,
                room_number,
                floor,
                price,
                status,
                room_type_id
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

            return;
        }


        rooms = data || [];
    }


    /* =========================================
       LOAD BOOKINGS
       
       IMPORTANT:
       bookings uses:
       check_in_date
       check_out_date
    ========================================= */

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

            return;
        }


        bookings = data || [];

        console.log(
            "Bookings loaded:",
            bookings.length
        );
    }


    /* =========================================
       LOAD STAYS
    ========================================= */

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


        stays = data || [];

        console.log(
            "Stays loaded:",
            stays.length
        );

        return true;
    }


    /* =========================================
       READY BOOKINGS
    ========================================= */

    function getReadyBookings() {

        const today =
            getToday();


        return bookings.filter(
            booking => {

                if (
                    booking.status !==
                    "CONFIRMED"
                ) {
                    return false;
                }


                if (
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


                return true;
            }
        );
    }


    /* =========================================
       RENDER READY BOOKINGS
    ========================================= */

    function renderReadyBookings() {

        if (!readyBookingsTableBody) {
            return;
        }


        const readyBookings =
            getReadyBookings();


        const countElement =
            document.getElementById(
                "readyForCheckInCount"
            );


        if (countElement) {

            countElement.textContent =
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
                                        booking.booking_number
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHtml(
                                    getGuestName(
                                        guest
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getRoomName(
                                        room
                                    )
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
                                    data-id="${booking.id}">
                                    Check-in
                                </button>

                            </td>

                        </tr>
                    `;
                }
            ).join("");
    }


    /* =========================================
       RENDER ACTIVE STAYS
    ========================================= */

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
                                room.room_number
                            ).toLowerCase()
                            : "";


                    const stayNumber =
                        String(
                            stay.stay_number || ""
                        ).toLowerCase();


                    const bookingNumber =
                        booking
                            ? String(
                                booking.booking_number ||
                                ""
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


        const activeCount =
            document.getElementById(
                "activeStaysCount"
            );


        if (activeCount) {

            activeCount.textContent =
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
                                        stay.stay_number
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHtml(
                                    getGuestName(
                                        guest
                                    )
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    getRoomName(
                                        room
                                    )
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
                                    data-id="${stay.id}">
                                    Checkout
                                </button>

                            </td>

                        </tr>
                    `;
                }
            ).join("");
    }


    /* =========================================
       SUMMARY
    ========================================= */

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


        const readyElement =
            document.getElementById(
                "readyForCheckInCount"
            );


        const activeElement =
            document.getElementById(
                "activeStaysCount"
            );


        const todayElement =
            document.getElementById(
                "checkedInTodayCount"
            );


        const occupiedElement =
            document.getElementById(
                "occupiedRoomsCount"
            );


        if (readyElement) {
            readyElement.textContent =
                ready.length;
        }


        if (activeElement) {
            activeElement.textContent =
                active.length;
        }


        if (todayElement) {
            todayElement.textContent =
                checkedInToday.length;
        }


        if (occupiedElement) {
            occupiedElement.textContent =
                occupiedRooms.length;
        }
    }


    /* =========================================
       CHECK-IN
    ========================================= */

    async function checkInBooking(
        bookingId
    ) {

        const booking =
            getBookingById(
                bookingId
            );


        if (!booking) {

            alert(
                "Booking not found."
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

            alert(
                "This booking is already checked in."
            );

            return;
        }


        const room =
            getRoomById(
                booking.room_id
            );


        if (!room) {

            alert(
                "Room not found."
            );

            return;
        }


        if (
            room.status === "OCCUPIED" ||
            room.status === "CLEANING" ||
            room.status === "MAINTENANCE"
        ) {

            alert(
                `Room ${room.room_number} is currently ${room.status}.`
            );

            return;
        }


        const guest =
            getGuestById(
                booking.guest_id
            );


        const confirmed =
            confirm(
                `Check-in ${getGuestName(guest)} to Room ${room.room_number}?`
            );


        if (!confirmed) {
            return;
        }


        const stayNumber =
            generateStayNumber();


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
                new Date().toISOString(),

            expected_check_out:
                booking.check_out_date,

            adults:
                booking.adults || 1,

            children:
                booking.children || 0,

            status:
                "ACTIVE",

            notes:
                booking.notes || null,

            updated_at:
                new Date().toISOString()
        };


        const {
            data: insertedStay,
            error: stayError
        } = await supabase
            .from("stays")
            .insert(stayData)
            .select()
            .single();


        if (stayError) {

            console.error(
                "Check-in error:",
                stayError
            );

            alert(
                "Failed to check-in:\n" +
                stayError.message
            );

            return;
        }


        console.log(
            "Stay created:",
            insertedStay
        );


        /* UPDATE BOOKING */

        const {
            error: bookingError
        } = await supabase
            .from("bookings")
            .update({
                status: "CHECKED_IN",
                updated_at:
                    new Date().toISOString()
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

            console.error(
                "Booking status update error:",
                bookingError
            );
        }


        /* UPDATE ROOM */

        const {
            error: roomError
        } = await supabase
            .from("rooms")
            .update({
                status: "OCCUPIED"
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

            console.error(
                "Room status update error:",
                roomError
            );
        }


        await reloadAll();


        alert(
            `Check-in successful.\nStay ID: ${stayNumber}`
        );
    }


    /* =========================================
       CHECKOUT
    ========================================= */

    async function checkoutStay(
        stayId
    ) {

        const stay =
            stays.find(
                item =>
                    String(item.id) ===
                    String(stayId)
            );


        if (!stay) {

            alert(
                "Stay not found."
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


        const now =
            new Date().toISOString();


        /* UPDATE STAY */

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

            console.error(
                "Checkout stay error:",
                stayError
            );

            alert(
                "Failed to checkout:\n" +
                stayError.message
            );

            return;
        }


        /* UPDATE BOOKING */

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

            console.error(
                "Booking checkout update error:",
                bookingError
            );
        }


        /* ROOM → CLEANING */

        const {
            error: roomError
        } = await supabase
            .from("rooms")
            .update({
                status: "CLEANING"
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

            console.error(
                "Room cleaning status error:",
                roomError
            );
        }


        await reloadAll();


        alert(
            "Guest checked out successfully.\nRoom moved to CLEANING."
        );
    }


    /* =========================================
       RELOAD EVERYTHING
    ========================================= */

    async function reloadAll() {

        await loadGuests();

        await loadRooms();

        await loadBookings();

        await loadStays();

        renderStays();

        renderReadyBookings();

        updateSummary();
    }


    /* =========================================
       SEARCH
    ========================================= */

    if (staySearch) {

        staySearch.addEventListener(
            "input",
            renderStays
        );
    }


    /* =========================================
       READY BOOKING ACTION
    ========================================= */

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


                checkInBooking(id);
            }
        );
    }


    /* =========================================
       ACTIVE STAY ACTION
    ========================================= */

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


                checkoutStay(id);
            }
        );
    }


    /* =========================================
       INITIALIZE
    ========================================= */

    const hotelLoaded =
        await loadCurrentHotel();


    if (!hotelLoaded) {
        return;
    }


    await reloadAll();

});