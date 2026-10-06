/* =========================================================
   STAR HOTELS - INVOICES
   Complete Invoice Management Module
   ========================================================= */

document.addEventListener("DOMContentLoaded", async function () {

    "use strict";

    console.log("=================================");
    console.log("STAR HOTELS - INVOICES.JS");
    console.log("=================================");


    /* =====================================================
       SUPABASE
       ===================================================== */

    const supabase = window.supabaseClient;

    if (!supabase) {

        console.error(
            "INVOICES.JS: Supabase client is not initialized."
        );

        showTableMessage(
            "Supabase connection is not available."
        );

        return;
    }


    /* =====================================================
       HELPERS
       ===================================================== */

    const $ = function (id) {
        return document.getElementById(id);
    };


    /* =====================================================
       STATE
       ===================================================== */

    let hotelId = null;

    let hotelInfo = {};

    let allInvoices = [];

    let invoiceItems = [];

    let staysById = {};

    let guestsById = {};

    let roomsById = {};

    let selectedInvoice = null;


    /* =====================================================
       MONEY
       ===================================================== */

    function money(value) {

        const amount = Number(value || 0);

        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",
                currency: hotelInfo.currency || "INR",
                maximumFractionDigits: 2
            }
        ).format(amount);

    }


    /* =====================================================
       ESCAPE HTML
       ===================================================== */

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
            .replace(/'/g, "&#39;");
    }


    /* =====================================================
       DATE
       ===================================================== */

    function formatDate(value) {

        if (!value) {
            return "—";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
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


    /* =====================================================
       MESSAGE
       ===================================================== */

    function showMessage(
        message,
        type = "info"
    ) {

        const element = $("invoiceMessage");

        if (!element) {
            return;
        }

        const colors = {
            info: "#51418c",
            success: "#137547",
            error: "#b42318"
        };

        element.textContent = message;

        element.style.color =
            colors[type] || colors.info;
    }


    /* =====================================================
       TABLE MESSAGE
       ===================================================== */

    function showTableMessage(message) {

        const tbody = $("invoicesTableBody");

        if (!tbody) {
            return;
        }

        tbody.innerHTML = `
            <tr>
                <td colspan="11">
                    <div class="empty-table">
                        ${escapeHtml(message)}
                    </div>
                </td>
            </tr>
        `;
    }


    /* =====================================================
       GUEST NAME
       ===================================================== */

    function getGuestName(guestId) {

        if (!guestId) {
            return "Guest";
        }

        const guest =
            guestsById[String(guestId)];

        if (!guest) {
            return "Guest #" + guestId;
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
            .filter(Boolean)
            .join(" ")
            .trim();

        return name || "Guest";
    }


    /* =====================================================
       STATUS
       ===================================================== */

    function getInvoiceStatus(invoice) {

        const total =
            Number(invoice.total || 0);

        const paid =
            Number(invoice.amount_paid || 0);

        const balance =
            invoice.balance_due !== null &&
            invoice.balance_due !== undefined
                ? Number(invoice.balance_due)
                : Math.max(
                    0,
                    total - paid
                );

        const storedStatus =
            String(
                invoice.status || ""
            ).toLowerCase();

        if (
            balance <= 0.01 ||
            storedStatus === "paid"
        ) {
            return "paid";
        }

        if (
            paid > 0 ||
            storedStatus === "partial"
        ) {
            return "partial";
        }

        return "unpaid";
    }


    function statusLabel(status) {

        const labels = {
            paid: "Paid",
            partial: "Partially Paid",
            unpaid: "Unpaid"
        };

        return labels[status] || "Unknown";
    }


    function statusBadge(status) {

        return `
            <span class="status-badge status-${escapeHtml(status)}">
                ${escapeHtml(statusLabel(status))}
            </span>
        `;
    }


    /* =====================================================
       BALANCE
       ===================================================== */

    function getInvoiceBalance(invoice) {

        const total =
            Number(invoice.total || 0);

        const paid =
            Number(invoice.amount_paid || 0);

        if (
            invoice.balance_due !== null &&
            invoice.balance_due !== undefined
        ) {

            return Math.max(
                0,
                Number(invoice.balance_due)
            );
        }

        return Math.max(
            0,
            total - paid
        );
    }


    /* =====================================================
       CURRENT USER / HOTEL
       ===================================================== */

    async function initializeInvoices() {

        showMessage(
            "Loading invoices..."
        );

        const {
            data: {
                user
            },
            error: authError
        } = await supabase.auth.getUser();


        if (authError) {

            console.error(
                "Authentication error:",
                authError
            );

            showMessage(
                "Unable to verify your login.",
                "error"
            );

            showTableMessage(
                "Unable to verify your login."
            );

            return;
        }


        if (!user) {

            showMessage(
                "Please log in to view invoices.",
                "error"
            );

            showTableMessage(
                "Please log in to view invoices."
            );

            return;
        }


        /* =================================================
           PROFILE
           ================================================= */

        const {
            data: profile,
            error: profileError
        } = await supabase
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

            console.error(
                "Profile error:",
                profileError
            );

            showMessage(
                "Unable to load your hotel profile.",
                "error"
            );

            showTableMessage(
                "Unable to load hotel profile."
            );

            return;
        }


        if (!profile?.hotel_id) {

            showMessage(
                "Your account is not linked to a hotel.",
                "error"
            );

            showTableMessage(
                "No hotel is linked to this account."
            );

            return;
        }


        hotelId =
            profile.hotel_id;


        /* =================================================
           TOP USER
           ================================================= */

        const userName =
            profile.full_name ||
            user.email ||
            "User";


        if ($("topUserName")) {

            $("topUserName").textContent =
                userName;

        }


        if ($("topUserAvatar")) {

            $("topUserAvatar").textContent =
                String(userName)
                    .charAt(0)
                    .toUpperCase();

        }


        /* =================================================
           HOTEL
           ================================================= */

        const {
            data: hotel,
            error: hotelError
        } = await supabase
            .from("hotels")
            .select(`
                id,
                name,
                logo_url,
                address,
                city,
                state,
                country,
                phone,
                email,
                website,
                currency,
                tax_number
            `)
            .eq(
                "id",
                hotelId
            )
            .maybeSingle();


        if (hotelError) {

            console.warn(
                "Hotel loading warning:",
                hotelError
            );

        }


        hotelInfo =
            hotel || {};


        await loadInvoices();
    }


    /* =====================================================
       LOAD INVOICES
       ===================================================== */

    async function loadInvoices() {

        if (!hotelId) {
            return;
        }


        showMessage(
            "Loading invoices..."
        );


        const {
            data: invoices,
            error
        } = await supabase
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
                "issued_at",
                {
                    ascending: false,
                    nullsFirst: false
                }
            );


        if (error) {

            console.error(
                "Invoice loading error:",
                error
            );

            showMessage(
                "Could not load invoices: " +
                error.message,
                "error"
            );

            showTableMessage(
                "Unable to load invoices."
            );

            return;
        }


        allInvoices =
            Array.isArray(invoices)
                ? invoices
                : [];


        staysById = {};
        guestsById = {};
        roomsById = {};
        invoiceItems = [];


        const stayIds = [
            ...new Set(
                allInvoices
                    .map(
                        invoice =>
                            invoice.stay_id
                    )
                    .filter(Boolean)
            )
        ];


        const invoiceIds =
            allInvoices
                .map(
                    invoice =>
                        invoice.id
                )
                .filter(Boolean);


        /* =================================================
           STAYS
           ================================================= */

        if (stayIds.length) {

            const {
                data: stays,
                error: staysError
            } = await supabase
                .from("stays")
                .select(`
                    id,
                    hotel_id,
                    guest_id,
                    stay_number,
                    room_id,
                    actual_check_in,
                    actual_check_out,
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


            if (staysError) {

                console.error(
                    "Stay loading error:",
                    staysError
                );

            }


            (stays || []).forEach(
                stay => {

                    staysById[
                        String(stay.id)
                    ] = stay;

                }
            );


            /* =============================================
               GUESTS
               ============================================= */

            const guestIds = [
                ...new Set(
                    (stays || [])
                        .map(
                            stay =>
                                stay.guest_id
                        )
                        .filter(Boolean)
                )
            ];


            if (guestIds.length) {

                const {
                    data: guests,
                    error: guestsError
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
                        hotelId
                    )
                    .in(
                        "id",
                        guestIds
                    );


                if (guestsError) {

                    console.error(
                        "Guest loading error:",
                        guestsError
                    );

                }


                (guests || []).forEach(
                    guest => {

                        guestsById[
                            String(guest.id)
                        ] = guest;

                    }
                );

            }


            /* =============================================
               ROOMS
               ============================================= */

            const roomIds = [
                ...new Set(
                    (stays || [])
                        .map(
                            stay =>
                                stay.room_id
                        )
                        .filter(Boolean)
                )
            ];


            if (roomIds.length) {

                const {
                    data: rooms,
                    error: roomsError
                } = await supabase
                    .from("rooms")
                    .select(`
                        id,
                        hotel_id,
                        room_number,
                        room_type_id,
                        price,
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


                if (roomsError) {

                    console.error(
                        "Room loading error:",
                        roomsError
                    );

                }


                (rooms || []).forEach(
                    room => {

                        roomsById[
                            String(room.id)
                        ] = room;

                    }
                );

            }

        }


        /* =================================================
           INVOICE ITEMS
           ================================================= */

        if (invoiceIds.length) {

            const {
                data: items,
                error: itemsError
            } = await supabase
                .from("invoice_items")
                .select(`
                    id,
                    hotel_id,
                    invoice_id,
                    description,
                    quantity,
                    unit_price,
                    total,
                    item_type,
                    source_order_id,
                    source_charge_id,
                    created_at
                `)
                .eq(
                    "hotel_id",
                    hotelId
                )
                .in(
                    "invoice_id",
                    invoiceIds
                )
                .order(
                    "id",
                    {
                        ascending: true
                    }
                );


            if (itemsError) {

                console.error(
                    "Invoice items error:",
                    itemsError
                );

            }


            invoiceItems =
                items || [];

        }


        renderInvoices();


        showMessage(
            `${allInvoices.length} invoice(s) loaded.`,
            "success"
        );
    }


    /* =====================================================
       FILTER
       ===================================================== */

    function getFilteredInvoices() {

        const search =
            (
                $("invoiceSearch")?.value ||
                ""
            )
                .trim()
                .toLowerCase();


        const statusFilter =
            $("invoiceStatusFilter")?.value ||
            "";


        const fromDate =
            $("invoiceFromDate")?.value ||
            "";


        const toDate =
            $("invoiceToDate")?.value ||
            "";


        return allInvoices.filter(
            invoice => {

                const stay =
                    staysById[
                        String(
                            invoice.stay_id
                        )
                    ];


                const guestName =
                    getGuestName(
                        stay?.guest_id
                    );


                const searchable = [
                    invoice.invoice_number,
                    guestName,
                    stay?.stay_number,
                    invoice.id
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();


                if (
                    search &&
                    !searchable.includes(search)
                ) {
                    return false;
                }


                if (
                    statusFilter &&
                    getInvoiceStatus(invoice) !==
                    statusFilter
                ) {
                    return false;
                }


                const invoiceDate =
                    String(
                        invoice.issued_at ||
                        invoice.created_at ||
                        ""
                    ).slice(0, 10);


                if (
                    fromDate &&
                    invoiceDate < fromDate
                ) {
                    return false;
                }


                if (
                    toDate &&
                    invoiceDate > toDate
                ) {
                    return false;
                }


                return true;
            }
        );
    }


    /* =====================================================
       STATS
       ===================================================== */

    function renderStats() {

        const totalCount =
            allInvoices.length;


        const paidCount =
            allInvoices.filter(
                invoice =>
                    getInvoiceStatus(invoice) ===
                    "paid"
            ).length;


        const pendingCount =
            allInvoices.filter(
                invoice =>
                    getInvoiceStatus(invoice) !==
                    "paid"
            ).length;


        const outstanding =
            allInvoices.reduce(
                (
                    sum,
                    invoice
                ) => {

                    return (
                        sum +
                        getInvoiceBalance(
                            invoice
                        )
                    );

                },
                0
            );


        if ($("invoiceCount")) {

            $("invoiceCount").textContent =
                totalCount;

        }


        if ($("paidInvoiceCount")) {

            $("paidInvoiceCount").textContent =
                paidCount;

        }


        if ($("pendingInvoiceCount")) {

            $("pendingInvoiceCount").textContent =
                pendingCount;

        }


        if ($("outstandingInvoiceAmount")) {

            $("outstandingInvoiceAmount").textContent =
                money(outstanding);

        }

    }


    /* =====================================================
       EMPTY
       ===================================================== */

    function renderEmpty(message) {

        const tbody =
            $("invoicesTableBody");

        if (!tbody) {
            return;
        }

        tbody.innerHTML = `
            <tr>
                <td colspan="11">
                    <div class="empty-table">
                        ${escapeHtml(message)}
                    </div>
                </td>
            </tr>
        `;
    }


    /* =====================================================
       RENDER TABLE
       ===================================================== */

    function renderInvoices() {

        renderStats();


        const tbody =
            $("invoicesTableBody");


        if (!tbody) {
            return;
        }


        const invoices =
            getFilteredInvoices();


        if (!invoices.length) {

            renderEmpty(
                allInvoices.length
                    ? "No invoices match your filters."
                    : "No invoices have been created yet."
            );

            return;
        }


        tbody.innerHTML =
            invoices.map(
                invoice => {

                    const stay =
                        staysById[
                            String(
                                invoice.stay_id
                            )
                        ];


                    const guestName =
                        getGuestName(
                            stay?.guest_id
                        );


                    const status =
                        getInvoiceStatus(
                            invoice
                        );


                    const subtotal =
                        Number(
                            invoice.subtotal || 0
                        );


                    const tax =
                        Number(
                            invoice.tax || 0
                        );


                    const total =
                        Number(
                            invoice.total || 0
                        );


                    const paid =
                        Number(
                            invoice.amount_paid || 0
                        );


                    const balance =
                        getInvoiceBalance(
                            invoice
                        );


                    const invoiceNumber =
                        invoice.invoice_number ||
                        `INV-${invoice.id}`;


                    return `
                        <tr>

                            <td>
                                <span class="invoice-number">
                                    ${escapeHtml(
                                        invoiceNumber
                                    )}
                                </span>
                            </td>


                            <td>
                                <strong>
                                    ${escapeHtml(
                                        guestName
                                    )}
                                </strong>
                            </td>


                            <td>
                                <span class="stay-number">
                                    ${escapeHtml(
                                        stay?.stay_number ||
                                        "—"
                                    )}
                                </span>
                            </td>


                            <td>
                                <span class="amount">
                                    ${escapeHtml(
                                        money(subtotal)
                                    )}
                                </span>
                            </td>


                            <td>
                                ${escapeHtml(
                                    money(tax)
                                )}
                            </td>


                            <td>
                                <strong>
                                    ${escapeHtml(
                                        money(total)
                                    )}
                                </strong>
                            </td>


                            <td>
                                <span class="amount">
                                    ${escapeHtml(
                                        money(paid)
                                    )}
                                </span>
                            </td>


                            <td>
                                <span
                                    class="${
                                        balance > 0.01
                                            ? "balance-due"
                                            : "balance-zero"
                                    }"
                                >
                                    ${escapeHtml(
                                        money(balance)
                                    )}
                                </span>
                            </td>


                            <td>
                                ${statusBadge(status)}
                            </td>


                            <td>
                                ${escapeHtml(
                                    formatDate(
                                        invoice.issued_at ||
                                        invoice.created_at
                                    )
                                )}
                            </td>


                            <td>

                                <div class="action-buttons">

                                    <button
                                        type="button"
                                        class="invoice-action-btn"
                                        data-invoice-view="${escapeHtml(
                                            invoice.id
                                        )}"
                                    >
                                        View
                                    </button>


                                    <button
                                        type="button"
                                        class="invoice-action-btn"
                                        data-invoice-print="${escapeHtml(
                                            invoice.id
                                        )}"
                                    >
                                        Print
                                    </button>

                                </div>

                            </td>

                        </tr>
                    `;
                }
            ).join("");
    }


    /* =====================================================
       ITEMS
       ===================================================== */

    function getItemsForInvoice(invoiceId) {

        return invoiceItems.filter(
            item =>
                String(item.invoice_id) ===
                String(invoiceId)
        );
    }


    /* =====================================================
       BUILD INVOICE
       ===================================================== */

    function buildInvoiceHTML(invoice) {

        const stay =
            staysById[
                String(invoice.stay_id)
            ];


        const guest =
            guestsById[
                String(stay?.guest_id)
            ] || {};


        const room =
            roomsById[
                String(stay?.room_id)
            ] || {};


        const guestName =
            getGuestName(
                stay?.guest_id
            );


        const items =
            getItemsForInvoice(
                invoice.id
            );


        const subtotal =
            Number(invoice.subtotal || 0);


        const tax =
            Number(invoice.tax || 0);


        const discount =
            Number(invoice.discount || 0);


        const total =
            Number(invoice.total || 0);


        const paid =
            Number(invoice.amount_paid || 0);


        const balance =
            getInvoiceBalance(invoice);


        const status =
            getInvoiceStatus(invoice);


        const location = [
            hotelInfo.city,
            hotelInfo.state,
            hotelInfo.country
        ]
            .filter(Boolean)
            .join(", ");


        const invoiceNumber =
            invoice.invoice_number ||
            `INV-${invoice.id}`;


        return `
            <div class="print-invoice">

                <div class="invoice-hotel-header">

                    ${
                        hotelInfo.logo_url
                            ? `
                                <img
                                    src="${escapeHtml(
                                        hotelInfo.logo_url
                                    )}"
                                    class="invoice-hotel-logo"
                                    alt="Hotel Logo"
                                >
                            `
                            : ""
                    }


                    <h2>
                        ${escapeHtml(
                            hotelInfo.name ||
                            "Hotel"
                        )}
                    </h2>


                    ${
                        hotelInfo.address
                            ? `
                                <p>
                                    ${escapeHtml(
                                        hotelInfo.address
                                    )}
                                </p>
                            `
                            : ""
                    }


                    ${
                        location
                            ? `
                                <p>
                                    ${escapeHtml(location)}
                                </p>
                            `
                            : ""
                    }


                    ${
                        hotelInfo.phone ||
                        hotelInfo.email
                            ? `
                                <p>
                                    ${escapeHtml(
                                        hotelInfo.phone ||
                                        ""
                                    )}

                                    ${
                                        hotelInfo.email
                                            ? " | " +
                                              escapeHtml(
                                                  hotelInfo.email
                                              )
                                            : ""
                                    }
                                </p>
                            `
                            : ""
                    }


                    ${
                        hotelInfo.website
                            ? `
                                <p>
                                    ${escapeHtml(
                                        hotelInfo.website
                                    )}
                                </p>
                            `
                            : ""
                    }


                    ${
                        hotelInfo.tax_number
                            ? `
                                <p>
                                    Tax Number:
                                    ${escapeHtml(
                                        hotelInfo.tax_number
                                    )}
                                </p>
                            `
                            : ""
                    }


                    <div class="invoice-title">
                        INVOICE
                    </div>

                </div>


                <div class="invoice-meta-grid">

                    <div class="invoice-meta-box">

                        <strong>
                            Invoice Number
                        </strong>

                        <p>
                            ${escapeHtml(
                                invoiceNumber
                            )}
                        </p>


                        <strong>
                            Invoice Date
                        </strong>

                        <p>
                            ${escapeHtml(
                                formatDate(
                                    invoice.issued_at ||
                                    invoice.created_at
                                )
                            )}
                        </p>


                        <strong>
                            Room
                        </strong>

                        <p>
                            ${escapeHtml(
                                room.room_number ||
                                "—"
                            )}
                        </p>

                    </div>


                    <div class="invoice-meta-box">

                        <strong>
                            Guest Name
                        </strong>

                        <p>
                            ${escapeHtml(
                                guestName
                            )}
                        </p>


                        <strong>
                            Stay Number
                        </strong>

                        <p>
                            ${escapeHtml(
                                stay?.stay_number ||
                                "—"
                            )}
                        </p>


                        <strong>
                            Phone
                        </strong>

                        <p>
                            ${escapeHtml(
                                guest.phone ||
                                "—"
                            )}
                        </p>

                    </div>

                </div>


                <table class="invoice-items">

                    <thead>

                        <tr>

                            <th>
                                Description
                            </th>

                            <th class="text-right">
                                Qty
                            </th>

                            <th class="text-right">
                                Unit Price
                            </th>

                            <th class="text-right">
                                Amount
                            </th>

                        </tr>

                    </thead>


                    <tbody>

                        ${
                            items.length
                                ? items.map(
                                    item => `
                                        <tr>

                                            <td>
                                                ${escapeHtml(
                                                    item.description ||
                                                    item.item_type ||
                                                    "Charge"
                                                )}
                                            </td>

                                            <td class="text-right">
                                                ${escapeHtml(
                                                    item.quantity ?? 1
                                                )}
                                            </td>

                                            <td class="text-right">
                                                ${escapeHtml(
                                                    money(
                                                        item.unit_price
                                                    )
                                                )}
                                            </td>

                                            <td class="text-right">
                                                ${escapeHtml(
                                                    money(
                                                        item.total
                                                    )
                                                )}
                                            </td>

                                        </tr>
                                    `
                                ).join("")
                                : `
                                    <tr>
                                        <td
                                            colspan="4"
                                            style="text-align:center;"
                                        >
                                            No itemized charges recorded.
                                        </td>
                                    </tr>
                                `
                        }

                    </tbody>

                </table>


                <div class="invoice-totals">

                    <div class="invoice-total-row">

                        <span>
                            Subtotal
                        </span>

                        <strong>
                            ${escapeHtml(
                                money(subtotal)
                            )}
                        </strong>

                    </div>


                    <div class="invoice-total-row">

                        <span>
                            Tax
                        </span>

                        <strong>
                            ${escapeHtml(
                                money(tax)
                            )}
                        </strong>

                    </div>


                    <div class="invoice-total-row">

                        <span>
                            Discount
                        </span>

                        <strong>
                            −${escapeHtml(
                                money(discount)
                            )}
                        </strong>

                    </div>


                    <div class="invoice-total-row grand">

                        <strong>
                            Grand Total
                        </strong>

                        <strong>
                            ${escapeHtml(
                                money(total)
                            )}
                        </strong>

                    </div>


                    <div class="invoice-total-row">

                        <span>
                            Amount Paid
                        </span>

                        <strong>
                            ${escapeHtml(
                                money(paid)
                            )}
                        </strong>

                    </div>


                    <div class="invoice-total-row">

                        <strong>
                            Balance Due
                        </strong>

                        <strong>
                            ${escapeHtml(
                                money(balance)
                            )}
                        </strong>

                    </div>


                    <div class="invoice-total-row">

                        <span>
                            Payment Status
                        </span>

                        <strong>
                            ${escapeHtml(
                                statusLabel(status)
                            )}
                        </strong>

                    </div>

                </div>


                <div class="invoice-footer-message">

                    Thank you for staying with
                    ${escapeHtml(
                        hotelInfo.name ||
                        "us"
                    )}!

                </div>

            </div>
        `;
    }


    /* =====================================================
       VIEW INVOICE
       ===================================================== */

    function viewInvoice(invoiceId) {

        const invoice =
            allInvoices.find(
                item =>
                    String(item.id) ===
                    String(invoiceId)
            );


        if (!invoice) {

            showMessage(
                "Invoice not found.",
                "error"
            );

            return;
        }


        selectedInvoice =
            invoice;


        const modal =
            $("invoiceDetailsModal");


        const content =
            $("invoiceDetailsContent");


        if (!modal || !content) {
            return;
        }


        content.innerHTML =
            buildInvoiceHTML(invoice);


        modal.classList.add("show");

        document.body.style.overflow =
            "hidden";
    }


    /* =====================================================
       CLOSE MODAL
       ===================================================== */

    function closeInvoiceModal() {

        const modal =
            $("invoiceDetailsModal");


        if (modal) {

            modal.classList.remove("show");

        }


        document.body.style.overflow =
            "";
    }


    /* =====================================================
       PRINT
       ===================================================== */

    function printInvoice(invoice) {

        if (!invoice) {

            showMessage(
                "Invoice not found.",
                "error"
            );

            return;
        }


        const printWindow =
            window.open(
                "",
                "_blank"
            );


        if (!printWindow) {

            showMessage(
                "Please allow pop-ups to print invoices.",
                "error"
            );

            return;
        }


        const content =
            buildInvoiceHTML(invoice);


        const title =
            invoice.invoice_number ||
            `INV-${invoice.id}`;


        printWindow.document.open();


        printWindow.document.write(`
            <!DOCTYPE html>

            <html lang="en">

            <head>

                <meta charset="UTF-8">

                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                >

                <title>
                    ${escapeHtml(title)}
                </title>


                <style>

                    * {
                        box-sizing: border-box;
                    }

                    body {
                        margin: 0;
                        padding: 25px;

                        background: #ffffff;

                        color: #29243a;

                        font-family:
                            Arial,
                            Helvetica,
                            sans-serif;
                    }

                    .print-invoice {
                        max-width: 800px;
                        margin: 0 auto;
                    }

                    .invoice-hotel-header {
                        padding-bottom: 20px;
                        text-align: center;
                        border-bottom: 1px solid #e5e5e5;
                    }

                    .invoice-hotel-logo {
                        max-width: 110px;
                        max-height: 75px;
                        object-fit: contain;
                        margin-bottom: 10px;
                    }

                    .invoice-hotel-header h2 {
                        font-size: 22px;
                        margin: 0 0 6px;
                    }

                    .invoice-hotel-header p {
                        margin: 3px 0;
                        color: #666;
                        font-size: 11px;
                    }

                    .invoice-title {
                        margin-top: 18px;
                        font-size: 16px;
                        letter-spacing: 2px;
                    }

                    .invoice-meta-grid {
                        display: grid;
                        grid-template-columns:
                            repeat(2, minmax(0, 1fr));
                        gap: 30px;
                        margin: 22px 0;
                    }

                    .invoice-meta-box {
                        padding: 13px;
                        border: 1px solid #e7e5eb;
                        border-radius: 7px;
                    }

                    .invoice-meta-box strong {
                        font-size: 10px;
                    }

                    .invoice-meta-box p {
                        margin: 4px 0 12px;
                        font-size: 11px;
                    }

                    .invoice-items {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                    }

                    .invoice-items th {
                        padding: 10px;
                        text-align: left;
                        background: #f7f7f7;
                        border-bottom: 1px solid #ddd;
                        font-size: 10px;
                    }

                    .invoice-items td {
                        padding: 10px;
                        border-bottom: 1px solid #eee;
                        font-size: 10px;
                    }

                    .text-right {
                        text-align: right !important;
                    }

                    .invoice-totals {
                        width: 350px;
                        max-width: 100%;
                        margin-left: auto;
                    }

                    .invoice-total-row {
                        padding: 7px 0;
                        display: flex;
                        justify-content: space-between;
                        gap: 15px;
                        font-size: 11px;
                    }

                    .invoice-total-row.grand {
                        padding-top: 12px;
                        margin-top: 5px;
                        border-top: 1px solid #ddd;
                        font-size: 15px;
                    }

                    .invoice-footer-message {
                        margin-top: 30px;
                        text-align: center;
                        color: #777;
                        font-size: 10px;
                    }

                    @page {
                        size: A4;
                        margin: 15mm;
                    }

                    @media print {

                        body {
                            padding: 0;
                        }

                    }

                </style>

            </head>


            <body>

                ${content}

            </body>

            </html>
        `);


        printWindow.document.close();


        printWindow.onload =
            function () {

                printWindow.focus();

                printWindow.print();

            };
    }


    /* =====================================================
       TABLE EVENTS
       ===================================================== */

    const tableBody =
        $("invoicesTableBody");


    if (tableBody) {

        tableBody.addEventListener(
            "click",
            function (event) {

                const viewButton =
                    event.target.closest(
                        "[data-invoice-view]"
                    );


                const printButton =
                    event.target.closest(
                        "[data-invoice-print]"
                    );


                if (viewButton) {

                    viewInvoice(
                        viewButton.dataset
                            .invoiceView
                    );

                    return;
                }


                if (printButton) {

                    const invoice =
                        allInvoices.find(
                            item =>
                                String(item.id) ===
                                String(
                                    printButton.dataset
                                        .invoicePrint
                                )
                        );


                    if (invoice) {

                        printInvoice(
                            invoice
                        );

                    }

                }

            }
        );

    }


    /* =====================================================
       SEARCH
       ===================================================== */

    if ($("invoiceSearch")) {

        $("invoiceSearch")
            .addEventListener(
                "input",
                renderInvoices
            );

    }


    /* =====================================================
       FILTERS
       ===================================================== */

    if ($("invoiceStatusFilter")) {

        $("invoiceStatusFilter")
            .addEventListener(
                "change",
                renderInvoices
            );

    }


    if ($("invoiceFromDate")) {

        $("invoiceFromDate")
            .addEventListener(
                "change",
                renderInvoices
            );

    }


    if ($("invoiceToDate")) {

        $("invoiceToDate")
            .addEventListener(
                "change",
                renderInvoices
            );

    }


    if ($("filterInvoicesButton")) {

        $("filterInvoicesButton")
            .addEventListener(
                "click",
                renderInvoices
            );

    }


    /* =====================================================
       RESET
       ===================================================== */

    if ($("resetInvoiceFiltersButton")) {

        $("resetInvoiceFiltersButton")
            .addEventListener(
                "click",
                function () {

                    if ($("invoiceSearch")) {
                        $("invoiceSearch").value = "";
                    }


                    if ($("invoiceStatusFilter")) {
                        $("invoiceStatusFilter").value = "";
                    }


                    if ($("invoiceFromDate")) {
                        $("invoiceFromDate").value = "";
                    }


                    if ($("invoiceToDate")) {
                        $("invoiceToDate").value = "";
                    }


                    renderInvoices();

                }
            );

    }


    /* =====================================================
       REFRESH
       ===================================================== */

    if ($("refreshInvoicesButton")) {

        $("refreshInvoicesButton")
            .addEventListener(
                "click",
                async function () {

                    const button =
                        $("refreshInvoicesButton");


                    if (button) {

                        button.disabled = true;

                        button.textContent =
                            "Refreshing...";

                    }


                    try {

                        await loadInvoices();

                    } catch (error) {

                        console.error(
                            error
                        );

                        showMessage(
                            "Unable to refresh invoices.",
                            "error"
                        );

                    } finally {

                        if (button) {

                            button.disabled = false;

                            button.textContent =
                                "↻ Refresh";

                        }

                    }

                }
            );

    }


    /* =====================================================
       MODAL CLOSE
       ===================================================== */

    if ($("closeInvoiceDetailsButton")) {

        $("closeInvoiceDetailsButton")
            .addEventListener(
                "click",
                closeInvoiceModal
            );

    }


    if ($("modalCloseBottomButton")) {

        $("modalCloseBottomButton")
            .addEventListener(
                "click",
                closeInvoiceModal
            );

    }


    if ($("modalPrintInvoiceButton")) {

        $("modalPrintInvoiceButton")
            .addEventListener(
                "click",
                function () {

                    if (selectedInvoice) {

                        printInvoice(
                            selectedInvoice
                        );

                    }

                }
            );

    }


    /* =====================================================
       MODAL BACKDROP
       ===================================================== */

    if ($("invoiceDetailsModal")) {

        $("invoiceDetailsModal")
            .addEventListener(
                "click",
                function (event) {

                    if (
                        event.target ===
                        $("invoiceDetailsModal")
                    ) {

                        closeInvoiceModal();

                    }

                }
            );

    }


    /* =====================================================
       ESCAPE KEY
       ===================================================== */

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape"
            ) {

                closeInvoiceModal();

            }

        }
    );


    /* =====================================================
       MOBILE SIDEBAR
       ===================================================== */

    function openSidebar() {

        const sidebar =
            $("sidebar");

        const backdrop =
            $("sidebarBackdrop");


        if (sidebar) {
            sidebar.classList.add("show");
        }


        if (backdrop) {
            backdrop.classList.add("show");
        }

    }


    function closeSidebar() {

        const sidebar =
            $("sidebar");

        const backdrop =
            $("sidebarBackdrop");


        if (sidebar) {
            sidebar.classList.remove("show");
        }


        if (backdrop) {
            backdrop.classList.remove("show");
        }

    }


    if ($("mobileMenu")) {

        $("mobileMenu")
            .addEventListener(
                "click",
                function () {

                    const sidebar =
                        $("sidebar");


                    if (
                        sidebar &&
                        sidebar.classList.contains(
                            "show"
                        )
                    ) {

                        closeSidebar();

                    } else {

                        openSidebar();

                    }

                }
            );

    }


    if ($("sidebarBackdrop")) {

        $("sidebarBackdrop")
            .addEventListener(
                "click",
                closeSidebar
            );

    }


    document
        .querySelectorAll(".nav-item")
        .forEach(
            function (item) {

                item.addEventListener(
                    "click",
                    closeSidebar
                );

            }
        );


    /* =====================================================
       AUTH STATE
       ===================================================== */

    supabase.auth.onAuthStateChange(
        async function (
            event,
            session
        ) {

            console.log(
                "INVOICES.JS auth event:",
                event
            );


            if (
                event === "SIGNED_OUT"
            ) {

                hotelId = null;

                hotelInfo = {};

                allInvoices = [];

                invoiceItems = [];

                staysById = {};

                guestsById = {};

                roomsById = {};

                selectedInvoice = null;


                renderStats();


                showMessage(
                    "Please log in to view invoices.",
                    "error"
                );


                showTableMessage(
                    "Please log in to view invoices."
                );

                return;
            }


            if (
                event === "SIGNED_IN" &&
                session?.user
            ) {

                await initializeInvoices();

            }

        }
    );


    /* =====================================================
       START
       ===================================================== */

    try {

        await initializeInvoices();

        console.log(
            "✓ Invoice management initialized successfully."
        );

    } catch (error) {

        console.error(
            "Invoice initialization error:",
            error
        );

        showMessage(
            "An unexpected error occurred while loading invoices.",
            "error"
        );

        showTableMessage(
            "Unable to load invoices."
        );

    }

});