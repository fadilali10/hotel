/* =========================================================
   HOTEL MANAGEMENT - GUEST MANAGEMENT
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    console.log("=================================");
    console.log("GUESTS.JS STARTED");
    console.log("=================================");

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error(
            "GUESTS.JS: Supabase client not available."
        );
        return;
    }

    console.log(
        "GUESTS.JS: Supabase client available"
    );


    /* =====================================================
       GLOBAL DATA
    ===================================================== */

    let guests = [];
    let currentHotelId = null;


    /* =====================================================
       ELEMENTS
    ===================================================== */

    const addGuestButton =
        document.getElementById("addGuestButton");

    const guestDrawer =
        document.getElementById("guestDrawer");

    const guestDrawerOverlay =
        document.getElementById("guestDrawerOverlay");

    const closeGuestDrawer =
        document.getElementById("closeGuestDrawer");

    const cancelGuestButton =
        document.getElementById("cancelGuestButton");

    const saveGuestButton =
        document.getElementById("saveGuestButton");

    const guestSearch =
        document.getElementById("guestSearch");

    const guestGenderFilter =
        document.getElementById("guestGenderFilter");

    const guestsTableBody =
        document.getElementById("guestsTableBody");


    /* =====================================================
       OPEN GUEST DRAWER
    ===================================================== */

    function openGuestDrawer(guest = null) {

        console.log(
            "OPEN GUEST DRAWER",
            guest
        );

        if (!guestDrawer) {
            console.error(
                "#guestDrawer not found."
            );
            return;
        }

        const title =
            document.getElementById("guestDrawerTitle");

        const guestId =
            document.getElementById("guestId");

        const guestName =
            document.getElementById("guestName");

        const guestPhone =
            document.getElementById("guestPhone");

        const guestEmail =
            document.getElementById("guestEmail");

        const guestGender =
            document.getElementById("guestGender");

        const guestDateOfBirth =
            document.getElementById("guestDateOfBirth");

        const guestIdType =
            document.getElementById("guestIdType");

        const guestIdNumber =
            document.getElementById("guestIdNumber");

        const guestNationality =
            document.getElementById("guestNationality");

        const guestAddress =
            document.getElementById("guestAddress");

        const guestCity =
            document.getElementById("guestCity");

        const guestState =
            document.getElementById("guestState");

        const guestCountry =
            document.getElementById("guestCountry");

        const guestNotes =
            document.getElementById("guestNotes");


        /* =================================================
           ADD MODE
        ================================================= */

        if (!guest) {

            if (title) {
                title.textContent = "Add Guest";
            }

            if (guestId) {
                guestId.value = "";
            }

            if (guestName) {
                guestName.value = "";
            }

            if (guestPhone) {
                guestPhone.value = "";
            }

            if (guestEmail) {
                guestEmail.value = "";
            }

            if (guestGender) {
                guestGender.value = "";
            }

            if (guestDateOfBirth) {
                guestDateOfBirth.value = "";
            }

            if (guestIdType) {
                guestIdType.value = "";
            }

            if (guestIdNumber) {
                guestIdNumber.value = "";
            }

            if (guestNationality) {
                guestNationality.value = "Indian";
            }

            if (guestAddress) {
                guestAddress.value = "";
            }

            if (guestCity) {
                guestCity.value = "";
            }

            if (guestState) {
                guestState.value = "";
            }

            if (guestCountry) {
                guestCountry.value = "India";
            }

            if (guestNotes) {
                guestNotes.value = "";
            }

        }


        /* =================================================
           EDIT MODE
        ================================================= */

        else {

            if (title) {
                title.textContent = "Edit Guest";
            }

            if (guestId) {
                guestId.value = guest.id;
            }


            let displayName =
                guest.full_name || "";

            if (!displayName) {

                displayName =
                    [
                        guest.first_name,
                        guest.last_name
                    ]
                    .filter(Boolean)
                    .join(" ");

            }

            if (guestName) {
                guestName.value = displayName;
            }

            if (guestPhone) {
                guestPhone.value =
                    guest.phone || "";
            }

            if (guestEmail) {
                guestEmail.value =
                    guest.email || "";
            }

            if (guestGender) {
                guestGender.value =
                    guest.gender || "";
            }

            if (guestDateOfBirth) {
                guestDateOfBirth.value =
                    guest.date_of_birth || "";
            }

            if (guestIdType) {
                guestIdType.value =
                    guest.id_type || "";
            }

            if (guestIdNumber) {
                guestIdNumber.value =
                    guest.id_number || "";
            }

            if (guestNationality) {
                guestNationality.value =
                    guest.nationality || "Indian";
            }

            if (guestAddress) {
                guestAddress.value =
                    guest.address || "";
            }

            if (guestCity) {
                guestCity.value =
                    guest.city || "";
            }

            if (guestState) {
                guestState.value =
                    guest.state || "";
            }

            if (guestCountry) {
                guestCountry.value =
                    guest.country || "India";
            }

            if (guestNotes) {
                guestNotes.value =
                    guest.notes || "";
            }

        }


        /* =================================================
           SHOW DRAWER
        ================================================= */

        guestDrawer.classList.add("show");

        if (guestDrawerOverlay) {
            guestDrawerOverlay.classList.add("show");
        }

        document.body.style.overflow = "hidden";


        setTimeout(function () {

            if (guestName) {
                guestName.focus();
            }

        }, 150);

    }


    /* =====================================================
       CLOSE DRAWER
    ===================================================== */

    function closeDrawer() {

        if (guestDrawer) {
            guestDrawer.classList.remove("show");
        }

        if (guestDrawerOverlay) {
            guestDrawerOverlay.classList.remove("show");
        }

        document.body.style.overflow = "";

    }


    /* =====================================================
       LOAD CURRENT HOTEL
    ===================================================== */

    async function loadCurrentHotel() {

        try {

            const {
                data: {
                    user
                },
                error: userError
            } =
                await supabase.auth.getUser();


            if (userError) {
                throw userError;
            }


            if (!user) {

                console.warn(
                    "No logged-in user."
                );

                return null;
            }


            const {
                data: profile,
                error: profileError
            } =
                await supabase
                    .from("profiles")
                    .select("hotel_id")
                    .eq("id", user.id)
                    .maybeSingle();


            if (profileError) {
                throw profileError;
            }


            if (!profile) {

                console.error(
                    "Profile not found."
                );

                return null;
            }


            currentHotelId =
                profile.hotel_id;


            console.log(
                "Current Hotel ID:",
                currentHotelId
            );


            return currentHotelId;

        } catch (error) {

            console.error(
                "Hotel loading error:",
                error
            );

            return null;
        }

    }


    /* =====================================================
       LOAD GUESTS
    ===================================================== */

    async function loadGuests() {

        if (!guestsTableBody) {
            return;
        }


        if (!currentHotelId) {

            guestsTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="guest-empty"
                    >
                        Please login to view guests.
                    </td>
                </tr>
            `;

            return;
        }


        guestsTableBody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="guest-empty"
                >
                    Loading guests...
                </td>
            </tr>
        `;


        const {
            data,
            error
        } =
            await supabase
                .from("guests")
                .select(`
                    id,
                    hotel_id,
                    first_name,
                    last_name,
                    full_name,
                    phone,
                    email,
                    gender,
                    date_of_birth,
                    id_type,
                    id_number,
                    nationality,
                    address,
                    city,
                    state,
                    country,
                    notes,
                    created_at
                `)
                .eq(
                    "hotel_id",
                    currentHotelId
                )
                .order(
                    "created_at",
                    {
                        ascending: false
                    }
                );


        if (error) {

            console.error(
                "Guest loading error:",
                error
            );


            guestsTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="guest-empty"
                    >
                        Unable to load guests.
                        <br>
                        <small>
                            ${escapeHtml(
                                error.message
                            )}
                        </small>
                    </td>
                </tr>
            `;

            return;
        }


        guests =
            data || [];


        console.log(
            "Guests loaded:",
            guests.length
        );


        updateGuestSummary();

        renderGuests();

    }


    /* =====================================================
       SUMMARY
    ===================================================== */

    function updateGuestSummary() {

        const total =
            document.getElementById(
                "totalGuestsCount"
            );

        const phone =
            document.getElementById(
                "guestsWithPhoneCount"
            );

        const email =
            document.getElementById(
                "guestsWithEmailCount"
            );

        const indian =
            document.getElementById(
                "indianGuestsCount"
            );


        if (total) {
            total.textContent =
                guests.length;
        }


        if (phone) {

            phone.textContent =
                guests.filter(
                    guest =>
                        guest.phone &&
                        guest.phone.trim()
                ).length;

        }


        if (email) {

            email.textContent =
                guests.filter(
                    guest =>
                        guest.email &&
                        guest.email.trim()
                ).length;

        }


        if (indian) {

            indian.textContent =
                guests.filter(
                    guest =>
                        String(
                            guest.nationality || ""
                        ).toLowerCase() ===
                        "indian"
                ).length;

        }

    }


    /* =====================================================
       GET DISPLAY NAME
    ===================================================== */

    function getGuestDisplayName(guest) {

        if (!guest) {
            return "Guest";
        }

        if (guest.full_name) {
            return guest.full_name;
        }

        return [
            guest.first_name,
            guest.last_name
        ]
            .filter(Boolean)
            .join(" ") || "Guest";

    }


    /* =====================================================
       RENDER GUESTS
    ===================================================== */

    function renderGuests() {

        if (!guestsTableBody) {
            return;
        }


        const search =
            guestSearch
                ? guestSearch.value
                    .trim()
                    .toLowerCase()
                : "";


        const gender =
            guestGenderFilter
                ? guestGenderFilter.value
                : "ALL";


        const filteredGuests =
            guests.filter(
                function (guest) {

                    const name =
                        getGuestDisplayName(
                            guest
                        )
                            .toLowerCase();


                    const phone =
                        String(
                            guest.phone || ""
                        )
                            .toLowerCase();


                    const matchesSearch =
                        !search ||
                        name.includes(search) ||
                        phone.includes(search);


                    const matchesGender =
                        gender === "ALL" ||
                        guest.gender === gender;


                    return (
                        matchesSearch &&
                        matchesGender
                    );

                }
            );


        if (!filteredGuests.length) {

            guestsTableBody.innerHTML = `
                <tr>
                    <td
                        colspan="6"
                        class="guest-empty"
                    >
                        No guests found.
                    </td>
                </tr>
            `;

            return;
        }


        guestsTableBody.innerHTML =
            filteredGuests
                .map(
                    function (guest) {

                        const displayName =
                            getGuestDisplayName(
                                guest
                            );


                        const initials =
                            getInitials(
                                displayName
                            );


                        return `
                            <tr>

                                <td>

                                    <div
                                        class="guest-name-cell"
                                    >

                                        <div
                                            class="guest-avatar-small"
                                        >
                                            ${escapeHtml(
                                                initials
                                            )}
                                        </div>

                                        <div>

                                            <strong>
                                                ${escapeHtml(
                                                    displayName
                                                )}
                                            </strong>

                                            <small>
                                                ${escapeHtml(
                                                    guest.gender ||
                                                    "Guest"
                                                )}
                                            </small>

                                        </div>

                                    </div>

                                </td>


                                <td>
                                    ${escapeHtml(
                                        guest.phone ||
                                        "-"
                                    )}
                                </td>


                                <td>
                                    ${escapeHtml(
                                        guest.email ||
                                        "-"
                                    )}
                                </td>


                                <td>
                                    ${
                                        guest.id_type
                                            ? escapeHtml(
                                                guest.id_type
                                            )
                                            : "-"
                                    }
                                </td>


                                <td>
                                    ${escapeHtml(
                                        guest.city ||
                                        "-"
                                    )}
                                </td>


                                <td>

                                    <div
                                        class="guest-action-buttons"
                                    >

                                        <button
                                            type="button"
                                            class="guest-action-btn"
                                            data-edit-guest="${guest.id}"
                                        >
                                            Edit
                                        </button>


                                        <button
                                            type="button"
                                            class="guest-action-btn guest-delete-btn"
                                            data-delete-guest="${guest.id}"
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </td>

                            </tr>
                        `;

                    }
                )
                .join("");

    }


    /* =====================================================
       SAVE GUEST
    ===================================================== */

    async function saveGuest() {

        const id =
            document.getElementById(
                "guestId"
            )?.value;


        const fullName =
            document.getElementById(
                "guestName"
            )?.value
                .trim();


        const phone =
            document.getElementById(
                "guestPhone"
            )?.value
                .trim();


        const email =
            document.getElementById(
                "guestEmail"
            )?.value
                .trim();


        const gender =
            document.getElementById(
                "guestGender"
            )?.value;


        const dateOfBirth =
            document.getElementById(
                "guestDateOfBirth"
            )?.value;


        const idType =
            document.getElementById(
                "guestIdType"
            )?.value;


        const idNumber =
            document.getElementById(
                "guestIdNumber"
            )?.value
                .trim();


        const nationality =
            document.getElementById(
                "guestNationality"
            )?.value
                .trim();


        const address =
            document.getElementById(
                "guestAddress"
            )?.value
                .trim();


        const city =
            document.getElementById(
                "guestCity"
            )?.value
                .trim();


        const state =
            document.getElementById(
                "guestState"
            )?.value
                .trim();


        const country =
            document.getElementById(
                "guestCountry"
            )?.value
                .trim();


        const notes =
            document.getElementById(
                "guestNotes"
            )?.value
                .trim();


        /* =================================================
           VALIDATION
        ================================================= */

        if (!fullName) {

            alert(
                "Please enter the guest name."
            );

            return;
        }


        if (!currentHotelId) {

            alert(
                "Hotel information not found. Please login again."
            );

            return;
        }


        /* =================================================
           SPLIT NAME
        ================================================= */

        const nameParts =
            fullName
                .trim()
                .split(/\s+/);


        const firstName =
            nameParts.shift();


        const lastName =
            nameParts.join(" ").trim();


        if (!firstName) {

            alert(
                "Please enter a valid guest first name."
            );

            return;
        }


        /* =================================================
           DISABLE BUTTON
        ================================================= */

        if (saveGuestButton) {

            saveGuestButton.disabled =
                true;

            saveGuestButton.textContent =
                "Saving...";

        }


        try {

            const guestData = {

                hotel_id:
                    currentHotelId,

                first_name:
                    firstName,

                last_name:
                    lastName || null,

                full_name:
                    fullName,

                phone:
                    phone || null,

                email:
                    email || null,

                gender:
                    gender || null,

                date_of_birth:
                    dateOfBirth || null,

                id_type:
                    idType || null,

                id_number:
                    idNumber || null,

                nationality:
                    nationality ||
                    "Indian",

                address:
                    address || null,

                city:
                    city || null,

                state:
                    state || null,

                country:
                    country ||
                    "India",

                notes:
                    notes || null,

                updated_at:
                    new Date().toISOString()

            };


            console.log(
                "Saving guest:",
                guestData
            );


            let result;


            /* =================================================
               EDIT
            ================================================= */

            if (id) {

                result =
                    await supabase
                        .from("guests")
                        .update(
                            guestData
                        )
                        .eq(
                            "id",
                            Number(id)
                        )
                        .eq(
                            "hotel_id",
                            currentHotelId
                        );

            }


            /* =================================================
               ADD
            ================================================= */

            else {

                result =
                    await supabase
                        .from("guests")
                        .insert(
                            guestData
                        );

            }


            if (result.error) {
                throw result.error;
            }


            alert(
                id
                    ? "Guest updated successfully."
                    : "Guest added successfully."
            );


            closeDrawer();

            await loadGuests();


        } catch (error) {

            console.error(
                "Save guest error:",
                error
            );


            alert(
                error.message ||
                "Unable to save guest."
            );


        } finally {

            if (saveGuestButton) {

                saveGuestButton.disabled =
                    false;

                saveGuestButton.textContent =
                    "Save Guest";

            }

        }

    }


    /* =====================================================
       DELETE GUEST
       
       IMPORTANT:
       Guests with bookings cannot be deleted.
       This protects booking/stay/invoice history.
    ===================================================== */

    async function deleteGuest(id) {

        const guest =
            guests.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!guest) {

            alert(
                "Guest not found."
            );

            return;
        }


        const guestName =
            getGuestDisplayName(
                guest
            );


        const confirmed =
            confirm(
                `Delete guest ${guestName}?`
            );


        if (!confirmed) {
            return;
        }


        if (!currentHotelId) {

            alert(
                "Hotel information not found. Please login again."
            );

            return;
        }


        try {

            /*
             * =================================================
             * STEP 1
             * CHECK EXISTING BOOKINGS
             * =================================================
             *
             * We must check this BEFORE deleting the guest.
             *
             * bookings.guest_id references guests.id.
             *
             * If a booking exists, PostgreSQL will reject
             * deleting the guest.
             */

            const {
                count: bookingCount,
                error: bookingCheckError
            } =
                await supabase
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
                        currentHotelId
                    )
                    .eq(
                        "guest_id",
                        Number(id)
                    );


            if (bookingCheckError) {

                console.error(
                    "Booking check error:",
                    bookingCheckError
                );

                alert(
                    "Unable to check the guest's booking history.\n\n" +
                    bookingCheckError.message
                );

                return;
            }


            /*
             * =================================================
             * STEP 2
             * BLOCK DELETE IF BOOKINGS EXIST
             * =================================================
             */

            if (
                bookingCount !== null &&
                bookingCount > 0
            ) {

                alert(
                    `${guestName} cannot be deleted.\n\n` +
                    `This guest has ${bookingCount} existing booking` +
                    `${bookingCount === 1 ? "" : "s"}.\n\n` +
                    `The guest record is kept so that booking, stay, ` +
                    `restaurant and billing history remains valid.`
                );

                return;
            }


            /*
             * =================================================
             * STEP 3
             * DELETE GUEST
             * =================================================
             */

            const {
                error: deleteError
            } =
                await supabase
                    .from("guests")
                    .delete()
                    .eq(
                        "id",
                        Number(id)
                    )
                    .eq(
                        "hotel_id",
                        currentHotelId
                    );


            if (deleteError) {

                console.error(
                    "Delete guest error:",
                    deleteError
                );


                /*
                 * Extra protection:
                 * If another foreign key prevents deletion,
                 * show a user-friendly message instead of
                 * exposing the raw PostgreSQL error.
                 */

                if (
                    deleteError.code === "23503" ||
                    String(
                        deleteError.message || ""
                    ).includes(
                        "foreign key constraint"
                    )
                ) {

                    alert(
                        `${guestName} cannot be deleted because ` +
                        `this guest is linked to existing hotel records.\n\n` +
                        `The guest record has been kept to protect historical data.`
                    );

                } else {

                    alert(
                        "Failed to delete guest:\n\n" +
                        deleteError.message
                    );
                }

                return;
            }


            /*
             * =================================================
             * STEP 4
             * SUCCESS
             * =================================================
             */

            alert(
                "Guest deleted successfully."
            );


            await loadGuests();


        } catch (error) {

            console.error(
                "Delete guest error:",
                error
            );


            /*
             * Handle foreign-key errors that may come
             * from the database even after our check.
             */

            if (
                error?.code === "23503" ||
                String(
                    error?.message || ""
                ).includes(
                    "foreign key constraint"
                )
            ) {

                alert(
                    `${guestName} cannot be deleted because ` +
                    `this guest is linked to existing hotel records.\n\n` +
                    `The guest record has been kept to protect historical data.`
                );

            } else {

                alert(
                    error?.message ||
                    "Unable to delete guest."
                );

            }

        }

    }


    /* =====================================================
       ADD BUTTON
    ===================================================== */

    if (addGuestButton) {

        addGuestButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();
                event.stopPropagation();

                openGuestDrawer();

            }
        );

    }


    /* =====================================================
       CLOSE BUTTONS
    ===================================================== */

    if (closeGuestDrawer) {

        closeGuestDrawer.addEventListener(
            "click",
            function () {

                closeDrawer();

            }
        );

    }


    if (cancelGuestButton) {

        cancelGuestButton.addEventListener(
            "click",
            function () {

                closeDrawer();

            }
        );

    }


    if (guestDrawerOverlay) {

        guestDrawerOverlay.addEventListener(
            "click",
            function () {

                closeDrawer();

            }
        );

    }


    /* =====================================================
       SAVE BUTTON
    ===================================================== */

    if (saveGuestButton) {

        saveGuestButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                saveGuest();

            }
        );

    }


    /* =====================================================
       SEARCH
    ===================================================== */

    if (guestSearch) {

        guestSearch.addEventListener(
            "input",
            renderGuests
        );

    }


    if (guestGenderFilter) {

        guestGenderFilter.addEventListener(
            "change",
            renderGuests
        );

    }


    /* =====================================================
       EDIT / DELETE EVENT DELEGATION
    ===================================================== */

    if (guestsTableBody) {

        guestsTableBody.addEventListener(
            "click",
            function (event) {

                const editButton =
                    event.target.closest(
                        "[data-edit-guest]"
                    );


                const deleteButton =
                    event.target.closest(
                        "[data-delete-guest]"
                    );


                /* =================================================
                   EDIT
                ================================================= */

                if (editButton) {

                    const id =
                        Number(
                            editButton.dataset
                                .editGuest
                        );


                    const guest =
                        guests.find(
                            item =>
                                Number(item.id) ===
                                id
                        );


                    if (guest) {

                        openGuestDrawer(
                            guest
                        );

                    }

                    return;
                }


                /* =================================================
                   DELETE
                ================================================= */

                if (deleteButton) {

                    const id =
                        Number(
                            deleteButton.dataset
                                .deleteGuest
                        );


                    deleteGuest(id);

                }

            }
        );

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function initializeGuests() {

        console.log(
            "Initializing guest management..."
        );


        currentHotelId =
            await loadCurrentHotel();


        if (!currentHotelId) {

            console.error(
                "Could not determine hotel ID."
            );

            return;
        }


        await loadGuests();


        console.log(
            "Guest management initialized successfully."
        );

    }


    initializeGuests();


    /* =====================================================
       HELPERS
    ===================================================== */

    function getInitials(name) {

        if (!name) {
            return "G";
        }


        const parts =
            String(name)
                .trim()
                .split(/\s+/);


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

});