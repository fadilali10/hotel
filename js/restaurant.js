/* =========================================================
   STAR HOTELS - RESTAURANT MANAGEMENT
   File: js/restaurant.js

   Features:
   - Restaurant tables
   - Menu categories
   - Menu items
   - Menu availability
   - Menu search
   - Today's restaurant sales
   - Mobile sidebar
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

    console.log("Restaurant module loaded.");

    const db = window.supabaseClient;

    if (!db) {
        console.error(
            "Supabase client not found."
        );
        return;
    }


    /* =====================================================
       STATE
    ===================================================== */

    let hotelId = null;

    let tables = [];
    let categories = [];
    let menuItems = [];
    let todaySales = 0;

    let isLoading = false;


    /* =====================================================
       ELEMENT HELPER
    ===================================================== */

    const $ = (id) =>
        document.getElementById(id);


    /* =====================================================
       ESCAPE HTML
    ===================================================== */

    function escapeHTML(value) {

        return String(value ?? "")
            .replace(
                /[&<>"']/g,
                character => ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#039;"
                })[character]
            );
    }


    /* =====================================================
       MONEY
    ===================================================== */

    function money(amount) {

        const value =
            Number(amount) || 0;

        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: "INR",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(value);
    }


    /* =====================================================
       ROUND MONEY
    ===================================================== */

    function roundMoney(value) {

        return Math.round(
            (Number(value) || 0) * 100
        ) / 100;
    }


    /* =====================================================
       MESSAGE
    ===================================================== */

    function showMessage(
        id,
        message,
        isError = false
    ) {

        const element = $(id);

        if (!element) {
            return;
        }

        element.textContent =
            message || "";

        element.style.color =
            isError
                ? "#dc2626"
                : "#15803d";

        element.style.display =
            message
                ? "block"
                : "none";
    }


    /* =====================================================
       BUTTON LOADING
    ===================================================== */

    function setButtonLoading(
        button,
        loading,
        normalText
    ) {

        if (!button) {
            return;
        }

        if (loading) {

            if (
                !button.dataset.originalText
            ) {
                button.dataset.originalText =
                    button.textContent;
            }

            button.disabled = true;

            button.textContent =
                "Saving...";

        } else {

            button.disabled = false;

            button.textContent =
                button.dataset.originalText ||
                normalText ||
                "Save";

            delete button.dataset.originalText;
        }
    }


    /* =====================================================
       GET HOTEL ID
    ===================================================== */

    async function getHotelId() {

        const {
            data: authData,
            error: authError
        } = await db.auth.getUser();

        if (authError) {
            throw authError;
        }

        const user =
            authData?.user;

        if (!user) {

            window.location.href =
                "login.html";

            return null;
        }


        const {
            data: profile,
            error: profileError
        } = await db
            .from("profiles")
            .select(`
                id,
                hotel_id,
                full_name
            `)
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


        if (profileError) {
            throw profileError;
        }


        if (
            !profile ||
            !profile.hotel_id
        ) {

            throw new Error(
                "Your account is not linked to a hotel."
            );
        }


        /* ---------------------------------------------
           Update top user information
        --------------------------------------------- */

        const topUserName =
            $("topUserName");

        const topUserInitial =
            $("topUserInitial");


        const name =
            profile.full_name ||
            user.email ||
            "User";


        if (topUserName) {
            topUserName.textContent =
                name;
        }


        if (topUserInitial) {

            topUserInitial.textContent =
                String(name)
                    .trim()
                    .charAt(0)
                    .toUpperCase() ||
                "U";
        }


        return profile.hotel_id;
    }


    /* =====================================================
       LOAD TABLES
    ===================================================== */

    async function loadTables() {

        const {
            data,
            error
        } = await db
            .from("restaurant_tables")
            .select(`
                id,
                hotel_id,
                table_number,
                capacity,
                status,
                notes,
                created_at
            `)
            .eq(
                "hotel_id",
                hotelId
            )
            .order(
                "table_number",
                {
                    ascending: true
                }
            );


        if (error) {
            throw error;
        }


        tables =
            data || [];


        renderTables();
    }


    /* =====================================================
       LOAD CATEGORIES
    ===================================================== */

    async function loadCategories() {

        const {
            data,
            error
        } = await db
            .from("menu_categories")
            .select(`
                id,
                hotel_id,
                name,
                description,
                display_order,
                is_active,
                created_at
            `)
            .eq(
                "hotel_id",
                hotelId
            )
            .order(
                "display_order",
                {
                    ascending: true
                }
            );


        if (error) {
            throw error;
        }


        categories =
            data || [];


        renderCategories();

        populateCategorySelect();
    }


    /* =====================================================
       LOAD MENU ITEMS
    ===================================================== */

    async function loadMenuItems() {

        const {
            data,
            error
        } = await db
            .from("menu_items")
            .select(`
                id,
                hotel_id,
                category_id,
                name,
                description,
                price,
                is_available,
                created_at
            `)
            .eq(
                "hotel_id",
                hotelId
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


        menuItems =
            data || [];


        renderMenuItems();
    }


    /* =====================================================
       LOAD TODAY SALES
    ===================================================== */

    async function loadTodaySales() {

        todaySales = 0;


        const today =
            new Date();


        const start =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate(),
                0,
                0,
                0
            );


        const end =
            new Date(
                today.getFullYear(),
                today.getMonth(),
                today.getDate() + 1,
                0,
                0,
                0
            );


        const {
            data,
            error
        } = await db
            .from("restaurant_orders")
            .select(`
                id,
                total,
                status,
                created_at
            `)
            .eq(
                "hotel_id",
                hotelId
            )
            .gte(
                "created_at",
                start.toISOString()
            )
            .lt(
                "created_at",
                end.toISOString()
            );


        if (error) {

            console.warn(
                "Today's sales could not be loaded:",
                error.message
            );

            updateSalesStat();

            return;
        }


        todaySales =
            (data || [])
                .filter(
                    order =>
                        String(
                            order.status ||
                            ""
                        ).toUpperCase() !==
                        "CANCELLED"
                )
                .reduce(
                    (
                        total,
                        order
                    ) =>
                        total +
                        Number(
                            order.total || 0
                        ),
                    0
                );


        updateSalesStat();
    }


    /* =====================================================
       UPDATE SALES STAT
    ===================================================== */

    function updateSalesStat() {

        const element =
            $("restaurantSales");

        if (element) {

            element.textContent =
                money(todaySales);
        }
    }


    /* =====================================================
       RENDER TABLES
    ===================================================== */

    function renderTables() {

        const grid =
            $("restTablesGrid");


        if (!grid) {
            return;
        }


        if (!tables.length) {

            grid.innerHTML = `
                <div class="empty-state">
                    No restaurant tables added yet.
                </div>
            `;

        } else {

            grid.innerHTML =
                tables.map(
                    table => {

                        const status =
                            String(
                                table.status ||
                                "AVAILABLE"
                            ).toUpperCase();


                        return `
                            <div class="restaurant-item">

                                <div style="
                                    display:flex;
                                    align-items:center;
                                    justify-content:space-between;
                                    gap:10px;
                                ">

                                    <strong>
                                        Table
                                        ${escapeHTML(
                                            table.table_number
                                        )}
                                    </strong>

                                    <span class="restaurant-status">
                                        ${escapeHTML(
                                            status
                                        )}
                                    </span>

                                </div>

                                <p>
                                    Capacity:
                                    ${escapeHTML(
                                        table.capacity ??
                                        "—"
                                    )}
                                </p>

                                ${
                                    table.notes
                                        ? `
                                            <p>
                                                ${escapeHTML(
                                                    table.notes
                                                )}
                                            </p>
                                        `
                                        : ""
                                }

                            </div>
                        `;
                    }
                ).join("");
        }


        const count =
            $("restaurantTableCount");

        if (count) {
            count.textContent =
                tables.length;
        }
    }


    /* =====================================================
       RENDER CATEGORIES
    ===================================================== */

    function renderCategories() {

        const list =
            $("restCategoriesList");


        if (!list) {
            return;
        }


        const activeCategories =
            categories.filter(
                category =>
                    category.is_active !== false
            );


        if (!activeCategories.length) {

            list.innerHTML = `
                <div class="empty-state">
                    No food categories added yet.
                </div>
            `;

            return;
        }


        list.innerHTML =
            activeCategories
                .map(
                    category => `
                        <div class="restaurant-item">

                            <strong>
                                ${escapeHTML(
                                    category.name
                                )}
                            </strong>

                            ${
                                category.description
                                    ? `
                                        <p>
                                            ${escapeHTML(
                                                category.description
                                            )}
                                        </p>
                                    `
                                    : ""
                            }

                        </div>
                    `
                )
                .join("");
    }


    /* =====================================================
       CATEGORY SELECT
    ===================================================== */

    function populateCategorySelect() {

        const select =
            $("restMenuCategory");


        if (!select) {
            return;
        }


        const previousValue =
            select.value;


        const activeCategories =
            categories.filter(
                category =>
                    category.is_active !== false
            );


        select.innerHTML = `
            <option value="">
                Select category
            </option>

            ${activeCategories
                .map(
                    category => `
                        <option value="${escapeHTML(
                            category.id
                        )}">
                            ${escapeHTML(
                                category.name
                            )}
                        </option>
                    `
                )
                .join("")}
        `;


        if (
            previousValue &&
            [...select.options].some(
                option =>
                    option.value ===
                    previousValue
            )
        ) {

            select.value =
                previousValue;
        }
    }


    /* =====================================================
       RENDER MENU ITEMS
    ===================================================== */

    function renderMenuItems() {

        const body =
            $("menuItemsTableBody");


        if (!body) {
            return;
        }


        const search =
            $("menuSearch")
                ?.value
                .trim()
                .toLowerCase() || "";


        const filteredItems =
            menuItems.filter(
                item => {

                    if (!search) {
                        return true;
                    }


                    const category =
                        categories.find(
                            entry =>
                                String(
                                    entry.id
                                ) ===
                                String(
                                    item.category_id
                                )
                        );


                    const name =
                        String(
                            item.name || ""
                        ).toLowerCase();


                    const description =
                        String(
                            item.description || ""
                        ).toLowerCase();


                    const categoryName =
                        String(
                            category?.name || ""
                        ).toLowerCase();


                    return (
                        name.includes(search) ||
                        description.includes(search) ||
                        categoryName.includes(search)
                    );
                }
            );


        if (!filteredItems.length) {

            body.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-table">
                            ${
                                menuItems.length
                                    ? "No menu items match your search."
                                    : "No food items added yet."
                            }
                        </div>
                    </td>
                </tr>
            `;

        } else {

            body.innerHTML =
                filteredItems
                    .map(
                        item => {

                            const category =
                                categories.find(
                                    entry =>
                                        String(
                                            entry.id
                                        ) ===
                                        String(
                                            item.category_id
                                        )
                                );


                            const available =
                                item.is_available !== false;


                            return `
                                <tr>

                                    <td>
                                        <strong>
                                            ${escapeHTML(
                                                item.name
                                            )}
                                        </strong>

                                        ${
                                            item.description
                                                ? `
                                                    <div style="
                                                        margin-top:4px;
                                                        color:#96929f;
                                                        font-size:9px;
                                                    ">
                                                        ${escapeHTML(
                                                            item.description
                                                        )}
                                                    </div>
                                                `
                                                : ""
                                        }

                                    </td>

                                    <td>
                                        ${escapeHTML(
                                            category?.name ||
                                            "Uncategorized"
                                        )}
                                    </td>

                                    <td>
                                        <strong>
                                            ${money(
                                                item.price
                                            )}
                                        </strong>
                                    </td>

                                    <td>

                                        <span class="${
                                            available
                                                ? "status-available"
                                                : "status-unavailable"
                                        }">

                                            ${
                                                available
                                                    ? "Available"
                                                    : "Unavailable"
                                            }

                                        </span>

                                    </td>

                                    <td>

                                        <button
                                            type="button"
                                            class="table-action-btn ${
                                                available
                                                    ? ""
                                                    : "unavailable"
                                            }"
                                            data-menu-toggle="${escapeHTML(
                                                item.id
                                            )}"
                                            data-available="${
                                                available
                                                    ? "true"
                                                    : "false"
                                            }">

                                            ${
                                                available
                                                    ? "Mark unavailable"
                                                    : "Mark available"
                                            }

                                        </button>

                                    </td>

                                </tr>
                            `;
                        }
                    )
                    .join("");
        }


        /* ---------------------------------------------
           Statistics
        --------------------------------------------- */

        const availableCount =
            menuItems.filter(
                item =>
                    item.is_available !== false
            ).length;


        const menuCount =
            $("menuItemCount");


        const availableElement =
            $("availableMenuItems");


        if (menuCount) {
            menuCount.textContent =
                menuItems.length;
        }


        if (availableElement) {
            availableElement.textContent =
                availableCount;
        }
    }


    /* =====================================================
       ADD TABLE
    ===================================================== */

    async function addTable(event) {

        event.preventDefault();


        const button =
            $("restSaveTable");


        const tableNumber =
            $("restTableNumber")
                ?.value
                .trim();


        const capacity =
            Number(
                $("restTableCapacity")
                    ?.value
            );


        const notes =
            $("restTableNotes")
                ?.value
                .trim() ||
            null;


        showMessage(
            "restTableMessage",
            ""
        );


        if (!tableNumber) {

            showMessage(
                "restTableMessage",
                "Enter a table number.",
                true
            );

            return;
        }


        if (
            !Number.isInteger(capacity) ||
            capacity < 1
        ) {

            showMessage(
                "restTableMessage",
                "Capacity must be at least 1.",
                true
            );

            return;
        }


        const duplicate =
            tables.some(
                table =>
                    String(
                        table.table_number || ""
                    )
                    .trim()
                    .toLowerCase() ===
                    tableNumber.toLowerCase()
            );


        if (duplicate) {

            showMessage(
                "restTableMessage",
                `Table ${tableNumber} already exists.`,
                true
            );

            return;
        }


        setButtonLoading(
            button,
            true,
            "Save Table"
        );


        try {

            const insertData = {
                hotel_id: hotelId,
                table_number:
                    tableNumber,
                capacity
            };


            if (notes) {
                insertData.notes =
                    notes;
            }


            const {
                error
            } = await db
                .from(
                    "restaurant_tables"
                )
                .insert(
                    insertData
                );


            if (error) {
                throw error;
            }


            $("restTableForm")
                ?.reset();


            $("restTableCapacity")
                && (
                    $("restTableCapacity")
                        .value = 2
                );


            await loadTables();


            showMessage(
                "restTableMessage",
                `Table ${tableNumber} added successfully.`
            );

        } catch (error) {

            console.error(
                "Add table error:",
                error
            );


            showMessage(
                "restTableMessage",
                error?.message ||
                "Could not add restaurant table.",
                true
            );

        } finally {

            setButtonLoading(
                button,
                false,
                "Save Table"
            );
        }
    }


    /* =====================================================
       ADD CATEGORY
    ===================================================== */

    async function addCategory(event) {

        event.preventDefault();


        const button =
            $("restSaveCategory");


        const name =
            $("restCategoryName")
                ?.value
                .trim();


        const description =
            $("restCategoryDescription")
                ?.value
                .trim() ||
            null;


        showMessage(
            "restCategoryMessage",
            ""
        );


        if (!name) {

            showMessage(
                "restCategoryMessage",
                "Enter a category name.",
                true
            );

            return;
        }


        const duplicate =
            categories.some(
                category =>
                    String(
                        category.name || ""
                    )
                    .trim()
                    .toLowerCase() ===
                    name.toLowerCase()
            );


        if (duplicate) {

            showMessage(
                "restCategoryMessage",
                `Category "${name}" already exists.`,
                true
            );

            return;
        }


        setButtonLoading(
            button,
            true,
            "Save Category"
        );


        try {

            const nextDisplayOrder =
                categories.reduce(
                    (
                        max,
                        category
                    ) =>
                        Math.max(
                            max,
                            Number(
                                category.display_order
                            ) || 0
                        ),
                    0
                ) + 1;


            const insertData = {
                hotel_id: hotelId,
                name,
                display_order:
                    nextDisplayOrder,
                is_active: true
            };


            if (description) {
                insertData.description =
                    description;
            }


            const {
                error
            } = await db
                .from(
                    "menu_categories"
                )
                .insert(
                    insertData
                );


            if (error) {
                throw error;
            }


            $("restCategoryForm")
                ?.reset();


            await loadCategories();


            showMessage(
                "restCategoryMessage",
                `Food category "${name}" added successfully.`
            );

        } catch (error) {

            console.error(
                "Add category error:",
                error
            );


            showMessage(
                "restCategoryMessage",
                error?.message ||
                "Could not add category.",
                true
            );

        } finally {

            setButtonLoading(
                button,
                false,
                "Save Category"
            );
        }
    }


    /* =====================================================
       ADD MENU ITEM
    ===================================================== */

    async function addMenuItem(event) {

        event.preventDefault();


        const button =
            $("restSaveMenu");


        const name =
            $("restMenuName")
                ?.value
                .trim();


        const categoryId =
            $("restMenuCategory")
                ?.value;


        const price =
            Number(
                $("restMenuPrice")
                    ?.value
            );


        const description =
            $("restMenuDescription")
                ?.value
                .trim() ||
            null;


        showMessage(
            "restMenuMessage",
            ""
        );


        if (!name) {

            showMessage(
                "restMenuMessage",
                "Enter a food item name.",
                true
            );

            return;
        }


        if (!categoryId) {

            showMessage(
                "restMenuMessage",
                "Select a food category.",
                true
            );

            return;
        }


        if (
            !Number.isFinite(price) ||
            price < 0
        ) {

            showMessage(
                "restMenuMessage",
                "Enter a valid price.",
                true
            );

            return;
        }


        const selectedCategory =
            categories.find(
                category =>
                    String(
                        category.id
                    ) ===
                    String(categoryId)
            );


        if (
            !selectedCategory ||
            selectedCategory.is_active === false
        ) {

            showMessage(
                "restMenuMessage",
                "Selected category is not available.",
                true
            );

            return;
        }


        const duplicate =
            menuItems.some(
                item =>
                    String(
                        item.name || ""
                    )
                    .trim()
                    .toLowerCase() ===
                    name.toLowerCase()
            );


        if (duplicate) {

            showMessage(
                "restMenuMessage",
                `Food item "${name}" already exists.`,
                true
            );

            return;
        }


        setButtonLoading(
            button,
            true,
            "Save Food Item"
        );


        try {

            const insertData = {
                hotel_id: hotelId,
                category_id:
                    categoryId,
                name,
                price:
                    roundMoney(price),
                is_available:
                    true
            };


            if (description) {
                insertData.description =
                    description;
            }


            const {
                error
            } = await db
                .from("menu_items")
                .insert(
                    insertData
                );


            if (error) {
                throw error;
            }


            $("restMenuForm")
                ?.reset();


            await loadMenuItems();


            showMessage(
                "restMenuMessage",
                `"${name}" added to the menu successfully.`
            );

        } catch (error) {

            console.error(
                "Add menu item error:",
                error
            );


            showMessage(
                "restMenuMessage",
                error?.message ||
                "Could not add food item.",
                true
            );

        } finally {

            setButtonLoading(
                button,
                false,
                "Save Food Item"
            );
        }
    }


    /* =====================================================
       TOGGLE MENU AVAILABILITY
    ===================================================== */

    async function toggleMenuItem(button) {

        if (!button) {
            return;
        }


        const itemId =
            button.dataset.menuToggle;


        const currentlyAvailable =
            button.dataset.available ===
            "true";


        const nextAvailable =
            !currentlyAvailable;


        if (!itemId) {
            return;
        }


        const item =
            menuItems.find(
                entry =>
                    String(entry.id) ===
                    String(itemId)
            );


        if (!item) {

            alert(
                "Food item not found. Refresh the page."
            );

            return;
        }


        button.disabled = true;


        try {

            const {
                error
            } = await db
                .from("menu_items")
                .update({
                    is_available:
                        nextAvailable
                })
                .eq(
                    "id",
                    itemId
                )
                .eq(
                    "hotel_id",
                    hotelId
                );


            if (error) {
                throw error;
            }


            await loadMenuItems();


        } catch (error) {

            console.error(
                "Menu availability update error:",
                error
            );


            alert(
                error?.message ||
                "Could not update food availability."
            );


        } finally {

            button.disabled =
                false;
        }
    }


    /* =====================================================
       SEARCH
    ===================================================== */

    function setupSearch() {

        const search =
            $("menuSearch");


        if (!search) {
            return;
        }


        search.addEventListener(
            "input",
            () => {
                renderMenuItems();
            }
        );
    }


    /* =====================================================
       MOBILE MENU
    ===================================================== */

    function setupMobileMenu() {

        const menu =
            $("mobileMenu");

        const sidebar =
            $("sidebar");

        const backdrop =
            $("sidebarBackdrop");


        if (
            !menu ||
            !sidebar ||
            !backdrop
        ) {
            return;
        }


        function closeSidebar() {

            sidebar.classList.remove(
                "show"
            );

            backdrop.classList.remove(
                "show"
            );
        }


        menu.addEventListener(
            "click",
            () => {

                sidebar.classList.toggle(
                    "show"
                );

                backdrop.classList.toggle(
                    "show"
                );
            }
        );


        backdrop.addEventListener(
            "click",
            closeSidebar
        );


        sidebar
            .querySelectorAll("a")
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        closeSidebar
                    );
                }
            );
    }


    /* =====================================================
       ADD MENU ITEM BUTTON
    ===================================================== */

    function setupAddMenuButton() {

        const button =
            $("addMenuItemBtn");

        const card =
            $("menuItemFormCard");


        if (!button || !card) {
            return;
        }


        button.addEventListener(
            "click",
            () => {

                card.scrollIntoView({
                    behavior: "smooth",
                    block: "center"
                });


                setTimeout(
                    () => {

                        $("restMenuName")
                            ?.focus();

                    },
                    400
                );
            }
        );
    }


    /* =====================================================
       REFRESH
    ===================================================== */

    function setupRefresh() {

        const button =
            $("restaurantRefresh");


        if (!button) {
            return;
        }


        button.addEventListener(
            "click",
            async () => {

                if (isLoading) {
                    return;
                }


                button.disabled = true;

                const original =
                    button.textContent;

                button.textContent =
                    "Refreshing...";


                try {

                    await Promise.all([
                        loadTables(),
                        loadCategories(),
                        loadMenuItems(),
                        loadTodaySales()
                    ]);


                    showMessage(
                        "restTableMessage",
                        "Restaurant data refreshed."
                    );

                } catch (error) {

                    console.error(
                        "Refresh error:",
                        error
                    );


                    showMessage(
                        "restTableMessage",
                        error?.message ||
                        "Could not refresh restaurant data.",
                        true
                    );

                } finally {

                    button.disabled =
                        false;

                    button.textContent =
                        original;
                }
            }
        );
    }


    /* =====================================================
       EVENTS
    ===================================================== */

    function wireEvents() {

        $("restTableForm")
            ?.addEventListener(
                "submit",
                addTable
            );


        $("restCategoryForm")
            ?.addEventListener(
                "submit",
                addCategory
            );


        $("restMenuForm")
            ?.addEventListener(
                "submit",
                addMenuItem
            );


        $("menuItemsTableBody")
            ?.addEventListener(
                "click",
                event => {

                    const button =
                        event.target.closest(
                            "[data-menu-toggle]"
                        );


                    if (!button) {
                        return;
                    }


                    toggleMenuItem(
                        button
                    );
                }
            );


        setupSearch();

        setupMobileMenu();

        setupAddMenuButton();

        setupRefresh();
    }


    /* =====================================================
       AUTH STATE
    ===================================================== */

    db.auth.onAuthStateChange(
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


    /* =====================================================
       INITIALIZE
    ===================================================== */

    async function init() {

        if (isLoading) {
            return;
        }


        isLoading = true;


        try {

            hotelId =
                await getHotelId();


            if (!hotelId) {
                return;
            }


            wireEvents();


            /*
             * Categories first because
             * menu items use category names.
             */

            await loadCategories();


            await Promise.all([
                loadTables(),
                loadMenuItems(),
                loadTodaySales()
            ]);


            console.log(
                "Restaurant management initialized successfully."
            );


        } catch (error) {

            console.error(
                "Restaurant initialization failed:",
                error
            );


            const message =
                error?.message ||
                "Could not load restaurant information.";


            showMessage(
                "restTableMessage",
                message,
                true
            );


            showMessage(
                "restCategoryMessage",
                message,
                true
            );


            showMessage(
                "restMenuMessage",
                message,
                true
            );

        } finally {

            isLoading = false;
        }
    }


    await init();

});