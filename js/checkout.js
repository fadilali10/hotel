/* =========================================================
   STAR HOTELS
   BILLING & CHECKOUT MODULE

   File:
   js/checkout.js

   Supports:
   - Active stay selection
   - Room charges
   - Restaurant charges
   - Extra charges
   - Discount
   - Payment
   - Invoice creation
   - Invoice items
   - Restaurant order billing
   - Guest checkout
   - Booking checkout
   - Room status update
   - Invoice preview
   - Invoice printing
   - Billing history
   ========================================================= */


document.addEventListener("DOMContentLoaded", async () => {

    "use strict";


    console.log("==========================================");
    console.log("STAR HOTELS - BILLING & CHECKOUT");
    console.log("==========================================");


    // =====================================================
    // SUPABASE
    // =====================================================

    const db = window.supabaseClient;


    if (!db) {

        console.error(
            "❌ Supabase client is unavailable."
        );

        return;
    }


    console.log("✓ Supabase client available");


    // =====================================================
    // HELPERS
    // =====================================================

    const $ = (id) => document.getElementById(id);


    const staySelect = $("checkoutStaySelect");
    const checkoutDate = $("checkoutDate");
    const discountInput = $("checkoutDiscount");
    const paymentInput = $("checkoutPaymentAmount");
    const paymentMethod = $("checkoutPaymentMethod");
    const paymentReference = $("checkoutPaymentReference");
    const paymentNotes = $("checkoutPaymentNotes");
    const message = $("checkoutMessage");
    const preview = $("checkoutInvoicePreview");


    // =====================================================
    // STATE
    // =====================================================

    let hotelId = null;

    let currentUser = null;

    let stays = [];

    let selectedStay = null;

    let currentBill = null;

    let currentInvoice = null;

    let billingInvoices = [];

    let generating = false;


    // =====================================================
    // MONEY
    // =====================================================

    function money(value) {

        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: "INR"
            }
        ).format(Number(value) || 0);
    }


    function round2(value) {

        return Math.round(
            (Number(value) + Number.EPSILON) * 100
        ) / 100;
    }


    // =====================================================
    // ESCAPE HTML
    // =====================================================

    function escapeHtml(value) {

        return String(value ?? "").replace(
            /[&<>"']/g,
            (char) => ({

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"

            })[char]
        );
    }


    // =====================================================
    // TODAY
    // =====================================================

    function today() {

        const date = new Date();

        date.setMinutes(
            date.getMinutes() -
            date.getTimezoneOffset()
        );

        return date.toISOString().slice(0, 10);
    }


    // =====================================================
    // DATE ONLY
    // =====================================================

    function dateOnly(value) {

        return value
            ? String(value).slice(0, 10)
            : "";
    }


    // =====================================================
    // FORMAT DATE
    // =====================================================

    function formatDate(value) {

        const date = dateOnly(value);

        if (!date) {
            return "—";
        }

        const parts = date.split("-");

        if (parts.length !== 3) {
            return date;
        }

        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }


    // =====================================================
    // MESSAGE
    // =====================================================

    function showMessage(
        text,
        isError = false
    ) {

        if (!message) {
            return;
        }

        message.textContent = text || "";

        message.style.color = isError
            ? "#b42318"
            : "#167647";
    }


    // =====================================================
    // BUTTON BUSY
    // =====================================================

    function setBusy(
        button,
        busy,
        busyText = "Please wait..."
    ) {

        if (!button) {
            return;
        }

        if (busy) {

            button.dataset.oldText =
                button.textContent;

            button.disabled = true;

            button.textContent =
                busyText;

        } else {

            button.disabled = false;

            button.textContent =
                button.dataset.oldText ||
                button.textContent;
        }
    }


    // =====================================================
    // NIGHTS
    // =====================================================

    function numberOfNights(
        start,
        end
    ) {

        const startDate = dateOnly(start);
        const endDate = dateOnly(end);


        const startTime = Date.parse(
            `${startDate}T00:00:00`
        );


        const endTime = Date.parse(
            `${endDate}T00:00:00`
        );


        if (
            !Number.isFinite(startTime) ||
            !Number.isFinite(endTime)
        ) {

            throw new Error(
                "Invalid check-in or checkout date."
            );
        }


        if (endTime < startTime) {

            throw new Error(
                "Checkout date cannot be before check-in."
            );
        }


        return Math.max(
            1,
            Math.ceil(
                (endTime - startTime) /
                86400000
            )
        );
    }


    // =====================================================
    // GET HOTEL
    // =====================================================

    async function getHotel() {

        const {
            data,
            error
        } = await db.auth.getUser();


        if (error) {
            throw error;
        }


        if (!data?.user) {

            throw new Error(
                "Please log in to use Billing."
            );
        }


        currentUser = data.user;


        const {
            data: profile,
            error: profileError
        } = await db
            .from("profiles")
            .select(`
                hotel_id,
                full_name
            `)
            .eq(
                "id",
                currentUser.id
            )
            .single();


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
            currentUser.email?.split("@")[0] ||
            "User";


        const topUserName =
            $("topUserName");


        if (topUserName) {
            topUserName.textContent = userName;
        }


        return profile.hotel_id;
    }


    // =====================================================
    // LOAD ACTIVE STAYS
    // =====================================================

    async function loadActiveStays() {

        const {
            data,
            error
        } = await db
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
                status,
                adults,
                children
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
                "actual_check_in",
                {
                    ascending: false
                }
            );


        if (error) {
            throw error;
        }


        const rows = data || [];


        const guestIds = [
            ...new Set(
                rows
                    .map(
                        stay => stay.guest_id
                    )
                    .filter(Boolean)
            )
        ];


        const roomIds = [
            ...new Set(
                rows
                    .map(
                        stay => stay.room_id
                    )
                    .filter(Boolean)
            )
        ];


        let guests = [];
        let rooms = [];


        // =================================================
        // GUESTS
        // =================================================

        if (guestIds.length) {

            const result =
                await db
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


            if (result.error) {
                throw result.error;
            }


            guests = result.data || [];
        }


        // =================================================
        // ROOMS
        // =================================================

        if (roomIds.length) {

            const result =
                await db
                    .from("rooms")
                    .select(`
                        id,
                        room_number,
                        price,
                        room_type_id
                    `)
                    .eq(
                        "hotel_id",
                        hotelId
                    )
                    .in(
                        "id",
                        roomIds
                    );


            if (result.error) {
                throw result.error;
            }


            rooms = result.data || [];
        }


        // =================================================
        // COMBINE
        // =================================================

        stays = rows.map((stay) => {

            const guest =
                guests.find(
                    item =>
                        String(item.id) ===
                        String(stay.guest_id)
                );


            const room =
                rooms.find(
                    item =>
                        String(item.id) ===
                        String(stay.room_id)
                );


            const guestName =
                guest?.full_name ||
                [
                    guest?.first_name,
                    guest?.last_name
                ]
                    .filter(Boolean)
                    .join(" ") ||
                "Guest";


            return {

                ...stay,

                guestName,

                roomNumber:
                    room?.room_number ||
                    "—",

                roomPrice:
                    Number(room?.price) || 0
            };
        });


        // =================================================
        // SELECT
        // =================================================

        staySelect.innerHTML =
            `<option value="">
                Select an active stay
            </option>`;


        stays.forEach((stay) => {

            const option =
                document.createElement("option");


            option.value = stay.id;


            option.textContent =
                `${stay.stay_number || `Stay #${stay.id}`} — ` +
                `${stay.guestName} — ` +
                `Room ${stay.roomNumber}`;


            staySelect.appendChild(option);
        });


        console.log(
            `✓ Loaded ${stays.length} active stay(s)`
        );
    }


    // =====================================================
    // LOAD RESTAURANT ORDERS
    // =====================================================

    async function loadRestaurantOrders(stayId) {

        const {
            data,
            error
        } = await db
            .from("restaurant_orders")
            .select(`
                id,
                order_number,
                subtotal,
                tax,
                discount,
                total,
                status,
                billed_invoice_id,
                created_at
            `)
            .eq(
                "hotel_id",
                hotelId
            )
            .eq(
                "stay_id",
                stayId
            )
            .eq(
                "status",
                "SERVED"
            )
            .is(
                "billed_invoice_id",
                null
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


        if (error) {
            throw error;
        }


        const orders = data || [];


        if (!orders.length) {
            return [];
        }


        const orderIds =
            orders.map(
                order => order.id
            );


        const {
            data: itemRows,
            error: itemsError
        } = await db
            .from("restaurant_order_items")
            .select(`
                id,
                order_id,
                item_name,
                quantity,
                unit_price,
                total
            `)
            .eq(
                "hotel_id",
                hotelId
            )
            .in(
                "order_id",
                orderIds
            );


        if (itemsError) {
            throw itemsError;
        }


        const itemsByOrder = new Map();


        for (const item of itemRows || []) {

            const key =
                String(item.order_id);


            const list =
                itemsByOrder.get(key) || [];


            list.push(item);

            itemsByOrder.set(
                key,
                list
            );
        }


        return orders.map((order) => ({

            ...order,

            items:
                itemsByOrder.get(
                    String(order.id)
                ) || []

        }));
    }


    // =====================================================
    // LOAD EXTRA CHARGES
    // =====================================================

    async function loadExtraCharges(stayId) {

        const {
            data,
            error
        } = await db
            .from("charges")
            .select(`
                id,
                description,
                category,
                quantity,
                unit_price,
                total
            `)
            .eq(
                "hotel_id",
                hotelId
            )
            .eq(
                "stay_id",
                stayId
            );


        if (error) {

            if (
                error.code === "42P01" ||
                error.code === "PGRST205"
            ) {

                console.warn(
                    "Charges table unavailable. Continuing without extra charges."
                );

                return [];
            }


            throw error;
        }


        return data || [];
    }


    // =====================================================
    // GET BILL
    // =====================================================

    async function getBill(
        stay,
        endDate
    ) {

        if (!stay.actual_check_in) {

            throw new Error(
                "This stay has no recorded check-in date."
            );
        }


        const startDate =
            dateOnly(
                stay.actual_check_in
            );


        if (
            !endDate ||
            endDate < startDate
        ) {

            throw new Error(
                "Checkout date must be on or after check-in."
            );
        }


        // =================================================
        // DUPLICATE INVOICE CHECK
        // =================================================

        const {
            data: existing,
            error: invoiceError
        } = await db
            .from("invoices")
            .select(`
                id,
                invoice_number,
                status
            `)
            .eq(
                "hotel_id",
                hotelId
            )
            .eq(
                "stay_id",
                stay.id
            )
            .limit(1);


        if (invoiceError) {
            throw invoiceError;
        }


        if (existing?.length) {

            throw new Error(
                `Invoice ${
                    existing[0].invoice_number ||
                    existing[0].id
                } already exists for this stay.`
            );
        }


        // =================================================
        // ROOM
        // =================================================

        const nights =
            numberOfNights(
                startDate,
                endDate
            );


        const roomTotal =
            round2(
                nights *
                stay.roomPrice
            );


        // =================================================
        // OTHER CHARGES
        // =================================================

        const [
            orders,
            charges
        ] = await Promise.all([

            loadRestaurantOrders(stay.id),

            loadExtraCharges(stay.id)

        ]);


        const restaurantTotal =
            round2(
                orders.reduce(
                    (sum, order) =>
                        sum +
                        Number(order.total || 0),
                    0
                )
            );


        const extraTotal =
            round2(
                charges.reduce(
                    (sum, charge) =>
                        sum +
                        Number(charge.total || 0),
                    0
                )
            );


        const subtotal =
            round2(
                roomTotal +
                restaurantTotal +
                extraTotal
            );


        // =================================================
        // DISCOUNT
        // =================================================

        const discount =
            round2(
                Math.max(
                    0,
                    Number(
                        discountInput.value
                    ) || 0
                )
            );


        if (discount > subtotal) {

            throw new Error(
                "Discount cannot exceed the bill subtotal."
            );
        }


        // =================================================
        // TAX
        // =================================================

        /*
         * Current billing logic does not add another
         * invoice-level tax because restaurant totals
         * may already contain tax.
         */

        const tax = 0;


        const total =
            round2(
                subtotal +
                tax -
                discount
            );


        // =================================================
        // INVOICE ITEMS
        // =================================================

        const items = [

            {

                description:
                    `Room ${stay.roomNumber} — ${nights} night(s)`,

                item_type:
                    "ROOM",

                quantity:
                    nights,

                unit_price:
                    stay.roomPrice,

                total:
                    roomTotal
            }

        ];


        // =================================================
        // RESTAURANT ITEMS
        // =================================================

        for (const order of orders) {

            if (order.items.length) {

                for (const item of order.items) {

                    items.push({

                        description:
                            `Restaurant ${
                                order.order_number ||
                                `#${order.id}`
                            } — ${item.item_name}`,

                        item_type:
                            "RESTAURANT",

                        source_order_id:
                            order.id,

                        quantity:
                            Number(item.quantity || 1),

                        unit_price:
                            Number(item.unit_price || 0),

                        total:
                            Number(item.total || 0)

                    });
                }

            } else {

                items.push({

                    description:
                        `Restaurant order ${
                            order.order_number ||
                            order.id
                        }`,

                    item_type:
                        "RESTAURANT",

                    source_order_id:
                        order.id,

                    quantity:
                        1,

                    unit_price:
                        Number(order.total || 0),

                    total:
                        Number(order.total || 0)

                });
            }
        }


        // =================================================
        // EXTRA CHARGES
        // =================================================

        for (const charge of charges) {

            items.push({

                description:
                    charge.description ||
                    "Additional charge",

                item_type:
                    charge.category ||
                    "OTHER",

                source_charge_id:
                    charge.id,

                quantity:
                    Number(
                        charge.quantity || 1
                    ),

                unit_price:
                    Number(
                        charge.unit_price || 0
                    ),

                total:
                    Number(
                        charge.total || 0
                    )

            });
        }


        // =================================================
        // DISCOUNT ITEM
        // =================================================

        if (discount > 0) {

            items.push({

                description:
                    "Discount",

                item_type:
                    "DISCOUNT",

                quantity:
                    1,

                unit_price:
                    -discount,

                total:
                    -discount

            });
        }


        return {

            nights,

            roomTotal,

            restaurantTotal,

            extraTotal,

            subtotal,

            tax,

            discount,

            total,

            orders,

            charges,

            items
        };
    }


    // =====================================================
    // RENDER GUEST DETAILS
    // =====================================================

    function renderGuestDetails(stay) {

        const container =
            $("checkoutGuestDetails");


        if (!container) {
            return;
        }


        container.innerHTML = `

            <div class="detail-box">

                <span>
                    Guest
                </span>

                <strong>
                    ${escapeHtml(
                        stay.guestName
                    )}
                </strong>

            </div>


            <div class="detail-box">

                <span>
                    Room
                </span>

                <strong>
                    ${escapeHtml(
                        stay.roomNumber
                    )}
                </strong>

            </div>


            <div class="detail-box">

                <span>
                    Check-in
                </span>

                <strong>
                    ${escapeHtml(
                        formatDate(
                            stay.actual_check_in
                        )
                    )}
                </strong>

            </div>

        `;
    }


    // =====================================================
    // RENDER TOTALS
    // =====================================================

    function renderTotals(bill) {

        const roomTotal =
            $("checkoutRoomTotal");


        if (roomTotal) {

            roomTotal.textContent =
                money(bill.roomTotal);
        }


        const restaurantTotal =
            $("checkoutRestaurantTotal");


        if (restaurantTotal) {

            restaurantTotal.textContent =
                money(
                    bill.restaurantTotal
                );
        }


        const extraTotal =
            $("checkoutExtraTotal");


        if (extraTotal) {

            extraTotal.textContent =
                money(
                    bill.extraTotal
                );
        }


        const discountTotal =
            $("checkoutDiscountTotal");


        if (discountTotal) {

            discountTotal.textContent =
                `− ${money(
                    bill.discount
                )}`;
        }


        const taxTotal =
            $("checkoutTaxTotal");


        if (taxTotal) {

            taxTotal.textContent =
                money(bill.tax);
        }


        const grandTotal =
            $("checkoutGrandTotal");


        if (grandTotal) {

            grandTotal.textContent =
                money(bill.total);
        }


        const balanceDue =
            $("checkoutBalanceDue");


        if (balanceDue) {

            const payment =
                Math.max(
                    0,
                    Number(
                        paymentInput.value
                    ) || 0
                );


            balanceDue.textContent =
                money(
                    Math.max(
                        0,
                        Number(bill.total) -
                        payment
                    )
                );
        }
    }


    // =====================================================
    // CLEAR SCREEN
    // =====================================================

    function clearBillingScreen() {

        selectedStay = null;

        currentBill = null;

        currentInvoice = null;


        if (preview) {

            preview.innerHTML = `

                <div class="preview-placeholder">

                    Select an active stay,
                    calculate the bill,
                    and generate the invoice.

                </div>

            `;
        }


        renderTotals({

            roomTotal: 0,

            restaurantTotal: 0,

            extraTotal: 0,

            discount: 0,

            tax: 0,

            total: 0

        });


        const guestDetails =
            $("checkoutGuestDetails");


        if (guestDetails) {

            guestDetails.innerHTML = `

                <div class="detail-box">

                    <span>
                        Guest
                    </span>

                    <strong>
                        Select a stay
                    </strong>

                </div>


                <div class="detail-box">

                    <span>
                        Room
                    </span>

                    <strong>
                        —
                    </strong>

                </div>


                <div class="detail-box">

                    <span>
                        Check-in
                    </span>

                    <strong>
                        —
                    </strong>

                </div>

            `;
        }
    }


    // =====================================================
    // REFRESH BILL
    // =====================================================

    async function refreshBill() {

        currentBill = null;

        currentInvoice = null;


        if (preview) {

            preview.innerHTML = `

                <div class="preview-placeholder">

                    Calculate the bill to continue.

                </div>

            `;
        }


        const stayId =
            staySelect.value;


        if (!stayId) {

            clearBillingScreen();

            return;
        }


        selectedStay =
            stays.find(
                stay =>
                    String(stay.id) ===
                    String(stayId)
            );


        if (!selectedStay) {

            throw new Error(
                "Selected stay could not be found. Refresh the page."
            );
        }


        renderGuestDetails(
            selectedStay
        );


        currentBill =
            await getBill(
                selectedStay,
                checkoutDate.value
            );


        renderTotals(
            currentBill
        );


        showMessage(
            `Bill calculated successfully. ${
                currentBill.nights
            } night(s), ${
                currentBill.orders.length
            } restaurant order(s).`
        );
    }


    // =====================================================
    // GENERATE INVOICE
    // =====================================================

    async function generateInvoice() {

        if (generating) {
            return;
        }


        if (
            !selectedStay ||
            !currentBill
        ) {

            throw new Error(
                "Select a stay and calculate the bill first."
            );
        }


        generating = true;


        const button =
            $("generateCheckoutInvoiceButton");


        setBusy(
            button,
            true,
            "Generating invoice..."
        );


        let createdInvoiceId = null;


        try {

            // =================================================
            // DUPLICATE CHECK
            // =================================================

            const {
                data: existing,
                error: checkError
            } = await db
                .from("invoices")
                .select(`
                    id,
                    invoice_number
                `)
                .eq(
                    "hotel_id",
                    hotelId
                )
                .eq(
                    "stay_id",
                    selectedStay.id
                )
                .limit(1);


            if (checkError) {
                throw checkError;
            }


            if (existing?.length) {

                throw new Error(
                    `An invoice already exists for this stay: ${
                        existing[0].invoice_number ||
                        existing[0].id
                    }`
                );
            }


            // =================================================
            // PAYMENT
            // =================================================

            const payment =
                round2(
                    Math.max(
                        0,
                        Number(
                            paymentInput.value
                        ) || 0
                    )
                );


            if (
                payment >
                currentBill.total
            ) {

                throw new Error(
                    "Payment cannot exceed the invoice total."
                );
            }


            // =================================================
            // STATUS
            // =================================================

            const status =
                payment >= currentBill.total
                    ? "PAID"
                    : payment > 0
                        ? "PARTIAL"
                        : "UNPAID";


            // =================================================
            // INVOICE NUMBER
            // =================================================

            const invoiceNumber =
                `INV-${today().replaceAll("-", "")}-${selectedStay.id}`;


            // =================================================
            // CREATE INVOICE
            // =================================================

            const {
                data: invoice,
                error: invoiceError
            } = await db
                .from("invoices")
                .insert({

                    hotel_id:
                        hotelId,

                    stay_id:
                        selectedStay.id,

                    invoice_number:
                        invoiceNumber,

                    subtotal:
                        currentBill.subtotal,

                    tax:
                        currentBill.tax,

                    discount:
                        currentBill.discount,

                    total:
                        currentBill.total,

                    amount_paid:
                        payment,

                    balance_due:
                        round2(
                            currentBill.total -
                            payment
                        ),

                    status:
                        status

                })
                .select()
                .single();


            if (invoiceError) {
                throw invoiceError;
            }


            createdInvoiceId =
                invoice.id;


            console.log(
                "✓ Invoice created:",
                invoice.invoice_number
            );


            // =================================================
            // INVOICE ITEMS
            // =================================================

            const itemRows =
                currentBill.items.map(
                    item => ({

                        hotel_id:
                            hotelId,

                        invoice_id:
                            invoice.id,

                        description:
                            item.description,

                        quantity:
                            item.quantity,

                        unit_price:
                            item.unit_price,

                        total:
                            item.total,

                        item_type:
                            item.item_type,

                        ...(item.source_order_id
                            ? {
                                source_order_id:
                                    item.source_order_id
                            }
                            : {}),

                        ...(item.source_charge_id
                            ? {
                                source_charge_id:
                                    item.source_charge_id
                            }
                            : {})

                    })
                );


            const {
                error: itemError
            } = await db
                .from("invoice_items")
                .insert(itemRows);


            if (itemError) {

                await cleanupInvoice(
                    invoice.id
                );

                throw new Error(
                    `Could not save invoice items: ${
                        itemError.message
                    }`
                );
            }


            console.log(
                "✓ Invoice items saved"
            );


            // =================================================
            // PAYMENT
            // =================================================

            if (payment > 0) {

                const paymentData = {

                    hotel_id:
                        hotelId,

                    invoice_id:
                        invoice.id,

                    amount:
                        payment,

                    payment_method:
                        paymentMethod.value ||
                        "CASH",

                    reference_number:
                        paymentReference.value.trim() ||
                        null,

                    notes:
                        paymentNotes.value.trim() ||
                        null
                };


                const {
                    error: paymentError
                } = await db
                    .from("payments")
                    .insert(paymentData);


                if (paymentError) {

                    await cleanupInvoice(
                        invoice.id
                    );

                    throw new Error(
                        `Payment recording failed: ${
                            paymentError.message
                        }`
                    );
                }


                console.log(
                    "✓ Payment recorded"
                );
            }


            // =================================================
            // RESTAURANT ORDERS
            // =================================================

            if (
                currentBill.orders.length
            ) {

                const orderIds =
                    currentBill.orders.map(
                        order => order.id
                    );


                const {
                    data: updatedOrders,
                    error: orderUpdateError
                } = await db
                    .from("restaurant_orders")
                    .update({

                        billed_invoice_id:
                            invoice.id,

                        billed_at:
                            new Date().toISOString()

                    })
                    .eq(
                        "hotel_id",
                        hotelId
                    )
                    .in(
                        "id",
                        orderIds
                    )
                    .is(
                        "billed_invoice_id",
                        null
                    )
                    .select("id");


                if (orderUpdateError) {

                    await cleanupInvoice(
                        invoice.id
                    );

                    throw new Error(
                        `Restaurant orders could not be marked as billed: ${
                            orderUpdateError.message
                        }`
                    );
                }


                if (
                    (updatedOrders || []).length !==
                    orderIds.length
                ) {

                    await cleanupInvoice(
                        invoice.id
                    );

                    throw new Error(
                        "One or more restaurant orders were already billed or changed. The invoice was rolled back."
                    );
                }


                console.log(
                    "✓ Restaurant orders marked as billed"
                );
            }


            // =================================================
            // SAVE
            // =================================================

            currentInvoice =
                invoice;


            // =================================================
            // PREVIEW
            // =================================================

            renderInvoicePreview(
                invoice,
                itemRows
            );


            // =================================================
            // REFRESH BILLING HISTORY
            // =================================================

            await loadBillingInvoices();


            showMessage(
                `Invoice ${invoice.invoice_number} created successfully.`
            );


            console.log(
                "✓ Invoice generation completed"
            );

        } catch (error) {

            console.error(
                "Invoice generation error:",
                error
            );


            if (
                createdInvoiceId &&
                error
            ) {

                /*
                 * cleanupInvoice() has already been called
                 * in the relevant failure branches.
                 */
            }


            throw error;

        } finally {

            generating = false;

            setBusy(
                button,
                false
            );
        }
    }


    // =====================================================
    // CLEANUP INVOICE
    // =====================================================

    async function cleanupInvoice(invoiceId) {

        try {

            await db
                .from("payments")
                .delete()
                .eq(
                    "hotel_id",
                    hotelId
                )
                .eq(
                    "invoice_id",
                    invoiceId
                );


            await db
                .from("invoice_items")
                .delete()
                .eq(
                    "hotel_id",
                    hotelId
                )
                .eq(
                    "invoice_id",
                    invoiceId
                );


            await db
                .from("invoices")
                .delete()
                .eq(
                    "hotel_id",
                    hotelId
                )
                .eq(
                    "id",
                    invoiceId
                );

        } catch (error) {

            console.error(
                "Invoice cleanup failed:",
                error
            );
        }
    }


    // =====================================================
    // RENDER INVOICE PREVIEW
    // =====================================================

    function renderInvoicePreview(
        invoice,
        items
    ) {

        if (!preview) {
            return;
        }


        preview.innerHTML = `

            <div class="print-invoice">


                <div class="print-invoice-header">

                    <div>

                        <h2>
                            INVOICE
                        </h2>

                        <div style="margin-top:5px;font-size:9px;color:#777;">
                            Star Hotels
                        </div>

                    </div>


                    <div class="invoice-meta">

                        <div>
                            <strong>
                                Invoice No:
                            </strong>

                            ${escapeHtml(
                                invoice.invoice_number
                            )}
                        </div>

                        <div>
                            <strong>
                                Date:
                            </strong>

                            ${formatDate(
                                invoice.issued_at ||
                                new Date()
                            )}
                        </div>

                    </div>

                </div>


                <div class="invoice-guest">


                    <div class="invoice-info-box">

                        <span>
                            Guest
                        </span>

                        <strong>
                            ${escapeHtml(
                                selectedStay.guestName
                            )}
                        </strong>

                    </div>


                    <div class="invoice-info-box">

                        <span>
                            Stay
                        </span>

                        <strong>
                            ${escapeHtml(
                                selectedStay.stay_number ||
                                selectedStay.id
                            )}
                        </strong>

                    </div>


                    <div class="invoice-info-box">

                        <span>
                            Room
                        </span>

                        <strong>
                            ${escapeHtml(
                                selectedStay.roomNumber
                            )}
                        </strong>

                    </div>

                </div>


                <table>

                    <thead>

                        <tr>

                            <th>
                                Description
                            </th>

                            <th>
                                Qty
                            </th>

                            <th>
                                Rate
                            </th>

                            <th>
                                Total
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${items.map(
                            item => `

                                <tr>

                                    <td>
                                        ${escapeHtml(
                                            item.description
                                        )}
                                    </td>

                                    <td>
                                        ${escapeHtml(
                                            item.quantity
                                        )}
                                    </td>

                                    <td>
                                        ${money(
                                            item.unit_price
                                        )}
                                    </td>

                                    <td>
                                        ${money(
                                            item.total
                                        )}
                                    </td>

                                </tr>

                            `
                        ).join("")}

                    </tbody>

                </table>


                <div class="invoice-totals">

                    <div class="invoice-total-row">

                        <span>
                            Subtotal
                        </span>

                        <strong>
                            ${money(
                                invoice.subtotal
                            )}
                        </strong>

                    </div>


                    <div class="invoice-total-row">

                        <span>
                            Tax
                        </span>

                        <strong>
                            ${money(
                                invoice.tax
                            )}
                        </strong>

                    </div>


                    <div class="invoice-total-row">

                        <span>
                            Discount
                        </span>

                        <strong>
                            − ${money(
                                invoice.discount
                            )}
                        </strong>

                    </div>


                    <div class="invoice-total-row grand">

                        <span>
                            Total
                        </span>

                        <strong>
                            ${money(
                                invoice.total
                            )}
                        </strong>

                    </div>


                    <div class="invoice-total-row">

                        <span>
                            Paid
                        </span>

                        <strong>
                            ${money(
                                invoice.amount_paid
                            )}
                        </strong>

                    </div>


                    <div class="invoice-total-row">

                        <span>
                            Balance Due
                        </span>

                        <strong>
                            ${money(
                                invoice.balance_due
                            )}
                        </strong>

                    </div>

                </div>

            </div>

        `;
    }


    // =====================================================
    // COMPLETE CHECKOUT
    // =====================================================

    async function completeCheckout() {

        if (!selectedStay) {

            throw new Error(
                "Select an active stay first."
            );
        }


        if (!currentInvoice) {

            throw new Error(
                "Generate the invoice before completing checkout."
            );
        }


        // =================================================
        // VERIFY STAY
        // =================================================

        const {
            data: latestStay,
            error: stayError
        } = await db
            .from("stays")
            .select(`
                id,
                booking_id,
                status,
                room_id
            `)
            .eq(
                "hotel_id",
                hotelId
            )
            .eq(
                "id",
                selectedStay.id
            )
            .single();


        if (stayError) {
            throw stayError;
        }


        if (
            latestStay.status !==
            "ACTIVE"
        ) {

            throw new Error(
                "This stay is no longer active."
            );
        }


        const now =
            new Date().toISOString();


        // =================================================
        // UPDATE STAY
        // =================================================

        const {
            data: updatedStay,
            error: updateStayError
        } = await db
            .from("stays")
            .update({

                status:
                    "CHECKED_OUT",

                actual_check_out:
                    now,

                updated_at:
                    now

            })
            .eq(
                "hotel_id",
                hotelId
            )
            .eq(
                "id",
                selectedStay.id
            )
            .eq(
                "status",
                "ACTIVE"
            )
            .select("id")
            .maybeSingle();


        if (updateStayError) {
            throw updateStayError;
        }


        if (!updatedStay) {

            throw new Error(
                "Stay status changed before checkout could complete."
            );
        }


        // =================================================
        // UPDATE BOOKING
        // =================================================

        if (latestStay.booking_id) {

            const {
                error: bookingError
            } = await db
                .from("bookings")
                .update({

                    status:
                        "CHECKED_OUT",

                    updated_at:
                        now

                })
                .eq(
                    "hotel_id",
                    hotelId
                )
                .eq(
                    "id",
                    latestStay.booking_id
                );


            if (bookingError) {

                console.error(
                    "Booking checkout update failed:",
                    bookingError
                );

                showMessage(
                    "Stay was checked out, but the booking status could not be updated.",
                    true
                );
            }
        }


        // =================================================
        // UPDATE ROOM
        // =================================================

        const {
            error: roomError
        } = await db
            .from("rooms")
            .update({

                status:
                    "CLEANING",

                updated_at:
                    now

            })
            .eq(
                "hotel_id",
                hotelId
            )
            .eq(
                "id",
                latestStay.room_id
            );


        if (roomError) {

            showMessage(
                "Stay checked out, but room status could not be updated: " +
                roomError.message,
                true
            );

            return;
        }


        // =================================================
        // SUCCESS
        // =================================================

        showMessage(
            "Checkout completed successfully. Room is now marked CLEANING."
        );


        console.log(
            "✓ Checkout completed:",
            selectedStay.id
        );


        // =================================================
        // REFRESH
        // =================================================

        await loadActiveStays();

        await loadBillingInvoices();


        staySelect.value = "";

        clearBillingScreen();


        paymentInput.value = "0";

        discountInput.value = "0";

        paymentReference.value = "";

        paymentNotes.value = "";
    }


    // =====================================================
    // LOAD BILLING INVOICES
    // =====================================================

    async function loadBillingInvoices() {

        const tbody =
            $("billingTableBody");


        if (!tbody) {
            return;
        }


        tbody.innerHTML = `

            <tr>

                <td colspan="8">

                    <div class="empty-table">
                        Loading billing records...
                    </div>

                </td>

            </tr>

        `;


        const {
            data: invoices,
            error
        } = await db
            .from("invoices")
            .select(`
                id,
                hotel_id,
                stay_id,
                invoice_number,
                subtotal,
                tax,
                discount,
                total,
                amount_paid,
                balance_due,
                status,
                issued_at,
                created_at
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
            )
            .limit(100);


        if (error) {
            throw error;
        }


        const invoiceRows =
            invoices || [];


        if (!invoiceRows.length) {

            billingInvoices = [];

            updateBillingStats([]);

            tbody.innerHTML = `

                <tr>

                    <td colspan="8">

                        <div class="empty-table">
                            No billing records found.
                        </div>

                    </td>

                </tr>

            `;

            return;
        }


        // =================================================
        // STAY IDS
        // =================================================

        const stayIds = [
            ...new Set(
                invoiceRows
                    .map(
                        invoice =>
                            invoice.stay_id
                    )
                    .filter(Boolean)
            )
        ];


        let stayRows = [];


        if (stayIds.length) {

            const result =
                await db
                    .from("stays")
                    .select(`
                        id,
                        stay_number,
                        guest_id,
                        room_id
                    `)
                    .eq(
                        "hotel_id",
                        hotelId
                    )
                    .in(
                        "id",
                        stayIds
                    );


            if (result.error) {
                throw result.error;
            }


            stayRows =
                result.data || [];
        }


        // =================================================
        // GUEST IDS
        // =================================================

        const guestIds = [
            ...new Set(
                stayRows
                    .map(
                        stay =>
                            stay.guest_id
                    )
                    .filter(Boolean)
            )
        ];


        let guestRows = [];


        if (guestIds.length) {

            const result =
                await db
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


            if (result.error) {
                throw result.error;
            }


            guestRows =
                result.data || [];
        }


        // =================================================
        // COMBINE
        // =================================================

        billingInvoices =
            invoiceRows.map(invoice => {

                const stay =
                    stayRows.find(
                        item =>
                            String(item.id) ===
                            String(invoice.stay_id)
                    );


                const guest =
                    guestRows.find(
                        item =>
                            String(item.id) ===
                            String(stay?.guest_id)
                    );


                const guestName =
                    guest?.full_name ||
                    [
                        guest?.first_name,
                        guest?.last_name
                    ]
                        .filter(Boolean)
                        .join(" ") ||
                    "Guest";


                return {

                    ...invoice,

                    stayNumber:
                        stay?.stay_number ||
                        `Stay #${invoice.stay_id}`,

                    guestName

                };
            });


        updateBillingStats(
            billingInvoices
        );


        renderBillingInvoices(
            billingInvoices
        );
    }


    // =====================================================
    // BILLING STATS
    // =====================================================

    function updateBillingStats(
        invoices
    ) {

        const todayDate =
            today();


        const todayInvoices =
            invoices.filter(
                invoice =>
                    dateOnly(
                        invoice.issued_at ||
                        invoice.created_at
                    ) ===
                    todayDate
            );


        const todayRevenue =
            todayInvoices.reduce(
                (sum, invoice) =>
                    sum +
                    Number(
                        invoice.amount_paid || 0
                    ),
                0
            );


        const paidAmount =
            invoices.reduce(
                (sum, invoice) =>
                    sum +
                    Number(
                        invoice.amount_paid || 0
                    ),
                0
            );


        const pendingAmount =
            invoices.reduce(
                (sum, invoice) =>
                    sum +
                    Number(
                        invoice.balance_due || 0
                    ),
                0
            );


        const revenueElement =
            $("todayRevenue");


        if (revenueElement) {

            revenueElement.textContent =
                money(todayRevenue);
        }


        const paidElement =
            $("paidAmount");


        if (paidElement) {

            paidElement.textContent =
                money(paidAmount);
        }


        const pendingElement =
            $("pendingAmount");


        if (pendingElement) {

            pendingElement.textContent =
                money(pendingAmount);
        }


        const countElement =
            $("billingInvoiceCount");


        if (countElement) {

            countElement.textContent =
                invoices.length;
        }
    }


    // =====================================================
    // STATUS BADGE
    // =====================================================

    function statusBadge(status) {

        const value =
            String(
                status || "UNPAID"
            ).toUpperCase();


        let className =
            "status-unpaid";


        if (value === "PAID") {

            className =
                "status-paid";

        } else if (value === "PARTIAL") {

            className =
                "status-partial";

        } else if (value === "CANCELLED") {

            className =
                "status-cancelled";
        }


        return `

            <span class="status-badge ${className}">

                ${escapeHtml(value)}

            </span>

        `;
    }


    // =====================================================
    // RENDER BILLING TABLE
    // =====================================================

    function renderBillingInvoices(
        invoices
    ) {

        const tbody =
            $("billingTableBody");


        if (!tbody) {
            return;
        }


        const searchInput =
            $("billingSearch");


        const search =
            String(
                searchInput?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const filtered =
            invoices.filter(
                invoice => {

                    if (!search) {
                        return true;
                    }


                    return (

                        String(
                            invoice.invoice_number ||
                            ""
                        )
                            .toLowerCase()
                            .includes(search)

                        ||

                        String(
                            invoice.guestName ||
                            ""
                        )
                            .toLowerCase()
                            .includes(search)

                        ||

                        String(
                            invoice.stayNumber ||
                            ""
                        )
                            .toLowerCase()
                            .includes(search)

                        ||

                        String(
                            invoice.status ||
                            ""
                        )
                            .toLowerCase()
                            .includes(search)

                    );
                }
            );


        if (!filtered.length) {

            tbody.innerHTML = `

                <tr>

                    <td colspan="8">

                        <div class="empty-table">
                            No matching billing records.
                        </div>

                    </td>

                </tr>

            `;

            return;
        }


        tbody.innerHTML =
            filtered.map(
                invoice => `

                    <tr>

                        <td>

                            <span class="invoice-number">

                                ${escapeHtml(
                                    invoice.invoice_number ||
                                    `INV-${invoice.id}`
                                )}

                            </span>

                            <span class="sub-text">

                                ${formatDate(
                                    invoice.issued_at ||
                                    invoice.created_at
                                )}

                            </span>

                        </td>


                        <td>

                            <span class="guest-name">

                                ${escapeHtml(
                                    invoice.guestName
                                )}

                            </span>

                        </td>


                        <td>

                            ${escapeHtml(
                                invoice.stayNumber
                            )}

                        </td>


                        <td>

                            <strong>

                                ${money(
                                    invoice.total
                                )}

                            </strong>

                        </td>


                        <td>

                            ${money(
                                invoice.amount_paid
                            )}

                        </td>


                        <td>

                            ${money(
                                invoice.balance_due
                            )}

                        </td>


                        <td>

                            ${statusBadge(
                                invoice.status
                            )}

                        </td>


                        <td>

                            <button
                                type="button"
                                class="action-btn"
                                data-view-invoice="${escapeHtml(
                                    invoice.id
                                )}">

                                View

                            </button>

                        </td>

                    </tr>

                `
            ).join("");
    }


    // =====================================================
    // VIEW EXISTING INVOICE
    // =====================================================

    async function viewInvoice(
        invoiceId
    ) {

        const {
            data: invoice,
            error
        } = await db
            .from("invoices")
            .select(`
                id,
                invoice_number,
                stay_id,
                subtotal,
                tax,
                discount,
                total,
                amount_paid,
                balance_due,
                status,
                issued_at
            `)
            .eq(
                "hotel_id",
                hotelId
            )
            .eq(
                "id",
                invoiceId
            )
            .single();


        if (error) {
            throw error;
        }


        const {
            data: items,
            error: itemsError
        } = await db
            .from("invoice_items")
            .select(`
                id,
                description,
                quantity,
                unit_price,
                total,
                item_type
            `)
            .eq(
                "hotel_id",
                hotelId
            )
            .eq(
                "invoice_id",
                invoiceId
            )
            .order(
                "id",
                {
                    ascending: true
                }
            );


        if (itemsError) {
            throw itemsError;
        }


        const {
            data: stay,
            error: stayError
        } = await db
            .from("stays")
            .select(`
                id,
                stay_number,
                guest_id,
                room_id,
                actual_check_in
            `)
            .eq(
                "hotel_id",
                hotelId
            )
            .eq(
                "id",
                invoice.stay_id
            )
            .single();


        if (stayError) {
            throw stayError;
        }


        let guest = null;

        let room = null;


        if (stay.guest_id) {

            const result =
                await db
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
                    .eq(
                        "id",
                        stay.guest_id
                    )
                    .single();


            if (!result.error) {
                guest = result.data;
            }
        }


        if (stay.room_id) {

            const result =
                await db
                    .from("rooms")
                    .select(`
                        id,
                        room_number
                    `)
                    .eq(
                        "hotel_id",
                        hotelId
                    )
                    .eq(
                        "id",
                        stay.room_id
                    )
                    .single();


            if (!result.error) {
                room = result.data;
            }
        }


        const guestName =
            guest?.full_name ||
            [
                guest?.first_name,
                guest?.last_name
            ]
                .filter(Boolean)
                .join(" ") ||
            "Guest";


        selectedStay = {

            ...stay,

            guestName,

            roomNumber:
                room?.room_number ||
                "—"
        };


        renderInvoicePreview(
            invoice,
            items || []
        );


        currentInvoice =
            invoice;


        preview.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


        showMessage(
            `Invoice ${invoice.invoice_number} loaded.`
        );
    }


    // =====================================================
    // EVENT BINDING
    // =====================================================

    function safelyBind(
        id,
        event,
        handler
    ) {

        const element =
            $(id);


        if (element) {

            element.addEventListener(
                event,
                handler
            );
        }
    }


    // =====================================================
    // STAY CHANGE
    // =====================================================

    safelyBind(
        "checkoutStaySelect",
        "change",
        async () => {

            try {

                await refreshBill();

            } catch (error) {

                console.error(error);

                showMessage(
                    error.message ||
                    "Could not calculate bill.",
                    true
                );
            }
        }
    );


    // =====================================================
    // REFRESH BILL
    // =====================================================

    safelyBind(
        "refreshCheckoutBillButton",
        "click",
        async () => {

            try {

                await refreshBill();

            } catch (error) {

                console.error(error);

                showMessage(
                    error.message ||
                    "Could not calculate bill.",
                    true
                );
            }
        }
    );


    // =====================================================
    // CHECKOUT DATE
    // =====================================================

    safelyBind(
        "checkoutDate",
        "change",
        async () => {

            if (!staySelect.value) {
                return;
            }


            try {

                await refreshBill();

            } catch (error) {

                showMessage(
                    error.message ||
                    "Could not calculate bill.",
                    true
                );
            }
        }
    );


    // =====================================================
    // DISCOUNT
    // =====================================================

    safelyBind(
        "checkoutDiscount",
        "input",
        async () => {

            if (!staySelect.value) {
                return;
            }


            try {

                await refreshBill();

            } catch (error) {

                showMessage(
                    error.message ||
                    "Could not calculate bill.",
                    true
                );
            }
        }
    );


    // =====================================================
    // PAYMENT
    // =====================================================

    safelyBind(
        "checkoutPaymentAmount",
        "input",
        () => {

            if (currentBill) {

                renderTotals(
                    currentBill
                );
            }
        }
    );


    // =====================================================
    // GENERATE INVOICE
    // =====================================================

    safelyBind(
        "generateCheckoutInvoiceButton",
        "click",
        async () => {

            try {

                await generateInvoice();

            } catch (error) {

                console.error(
                    "Invoice generation error:",
                    error
                );

                showMessage(
                    error.message ||
                    "Could not generate invoice.",
                    true
                );
            }
        }
    );


    // =====================================================
    // COMPLETE CHECKOUT
    // =====================================================

    safelyBind(
        "completeCheckoutButton",
        "click",
        async () => {

            if (!selectedStay) {

                showMessage(
                    "Select an active stay first.",
                    true
                );

                return;
            }


            if (!currentInvoice) {

                showMessage(
                    "Generate the invoice before completing checkout.",
                    true
                );

                return;
            }


            const confirmed =
                window.confirm(
                    "Complete checkout for this guest? The stay will be closed and the room will be marked CLEANING."
                );


            if (!confirmed) {
                return;
            }


            try {

                await completeCheckout();

            } catch (error) {

                console.error(
                    "Checkout error:",
                    error
                );

                showMessage(
                    error.message ||
                    "Checkout failed.",
                    true
                );
            }
        }
    );


    // =====================================================
    // PRINT
    // =====================================================

    safelyBind(
        "printCheckoutInvoiceButton",
        "click",
        () => {

            if (!currentInvoice) {

                showMessage(
                    "Generate or open an invoice before printing.",
                    true
                );

                return;
            }


            window.print();
        }
    );


    // =====================================================
    // SEARCH
    // =====================================================

    safelyBind(
        "billingSearch",
        "input",
        () => {

            renderBillingInvoices(
                billingInvoices
            );
        }
    );


    // =====================================================
    // VIEW INVOICE BUTTONS
    // =====================================================

    const billingTableBody =
        $("billingTableBody");


    if (billingTableBody) {

        billingTableBody.addEventListener(
            "click",
            async (event) => {

                const button =
                    event.target.closest(
                        "[data-view-invoice]"
                    );


                if (!button) {
                    return;
                }


                try {

                    await viewInvoice(
                        button.dataset.viewInvoice
                    );

                } catch (error) {

                    console.error(
                        error
                    );

                    showMessage(
                        error.message ||
                        "Could not open invoice.",
                        true
                    );
                }
            }
        );
    }


    // =====================================================
    // MOBILE SIDEBAR
    // =====================================================

    const mobileMenu =
        $("mobileMenu");

    const sidebar =
        $("sidebar");

    const sidebarBackdrop =
        $("sidebarBackdrop");


    function closeSidebar() {

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
            closeSidebar
        );
    }


    document
        .querySelectorAll(".nav-item")
        .forEach(
            link => {

                link.addEventListener(
                    "click",
                    closeSidebar
                );
            }
        );


    // =====================================================
    // AUTH STATE
    // =====================================================

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


    // =====================================================
    // INITIAL DATE
    // =====================================================

    checkoutDate.value =
        today();


    // =====================================================
    // INITIALIZE
    // =====================================================

    try {

        hotelId =
            await getHotel();


        console.log(
            "✓ Billing hotel ID:",
            hotelId
        );


        await Promise.all([

            loadActiveStays(),

            loadBillingInvoices()

        ]);


        showMessage(
            "Billing is ready. Select an active stay."
        );


        console.log(
            "✓ BILLING & CHECKOUT INITIALIZED"
        );


        console.log(
            "=========================================="
        );

    } catch (error) {

        console.error(
            "❌ Billing initialization failed:",
            error
        );


        showMessage(
            error.message ||
            "Could not initialize Billing.",
            true
        );


        if (staySelect) {

            staySelect.innerHTML = `

                <option value="">
                    Unable to load active stays
                </option>

            `;
        }
    }

});