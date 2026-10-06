/* =========================================================
   STAR HOTELS - RESTAURANT ORDERS
   File: js/orders.js

   Order statuses:
   OPEN
   PREPARING
   READY
   SERVED
   CANCELLED
   PAID

   restaurant_orders:
   id, hotel_id, order_number, stay_id, guest_id,
   table_id, status, subtotal, tax, discount, total,
   notes, created_at, updated_at,
   billed_invoice_id, billed_at

   restaurant_order_items:
   id, hotel_id, order_id, menu_item_id,
   item_name, quantity, unit_price, total,
   notes, created_at

   IMPORTANT:
   restaurant_order_items total column = "total"
   NOT "total_price"
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const db = window.supabaseClient;

    if (!db) {
        console.error(
            "❌ Supabase client not found. Check js/supabase.js."
        );
        return;
    }

    /* =========================================================
       SETTINGS
    ========================================================= */

    const TAX_RATE = 0.05;

    const ORDER_STATUSES = [
        "OPEN",
        "PREPARING",
        "READY",
        "SERVED",
        "CANCELLED",
        "PAID"
    ];

    /* =========================================================
       STATE
    ========================================================= */

    let hotelId = null;

    let stays = [];
    let tables = [];
    let menuItems = [];
    let orders = [];

    let cart = [];

    /* =========================================================
       HELPERS
    ========================================================= */

    const $ = (id) => document.getElementById(id);

    function escapeHTML(value) {

        return String(value ?? "").replace(
            /[&<>"']/g,
            (character) => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            })[character]
        );
    }

    function money(amount) {

        const value = Number(amount);

        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(
            Number.isFinite(value)
                ? value
                : 0
        );
    }

    function roundMoney(value) {

        return Math.round(
            (Number(value) || 0) * 100
        ) / 100;
    }

    function getTodayString() {

        const date = new Date();

        return [
            date.getFullYear(),
            String(
                date.getMonth() + 1
            ).padStart(2, "0"),
            String(
                date.getDate()
            ).padStart(2, "0")
        ].join("-");
    }

    function getGuestName(guest) {

        if (!guest) {
            return "Guest";
        }

        return (
            guest.full_name ||
            [
                guest.first_name,
                guest.last_name
            ]
                .filter(Boolean)
                .join(" ") ||
            "Guest"
        );
    }

    function showMessage(
        message,
        isError = false
    ) {

        const element =
            $("restOrderMessage");

        if (!element) {
            return;
        }

        element.textContent =
            message || "";

        element.style.color =
            isError
                ? "#dc2626"
                : "#15803d";

        element.style.background =
            isError
                ? "#fff0f0"
                : "#eaf8f0";

        element.style.display =
            message
                ? "block"
                : "none";
    }

    function setButtonLoading(
        button,
        loading,
        loadingText = "Saving..."
    ) {

        if (!button) {
            return;
        }

        if (loading) {

            if (!button.dataset.originalText) {
                button.dataset.originalText =
                    button.textContent;
            }

            button.disabled = true;
            button.textContent = loadingText;

        } else {

            button.disabled = false;

            button.textContent =
                button.dataset.originalText ||
                "Save Order";
        }
    }

    function getNextStatus(status) {

        const nextStatuses = {
            OPEN: "PREPARING",
            PREPARING: "READY",
            READY: "SERVED"
        };

        return (
            nextStatuses[
                String(status || "")
                    .toUpperCase()
            ] || null
        );
    }

    function isCancelledOrPaid(order) {

        return [
            "CANCELLED",
            "PAID"
        ].includes(
            String(order.status || "")
                .toUpperCase()
        );
    }

    /* =========================================================
       MOBILE SIDEBAR
    ========================================================= */

    function setupMobileMenu() {

        const mobileMenu =
            $("mobileMenu");

        const sidebar =
            $("sidebar");

        const backdrop =
            $("sidebarBackdrop");

        if (!mobileMenu || !sidebar) {
            return;
        }

        function closeSidebar() {

            sidebar.classList.remove("open");

            backdrop?.classList.remove("show");
        }

        mobileMenu.addEventListener(
            "click",
            () => {

                sidebar.classList.toggle("open");

                backdrop?.classList.toggle(
                    "show"
                );
            }
        );

        backdrop?.addEventListener(
            "click",
            closeSidebar
        );

        document
            .querySelectorAll(".nav-item")
            .forEach((item) => {

                item.addEventListener(
                    "click",
                    closeSidebar
                );
            });
    }

    /* =========================================================
       HOTEL / USER
    ========================================================= */

    async function getHotelProfile() {

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

            throw new Error(
                "Please log in to manage restaurant orders."
            );
        }

        const {
            data: profile,
            error: profileError
        } = await db
            .from("profiles")
            .select(
                "hotel_id, full_name"
            )
            .eq(
                "id",
                user.id
            )
            .maybeSingle();

        if (profileError) {
            throw profileError;
        }

        if (!profile?.hotel_id) {

            throw new Error(
                "Your account is not linked to a hotel."
            );
        }

        const userName =
            profile.full_name ||
            user.email?.split("@")[0] ||
            "User";

        const userElement =
            $("topUserName");

        if (userElement) {
            userElement.textContent =
                userName;
        }

        return profile.hotel_id;
    }

    /* =========================================================
       LOAD ACTIVE STAYS
    ========================================================= */

    async function loadStays() {

        const {
            data,
            error
        } = await db
            .from("stays")
            .select(`
                id,
                hotel_id,
                stay_number,
                guest_id,
                room_id,
                status,
                created_at
            `)
            .eq(
                "hotel_id",
                hotelId
            )
            .eq(
                "status",
                "ACTIVE"
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        const activeStays =
            data || [];

        const guestIds = [
            ...new Set(
                activeStays
                    .map(
                        stay =>
                            stay.guest_id
                    )
                    .filter(Boolean)
            )
        ];

        const roomIds = [
            ...new Set(
                activeStays
                    .map(
                        stay =>
                            stay.room_id
                    )
                    .filter(Boolean)
            )
        ];

        let guests = [];
        let rooms = [];

        if (guestIds.length) {

            const {
                data: guestData,
                error: guestError
            } = await db
                .from("guests")
                .select(`
                    id,
                    first_name,
                    last_name,
                    full_name
                `)
                .eq(
                    "hotel_id",
                    hotelId
                )
                .in(
                    "id",
                    guestIds
                );

            if (guestError) {
                throw guestError;
            }

            guests =
                guestData || [];
        }

        if (roomIds.length) {

            const {
                data: roomData,
                error: roomError
            } = await db
                .from("rooms")
                .select(`
                    id,
                    hotel_id,
                    room_number,
                    room_type_id,
                    status
                `)
                .eq(
                    "hotel_id",
                    hotelId
                )
                .in(
                    "id",
                    roomIds
                );

            if (roomError) {
                throw roomError;
            }

            rooms =
                roomData || [];
        }

        stays =
            activeStays.map(
                (stay) => ({

                    ...stay,

                    guest:
                        guests.find(
                            guest =>
                                String(
                                    guest.id
                                ) ===
                                String(
                                    stay.guest_id
                                )
                        ),

                    room:
                        rooms.find(
                            room =>
                                String(
                                    room.id
                                ) ===
                                String(
                                    stay.room_id
                                )
                        )
                })
            );

        renderStayOptions();
    }

    /* =========================================================
       LOAD RESTAURANT TABLES
    ========================================================= */

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
                status
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

        renderTableOptions();
    }

    /* =========================================================
       LOAD MENU ITEMS
    ========================================================= */

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
                is_available
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
            (data || []).filter(
                item =>
                    item.is_available !== false
            );

        renderMenuOptions();
    }

    /* =========================================================
       STAY OPTIONS
    ========================================================= */

    function renderStayOptions() {

        const select =
            $("restOrderStay");

        if (!select) {
            return;
        }

        const previousValue =
            select.value;

        if (!stays.length) {

            select.innerHTML = `
                <option value="">
                    No active stays available
                </option>
            `;

            return;
        }

        select.innerHTML = `
            <option value="">
                Select an active hotel stay
            </option>

            ${stays
                .map((stay) => {

                    const roomName =
                        stay.room?.room_number ||
                        stay.room_id ||
                        "Not assigned";

                    const stayNumber =
                        stay.stay_number ||
                        `Stay #${stay.id}`;

                    return `
                        <option
                            value="${escapeHTML(stay.id)}"
                        >
                            ${escapeHTML(
                                getGuestName(
                                    stay.guest
                                )
                            )}
                            — Room
                            ${escapeHTML(roomName)}
                            —
                            ${escapeHTML(
                                stayNumber
                            )}
                        </option>
                    `;
                })
                .join("")}
        `;

        if (
            [...select.options]
                .some(
                    option =>
                        option.value ===
                        previousValue
                )
        ) {
            select.value =
                previousValue;
        }
    }

    /* =========================================================
       TABLE OPTIONS
    ========================================================= */

    function renderTableOptions() {

        const select =
            $("restOrderTable");

        if (!select) {
            return;
        }

        const previousValue =
            select.value;

        select.innerHTML = `
            <option value="">
                No table / Room service
            </option>

            ${tables
                .map(
                    table => `
                        <option
                            value="${escapeHTML(
                                table.id
                            )}"
                        >
                            Table
                            ${escapeHTML(
                                table.table_number
                            )}
                            ${
                                table.capacity
                                    ? `(${escapeHTML(
                                        table.capacity
                                      )} seats)`
                                    : ""
                            }
                        </option>
                    `
                )
                .join("")}
        `;

        if (
            [...select.options]
                .some(
                    option =>
                        option.value ===
                        previousValue
                )
        ) {
            select.value =
                previousValue;
        }
    }

    /* =========================================================
       MENU OPTIONS
    ========================================================= */

    function renderMenuOptions() {

        const select =
            $("restOrderMenuItem");

        if (!select) {
            return;
        }

        const previousValue =
            select.value;

        if (!menuItems.length) {

            select.innerHTML = `
                <option value="">
                    No available menu items
                </option>
            `;

            return;
        }

        select.innerHTML = `
            <option value="">
                Select food item
            </option>

            ${menuItems
                .map(
                    item => `
                        <option
                            value="${escapeHTML(
                                item.id
                            )}"
                        >
                            ${escapeHTML(
                                item.name
                            )}
                            —
                            ${money(
                                item.price
                            )}
                        </option>
                    `
                )
                .join("")}
        `;

        if (
            [...select.options]
                .some(
                    option =>
                        option.value ===
                        previousValue
                )
        ) {
            select.value =
                previousValue;
        }
    }

    /* =========================================================
       CART TOTALS
    ========================================================= */

    function getTotals() {

        const subtotal =
            roundMoney(
                cart.reduce(
                    (sum, item) =>
                        sum +
                        (
                            Number(
                                item.quantity
                            ) *
                            Number(
                                item.unit_price
                            )
                        ),
                    0
                )
            );

        const tax =
            roundMoney(
                subtotal * TAX_RATE
            );

        const total =
            roundMoney(
                subtotal + tax
            );

        return {
            subtotal,
            tax,
            total
        };
    }

    /* =========================================================
       RENDER CART
    ========================================================= */

    function renderCart() {

        const container =
            $("restOrderItems");

        const {
            subtotal,
            tax,
            total
        } = getTotals();

        if (container) {

            if (!cart.length) {

                container.innerHTML = `
                    <div class="empty-state">
                        No food items added.
                        Select a food item and
                        click "Add Food Item".
                    </div>
                `;

            } else {

                container.innerHTML =
                    cart
                        .map(
                            (item, index) => `
                                <div
                                    class="restaurant-order-cart-item"
                                >

                                    <div>
                                        <strong>
                                            ${escapeHTML(
                                                item.item_name
                                            )}
                                        </strong>

                                        <p>
                                            ${money(
                                                item.unit_price
                                            )}
                                            each
                                        </p>
                                    </div>

                                    <div
                                        class="restaurant-order-cart-total"
                                    >

                                        <span>
                                            ${
                                                item.quantity
                                            }
                                            ×
                                            ${money(
                                                item.unit_price
                                            )}
                                            =
                                            <strong>
                                                ${money(
                                                    item.quantity *
                                                    item.unit_price
                                                )}
                                            </strong>
                                        </span>

                                        <button
                                            type="button"
                                            data-remove-cart-item="${index}"
                                        >
                                            Remove
                                        </button>

                                    </div>

                                </div>
                            `
                        )
                        .join("");
            }
        }

        if ($("cartCount")) {
            $("cartCount").textContent =
                cart.reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item.quantity
                        ),
                    0
                );
        }

        if ($("restOrderSubtotal")) {
            $("restOrderSubtotal")
                .textContent =
                money(subtotal);
        }

        if ($("restOrderTax")) {
            $("restOrderTax")
                .textContent =
                money(tax);
        }

        if ($("restOrderTotal")) {
            $("restOrderTotal")
                .textContent =
                money(total);
        }

        if ($("restOrderTaxLabel")) {
            $("restOrderTaxLabel")
                .textContent =
                `Tax (${TAX_RATE * 100}%)`;
        }
    }

    /* =========================================================
       ADD CART ITEM
    ========================================================= */

    function addCartItem() {

        showMessage("");

        const itemId =
            $("restOrderMenuItem")?.value;

        const quantity =
            Number(
                $("restOrderQuantity")?.value
            );

        if (!itemId) {

            showMessage(
                "Please select a food item.",
                true
            );

            return;
        }

        if (
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {

            showMessage(
                "Quantity must be at least 1.",
                true
            );

            return;
        }

        const selectedItem =
            menuItems.find(
                item =>
                    String(item.id) ===
                    String(itemId)
            );

        if (!selectedItem) {

            showMessage(
                "This food item is unavailable. Please refresh the menu.",
                true
            );

            return;
        }

        const unitPrice =
            Number(
                selectedItem.price
            );

        if (
            !Number.isFinite(unitPrice) ||
            unitPrice < 0
        ) {

            showMessage(
                "The selected food item has an invalid price.",
                true
            );

            return;
        }

        const existing =
            cart.find(
                item =>
                    String(
                        item.menu_item_id
                    ) ===
                    String(
                        selectedItem.id
                    )
            );

        if (existing) {

            existing.quantity +=
                quantity;

        } else {

            cart.push({

                menu_item_id:
                    selectedItem.id,

                item_name:
                    selectedItem.name,

                quantity,

                unit_price:
                    unitPrice
            });
        }

        if ($("restOrderQuantity")) {
            $("restOrderQuantity").value =
                "1";
        }

        if ($("restOrderMenuItem")) {
            $("restOrderMenuItem").value =
                "";
        }

        renderCart();
    }

    /* =========================================================
       LOAD ORDERS
    ========================================================= */

    async function loadOrders() {

        const {
            data,
            error
        } = await db
            .from("restaurant_orders")
            .select(`
                id,
                hotel_id,
                order_number,
                stay_id,
                guest_id,
                table_id,
                status,
                subtotal,
                tax,
                discount,
                total,
                notes,
                created_at,
                updated_at,
                billed_invoice_id,
                billed_at
            `)
            .eq(
                "hotel_id",
                hotelId
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );

        if (error) {
            throw error;
        }

        const rows =
            data || [];

        const guestIds = [
            ...new Set(
                rows
                    .map(
                        order =>
                            order.guest_id
                    )
                    .filter(Boolean)
            )
        ];

        const stayIds = [
            ...new Set(
                rows
                    .map(
                        order =>
                            order.stay_id
                    )
                    .filter(Boolean)
            )
        ];

        let guests = [];
        let stayRows = [];

        if (guestIds.length) {

            const {
                data: guestData,
                error: guestError
            } = await db
                .from("guests")
                .select(`
                    id,
                    first_name,
                    last_name,
                    full_name
                `)
                .eq(
                    "hotel_id",
                    hotelId
                )
                .in(
                    "id",
                    guestIds
                );

            if (guestError) {
                throw guestError;
            }

            guests =
                guestData || [];
        }

        if (stayIds.length) {

            const {
                data: stayData,
                error: stayError
            } = await db
                .from("stays")
                .select(`
                    id,
                    stay_number,
                    room_id,
                    status
                `)
                .eq(
                    "hotel_id",
                    hotelId
                )
                .in(
                    "id",
                    stayIds
                );

            if (stayError) {
                throw stayError;
            }

            stayRows =
                stayData || [];
        }

        orders =
            rows.map(
                order => ({

                    ...order,

                    guest:
                        guests.find(
                            guest =>
                                String(
                                    guest.id
                                ) ===
                                String(
                                    order.guest_id
                                )
                        ),

                    stay:
                        stayRows.find(
                            stay =>
                                String(
                                    stay.id
                                ) ===
                                String(
                                    order.stay_id
                                )
                        )
                })
            );

        renderOrders();
        renderOrderStats();
    }

    /* =========================================================
       ORDER STATISTICS
    ========================================================= */

    function renderOrderStats() {

        const today =
            getTodayString();

        const todayOrders =
            orders.filter(
                order =>
                    String(
                        order.created_at || ""
                    ).slice(0, 10) ===
                    today
            );

        const preparing =
            orders.filter(
                order =>
                    String(
                        order.status || ""
                    ).toUpperCase() ===
                    "PREPARING"
            );

        const completed =
            orders.filter(
                order =>
                    [
                        "SERVED",
                        "PAID"
                    ].includes(
                        String(
                            order.status || ""
                        ).toUpperCase()
                    )
            );

        const todayRevenue =
            todayOrders
                .filter(
                    order =>
                        String(
                            order.status || ""
                        ).toUpperCase() !==
                        "CANCELLED"
                )
                .reduce(
                    (sum, order) =>
                        sum +
                        Number(
                            order.total || 0
                        ),
                    0
                );

        if ($("todayOrders")) {

            $("todayOrders")
                .textContent =
                todayOrders.length;
        }

        if ($("preparingOrders")) {

            $("preparingOrders")
                .textContent =
                preparing.length;
        }

        if ($("completedOrders")) {

            $("completedOrders")
                .textContent =
                completed.length;
        }

        if ($("todayOrderRevenue")) {

            $("todayOrderRevenue")
                .textContent =
                money(todayRevenue);
        }
    }

    /* =========================================================
       GET ITEM COUNT FOR ORDER
    ========================================================= */

    async function getOrderItemCounts() {

        const orderIds =
            orders
                .map(order => order.id)
                .filter(Boolean);

        if (!orderIds.length) {
            return {};
        }

        const {
            data,
            error
        } = await db
            .from(
                "restaurant_order_items"
            )
            .select(
                "order_id, quantity"
            )
            .eq(
                "hotel_id",
                hotelId
            )
            .in(
                "order_id",
                orderIds
            );

        if (error) {
            console.error(
                "Could not load order item counts:",
                error
            );

            return {};
        }

        const counts = {};

        (data || []).forEach(
            item => {

                const orderId =
                    String(
                        item.order_id
                    );

                counts[orderId] =
                    (
                        counts[orderId] ||
                        0
                    ) +
                    Number(
                        item.quantity || 0
                    );
            }
        );

        return counts;
    }

    /* =========================================================
       RENDER ORDERS
    ========================================================= */

    async function renderOrders() {

        const body =
            $("restOrdersTableBody");

        if (!body) {
            return;
        }

        const filter =
            String(
                $("orderStatusFilter")
                    ?.value || ""
            ).toUpperCase();

        let filteredOrders =
            orders;

        if (filter) {

            filteredOrders =
                orders.filter(
                    order =>
                        String(
                            order.status || ""
                        ).toUpperCase() ===
                        filter
                );
        }

        if (!filteredOrders.length) {

            body.innerHTML = `
                <tr>
                    <td colspan="8">
                        <div class="empty-table">
                            No restaurant orders found.
                        </div>
                    </td>
                </tr>
            `;

            return;
        }

        const itemCounts =
            await getOrderItemCounts();

        body.innerHTML =
            filteredOrders
                .map(
                    order => {

                        const status =
                            String(
                                order.status ||
                                ""
                            ).toUpperCase();

                        const nextStatus =
                            getNextStatus(
                                status
                            );

                        const billed =
                            Boolean(
                                order.billed_invoice_id
                            );

                        let action =
                            `<span class="muted-text">—</span>`;

                        if (nextStatus) {

                            action = `
                                <button
                                    type="button"
                                    class="order-action-btn"
                                    data-next-order-status="${escapeHTML(
                                        order.id
                                    )}"
                                    data-next-status="${escapeHTML(
                                        nextStatus
                                    )}"
                                >
                                    Mark
                                    ${escapeHTML(
                                        nextStatus
                                    )}
                                </button>
                            `;

                        } else if (
                            status === "SERVED" &&
                            !billed
                        ) {

                            action = `
                                <button
                                    type="button"
                                    class="order-action-btn order-cancel-btn"
                                    data-cancel-order="${escapeHTML(
                                        order.id
                                    )}"
                                >
                                    Cancel
                                </button>
                            `;
                        }

                        const billingLabel =
                            billed
                                ? `
                                    <span class="billing-label billed">
                                        Billed
                                        #${escapeHTML(
                                            order.billed_invoice_id
                                        )}
                                    </span>
                                `
                                : `
                                    <span class="billing-label">
                                        Not billed
                                    </span>
                                `;

                        const tableName =
                            order.table_id
                                ? `Table #${order.table_id}`
                                : "Room service";

                        const stayName =
                            order.stay?.stay_number ||
                            order.stay_id ||
                            "—";

                        return `
                            <tr>

                                <td>
                                    <span class="order-number">
                                        ${escapeHTML(
                                            order.order_number ||
                                            order.id
                                        )}
                                    </span>
                                </td>

                                <td>
                                    <span class="guest-name">
                                        ${escapeHTML(
                                            getGuestName(
                                                order.guest
                                            )
                                        )}
                                    </span>
                                </td>

                                <td>
                                    <strong>
                                        ${escapeHTML(
                                            tableName
                                        )}
                                    </strong>

                                    <span class="muted-text">
                                        ${escapeHTML(
                                            stayName
                                        )}
                                    </span>
                                </td>

                                <td>
                                    ${escapeHTML(
                                        itemCounts[
                                            String(
                                                order.id
                                            )
                                        ] || 0
                                    )}
                                    item(s)
                                </td>

                                <td>
                                    <strong>
                                        ${money(
                                            order.total
                                        )}
                                    </strong>
                                </td>

                                <td>
                                    <span
                                        class="order-status order-status-${escapeHTML(
                                            status.toLowerCase()
                                        )}"
                                    >
                                        ${escapeHTML(
                                            status
                                        )}
                                    </span>
                                </td>

                                <td>
                                    ${billingLabel}
                                </td>

                                <td>
                                    ${action}
                                </td>

                            </tr>
                        `;
                    }
                )
                .join("");
    }

    /* =========================================================
       CLEAR ORDER FORM
    ========================================================= */

    function clearOrderForm() {

        $("restOrderForm")?.reset();

        cart = [];

        if ($("restOrderQuantity")) {
            $("restOrderQuantity")
                .value = "1";
        }

        showMessage("");

        renderCart();
    }

    /* =========================================================
       CREATE RESTAURANT ORDER
    ========================================================= */

    async function createOrder(event) {

        event.preventDefault();

        showMessage("");

        const button =
            $("restSaveOrder");

        const stayId =
            $("restOrderStay")
                ?.value;

        const tableId =
            $("restOrderTable")
                ?.value ||
            null;

        const notes =
            $("restOrderNotes")
                ?.value
                .trim() ||
            null;

        if (!stayId) {

            showMessage(
                "Please select an active hotel stay.",
                true
            );

            return;
        }

        if (!cart.length) {

            showMessage(
                "Please add at least one food item.",
                true
            );

            return;
        }

        /* ---------------------------------------------
           Verify stay
        ---------------------------------------------- */

        const {
            data: verifiedStay,
            error: stayError
        } = await db
            .from("stays")
            .select(`
                id,
                hotel_id,
                guest_id,
                status
            `)
            .eq(
                "id",
                stayId
            )
            .eq(
                "hotel_id",
                hotelId
            )
            .eq(
                "status",
                "ACTIVE"
            )
            .maybeSingle();

        if (stayError) {

            showMessage(
                stayError.message,
                true
            );

            return;
        }

        if (!verifiedStay) {

            showMessage(
                "This hotel stay is no longer active.",
                true
            );

            await loadStays();

            return;
        }

        /* ---------------------------------------------
           Calculate totals
        ---------------------------------------------- */

        const {
            subtotal,
            tax,
            total
        } = getTotals();

        setButtonLoading(
            button,
            true,
            "Saving..."
        );

        let createdOrderId =
            null;

        try {

            /* -----------------------------------------
               Order number
            ------------------------------------------ */

            const orderNumber =
                "RO-" +
                Date.now().toString() +
                "-" +
                Math.random()
                    .toString(36)
                    .slice(2, 6)
                    .toUpperCase();

            /* -----------------------------------------
               Order payload
            ------------------------------------------ */

            const orderPayload = {

                hotel_id:
                    hotelId,

                order_number:
                    orderNumber,

                stay_id:
                    stayId,

                guest_id:
                    verifiedStay.guest_id,

                status:
                    "OPEN",

                subtotal,

                tax,

                discount:
                    0,

                total,

                notes
            };

            if (tableId) {

                orderPayload.table_id =
                    tableId;
            }

            /* -----------------------------------------
               Insert order
            ------------------------------------------ */

            const {
                data: createdOrder,
                error: orderError
            } = await db
                .from(
                    "restaurant_orders"
                )
                .insert(
                    orderPayload
                )
                .select()
                .single();

            if (orderError) {
                throw orderError;
            }

            createdOrderId =
                createdOrder.id;

            /* -----------------------------------------
               Insert items
            ------------------------------------------ */

            const itemRows =
                cart.map(
                    item => ({

                        hotel_id:
                            hotelId,

                        order_id:
                            createdOrder.id,

                        menu_item_id:
                            item.menu_item_id,

                        item_name:
                            item.item_name,

                        quantity:
                            item.quantity,

                        unit_price:
                            item.unit_price,

                        total:
                            roundMoney(
                                Number(
                                    item.quantity
                                ) *
                                Number(
                                    item.unit_price
                                )
                            ),

                        notes:
                            null
                    })
                );

            const {
                error: itemsError
            } = await db
                .from(
                    "restaurant_order_items"
                )
                .insert(
                    itemRows
                );

            /* -----------------------------------------
               Cleanup if items fail
            ------------------------------------------ */

            if (itemsError) {

                const {
                    error:
                        cleanupError
                } = await db
                    .from(
                        "restaurant_orders"
                    )
                    .delete()
                    .eq(
                        "id",
                        createdOrder.id
                    )
                    .eq(
                        "hotel_id",
                        hotelId
                    );

                if (cleanupError) {

                    console.error(
                        "❌ Order cleanup failed:",
                        cleanupError
                    );
                }

                throw itemsError;
            }

            /* -----------------------------------------
               Success
            ------------------------------------------ */

            cart = [];

            renderCart();

            $("restOrderForm")
                ?.reset();

            if ($("restOrderQuantity")) {

                $("restOrderQuantity")
                    .value = "1";
            }

            showMessage(
                `Restaurant order ${orderNumber} saved successfully.`
            );

            await Promise.all([
                loadOrders(),
                loadStays()
            ]);

        } catch (error) {

            console.error(
                "❌ Create restaurant order failed:",
                error
            );

            showMessage(
                error?.message ||
                "Could not save the restaurant order.",
                true
            );

            if (createdOrderId) {

                console.error(
                    "Order ID to investigate:",
                    createdOrderId
                );
            }

        } finally {

            setButtonLoading(
                button,
                false
            );
        }
    }

    /* =========================================================
       UPDATE ORDER STATUS
    ========================================================= */

    async function updateOrderStatus(
        button
    ) {

        if (!button) {
            return;
        }

        const orderId =
            button.dataset
                .nextOrderStatus;

        const nextStatus =
            String(
                button.dataset
                    .nextStatus ||
                ""
            ).toUpperCase();

        if (!orderId) {
            return;
        }

        if (
            !ORDER_STATUSES.includes(
                nextStatus
            )
        ) {

            alert(
                "Invalid order status."
            );

            return;
        }

        const order =
            orders.find(
                entry =>
                    String(
                        entry.id
                    ) ===
                    String(
                        orderId
                    )
            );

        if (!order) {

            alert(
                "Restaurant order not found. Refresh the page."
            );

            return;
        }

        const currentStatus =
            String(
                order.status || ""
            ).toUpperCase();

        const expectedNext =
            getNextStatus(
                currentStatus
            );

        if (
            expectedNext !==
            nextStatus
        ) {

            alert(
                "This order status has changed. Please refresh the orders."
            );

            return;
        }

        button.disabled = true;

        try {

            const {
                error
            } = await db
                .from(
                    "restaurant_orders"
                )
                .update({
                    status:
                        nextStatus,

                    updated_at:
                        new Date()
                            .toISOString()
                })
                .eq(
                    "id",
                    orderId
                )
                .eq(
                    "hotel_id",
                    hotelId
                );

            if (error) {
                throw error;
            }

            await loadOrders();

        } catch (error) {

            console.error(
                "❌ Update order status failed:",
                error
            );

            alert(
                error?.message ||
                "Could not update order status."
            );

        } finally {

            button.disabled =
                false;
        }
    }

    /* =========================================================
       CANCEL ORDER
    ========================================================= */

    async function cancelOrder(
        button
    ) {

        if (!button) {
            return;
        }

        const orderId =
            button.dataset
                .cancelOrder;

        const order =
            orders.find(
                entry =>
                    String(
                        entry.id
                    ) ===
                    String(
                        orderId
                    )
            );

        if (!order) {
            return;
        }

        if (order.billed_invoice_id) {

            alert(
                "This order is already billed and cannot be cancelled here."
            );

            return;
        }

        const status =
            String(
                order.status || ""
            ).toUpperCase();

        if (
            ["CANCELLED", "PAID"]
                .includes(status)
        ) {

            alert(
                "This order can no longer be cancelled."
            );

            return;
        }

        if (
            !confirm(
                "Cancel this restaurant order?"
            )
        ) {
            return;
        }

        button.disabled = true;

        try {

            const {
                error
            } = await db
                .from(
                    "restaurant_orders"
                )
                .update({

                    status:
                        "CANCELLED",

                    updated_at:
                        new Date()
                            .toISOString()
                })
                .eq(
                    "id",
                    orderId
                )
                .eq(
                    "hotel_id",
                    hotelId
                )
                .is(
                    "billed_invoice_id",
                    null
                );

            if (error) {
                throw error;
            }

            await loadOrders();

        } catch (error) {

            console.error(
                "❌ Cancel order failed:",
                error
            );

            alert(
                error?.message ||
                "Could not cancel the order."
            );

        } finally {

            button.disabled =
                false;
        }
    }

    /* =========================================================
       EVENTS
    ========================================================= */

    function wireEvents() {

        setupMobileMenu();

        /* ---------------------------------------------
           New order button
        ---------------------------------------------- */

        $("newOrderBtn")
            ?.addEventListener(
                "click",
                () => {

                    $("orderFormCard")
                        ?.scrollIntoView({
                            behavior: "smooth",
                            block: "start"
                        });

                    setTimeout(() => {

                        $("restOrderStay")
                            ?.focus();

                    }, 400);
                }
            );

        /* ---------------------------------------------
           Add food
        ---------------------------------------------- */

        $("restAddOrderItem")
            ?.addEventListener(
                "click",
                addCartItem
            );

        /* ---------------------------------------------
           Submit
        ---------------------------------------------- */

        $("restOrderForm")
            ?.addEventListener(
                "submit",
                createOrder
            );

        /* ---------------------------------------------
           Clear
        ---------------------------------------------- */

        $("clearOrderBtn")
            ?.addEventListener(
                "click",
                clearOrderForm
            );

        /* ---------------------------------------------
           Remove cart item
        ---------------------------------------------- */

        $("restOrderItems")
            ?.addEventListener(
                "click",
                event => {

                    const button =
                        event.target.closest(
                            "[data-remove-cart-item]"
                        );

                    if (!button) {
                        return;
                    }

                    const index =
                        Number(
                            button.dataset
                                .removeCartItem
                        );

                    if (
                        Number.isInteger(
                            index
                        ) &&
                        index >= 0 &&
                        index < cart.length
                    ) {

                        cart.splice(
                            index,
                            1
                        );

                        renderCart();

                        showMessage("");
                    }
                }
            );

        /* ---------------------------------------------
           Order status / cancel
        ---------------------------------------------- */

        $("restOrdersTableBody")
            ?.addEventListener(
                "click",
                event => {

                    const statusButton =
                        event.target.closest(
                            "[data-next-order-status]"
                        );

                    if (statusButton) {

                        updateOrderStatus(
                            statusButton
                        );

                        return;
                    }

                    const cancelButton =
                        event.target.closest(
                            "[data-cancel-order]"
                        );

                    if (cancelButton) {

                        cancelOrder(
                            cancelButton
                        );
                    }
                }
            );

        /* ---------------------------------------------
           Status filter
        ---------------------------------------------- */

        $("orderStatusFilter")
            ?.addEventListener(
                "change",
                () => {

                    renderOrders();
                }
            );

        /* ---------------------------------------------
           Refresh
        ---------------------------------------------- */

        $("ordersRefresh")
            ?.addEventListener(
                "click",
                async () => {

                    const button =
                        $("ordersRefresh");

                    if (button) {
                        button.disabled =
                            true;

                        button.textContent =
                            "Refreshing...";
                    }

                    try {

                        await Promise.all([
                            loadOrders(),
                            loadStays(),
                            loadTables(),
                            loadMenuItems()
                        ]);

                        showMessage(
                            "Orders refreshed successfully."
                        );

                    } catch (error) {

                        console.error(
                            "❌ Refresh failed:",
                            error
                        );

                        showMessage(
                            error?.message ||
                            "Could not refresh orders.",
                            true
                        );

                    } finally {

                        if (button) {

                            button.disabled =
                                false;

                            button.textContent =
                                "↻ Refresh";
                        }
                    }
                }
            );
    }

    /* =========================================================
       AUTH STATE
    ========================================================= */

    function setupAuthListener() {

        db.auth.onAuthStateChange(
            (event) => {

                if (
                    event ===
                    "SIGNED_OUT"
                ) {

                    window.location.href =
                        "login.html";
                }
            }
        );
    }

    /* =========================================================
       INITIALIZE
    ========================================================= */

    async function init() {

        try {

            hotelId =
                await getHotelProfile();

            wireEvents();

            setupAuthListener();

            renderCart();

            await Promise.all([
                loadStays(),
                loadTables(),
                loadMenuItems(),
                loadOrders()
            ]);

            console.log(
                "✅ Restaurant Orders loaded successfully."
            );

        } catch (error) {

            console.error(
                "❌ Orders initialization failed:",
                error
            );

            showMessage(
                error?.message ||
                "Could not load restaurant orders.",
                true
            );

            const tableBody =
                $("restOrdersTableBody");

            if (tableBody) {

                tableBody.innerHTML = `
                    <tr>
                        <td colspan="8">
                            <div class="empty-table">
                                ${escapeHTML(
                                    error?.message ||
                                    "Could not load restaurant orders."
                                )}
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
    }

    init();
});