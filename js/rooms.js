/* =========================================================
   STAR HOTELS
   ROOM MANAGEMENT
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    "use strict";

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("ROOMS.JS: Supabase client not available.");
        return;
    }

    console.log("✓ ROOMS.JS LOADED");


    /* =====================================================
       STATE
       ===================================================== */

    let rooms = [];
    let roomTypes = [];
    let currentHotelId = null;
    let isSaving = false;


    /* =====================================================
       ELEMENTS
       ===================================================== */

    const addRoomButton =
        document.getElementById("addRoomBtn");

    const roomDrawer =
        document.getElementById("roomDrawer");

    const roomDrawerOverlay =
        document.getElementById("roomDrawerOverlay");

    const closeRoomDrawer =
        document.getElementById("closeRoomDrawer");

    const cancelRoomButton =
        document.getElementById("cancelRoomButton");

    const saveRoomButton =
        document.getElementById("saveRoomButton");

    const roomSearch =
        document.getElementById("roomSearch");

    const roomStatusFilter =
        document.getElementById("roomStatusFilter");

    const roomTypeFilter =
        document.getElementById("roomTypeFilter");

    const roomTypeSelect =
        document.getElementById("roomType");

    const roomIdInput =
        document.getElementById("roomId");

    const roomNumberInput =
        document.getElementById("roomNumber");

    const roomFloorInput =
        document.getElementById("roomFloor");

    const roomPriceInput =
        document.getElementById("roomPrice");

    const roomStatusInput =
        document.getElementById("roomStatus");

    const roomNotesInput =
        document.getElementById("roomNotes");

    const roomDrawerTitle =
        document.getElementById("roomDrawerTitle");

    const roomsTableBody =
        document.getElementById("roomsTableBody");

    const mobileMenu =
        document.getElementById("mobileMenu");

    const sidebar =
        document.querySelector(".sidebar");


    /* =====================================================
       MOBILE SIDEBAR
       ===================================================== */

    function setupMobileMenu() {

        if (!mobileMenu || !sidebar) {
            return;
        }

        mobileMenu.addEventListener("click", () => {

            sidebar.classList.toggle("show");

        });


        document
            .querySelectorAll(".sidebar .nav-item")
            .forEach(link => {

                link.addEventListener("click", () => {

                    sidebar.classList.remove("show");

                });

            });


        document.addEventListener("click", event => {

            if (
                window.innerWidth <= 768 &&
                sidebar.classList.contains("show") &&
                !sidebar.contains(event.target) &&
                !mobileMenu.contains(event.target)
            ) {

                sidebar.classList.remove("show");

            }

        });

    }


    setupMobileMenu();


    /* =====================================================
       GET CURRENT HOTEL
       ===================================================== */

    async function loadCurrentHotel() {

        try {

            const {
                data: {
                    user
                },
                error: userError
            } = await supabase.auth.getUser();


            if (userError) {
                throw userError;
            }


            if (!user) {

                console.warn(
                    "ROOMS.JS: No logged-in user."
                );

                return null;
            }


            const {
                data: profile,
                error: profileError
            } = await supabase
                .from("profiles")
                .select("hotel_id, full_name")
                .eq("id", user.id)
                .maybeSingle();


            if (profileError) {
                throw profileError;
            }


            if (!profile) {

                console.error(
                    "ROOMS.JS: Profile not found."
                );

                return null;
            }


            if (!profile.hotel_id) {

                console.error(
                    "ROOMS.JS: Hotel ID missing from profile."
                );

                return null;
            }


            currentHotelId =
                Number(profile.hotel_id);


            const topUserName =
                document.getElementById("topUserName");


            if (topUserName) {

                topUserName.textContent =
                    profile.full_name ||
                    user.email?.split("@")[0] ||
                    "User";

            }


            console.log(
                "✓ Current hotel ID:",
                currentHotelId
            );


            return currentHotelId;


        } catch (error) {

            console.error(
                "ROOMS.JS: Unable to get hotel:",
                error
            );

            return null;
        }

    }


    /* =====================================================
       OPEN ROOM DRAWER
       ===================================================== */

    function openRoomDrawer(room = null) {

        if (!roomDrawer) {

            console.error(
                "ROOMS.JS: roomDrawer not found."
            );

            return;
        }


        /* =================================================
           ADD ROOM
           ================================================= */

        if (!room) {

            if (roomDrawerTitle) {
                roomDrawerTitle.textContent =
                    "Add Room";
            }


            if (roomIdInput) {
                roomIdInput.value = "";
            }


            if (roomNumberInput) {
                roomNumberInput.value = "";
            }


            if (roomFloorInput) {
                roomFloorInput.value = "1";
            }


            if (roomPriceInput) {
                roomPriceInput.value = "";
            }


            if (roomStatusInput) {
                roomStatusInput.value =
                    "AVAILABLE";
            }


            if (roomNotesInput) {
                roomNotesInput.value = "";
            }


            if (roomTypeSelect) {
                roomTypeSelect.value = "";
            }

        }


        /* =================================================
           EDIT ROOM
           ================================================= */

        else {

            if (roomDrawerTitle) {
                roomDrawerTitle.textContent =
                    "Edit Room";
            }


            if (roomIdInput) {
                roomIdInput.value =
                    room.id ?? "";
            }


            if (roomNumberInput) {
                roomNumberInput.value =
                    room.room_number ?? "";
            }


            if (roomFloorInput) {
                roomFloorInput.value =
                    room.floor ?? 1;
            }


            if (roomPriceInput) {
                roomPriceInput.value =
                    room.price ?? "";
            }


            if (roomStatusInput) {
                roomStatusInput.value =
                    room.status || "AVAILABLE";
            }


            if (roomNotesInput) {
                roomNotesInput.value =
                    room.notes ?? "";
            }


            if (roomTypeSelect) {
                roomTypeSelect.value =
                    room.room_type_id != null
                        ? String(room.room_type_id)
                        : "";
            }

        }


        roomDrawer.classList.add("show");


        if (roomDrawerOverlay) {
            roomDrawerOverlay.classList.add("show");
        }


        document.body.style.overflow =
            "hidden";


        setTimeout(() => {

            if (roomNumberInput) {
                roomNumberInput.focus();
            }

        }, 100);


        console.log(
            "✓ Room drawer opened:",
            room ? room.id : "new room"
        );

    }


    /* =====================================================
       CLOSE DRAWER
       ===================================================== */

    function closeDrawer() {

        if (roomDrawer) {
            roomDrawer.classList.remove("show");
        }


        if (roomDrawerOverlay) {
            roomDrawerOverlay.classList.remove("show");
        }


        document.body.style.overflow = "";


        resetRoomForm();

    }


    /* =====================================================
       RESET FORM
       ===================================================== */

    function resetRoomForm() {

        if (roomIdInput) {
            roomIdInput.value = "";
        }


        if (roomNumberInput) {
            roomNumberInput.value = "";
        }


        if (roomFloorInput) {
            roomFloorInput.value = "1";
        }


        if (roomPriceInput) {
            roomPriceInput.value = "";
        }


        if (roomStatusInput) {
            roomStatusInput.value =
                "AVAILABLE";
        }


        if (roomNotesInput) {
            roomNotesInput.value = "";
        }


        if (roomTypeSelect) {
            roomTypeSelect.value = "";
        }


        if (roomDrawerTitle) {
            roomDrawerTitle.textContent =
                "Add Room";
        }

    }


    /* =====================================================
       LOAD ROOM TYPES
       ===================================================== */

    async function loadRoomTypes() {

        if (!currentHotelId) {
            return;
        }


        try {

            const {
                data,
                error
            } = await supabase
                .from("room_types")
                .select(`
                    id,
                    hotel_id,
                    name,
                    description,
                    capacity,
                    base_price
                `)
                .eq(
                    "hotel_id",
                    currentHotelId
                )
                .order(
                    "name",
                    {
                        ascending: true
                    }
                );


            if (error) {
                throw error;
            }


            roomTypes =
                data || [];


            /* =================================================
               ROOM TYPE SELECT
               ================================================= */

            if (roomTypeSelect) {

                roomTypeSelect.innerHTML = `
                    <option value="">
                        Select room type
                    </option>
                `;


                roomTypes.forEach(type => {

                    const option =
                        document.createElement("option");


                    option.value =
                        String(type.id);


                    option.textContent =
                        type.name || "Unnamed";


                    roomTypeSelect.appendChild(
                        option
                    );

                });

            }


            /* =================================================
               ROOM TYPE FILTER
               ================================================= */

            if (roomTypeFilter) {

                roomTypeFilter.innerHTML = `
                    <option value="ALL">
                        All Room Types
                    </option>
                `;


                roomTypes.forEach(type => {

                    const option =
                        document.createElement("option");


                    option.value =
                        String(type.id);


                    option.textContent =
                        type.name || "Unnamed";


                    roomTypeFilter.appendChild(
                        option
                    );

                });

            }


            console.log(
                `✓ Loaded ${roomTypes.length} room types`
            );


        } catch (error) {

            console.error(
                "ROOMS.JS: Room types loading error:",
                error
            );


            if (roomTypeSelect) {

                roomTypeSelect.innerHTML = `
                    <option value="">
                        Unable to load room types
                    </option>
                `;

            }


            if (roomTypeFilter) {

                roomTypeFilter.innerHTML = `
                    <option value="ALL">
                        All Room Types
                    </option>
                `;

            }


            showRoomMessage(
                "Unable to load room types.",
                "error"
            );

        }

    }


    /* =====================================================
       AUTO SET PRICE FROM ROOM TYPE
       ===================================================== */

    function updatePriceFromRoomType() {

        if (
            !roomTypeSelect ||
            !roomPriceInput
        ) {
            return;
        }


        const selectedId =
            Number(roomTypeSelect.value);


        if (!selectedId) {
            return;
        }


        const selectedType =
            roomTypes.find(
                type =>
                    Number(type.id) ===
                    selectedId
            );


        if (!selectedType) {
            return;
        }


        if (
            roomPriceInput.value.trim() === ""
        ) {

            const basePrice =
                selectedType.base_price;


            if (
                basePrice !== null &&
                basePrice !== undefined
            ) {

                roomPriceInput.value =
                    basePrice;

            }

        }

    }


    /* =====================================================
       LOAD ROOMS
       ===================================================== */

    async function loadRooms() {

        if (!currentHotelId) {

            console.warn(
                "ROOMS.JS: Hotel ID unavailable."
            );

            return;
        }


        try {

            /*
             * Load rooms first.
             * Room type names are mapped locally.
             *
             * This avoids dependency on a Supabase
             * foreign-key relationship named exactly
             * "room_types".
             */

            const {
                data,
                error
            } = await supabase
                .from("rooms")
                .select(`
                    id,
                    hotel_id,
                    room_type_id,
                    room_number,
                    floor,
                    status,
                    created_at,
                    notes,
                    price,
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
                throw error;
            }


            rooms =
                data || [];


            updateRoomSummary();

            renderRooms();


            console.log(
                `✓ Loaded ${rooms.length} rooms`
            );


        } catch (error) {

            console.error(
                "ROOMS.JS: Rooms loading error:",
                error
            );


            if (roomsTableBody) {

                roomsTableBody.innerHTML = `
                    <tr>
                        <td
                            colspan="6"
                            class="room-empty"
                        >
                            Unable to load rooms.
                        </td>
                    </tr>
                `;

            }


            showRoomMessage(
                "Unable to load rooms.",
                "error"
            );

        }

    }


    /* =====================================================
       UPDATE ROOM SUMMARY
       ===================================================== */

    function updateRoomSummary() {

        /*
         * Supports the IDs from the current rooms.html:
         *
         * totalRooms
         * availableRooms
         * occupiedRooms
         * maintenanceRooms
         */

        const total =
            rooms.length;


        const available =
            rooms.filter(
                room =>
                    room.status === "AVAILABLE"
            ).length;


        const occupied =
            rooms.filter(
                room =>
                    room.status === "OCCUPIED"
            ).length;


        const maintenance =
            rooms.filter(
                room =>
                    room.status === "MAINTENANCE"
            ).length;


        setText(
            "totalRooms",
            total
        );


        setText(
            "availableRooms",
            available
        );


        setText(
            "occupiedRooms",
            occupied
        );


        setText(
            "maintenanceRooms",
            maintenance
        );


        /*
         * Compatibility with older IDs.
         */

        setText(
            "totalRoomsCount",
            total
        );


        setText(
            "availableRoomsCount",
            available
        );


        setText(
            "occupiedRoomsCount",
            occupied
        );


        setText(
            "reservedRoomsCount",
            rooms.filter(
                room =>
                    room.status === "RESERVED"
            ).length
        );


        setText(
            "cleaningRoomsCount",
            rooms.filter(
                room =>
                    room.status === "CLEANING"
            ).length
        );

    }


    /* =====================================================
       RENDER ROOMS
       ===================================================== */

    function renderRooms() {

        if (!roomsTableBody) {

            console.error(
                "ROOMS.JS: roomsTableBody not found."
            );

            return;
        }


        const search =
            roomSearch
                ? roomSearch.value
                    .trim()
                    .toLowerCase()
                : "";


        const status =
            roomStatusFilter
                ? roomStatusFilter.value
                : "";


        const type =
            roomTypeFilter
                ? roomTypeFilter.value
                : "ALL";


        const filteredRooms =
            rooms.filter(room => {

                const roomNumber =
                    String(
                        room.room_number ?? ""
                    ).toLowerCase();


                const roomTypeName =
                    getRoomTypeName(
                        room.room_type_id
                    ).toLowerCase();


                const matchesSearch =
                    !search ||
                    roomNumber.includes(search) ||
                    roomTypeName.includes(search);


                const matchesStatus =
                    !status ||
                    status === "ALL" ||
                    room.status === status;


                const matchesType =
                    type === "ALL" ||
                    !type ||
                    String(
                        room.room_type_id
                    ) === String(type);


                return (
                    matchesSearch &&
                    matchesStatus &&
                    matchesType
                );

            });


        /* =================================================
           EMPTY
           ================================================= */

        if (!filteredRooms.length) {

            roomsTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="room-empty"
                    >
                        No rooms found.
                    </td>
                </tr>
            `;

            return;
        }


        /* =================================================
           TABLE
           ================================================= */

        roomsTableBody.innerHTML =
            filteredRooms
                .map(room => {

                    const typeName =
                        getRoomTypeName(
                            room.room_type_id
                        ) ||
                        "Unknown";


                    const statusClass =
                        String(
                            room.status ||
                            "unknown"
                        )
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9_-]/g,
                            ""
                        );


                    const price =
                        Number(
                            room.price || 0
                        );


                    return `
                        <tr>

                            <td>
                                <strong>
                                    ${escapeHtml(
                                        room.room_number
                                    )}
                                </strong>
                            </td>

                            <td>
                                ${escapeHtml(
                                    typeName
                                )}
                            </td>

                            <td>
                                Floor
                                ${escapeHtml(
                                    room.floor ?? "-"
                                )}
                            </td>

                            <td>
                                ₹${price.toLocaleString(
                                    "en-IN",
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                    }
                                )}
                            </td>

                            <td>
                                <span
                                    class="room-status ${statusClass}"
                                >
                                    ${escapeHtml(
                                        formatStatus(
                                            room.status
                                        )
                                    )}
                                </span>
                            </td>

                            <td>

                                <div
                                    class="room-action-buttons"
                                >

                                    <button
                                        type="button"
                                        class="room-action-btn"
                                        data-edit-room="${escapeHtml(
                                            room.id
                                        )}"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        class="room-action-btn room-delete-btn"
                                        data-delete-room="${escapeHtml(
                                            room.id
                                        )}"
                                    >
                                        Delete
                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;

                })
                .join("");


        attachRoomActionEvents();

    }


    /* =====================================================
       GET ROOM TYPE NAME
       ===================================================== */

    function getRoomTypeName(roomTypeId) {

        const type =
            roomTypes.find(
                item =>
                    Number(item.id) ===
                    Number(roomTypeId)
            );


        return type
            ? type.name || ""
            : "";

    }


    /* =====================================================
       ROOM ACTION EVENTS
       ===================================================== */

    function attachRoomActionEvents() {

        document
            .querySelectorAll(
                "[data-edit-room]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            Number(
                                button.dataset.editRoom
                            );


                        const room =
                            rooms.find(
                                item =>
                                    Number(item.id) ===
                                    id
                            );


                        if (room) {
                            openRoomDrawer(room);
                        }

                    }
                );

            });


        document
            .querySelectorAll(
                "[data-delete-room]"
            )
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            Number(
                                button.dataset.deleteRoom
                            );


                        deleteRoom(id);

                    }
                );

            });

    }


    /* =====================================================
       CHECK DUPLICATE ROOM NUMBER
       ===================================================== */

    async function roomNumberExists(
        roomNumber,
        excludeId = null
    ) {

        if (!currentHotelId) {
            return false;
        }


        let query =
            supabase
                .from("rooms")
                .select("id")
                .eq(
                    "hotel_id",
                    currentHotelId
                )
                .eq(
                    "room_number",
                    roomNumber
                );


        if (excludeId) {

            query =
                query.neq(
                    "id",
                    Number(excludeId)
                );

        }


        const {
            data,
            error
        } = await query;


        if (error) {
            throw error;
        }


        return Boolean(
            data &&
            data.length > 0
        );

    }


    /* =====================================================
       SAVE ROOM
       ===================================================== */

    async function saveRoom() {

        if (isSaving) {
            return;
        }


        if (!currentHotelId) {

            alert(
                "Hotel information is not available. Please login again."
            );

            return;
        }


        const id =
            roomIdInput
                ? roomIdInput.value.trim()
                : "";


        const roomNumber =
            roomNumberInput
                ? roomNumberInput.value.trim()
                : "";


        const roomTypeId =
            roomTypeSelect
                ? roomTypeSelect.value
                : "";


        const floorValue =
            roomFloorInput
                ? roomFloorInput.value.trim()
                : "";


        const priceValue =
            roomPriceInput
                ? roomPriceInput.value.trim()
                : "";


        const status =
            roomStatusInput
                ? roomStatusInput.value
                : "AVAILABLE";


        const notes =
            roomNotesInput
                ? roomNotesInput.value.trim()
                : "";


        /* =================================================
           VALIDATION
           ================================================= */

        if (!roomNumber) {

            alert(
                "Please enter a room number."
            );

            return;
        }


        if (!roomTypeId) {

            alert(
                "Please select a room type."
            );

            return;
        }


        const floor =
            Number(floorValue);


        if (
            !Number.isInteger(floor) ||
            floor < 0
        ) {

            alert(
                "Please enter a valid floor number."
            );

            return;
        }


        const price =
            Number(priceValue);


        if (
            !Number.isFinite(price) ||
            price < 0
        ) {

            alert(
                "Please enter a valid room price."
            );

            return;
        }


        const validStatuses = [
            "AVAILABLE",
            "RESERVED",
            "OCCUPIED",
            "CLEANING",
            "MAINTENANCE"
        ];


        if (
            !validStatuses.includes(status)
        ) {

            alert(
                "Invalid room status."
            );

            return;
        }


        /* =================================================
           PROTECT OCCUPIED ROOM
           ================================================= */

        if (
            id &&
            status === "AVAILABLE"
        ) {

            const currentRoom =
                rooms.find(
                    room =>
                        Number(room.id) ===
                        Number(id)
                );


            if (
                currentRoom &&
                currentRoom.status ===
                    "OCCUPIED"
            ) {

                alert(
                    "This room is currently occupied. Complete the stay/check-out before changing it to Available."
                );

                return;
            }

        }


        isSaving = true;


        if (saveRoomButton) {

            saveRoomButton.disabled =
                true;


            saveRoomButton.textContent =
                "Saving...";

        }


        try {

            /* =================================================
               DUPLICATE CHECK
               ================================================= */

            const exists =
                await roomNumberExists(
                    roomNumber,
                    id || null
                );


            if (exists) {

                alert(
                    `Room ${roomNumber} already exists in this hotel.`
                );

                return;
            }


            /* =================================================
               VERIFY ROOM TYPE
               ================================================= */

            const selectedRoomType =
                roomTypes.find(
                    type =>
                        Number(type.id) ===
                        Number(roomTypeId)
                );


            if (!selectedRoomType) {

                alert(
                    "Selected room type is not valid."
                );

                return;
            }


            /* =================================================
               ROOM DATA
               ================================================= */

            const roomData = {

                hotel_id:
                    currentHotelId,

                room_type_id:
                    Number(roomTypeId),

                room_number:
                    roomNumber,

                floor:
                    floor,

                price:
                    price,

                status:
                    status,

                notes:
                    notes || null

            };


            let error = null;


            /* =================================================
               UPDATE
               ================================================= */

            if (id) {

                const result =
                    await supabase
                        .from("rooms")
                        .update(roomData)
                        .eq(
                            "id",
                            Number(id)
                        )
                        .eq(
                            "hotel_id",
                            currentHotelId
                        );


                error =
                    result.error;

            }


            /* =================================================
               INSERT
               ================================================= */

            else {

                const result =
                    await supabase
                        .from("rooms")
                        .insert(
                            roomData
                        );


                error =
                    result.error;

            }


            if (error) {
                throw error;
            }


            console.log(
                id
                    ? "✓ Room updated"
                    : "✓ Room added"
            );


            closeDrawer();


            await loadRooms();


        } catch (error) {

            console.error(
                "ROOMS.JS: Save room error:",
                error
            );


            if (
                error &&
                error.code === "23505"
            ) {

                alert(
                    "This room number already exists."
                );

            } else {

                alert(
                    error?.message ||
                    "Unable to save room."
                );

            }

        } finally {

            isSaving = false;


            if (saveRoomButton) {

                saveRoomButton.disabled =
                    false;


                saveRoomButton.textContent =
                    "Save Room";

            }

        }

    }


    /* =====================================================
       GET ROOM HISTORY
       ===================================================== */

    async function getRoomHistory(roomId) {

        if (
            !currentHotelId ||
            !roomId
        ) {

            return {
                bookings: [],
                stays: []
            };

        }


        /* =================================================
           BOOKINGS
           ================================================= */

        const {
            data: bookings,
            error: bookingsError
        } = await supabase
            .from("bookings")
            .select(`
                id,
                booking_number,
                guest_id,
                check_in_date,
                check_out_date,
                status
            `)
            .eq(
                "hotel_id",
                currentHotelId
            )
            .eq(
                "room_id",
                Number(roomId)
            );


        if (bookingsError) {

            /*
             * If bookings table exists but there
             * is an error, don't silently allow
             * deletion.
             */

            throw bookingsError;
        }


        /* =================================================
           STAYS
           ================================================= */

        const {
            data: stays,
            error: staysError
        } = await supabase
            .from("stays")
            .select(`
                id,
                stay_number,
                booking_id,
                guest_id,
                actual_check_in,
                actual_check_out,
                status
            `)
            .eq(
                "hotel_id",
                currentHotelId
            )
            .eq(
                "room_id",
                Number(roomId)
            );


        /*
         * Stays may not exist in some older
         * installations.
         */

        if (staysError) {

            console.warn(
                "ROOMS.JS: Could not check stays:",
                staysError
            );


            return {
                bookings:
                    bookings || [],

                stays: []
            };

        }


        return {

            bookings:
                bookings || [],

            stays:
                stays || []

        };

    }


    /* =====================================================
       DELETE ROOM
       ===================================================== */

    async function deleteRoom(id) {

        const room =
            rooms.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!room) {
            return;
        }


        if (!currentHotelId) {

            alert(
                "Hotel information is not available. Please login again."
            );

            return;
        }


        /* =================================================
           DO NOT DELETE ACTIVE ROOMS
           ================================================= */

        if (
            [
                "OCCUPIED",
                "RESERVED",
                "CLEANING"
            ].includes(room.status)
        ) {

            alert(
                `Room ${room.room_number} cannot be deleted while its status is ${formatStatus(room.status)}.`
            );

            return;
        }


        try {

            /* =================================================
               CHECK HISTORY
               ================================================= */

            const history =
                await getRoomHistory(id);


            const bookingCount =
                history.bookings.length;


            const stayCount =
                history.stays.length;


            if (
                bookingCount > 0 ||
                stayCount > 0
            ) {

                let message =
                    `Room ${room.room_number} cannot be deleted.\n\n`;


                if (bookingCount > 0) {

                    message +=
                        `This room has ${bookingCount} existing booking${bookingCount === 1 ? "" : "s"}.\n`;

                }


                if (stayCount > 0) {

                    message +=
                        `This room has ${stayCount} existing stay${stayCount === 1 ? "" : "s"}.\n`;

                }


                message +=
                    "\nThe room record is kept so booking, stay, restaurant and billing history remains valid.";


                alert(message);


                return;
            }


            /* =================================================
               CONFIRM
               ================================================= */

            const confirmed =
                confirm(
                    `Delete room ${room.room_number}?\n\nThis room has no booking or stay history.\n\nThis action cannot be undone.`
                );


            if (!confirmed) {
                return;
            }


            /* =================================================
               DELETE
               ================================================= */

            const {
                error
            } =
                await supabase
                    .from("rooms")
                    .delete()
                    .eq(
                        "id",
                        Number(id)
                    )
                    .eq(
                        "hotel_id",
                        currentHotelId
                    );


            if (error) {

                if (
                    error.code === "23503"
                ) {

                    alert(
                        `Room ${room.room_number} cannot be deleted because it is linked to booking, stay, billing or other history.`
                    );

                    return;
                }


                throw error;

            }


            console.log(
                "✓ Room deleted:",
                room.room_number
            );


            await loadRooms();


        } catch (error) {

            console.error(
                "ROOMS.JS: Delete room error:",
                error
            );


            alert(
                error?.message ||
                "Unable to delete room."
            );

        }

    }


    /* =====================================================
       EVENT LISTENERS
       ===================================================== */

    /* =====================================================
       ADD ROOM
       ===================================================== */

    if (addRoomButton) {

        addRoomButton.addEventListener(
            "click",
            () => {

                openRoomDrawer();

            }
        );

    } else {

        console.warn(
            "ROOMS.JS: addRoomBtn not found."
        );

    }


    /* =====================================================
       CLOSE DRAWER
       ===================================================== */

    if (closeRoomDrawer) {

        closeRoomDrawer.addEventListener(
            "click",
            closeDrawer
        );

    }


    /* =====================================================
       CANCEL
       ===================================================== */

    if (cancelRoomButton) {

        cancelRoomButton.addEventListener(
            "click",
            closeDrawer
        );

    }


    /* =====================================================
       OVERLAY
       ===================================================== */

    if (roomDrawerOverlay) {

        roomDrawerOverlay.addEventListener(
            "click",
            closeDrawer
        );

    }


    /* =====================================================
       SAVE
       ===================================================== */

    if (saveRoomButton) {

        saveRoomButton.addEventListener(
            "click",
            saveRoom
        );

    }


    /* =====================================================
       FORM SUBMIT
       ===================================================== */

    const roomForm =
        document.getElementById("roomForm");


    if (roomForm) {

        roomForm.addEventListener(
            "submit",
            event => {

                event.preventDefault();

                saveRoom();

            }
        );

    }


    /* =====================================================
       SEARCH
       ===================================================== */

    if (roomSearch) {

        roomSearch.addEventListener(
            "input",
            renderRooms
        );

    }


    /* =====================================================
       STATUS FILTER
       ===================================================== */

    if (roomStatusFilter) {

        roomStatusFilter.addEventListener(
            "change",
            renderRooms
        );

    }


    /* =====================================================
       ROOM TYPE FILTER
       ===================================================== */

    if (roomTypeFilter) {

        roomTypeFilter.addEventListener(
            "change",
            renderRooms
        );

    }


    /* =====================================================
       ROOM TYPE CHANGE
       ===================================================== */

    if (roomTypeSelect) {

        roomTypeSelect.addEventListener(
            "change",
            updatePriceFromRoomType
        );

    }


    /* =====================================================
       ESCAPE
       ===================================================== */

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape" &&
                roomDrawer &&
                roomDrawer.classList.contains("show")
            ) {

                closeDrawer();

            }

        }
    );


    /* =====================================================
       SUPABASE AUTH STATE
       ===================================================== */

    supabase.auth.onAuthStateChange(
        async (event, session) => {

            console.log(
                "ROOMS.JS AUTH:",
                event
            );


            if (
                event === "SIGNED_IN" &&
                session
            ) {

                await initializeRooms();

            }

        }
    );


    /* =====================================================
       INITIALIZE
       ===================================================== */

    async function initializeRooms() {

        console.log(
            "ROOMS.JS: Initializing..."
        );


        const hotelId =
            await loadCurrentHotel();


        if (!hotelId) {

            console.warn(
                "ROOMS.JS: No hotel found."
            );

            return;
        }


        await loadRoomTypes();

        await loadRooms();


        console.log(
            "✓ ROOMS.JS INITIALIZED"
        );

    }


    initializeRooms();


    /* =====================================================
       HELPERS
       ===================================================== */

    function setText(
        elementId,
        value
    ) {

        const element =
            document.getElementById(
                elementId
            );


        if (element) {
            element.textContent =
                value;
        }

    }


    function formatStatus(status) {

        const names = {

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


        return (
            names[status] ||
            status ||
            "Unknown"
        );

    }


    function escapeHtml(value) {

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


    function showRoomMessage(
        message,
        type
    ) {

        console.log(
            `[ROOMS ${type}] ${message}`
        );

    }

});