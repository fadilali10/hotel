document.addEventListener("DOMContentLoaded", async () => {

    console.log("Bookings module loaded");

    if (!window.supabaseClient) {
        console.error("Supabase client not initialized.");
        return;
    }

    const supabase = window.supabaseClient;

    let currentHotelId = null;
    let bookings = [];
    let guests = [];
    let rooms = [];


    /* =========================================
       ELEMENTS
    ========================================= */

    const addBookingButton =
        document.getElementById("addBookingButton");

    const bookingDrawer =
        document.getElementById("bookingDrawer");

    const bookingDrawerOverlay =
        document.getElementById("bookingDrawerOverlay");

    const closeBookingDrawer =
        document.getElementById("closeBookingDrawer");

    const saveBookingButton =
        document.getElementById("saveBookingButton");

    const cancelBookingButton =
        document.getElementById("cancelBookingButton");

    const bookingId =
        document.getElementById("bookingId");

    const bookingNumber =
        document.getElementById("bookingNumber");

    const bookingGuest =
        document.getElementById("bookingGuest");

    const bookingRoom =
        document.getElementById("bookingRoom");

    const bookingCheckIn =
        document.getElementById("bookingCheckIn");

    const bookingCheckOut =
        document.getElementById("bookingCheckOut");

    const bookingAdults =
        document.getElementById("bookingAdults");

    const bookingChildren =
        document.getElementById("bookingChildren");

    const bookingStatus =
        document.getElementById("bookingStatus");

    const bookingSource =
        document.getElementById("bookingSource");

    const bookingSpecialRequests =
        document.getElementById("bookingSpecialRequests");

    const bookingNotes =
        document.getElementById("bookingNotes");

    const bookingDrawerTitle =
        document.getElementById("bookingDrawerTitle");

    const bookingSearch =
        document.getElementById("bookingSearch");

    const bookingStatusFilter =
        document.getElementById("bookingStatusFilter");

    const bookingsTableBody =
        document.getElementById("bookingsTableBody");


    /* =========================================
       HELPERS
    ========================================= */

    function escapeHtml(value) {

        if (value === null || value === undefined) {
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
            String(date.getMonth() + 1).padStart(2, "0");

        const day =
            String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    function getTomorrow() {

        const date = new Date();

        date.setDate(date.getDate() + 1);

        const year =
            date.getFullYear();

        const month =
            String(date.getMonth() + 1).padStart(2, "0");

        const day =
            String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    function formatDate(value) {

        if (!value) {
            return "-";
        }

        const parts =
            String(value).split("-");

        if (parts.length !== 3) {
            return value;
        }

        return `${parts[2]}-${parts[1]}-${parts[0]}`;
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


    function getGuestById(id) {

        return guests.find(
            guest =>
                String(guest.id) === String(id)
        );
    }


    function getRoomById(id) {

        return rooms.find(
            room =>
                String(room.id) === String(id)
        );
    }


    function getRoomLabel(room) {

        if (!room) {
            return "Unknown Room";
        }

        return `Room ${room.room_number}`;
    }


    function getStatusClass(status) {

        return String(status || "")
            .toLowerCase()
            .replace(/_/g, "-");
    }


    function generateBookingNumber() {

        const date =
            getToday().replace(/-/g, "");

        const random =
            Math.floor(
                1000 + Math.random() * 9000
            );

        return `BK-${date}-${random}`;
    }


    /* =========================================
       GET CURRENT HOTEL
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
            )
            .order(
                "first_name",
                {
                    ascending: true
                }
            );


        if (error) {

            console.error(
                "Guests loading error:",
                error
            );

            return;
        }


        guests =
            data || [];

        populateGuestSelect();
    }


    function populateGuestSelect() {

        if (!bookingGuest) {
            return;
        }


        bookingGuest.innerHTML =
            `<option value="">Select Guest</option>`;


        guests.forEach(guest => {

            const name =
                getGuestName(guest);

            const phone =
                guest.phone
                    ? ` • ${guest.phone}`
                    : "";


            bookingGuest.innerHTML += `
                <option value="${guest.id}">
                    ${escapeHtml(name)}${escapeHtml(phone)}
                </option>
            `;
        });
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


        rooms =
            data || [];

        populateRoomSelect();
    }


    function populateRoomSelect() {

        if (!bookingRoom) {
            return;
        }


        bookingRoom.innerHTML =
            `<option value="">Select Room</option>`;


        rooms.forEach(room => {

            const status =
                room.status || "AVAILABLE";


            bookingRoom.innerHTML += `
                <option value="${room.id}">
                    Room ${escapeHtml(room.room_number)}
                    — ${escapeHtml(status)}
                </option>
            `;
        });
    }


    /* =========================================
       LOAD BOOKINGS
       
       DATABASE COLUMNS:
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
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "Bookings loading error:",
                error
            );

            if (bookingsTableBody) {

                bookingsTableBody.innerHTML = `
                    <tr>
                        <td colspan="8" class="empty-table">
                            Failed to load bookings.
                        </td>
                    </tr>
                `;
            }

            return;
        }


        bookings =
            data || [];

        renderBookings();

        updateBookingSummary();
    }


    /* =========================================
       SUMMARY
    ========================================= */

    function updateBookingSummary() {

        const today =
            getToday();


        const total =
            bookings.length;


        const confirmed =
            bookings.filter(
                booking =>
                    booking.status === "PENDING" ||
                    booking.status === "CONFIRMED"
            ).length;


        const checkIns =
            bookings.filter(
                booking =>
                    booking.check_in_date === today &&
                    booking.status !== "CANCELLED" &&
                    booking.status !== "NO_SHOW"
            ).length;


        const checkOuts =
            bookings.filter(
                booking =>
                    booking.check_out_date === today &&
                    booking.status !== "CANCELLED" &&
                    booking.status !== "NO_SHOW"
            ).length;


        const totalBookingsElement =
            document.getElementById(
                "totalBookingsCount"
            );

        const confirmedBookingsElement =
            document.getElementById(
                "confirmedBookingsCount"
            );

        const checkInsElement =
            document.getElementById(
                "checkInsTodayCount"
            );

        const checkOutsElement =
            document.getElementById(
                "checkOutsTodayCount"
            );


        if (totalBookingsElement) {
            totalBookingsElement.textContent =
                total;
        }


        if (confirmedBookingsElement) {
            confirmedBookingsElement.textContent =
                confirmed;
        }


        if (checkInsElement) {
            checkInsElement.textContent =
                checkIns;
        }


        if (checkOutsElement) {
            checkOutsElement.textContent =
                checkOuts;
        }
    }


    /* =========================================
       RENDER BOOKINGS
    ========================================= */

    function renderBookings() {

        if (!bookingsTableBody) {
            return;
        }


        const search =
            bookingSearch
                ? bookingSearch.value
                    .trim()
                    .toLowerCase()
                : "";


        const statusFilter =
            bookingStatusFilter
                ? bookingStatusFilter.value
                : "";


        const filtered =
            bookings.filter(booking => {

                const guest =
                    getGuestById(
                        booking.guest_id
                    );


                const room =
                    getRoomById(
                        booking.room_id
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


                const bookingNumber =
                    String(
                        booking.booking_number || ""
                    ).toLowerCase();


                const matchesSearch =
                    !search ||
                    bookingNumber.includes(search) ||
                    guestName.includes(search) ||
                    roomNumber.includes(search);


                const matchesStatus =
                    !statusFilter ||
                    booking.status === statusFilter;


                return (
                    matchesSearch &&
                    matchesStatus
                );
            });


        if (!filtered.length) {

            bookingsTableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-table">
                        No bookings found.
                    </td>
                </tr>
            `;

            return;
        }


        bookingsTableBody.innerHTML =
            filtered.map(booking => {

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
                                getRoomLabel(room)
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
                            <span class="booking-status ${getStatusClass(booking.status)}">
                                ${escapeHtml(
                                    String(
                                        booking.status || ""
                                    ).replace(
                                        /_/g,
                                        " "
                                    )
                                )}
                            </span>
                        </td>

                        <td>

                            <div class="booking-actions">

                                <button
                                    type="button"
                                    class="small-btn booking-edit-btn"
                                    data-id="${booking.id}">
                                    Edit
                                </button>

                                ${
                                    booking.status !== "CANCELLED" &&
                                    booking.status !== "CHECKED_OUT"
                                    ? `
                                        <button
                                            type="button"
                                            class="small-btn danger-btn booking-cancel-btn"
                                            data-id="${booking.id}">
                                            Cancel
                                        </button>
                                    `
                                    : ""
                                }

                            </div>

                        </td>

                    </tr>
                `;

            }).join("");
    }


    /* =========================================
       OPEN DRAWER
    ========================================= */

    function openBookingDrawer(
        booking = null
    ) {

        if (!booking) {

            bookingDrawerTitle.textContent =
                "New Booking";

            bookingId.value =
                "";

            bookingNumber.value =
                generateBookingNumber();

            bookingGuest.value =
                "";

            bookingRoom.value =
                "";

            bookingCheckIn.value =
                getToday();

            bookingCheckOut.value =
                getTomorrow();

            bookingAdults.value =
                1;

            bookingChildren.value =
                0;

            bookingStatus.value =
                "CONFIRMED";

            bookingSource.value =
                "DIRECT";

            bookingSpecialRequests.value =
                "";

            bookingNotes.value =
                "";

        } else {

            bookingDrawerTitle.textContent =
                "Edit Booking";

            bookingId.value =
                booking.id;

            bookingNumber.value =
                booking.booking_number || "";

            bookingGuest.value =
                booking.guest_id || "";

            bookingRoom.value =
                booking.room_id || "";

            bookingCheckIn.value =
                booking.check_in_date || "";

            bookingCheckOut.value =
                booking.check_out_date || "";

            bookingAdults.value =
                booking.adults || 1;

            bookingChildren.value =
                booking.children || 0;

            bookingStatus.value =
                booking.status || "CONFIRMED";

            bookingSource.value =
                booking.source || "DIRECT";

            bookingSpecialRequests.value =
                booking.special_requests || "";

            bookingNotes.value =
                booking.notes || "";
        }


        bookingDrawer.classList.add("show");

        bookingDrawerOverlay.classList.add("show");

        document.body.style.overflow =
            "hidden";
    }


    /* =========================================
       CLOSE DRAWER
    ========================================= */

    function closeBookingDrawerFunction() {

        bookingDrawer.classList.remove("show");

        bookingDrawerOverlay.classList.remove("show");

        document.body.style.overflow =
            "";
    }


    /* =========================================
       ROOM AVAILABILITY
    ========================================= */

    function hasRoomConflict(
        roomId,
        checkIn,
        checkOut,
        currentBookingId
    ) {

        const activeStatuses = [
            "PENDING",
            "CONFIRMED",
            "CHECKED_IN"
        ];


        return bookings.some(booking => {

            if (
                String(booking.room_id) !==
                String(roomId)
            ) {
                return false;
            }


            if (
                currentBookingId &&
                String(booking.id) ===
                String(currentBookingId)
            ) {
                return false;
            }


            if (
                !activeStatuses.includes(
                    booking.status
                )
            ) {
                return false;
            }


            return (
                booking.check_in_date < checkOut &&
                booking.check_out_date > checkIn
            );
        });
    }


    /* =========================================
       UPDATE ROOM STATUS
    ========================================= */

    async function updateRoomStatusAfterBooking(
        roomId,
        status
    ) {

        if (!roomId) {
            return;
        }


        const room =
            getRoomById(roomId);


        if (!room) {
            return;
        }


        let newRoomStatus =
            null;


        if (status === "CHECKED_IN") {

            newRoomStatus =
                "OCCUPIED";

        } else if (
            status === "PENDING" ||
            status === "CONFIRMED"
        ) {

            if (
                room.status === "AVAILABLE" ||
                room.status === "RESERVED"
            ) {

                newRoomStatus =
                    "RESERVED";
            }

        } else if (
            status === "CHECKED_OUT"
        ) {

            newRoomStatus =
                "CLEANING";

        } else if (
            status === "CANCELLED" ||
            status === "NO_SHOW"
        ) {

            const anotherBooking =
                bookings.some(booking => {

                    if (
                        String(booking.room_id) !==
                        String(roomId)
                    ) {
                        return false;
                    }


                    if (
                        ["CANCELLED", "NO_SHOW", "CHECKED_OUT"]
                            .includes(booking.status)
                    ) {
                        return false;
                    }


                    return true;
                });


            if (!anotherBooking) {

                if (
                    room.status === "RESERVED"
                ) {

                    newRoomStatus =
                        "AVAILABLE";
                }
            }
        }


        if (
            !newRoomStatus ||
            newRoomStatus === room.status
        ) {
            return;
        }


        const {
            error
        } = await supabase
            .from("rooms")
            .update({
                status: newRoomStatus
            })
            .eq(
                "id",
                roomId
            )
            .eq(
                "hotel_id",
                currentHotelId
            );


        if (error) {

            console.error(
                "Room status update error:",
                error
            );

            return;
        }


        room.status =
            newRoomStatus;

        populateRoomSelect();
    }


    /* =========================================
       SAVE BOOKING
    ========================================= */

    async function saveBooking() {

        const id =
            bookingId.value.trim();


        const guestId =
            Number(
                bookingGuest.value
            );


        const roomId =
            Number(
                bookingRoom.value
            );


        const checkIn =
            bookingCheckIn.value;


        const checkOut =
            bookingCheckOut.value;


        const adults =
            Number(
                bookingAdults.value
            );


        const children =
            Number(
                bookingChildren.value
            );


        const status =
            bookingStatus.value;


        const source =
            bookingSource.value;


        const specialRequests =
            bookingSpecialRequests.value
                .trim();


        const notes =
            bookingNotes.value
                .trim();


        /* =====================================
           VALIDATION
        ===================================== */

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


        if (!checkIn || !checkOut) {

            alert(
                "Please select check-in and check-out dates."
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
                "At least 1 adult is required."
            );

            return;
        }


        if (children < 0) {

            alert(
                "Children count cannot be negative."
            );

            return;
        }


        const selectedRoom =
            getRoomById(roomId);


        if (!selectedRoom) {

            alert(
                "Selected room was not found."
            );

            return;
        }


        /* =====================================
           ROOM STATUS CHECK
        ===================================== */

        if (!id) {

            const unavailableStatuses = [
                "OCCUPIED",
                "CLEANING",
                "MAINTENANCE"
            ];


            if (
                unavailableStatuses.includes(
                    selectedRoom.status
                )
            ) {

                alert(
                    `Room ${selectedRoom.room_number} is currently ${selectedRoom.status}. Please choose another room.`
                );

                return;
            }
        }


        /* =====================================
           ROOM DATE CONFLICT
        ===================================== */

        if (
            status !== "CANCELLED" &&
            status !== "NO_SHOW" &&
            hasRoomConflict(
                roomId,
                checkIn,
                checkOut,
                id
            )
        ) {

            alert(
                "This room is already booked for the selected dates."
            );

            return;
        }


        saveBookingButton.disabled =
            true;

        saveBookingButton.textContent =
            "Saving...";


        try {

            /* =================================
               DATABASE DATA

               IMPORTANT:
               Exact DB columns:

               check_in_date
               check_out_date
            ================================= */

            const data = {

                hotel_id:
                    currentHotelId,

                booking_number:
                    bookingNumber.value ||
                    generateBookingNumber(),

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


            let error;


            /* =================================
               UPDATE EXISTING BOOKING
            ================================= */

            if (id) {

                const response =
                    await supabase
                        .from("bookings")
                        .update(data)
                        .eq(
                            "id",
                            id
                        )
                        .eq(
                            "hotel_id",
                            currentHotelId
                        );


                error =
                    response.error;

            }

            /* =================================
               CREATE NEW BOOKING
            ================================= */

            else {

                const response =
                    await supabase
                        .from("bookings")
                        .insert(data);


                error =
                    response.error;
            }


            /* =================================
               DATABASE ERROR
            ================================= */

            if (error) {

                console.error(
                    "Booking save error:",
                    error
                );

                alert(
                    "Failed to save booking:\n" +
                    error.message
                );

                return;
            }


            /* =================================
               UPDATE ROOM STATUS
            ================================= */

            await updateRoomStatusAfterBooking(
                roomId,
                status
            );


            /* =================================
               CLOSE + REFRESH
            ================================= */

            closeBookingDrawerFunction();

            await loadBookings();

            await loadRooms();


            alert(
                id
                    ? "Booking updated successfully."
                    : "Booking created successfully."
            );

        } finally {

            saveBookingButton.disabled =
                false;

            saveBookingButton.textContent =
                "Save Booking";
        }
    }


    /* =========================================
       CANCEL BOOKING
    ========================================= */

    async function cancelBooking(id) {

        const booking =
            bookings.find(
                item =>
                    String(item.id) ===
                    String(id)
            );


        if (!booking) {
            return;
        }


        const confirmed =
            confirm(
                `Cancel booking ${booking.booking_number}?`
            );


        if (!confirmed) {
            return;
        }


        const {
            error
        } = await supabase
            .from("bookings")
            .update({
                status: "CANCELLED",
                updated_at:
                    new Date().toISOString()
            })
            .eq(
                "id",
                id
            )
            .eq(
                "hotel_id",
                currentHotelId
            );


        if (error) {

            console.error(
                "Cancel booking error:",
                error
            );

            alert(
                "Failed to cancel booking:\n" +
                error.message
            );

            return;
        }


        await loadBookings();


        await updateRoomStatusAfterBooking(
            booking.room_id,
            "CANCELLED"
        );


        await loadRooms();


        alert(
            "Booking cancelled successfully."
        );
    }


    /* =========================================
       EVENTS
    ========================================= */

    if (addBookingButton) {

        addBookingButton.addEventListener(
            "click",
            () => openBookingDrawer()
        );
    }


    if (closeBookingDrawer) {

        closeBookingDrawer.addEventListener(
            "click",
            closeBookingDrawerFunction
        );
    }


    if (cancelBookingButton) {

        cancelBookingButton.addEventListener(
            "click",
            closeBookingDrawerFunction
        );
    }


    if (bookingDrawerOverlay) {

        bookingDrawerOverlay.addEventListener(
            "click",
            closeBookingDrawerFunction
        );
    }


    if (saveBookingButton) {

        saveBookingButton.addEventListener(
            "click",
            saveBooking
        );
    }


    if (bookingSearch) {

        bookingSearch.addEventListener(
            "input",
            renderBookings
        );
    }


    if (bookingStatusFilter) {

        bookingStatusFilter.addEventListener(
            "change",
            renderBookings
        );
    }


    /* =========================================
       TABLE ACTIONS
    ========================================= */

    if (bookingsTableBody) {

        bookingsTableBody.addEventListener(
            "click",
            event => {

                const editButton =
                    event.target.closest(
                        ".booking-edit-btn"
                    );


                const cancelButton =
                    event.target.closest(
                        ".booking-cancel-btn"
                    );


                /* EDIT */

                if (editButton) {

                    const id =
                        editButton.dataset.id;


                    const booking =
                        bookings.find(
                            item =>
                                String(item.id) ===
                                String(id)
                        );


                    if (booking) {

                        openBookingDrawer(
                            booking
                        );
                    }

                    return;
                }


                /* CANCEL */

                if (cancelButton) {

                    const id =
                        cancelButton.dataset.id;


                    cancelBooking(id);
                }

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


    await loadGuests();

    await loadRooms();

    await loadBookings();

});