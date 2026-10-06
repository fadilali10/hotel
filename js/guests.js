/* =========================================================
   STAR HOTELS
   Guest Management
   Separate Page Module
   ========================================================= */

document.addEventListener("DOMContentLoaded", async function () {

    "use strict";

    console.log("=================================");
    console.log("STAR HOTELS - GUESTS.JS");
    console.log("=================================");


    /* =====================================================
       SUPABASE
       ===================================================== */

    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase client is not available.");
        showPageMessage(
            "Supabase connection is not available. Please refresh the page."
        );
        return;
    }


    /* =====================================================
       STATE
       ===================================================== */

    let guests = [];
    let currentHotelId = null;


    /* =====================================================
       ELEMENTS
       ===================================================== */

    const sidebar = document.getElementById("sidebar");
    const mobileMenu = document.getElementById("mobileMenu");
    const sidebarBackdrop = document.getElementById("sidebarBackdrop");

    const topUserName = document.getElementById("topUserName");
    const topHotelName = document.getElementById("topHotelName");
    const topUserInitial = document.getElementById("topUserInitial");

    const addGuestBtn = document.getElementById("addGuestBtn");
    const emptyAddGuestBtn = document.getElementById("emptyAddGuestBtn");

    const guestSearch = document.getElementById("guestSearch");
    const guestGenderFilter = document.getElementById("guestGenderFilter");
    const clearGuestFilters = document.getElementById("clearGuestFilters");

    const guestsTableBody = document.getElementById("guestsTableBody");
    const guestResultCount = document.getElementById("guestResultCount");
    const guestEmptyState = document.getElementById("guestEmptyState");

    const guestDrawer = document.getElementById("guestDrawer");
    const guestDrawerOverlay = document.getElementById("guestDrawerOverlay");
    const closeGuestDrawer = document.getElementById("closeGuestDrawer");
    const cancelGuestButton = document.getElementById("cancelGuestButton");
    const saveGuestButton = document.getElementById("saveGuestButton");

    const guestDrawerTitle = document.getElementById("guestDrawerTitle");

    const guestId = document.getElementById("guestId");
    const guestName = document.getElementById("guestName");
    const guestPhone = document.getElementById("guestPhone");
    const guestEmail = document.getElementById("guestEmail");
    const guestGender = document.getElementById("guestGender");
    const guestDateOfBirth = document.getElementById("guestDateOfBirth");
    const guestIdType = document.getElementById("guestIdType");
    const guestIdNumber = document.getElementById("guestIdNumber");
    const guestNationality = document.getElementById("guestNationality");
    const guestAddress = document.getElementById("guestAddress");
    const guestCity = document.getElementById("guestCity");
    const guestState = document.getElementById("guestState");
    const guestCountry = document.getElementById("guestCountry");
    const guestNotes = document.getElementById("guestNotes");


    /* =====================================================
       PAGE MESSAGE
       ===================================================== */

    function showPageMessage(message) {

        if (!guestsTableBody) {
            return;
        }

        guestsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="guest-empty">
                    ${escapeHtml(message)}
                </td>
            </tr>
        `;

        if (guestResultCount) {
            guestResultCount.textContent = "0 guests";
        }

        if (guestEmptyState) {
            guestEmptyState.classList.add("hidden");
        }
    }


    /* =====================================================
       MOBILE SIDEBAR
       ===================================================== */

    function openSidebar() {

        if (sidebar) {
            sidebar.classList.add("show");
            sidebar.classList.add("open");
        }

        if (sidebarBackdrop) {
            sidebarBackdrop.classList.add("show");
        }
    }


    function closeSidebar() {

        if (sidebar) {
            sidebar.classList.remove("show");
            sidebar.classList.remove("open");
        }

        if (sidebarBackdrop) {
            sidebarBackdrop.classList.remove("show");
        }
    }


    if (mobileMenu) {
        mobileMenu.addEventListener("click", function () {

            if (
                sidebar &&
                sidebar.classList.contains("show")
            ) {
                closeSidebar();
            } else {
                openSidebar();
            }

        });
    }


    if (sidebarBackdrop) {
        sidebarBackdrop.addEventListener(
            "click",
            closeSidebar
        );
    }


    document.querySelectorAll(".sidebar .nav-item").forEach(
        function (item) {

            item.addEventListener("click", function () {

                if (window.innerWidth <= 900) {
                    closeSidebar();
                }

            });

        }
    );


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
            } = await supabase.auth.getUser();


            if (userError) {
                throw userError;
            }


            if (!user) {

                showPageMessage(
                    "Please login to view guests."
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


            if (!profile || !profile.hotel_id) {

                showPageMessage(
                    "Your hotel profile could not be found."
                );

                return null;
            }


            currentHotelId = profile.hotel_id;


            /* USER NAME */

            const userName =
                profile.full_name ||
                user.user_metadata?.full_name ||
                user.email?.split("@")[0] ||
                "User";


            if (topUserName) {
                topUserName.textContent = userName;
            }


            if (topUserInitial) {
                topUserInitial.textContent =
                    getInitials(userName).charAt(0);
            }


            /* HOTEL NAME */

            try {

                const {
                    data: hotel
                } = await supabase
                    .from("hotels")
                    .select("name")
                    .eq("id", currentHotelId)
                    .maybeSingle();


                if (topHotelName) {
                    topHotelName.textContent =
                        hotel?.name || "Hotel";
                }

            } catch (hotelError) {

                console.warn(
                    "Unable to load hotel name:",
                    hotelError
                );

            }


            return currentHotelId;

        } catch (error) {

            console.error(
                "Hotel loading error:",
                error
            );

            showPageMessage(
                "Unable to load hotel information."
            );

            return null;
        }
    }


    /* =====================================================
       LOAD GUESTS
       ===================================================== */

    async function loadGuests() {

        if (!currentHotelId) {
            showPageMessage(
                "Please login to view guests."
            );
            return;
        }


        guestsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-loading">
                    <div class="loading-spinner"></div>
                    Loading guests...
                </td>
            </tr>
        `;


        try {

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
                    created_at,
                    updated_at
                `)
                .eq("hotel_id", currentHotelId)
                .order("created_at", {
                    ascending: false
                });


            if (error) {
                throw error;
            }


            guests = Array.isArray(data)
                ? data
                : [];


            updateGuestSummary();
            renderGuests();


        } catch (error) {

            console.error(
                "Guest loading error:",
                error
            );

            guests = [];

            updateGuestSummary();

            guestsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="guest-empty">
                        Unable to load guests.
                        <br>
                        <small>
                            ${escapeHtml(
                                error?.message ||
                                "Unknown error"
                            )}
                        </small>
                    </td>
                </tr>
            `;
        }
    }


    /* =====================================================
       SUMMARY
       ===================================================== */

    function updateGuestSummary() {

        const total =
            document.getElementById("totalGuestsCount");

        const phone =
            document.getElementById("guestsWithPhoneCount");

        const email =
            document.getElementById("guestsWithEmailCount");

        const indian =
            document.getElementById("indianGuestsCount");


        if (total) {
            total.textContent = guests.length;
        }


        if (phone) {

            phone.textContent =
                guests.filter(function (guest) {

                    return Boolean(
                        guest.phone &&
                        String(guest.phone).trim()
                    );

                }).length;
        }


        if (email) {

            email.textContent =
                guests.filter(function (guest) {

                    return Boolean(
                        guest.email &&
                        String(guest.email).trim()
                    );

                }).length;
        }


        if (indian) {

            indian.textContent =
                guests.filter(function (guest) {

                    return String(
                        guest.nationality || ""
                    )
                        .trim()
                        .toLowerCase() === "indian";

                }).length;
        }
    }


    /* =====================================================
       GUEST DISPLAY NAME
       ===================================================== */

    function getGuestDisplayName(guest) {

        if (!guest) {
            return "Guest";
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
            .filter(function (value) {

                return (
                    value !== null &&
                    value !== undefined &&
                    String(value).trim()
                );

            })
            .join(" ")
            .trim();


        return name || "Guest";
    }


    /* =====================================================
       RENDER GUESTS
       ===================================================== */

    function renderGuests() {

        if (!guestsTableBody) {
            return;
        }


        const search =
            String(
                guestSearch?.value || ""
            )
                .trim()
                .toLowerCase();


        const gender =
            guestGenderFilter?.value || "";


        const filteredGuests =
            guests.filter(function (guest) {

                const name =
                    getGuestDisplayName(guest)
                        .toLowerCase();

                const phone =
                    String(
                        guest.phone || ""
                    ).toLowerCase();

                const email =
                    String(
                        guest.email || ""
                    ).toLowerCase();

                const city =
                    String(
                        guest.city || ""
                    ).toLowerCase();

                const idNumber =
                    String(
                        guest.id_number || ""
                    ).toLowerCase();


                const matchesSearch =
                    !search ||
                    name.includes(search) ||
                    phone.includes(search) ||
                    email.includes(search) ||
                    city.includes(search) ||
                    idNumber.includes(search);


                const matchesGender =
                    !gender ||
                    String(
                        guest.gender || ""
                    ) === gender;


                return (
                    matchesSearch &&
                    matchesGender
                );

            });


        if (guestResultCount) {

            guestResultCount.textContent =
                `${filteredGuests.length} ${
                    filteredGuests.length === 1
                        ? "guest"
                        : "guests"
                }`;
        }


        if (!filteredGuests.length) {

            guestsTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="guest-empty">
                        <div class="guest-table-empty-icon">
                            ♙
                        </div>

                        <strong>
                            No guests found
                        </strong>

                        <span>
                            Try another search or add a new guest.
                        </span>
                    </td>
                </tr>
            `;

            return;
        }


        guestsTableBody.innerHTML =
            filteredGuests.map(function (guest) {

                const displayName =
                    getGuestDisplayName(guest);

                const initials =
                    getInitials(displayName);


                return `
                    <tr>

                        <td>

                            <div class="guest-name-cell">

                                <div class="guest-avatar-small">
                                    ${escapeHtml(initials)}
                                </div>

                                <div class="guest-name-info">

                                    <strong>
                                        ${escapeHtml(displayName)}
                                    </strong>

                                    <small>
                                        ${escapeHtml(
                                            guest.gender || "Guest"
                                        )}
                                    </small>

                                </div>

                            </div>

                        </td>


                        <td>
                            <span class="table-primary-text">
                                ${escapeHtml(
                                    guest.phone || "-"
                                )}
                            </span>
                        </td>


                        <td>
                            <span class="table-secondary-text">
                                ${escapeHtml(
                                    guest.email || "-"
                                )}
                            </span>
                        </td>


                        <td>

                            ${
                                guest.id_type
                                    ? `
                                        <div class="id-cell">
                                            <strong>
                                                ${escapeHtml(
                                                    guest.id_type
                                                )}
                                            </strong>

                                            ${
                                                guest.id_number
                                                    ? `
                                                        <small>
                                                            ${escapeHtml(
                                                                guest.id_number
                                                            )}
                                                        </small>
                                                    `
                                                    : ""
                                            }
                                        </div>
                                    `
                                    : "-"
                            }

                        </td>


                        <td>
                            ${escapeHtml(
                                guest.city || "-"
                            )}
                        </td>


                        <td class="text-right">

                            <div class="guest-action-buttons">

                                <button
                                    type="button"
                                    class="table-action edit"
                                    data-edit-guest="${escapeHtml(
                                        guest.id
                                    )}"
                                >
                                    Edit
                                </button>

                                <button
                                    type="button"
                                    class="table-action delete"
                                    data-delete-guest="${escapeHtml(
                                        guest.id
                                    )}"
                                >
                                    Delete
                                </button>

                            </div>

                        </td>

                    </tr>
                `;

            }).join("");
    }


    /* =====================================================
       OPEN GUEST DRAWER
       ===================================================== */

    function openGuestDrawer(guest = null) {

        if (!guestDrawer) {
            return;
        }


        if (!guest) {

            guestDrawerTitle.textContent = "Add Guest";


            guestId.value = "";
            guestName.value = "";
            guestPhone.value = "";
            guestEmail.value = "";
            guestGender.value = "";
            guestDateOfBirth.value = "";
            guestIdType.value = "";
            guestIdNumber.value = "";
            guestNationality.value = "Indian";
            guestAddress.value = "";
            guestCity.value = "";
            guestState.value = "";
            guestCountry.value = "India";
            guestNotes.value = "";

        } else {

            guestDrawerTitle.textContent = "Edit Guest";


            guestId.value = guest.id || "";

            guestName.value =
                getGuestDisplayName(guest);

            guestPhone.value =
                guest.phone || "";

            guestEmail.value =
                guest.email || "";

            guestGender.value =
                guest.gender || "";

            guestDateOfBirth.value =
                guest.date_of_birth || "";

            guestIdType.value =
                guest.id_type || "";

            guestIdNumber.value =
                guest.id_number || "";

            guestNationality.value =
                guest.nationality || "Indian";

            guestAddress.value =
                guest.address || "";

            guestCity.value =
                guest.city || "";

            guestState.value =
                guest.state || "";

            guestCountry.value =
                guest.country || "India";

            guestNotes.value =
                guest.notes || "";
        }


        guestDrawer.classList.add("show");
        guestDrawer.setAttribute(
            "aria-hidden",
            "false"
        );


        if (guestDrawerOverlay) {
            guestDrawerOverlay.classList.add("show");
        }


        document.body.classList.add("drawer-open");


        setTimeout(function () {

            if (guestName) {
                guestName.focus();
            }

        }, 200);
    }


    /* =====================================================
       CLOSE DRAWER
       ===================================================== */

    function closeGuestDrawerPanel() {

        if (guestDrawer) {

            guestDrawer.classList.remove("show");

            guestDrawer.setAttribute(
                "aria-hidden",
                "true"
            );
        }


        if (guestDrawerOverlay) {
            guestDrawerOverlay.classList.remove("show");
        }


        document.body.classList.remove("drawer-open");
    }


    /* =====================================================
       SAVE GUEST
       ===================================================== */

    async function saveGuest() {

        if (!currentHotelId) {

            alert(
                "Hotel information not found. Please login again."
            );

            return;
        }


        const id =
            guestId.value.trim();

        const fullName =
            guestName.value.trim();

        const phone =
            guestPhone.value.trim();

        const email =
            guestEmail.value.trim();

        const gender =
            guestGender.value;

        const dateOfBirth =
            guestDateOfBirth.value;

        const idType =
            guestIdType.value;

        const idNumber =
            guestIdNumber.value.trim();

        const nationality =
            guestNationality.value.trim();

        const address =
            guestAddress.value.trim();

        const city =
            guestCity.value.trim();

        const state =
            guestState.value.trim();

        const country =
            guestCountry.value.trim();

        const notes =
            guestNotes.value.trim();


        /* VALIDATION */

        if (!fullName) {

            alert(
                "Please enter the guest name."
            );

            guestName.focus();

            return;
        }


        if (
            email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ) {

            alert(
                "Please enter a valid email address."
            );

            guestEmail.focus();

            return;
        }


        const nameParts =
            fullName
                .split(/\s+/)
                .filter(Boolean);


        const firstName =
            nameParts.shift() || "";

        const lastName =
            nameParts.join(" ").trim();


        saveGuestButton.disabled = true;
        saveGuestButton.textContent = "Saving...";


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
                    nationality || "Indian",

                address:
                    address || null,

                city:
                    city || null,

                state:
                    state || null,

                country:
                    country || "India",

                notes:
                    notes || null,

                updated_at:
                    new Date().toISOString()

            };


            let result;


            if (id) {

                result =
                    await supabase
                        .from("guests")
                        .update(guestData)
                        .eq(
                            "id",
                            Number(id)
                        )
                        .eq(
                            "hotel_id",
                            currentHotelId
                        );

            } else {

                result =
                    await supabase
                        .from("guests")
                        .insert(guestData);

            }


            if (result.error) {
                throw result.error;
            }


            closeGuestDrawerPanel();

            await loadGuests();


            showToast(
                id
                    ? "Guest updated successfully."
                    : "Guest added successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "Save guest error:",
                error
            );


            alert(
                getFriendlySupabaseError(
                    error,
                    "Unable to save guest."
                )
            );


        } finally {

            saveGuestButton.disabled = false;
            saveGuestButton.textContent = "Save Guest";
        }
    }


    /* =====================================================
       DELETE GUEST
       ===================================================== */

    async function deleteGuest(id) {

        const numericId =
            Number(id);


        if (!Number.isFinite(numericId)) {

            alert(
                "Invalid guest ID."
            );

            return;
        }


        const guest =
            guests.find(function (item) {

                return Number(item.id) === numericId;

            });


        if (!guest) {

            alert(
                "Guest not found."
            );

            return;
        }


        const displayName =
            getGuestDisplayName(guest);


        const confirmed =
            confirm(
                `Delete guest "${displayName}"?\n\n` +
                `This action cannot be undone.`
            );


        if (!confirmed) {
            return;
        }


        try {

            /* CHECK BOOKINGS */

            const {
                count: bookingCount,
                error: bookingCheckError
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
                    currentHotelId
                )
                .eq(
                    "guest_id",
                    numericId
                );


            if (bookingCheckError) {
                throw bookingCheckError;
            }


            if (
                bookingCount !== null &&
                bookingCount > 0
            ) {

                alert(
                    `${displayName} cannot be deleted.\n\n` +
                    `This guest has ${bookingCount} existing booking` +
                    `${bookingCount === 1 ? "" : "s"}.\n\n` +
                    `The guest record is kept to protect booking, ` +
                    `stay and billing history.`
                );

                return;
            }


            /* DELETE */

            const {
                error: deleteError
            } = await supabase
                .from("guests")
                .delete()
                .eq(
                    "id",
                    numericId
                )
                .eq(
                    "hotel_id",
                    currentHotelId
                );


            if (deleteError) {
                throw deleteError;
            }


            await loadGuests();


            showToast(
                "Guest deleted successfully.",
                "success"
            );


        } catch (error) {

            console.error(
                "Delete guest error:",
                error
            );


            if (
                error?.code === "23503" ||
                String(
                    error?.message || ""
                )
                    .toLowerCase()
                    .includes("foreign key constraint")
            ) {

                alert(
                    `${displayName} cannot be deleted because ` +
                    `this guest is linked to existing hotel records.`
                );

            } else {

                alert(
                    getFriendlySupabaseError(
                        error,
                        "Unable to delete guest."
                    )
                );
            }
        }
    }


    /* =====================================================
       BUTTON EVENTS
       ===================================================== */

    if (addGuestBtn) {

        addGuestBtn.addEventListener(
            "click",
            function () {

                openGuestDrawer();

            }
        );
    }


    if (emptyAddGuestBtn) {

        emptyAddGuestBtn.addEventListener(
            "click",
            function () {

                openGuestDrawer();

            }
        );
    }


    if (closeGuestDrawer) {

        closeGuestDrawer.addEventListener(
            "click",
            closeGuestDrawerPanel
        );
    }


    if (cancelGuestButton) {

        cancelGuestButton.addEventListener(
            "click",
            closeGuestDrawerPanel
        );
    }


    if (guestDrawerOverlay) {

        guestDrawerOverlay.addEventListener(
            "click",
            closeGuestDrawerPanel
        );
    }


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


    /* =====================================================
       GENDER FILTER
       ===================================================== */

    if (guestGenderFilter) {

        guestGenderFilter.addEventListener(
            "change",
            renderGuests
        );
    }


    /* =====================================================
       CLEAR FILTERS
       ===================================================== */

    if (clearGuestFilters) {

        clearGuestFilters.addEventListener(
            "click",
            function () {

                guestSearch.value = "";
                guestGenderFilter.value = "";

                renderGuests();

            }
        );
    }


    /* =====================================================
       TABLE ACTIONS
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


                if (editButton) {

                    const id =
                        Number(
                            editButton.dataset.editGuest
                        );


                    const guest =
                        guests.find(function (item) {

                            return Number(item.id) === id;

                        });


                    if (!guest) {

                        alert(
                            "Guest information could not be found."
                        );

                        return;
                    }


                    openGuestDrawer(guest);

                    return;
                }


                if (deleteButton) {

                    const id =
                        Number(
                            deleteButton.dataset.deleteGuest
                        );


                    deleteGuest(id);
                }

            }
        );
    }


    /* =====================================================
       ESC KEY
       ===================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                guestDrawer?.classList.contains("show")
            ) {

                closeGuestDrawerPanel();

            }

        }
    );


    /* =====================================================
       AUTH STATE
       ===================================================== */

    supabase.auth.onAuthStateChange(
        async function (event, session) {

            console.log(
                "Guest auth event:",
                event
            );


            if (event === "SIGNED_OUT") {

                currentHotelId = null;
                guests = [];

                updateGuestSummary();

                showPageMessage(
                    "Please login to view guests."
                );

                return;
            }


            if (
                event === "SIGNED_IN" ||
                event === "INITIAL_SESSION"
            ) {

                if (session?.user) {

                    const hotelId =
                        await loadCurrentHotel();


                    if (hotelId) {
                        await loadGuests();
                    }
                }
            }

        }
    );


    /* =====================================================
       INITIALIZE
       ===================================================== */

    currentHotelId =
        await loadCurrentHotel();


    if (currentHotelId) {
        await loadGuests();
    }


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
                .split(/\s+/)
                .filter(Boolean);


        if (!parts.length) {
            return "G";
        }


        if (parts.length === 1) {

            return parts[0]
                .substring(0, 2)
                .toUpperCase();
        }


        return (
            parts[0].charAt(0) +
            parts[parts.length - 1].charAt(0)
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
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    function getFriendlySupabaseError(
        error,
        fallback
    ) {

        if (!error) {
            return fallback;
        }


        const message =
            String(
                error.message || ""
            );


        if (error.code === "23503") {

            return (
                "This guest cannot be changed because " +
                "it is linked to other hotel records."
            );
        }


        if (error.code === "23505") {

            return (
                "A guest with the same information already exists."
            );
        }


        if (error.code === "42501") {

            return (
                "You do not have permission to perform this action."
            );
        }


        return message || fallback;
    }


    function showToast(message, type = "success") {

        const oldToast =
            document.querySelector(".star-toast");

        if (oldToast) {
            oldToast.remove();
        }


        const toast =
            document.createElement("div");

        toast.className =
            `star-toast ${type}`;


        toast.innerHTML = `
            <span class="toast-icon">
                ${type === "success" ? "✓" : "!"}
            </span>

            <span>
                ${escapeHtml(message)}
            </span>
        `;


        document.body.appendChild(toast);


        setTimeout(function () {

            toast.classList.add("hide");

            setTimeout(function () {

                toast.remove();

            }, 250);

        }, 2500);
    }

});