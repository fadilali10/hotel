
/* ==========================================
   STAR HOTELS - INVOICE MANAGEMENT
   Uses the existing Supabase database schema
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    const supabase = window.supabaseClient;

    if (!supabase) {
        console.error("Supabase client is not initialized.");
        return;
    }

    const $ = (id) => document.getElementById(id);

    let hotelId = null;
    let hotelInfo = {};
    let allInvoices = [];
    let invoiceItems = [];
    let staysById = {};
    let guestsById = {};
    let selectedInvoice = null;

    const money = (value) => {
        const amount = Number(value || 0);

        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: hotelInfo.currency || "INR",
            maximumFractionDigits: 2
        }).format(amount);
    };

    const escapeHtml = (value) => {
        return String(value ?? "").replace(/[&<>"']/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]);
    };

    const formatDate = (value) => {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    function showMessage(message, type = "info") {
        const element = $("invoiceMessage");
        if (!element) return;

        const colors = {
            info: "#51418c",
            success: "#137547",
            error: "#b42318"
        };

        element.textContent = message;
        element.style.color = colors[type] || colors.info;
    }

    function getGuestName(guestId) {
        const guest = guestsById[String(guestId)];

        if (!guest) return "Guest #" + (guestId ?? "Unknown");

        return guest.full_name ||
            [guest.first_name, guest.last_name]
                .filter(Boolean)
                .join(" ") ||
            "Guest";
    }

    function getInvoiceStatus(invoice) {
        const total = Number(invoice.total || 0);
        const paid = Number(invoice.amount_paid || 0);
        const balance = invoice.balance_due == null
            ? Math.max(0, total - paid)
            : Number(invoice.balance_due);

        if (balance <= 0.01 || invoice.status === "paid") {
            return "paid";
        }

        if (paid > 0 || invoice.status === "partial") {
            return "partial";
        }

        return "unpaid";
    }

    function statusLabel(status) {
        return {
            paid: "Paid",
            partial: "Partially Paid",
            unpaid: "Unpaid"
        }[status] || status;
    }

    function statusBadge(status) {
        const styles = {
            paid: "background:#e7f8ee;color:#137547;",
            partial: "background:#fff3d6;color:#8a5a00;",
            unpaid: "background:#fde8e7;color:#b42318;"
        };

        return `<span style="display:inline-block;padding:5px 9px;
            border-radius:20px;font-size:12px;font-weight:700;
            ${styles[status] || ""}">
            ${escapeHtml(statusLabel(status))}
        </span>`;
    }

    /* ----------------------------------
       AUTHENTICATION AND HOTEL
    ---------------------------------- */

    async function initializeInvoices() {
        showMessage("Loading invoices...");

        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser();

        if (authError || !user) {
            showMessage("Please log in to view invoices.", "error");
            renderEmpty("Please log in to view invoices.");
            return;
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("hotel_id")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error("Profile error:", profileError);
            showMessage("Unable to load your hotel profile.", "error");
            return;
        }

        if (!profile?.hotel_id) {
            showMessage("Your account is not linked to a hotel.", "error");
            renderEmpty("No hotel is linked to this account.");
            return;
        }

        hotelId = profile.hotel_id;

        const { data: hotel, error: hotelError } = await supabase
            .from("hotels")
            .select("*")
            .eq("id", hotelId)
            .maybeSingle();

        if (hotelError) {
            console.error("Hotel error:", hotelError);
        }

        hotelInfo = hotel || {};

        await loadInvoices();
    }

    /* ----------------------------------
       LOAD INVOICES AND RELATED RECORDS
    ---------------------------------- */

    async function loadInvoices() {
        if (!hotelId) return;

        showMessage("Loading invoices...");

        const { data: invoices, error } = await supabase
            .from("invoices")
            .select("*")
            .eq("hotel_id", hotelId)
            .order("issued_at", { ascending: false });

        if (error) {
            console.error("Invoice loading error:", error);
            showMessage("Could not load invoices: " + error.message, "error");
            renderEmpty("Unable to load invoices.");
            return;
        }

        allInvoices = invoices || [];

        const stayIds = [...new Set(
            allInvoices.map((item) => item.stay_id).filter(Boolean)
        )];

        const invoiceIds = allInvoices.map((item) => item.id);

        staysById = {};
        guestsById = {};
        invoiceItems = [];

        if (stayIds.length) {
            const { data: stays, error: staysError } = await supabase
                .from("stays")
                .select("id, hotel_id, guest_id, stay_number, room_id")
                .eq("hotel_id", hotelId)
                .in("id", stayIds);

            if (staysError) {
                console.error("Stay loading error:", staysError);
            }

            (stays || []).forEach((stay) => {
                staysById[String(stay.id)] = stay;
            });

            const guestIds = [...new Set(
                (stays || []).map((stay) => stay.guest_id).filter(Boolean)
            )];

            if (guestIds.length) {
                const { data: guests, error: guestsError } = await supabase
                    .from("guests")
                    .select("id, hotel_id, first_name, last_name, full_name, phone, email")
                    .eq("hotel_id", hotelId)
                    .in("id", guestIds);

                if (guestsError) {
                    console.error("Guest loading error:", guestsError);
                }

                (guests || []).forEach((guest) => {
                    guestsById[String(guest.id)] = guest;
                });
            }
        }

        if (invoiceIds.length) {
            const { data: items, error: itemsError } = await supabase
                .from("invoice_items")
                .select("*")
                .eq("hotel_id", hotelId)
                .in("invoice_id", invoiceIds)
                .order("id", { ascending: true });

            if (itemsError) {
                console.error("Invoice items error:", itemsError);
            }

            invoiceItems = items || [];
        }

        renderInvoices();
        showMessage(
            `${allInvoices.length} invoice(s) loaded.`,
            "success"
        );
    }

    /* ----------------------------------
       FILTERING
    ---------------------------------- */

    function getFilteredInvoices() {
        const search = ($("invoiceSearch")?.value || "")
            .trim()
            .toLowerCase();

        const statusFilter = $("invoiceStatusFilter")?.value || "";
        const fromDate = $("invoiceFromDate")?.value || "";
        const toDate = $("invoiceToDate")?.value || "";

        return allInvoices.filter((invoice) => {
            const stay = staysById[String(invoice.stay_id)];
            const guestName = getGuestName(stay?.guest_id);

            const searchable = [
                invoice.invoice_number,
                guestName,
                stay?.stay_number
            ].filter(Boolean).join(" ").toLowerCase();

            if (search && !searchable.includes(search)) return false;

            if (
                statusFilter &&
                getInvoiceStatus(invoice) !== statusFilter
            ) {
                return false;
            }

            const date = invoice.issued_at
                ? String(invoice.issued_at).slice(0, 10)
                : "";

            if (fromDate && (!date || date < fromDate)) return false;
            if (toDate && (!date || date > toDate)) return false;

            return true;
        });
    }

    /* ----------------------------------
       SUMMARY CARDS
    ---------------------------------- */

    function renderStats() {
        const totalCount = allInvoices.length;

        const paidCount = allInvoices.filter(
            (invoice) => getInvoiceStatus(invoice) === "paid"
        ).length;

        const pendingCount = allInvoices.filter(
            (invoice) => getInvoiceStatus(invoice) !== "paid"
        ).length;

        const outstanding = allInvoices.reduce((sum, invoice) => {
            const balance = invoice.balance_due == null
                ? Number(invoice.total || 0) -
                  Number(invoice.amount_paid || 0)
                : Number(invoice.balance_due);

            return sum + Math.max(0, balance);
        }, 0);

        if ($("invoiceCount")) {
            $("invoiceCount").textContent = totalCount;
        }

        if ($("paidInvoiceCount")) {
            $("paidInvoiceCount").textContent = paidCount;
        }

        if ($("pendingInvoiceCount")) {
            $("pendingInvoiceCount").textContent = pendingCount;
        }

        if ($("outstandingInvoiceAmount")) {
            $("outstandingInvoiceAmount").textContent = money(outstanding);
        }
    }

    /* ----------------------------------
       INVOICE TABLE
    ---------------------------------- */

    function renderEmpty(message) {
        const tbody = $("invoicesTableBody");
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center;padding:28px;">
                    ${escapeHtml(message)}
                </td>
            </tr>
        `;
    }

    function renderInvoices() {
        renderStats();

        const tbody = $("invoicesTableBody");
        if (!tbody) return;

        const invoices = getFilteredInvoices();

        if (!invoices.length) {
            renderEmpty(
                allInvoices.length
                    ? "No invoices match your search or filters."
                    : "No invoices have been created yet."
            );
            return;
        }

        tbody.innerHTML = invoices.map((invoice) => {
            const stay = staysById[String(invoice.stay_id)];
            const guestName = getGuestName(stay?.guest_id);
            const status = getInvoiceStatus(invoice);
            const total = Number(invoice.total || 0);
            const paid = Number(invoice.amount_paid || 0);
            const balance = invoice.balance_due == null
                ? Math.max(0, total - paid)
                : Math.max(0, Number(invoice.balance_due));

            return `
                <tr>
                    <td>
                        <strong>${escapeHtml(invoice.invoice_number || "INV-" + invoice.id)}</strong>
                    </td>
                    <td>${escapeHtml(guestName)}</td>
                    <td>${escapeHtml(formatDate(invoice.issued_at || invoice.created_at))}</td>
                    <td>${escapeHtml(money(total))}</td>
                    <td>${escapeHtml(money(paid))}</td>
                    <td>${escapeHtml(money(balance))}</td>
                    <td>${statusBadge(status)}</td>
                    <td>
                        <button type="button"
                            data-invoice-view="${escapeHtml(invoice.id)}">
                            View
                        </button>
                        <button type="button"
                            data-invoice-print="${escapeHtml(invoice.id)}">
                            Print
                        </button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    /* ----------------------------------
       INVOICE ITEM HELPERS
    ---------------------------------- */

    function getItemsForInvoice(invoiceId) {
        return invoiceItems.filter(
            (item) => String(item.invoice_id) === String(invoiceId)
        );
    }

    function renderItemRows(items) {
        if (!items.length) {
            return `
                <tr>
                    <td colspan="4">No itemized charges are recorded.</td>
                </tr>
            `;
        }

        return items.map((item) => `
            <tr>
                <td>${escapeHtml(item.description || item.item_type || "Charge")}</td>
                <td>${escapeHtml(item.quantity ?? 1)}</td>
                <td>${escapeHtml(money(item.unit_price))}</td>
                <td>${escapeHtml(money(item.total))}</td>
            </tr>
        `).join("");
    }

    /* ----------------------------------
       INVOICE DETAILS MODAL
    ---------------------------------- */

    function ensureDetailsModal() {
        let modal = $("invoiceDetailsModal");

        if (modal) return modal;

        modal = document.createElement("div");
        modal.id = "invoiceDetailsModal";

        modal.style.cssText = `
            display:none;
            position:fixed;
            inset:0;
            z-index:10000;
            background:rgba(20,15,40,.6);
            overflow-y:auto;
            padding:24px;
            box-sizing:border-box;
        `;

        modal.innerHTML = `
            <div style="
                max-width:850px;
                margin:20px auto;
                padding:24px;
                border-radius:14px;
                background:#fff;
                box-shadow:0 15px 50px rgba(0,0,0,.2);
            ">
                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:12px;
                    margin-bottom:20px;
                ">
                    <h2 style="margin:0;color:#29243a;">Invoice Details</h2>
                    <button type="button" id="closeInvoiceDetailsButton"
                        style="padding:9px 13px;cursor:pointer;">
                        Close
                    </button>
                </div>
                <div id="invoiceDetailsContent"></div>
                <button type="button" id="modalPrintInvoiceButton"
                    style="margin-top:16px;padding:11px 16px;cursor:pointer;">
                    Print Invoice
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        $("closeInvoiceDetailsButton").addEventListener("click", () => {
            modal.style.display = "none";
        });

        modal.addEventListener("click", (event) => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });

        $("modalPrintInvoiceButton").addEventListener("click", () => {
            if (selectedInvoice) printInvoice(selectedInvoice);
        });

        return modal;
    }

    function buildInvoiceHTML(invoice) {
        const stay = staysById[String(invoice.stay_id)];
        const guest = guestsById[String(stay?.guest_id)] || {};
        const guestName = getGuestName(stay?.guest_id);
        const items = getItemsForInvoice(invoice.id);

        const subtotal = Number(invoice.subtotal || 0);
        const tax = Number(invoice.tax || 0);
        const discount = Number(invoice.discount || 0);
        const total = Number(invoice.total || 0);
        const paid = Number(invoice.amount_paid || 0);
        const balance = invoice.balance_due == null
            ? Math.max(0, total - paid)
            : Math.max(0, Number(invoice.balance_due));

        return `
            <div class="print-invoice" style="color:#29243a;">
                <div style="text-align:center;margin-bottom:24px;">
                    <h2 style="margin-bottom:8px;">
                        ${escapeHtml(hotelInfo.name || "Hotel")}
                    </h2>
                    <p style="margin:4px 0;">
                        ${escapeHtml(hotelInfo.address || "")}
                    </p>
                    <p style="margin:4px 0;">
                        ${escapeHtml([hotelInfo.city, hotelInfo.state, hotelInfo.country]
                            .filter(Boolean).join(", "))}
                    </p>
                    <p style="margin:4px 0;">
                        ${escapeHtml(hotelInfo.phone || "")}
                        ${hotelInfo.email ? " | " + escapeHtml(hotelInfo.email) : ""}
                    </p>
                    ${hotelInfo.tax_number ? `
                        <p style="margin:4px 0;">
                            Tax Number: ${escapeHtml(hotelInfo.tax_number)}
                        </p>
                    ` : ""}
                    <h3 style="margin-top:24px;">INVOICE</h3>
                </div>

                <div style="
                    display:grid;
                    grid-template-columns:repeat(2,minmax(0,1fr));
                    gap:16px;
                    margin-bottom:24px;
                ">
                    <div>
                        <strong>Invoice Number</strong>
                        <p>${escapeHtml(invoice.invoice_number || "INV-" + invoice.id)}</p>
                        <strong>Invoice Date</strong>
                        <p>${escapeHtml(formatDate(invoice.issued_at || invoice.created_at))}</p>
                    </div>
                    <div>
                        <strong>Guest Name</strong>
                        <p>${escapeHtml(guestName)}</p>
                        <strong>Stay Number</strong>
                        <p>${escapeHtml(stay?.stay_number || "—")}</p>
                        <strong>Phone</strong>
                        <p>${escapeHtml(guest.phone || "—")}</p>
                    </div>
                </div>

                <table style="width:100%;border-collapse:collapse;margin:20px 0;">
                    <thead>
                        <tr>
                            <th style="text-align:left;padding:10px;border-bottom:1px solid #ddd;">Description</th>
                            <th style="text-align:right;padding:10px;border-bottom:1px solid #ddd;">Qty</th>
                            <th style="text-align:right;padding:10px;border-bottom:1px solid #ddd;">Unit Price</th>
                            <th style="text-align:right;padding:10px;border-bottom:1px solid #ddd;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${items.length ? items.map((item) => `
                            <tr>
                                <td style="padding:10px;border-bottom:1px solid #eee;">
                                    ${escapeHtml(item.description || item.item_type || "Charge")}
                                </td>
                                <td style="padding:10px;text-align:right;border-bottom:1px solid #eee;">
                                    ${escapeHtml(item.quantity ?? 1)}
                                </td>
                                <td style="padding:10px;text-align:right;border-bottom:1px solid #eee;">
                                    ${escapeHtml(money(item.unit_price))}
                                </td>
                                <td style="padding:10px;text-align:right;border-bottom:1px solid #eee;">
                                    ${escapeHtml(money(item.total))}
                                </td>
                            </tr>
                        `).join("") : `
                            <tr>
                                <td colspan="4" style="padding:12px;">
                                    No itemized charges recorded.
                                </td>
                            </tr>
                        `}
                    </tbody>
                </table>

                <div style="max-width:340px;margin-left:auto;">
                    <p style="display:flex;justify-content:space-between;gap:12px;">
                        <span>Subtotal</span><strong>${escapeHtml(money(subtotal))}</strong>
                    </p>
                    <p style="display:flex;justify-content:space-between;gap:12px;">
                        <span>Tax</span><strong>${escapeHtml(money(tax))}</strong>
                    </p>
                    <p style="display:flex;justify-content:space-between;gap:12px;">
                        <span>Discount</span><strong>−${escapeHtml(money(discount))}</strong>
                    </p>
                    <hr>
                    <p style="display:flex;justify-content:space-between;gap:12px;font-size:18px;">
                        <strong>Grand Total</strong><strong>${escapeHtml(money(total))}</strong>
                    </p>
                    <p style="display:flex;justify-content:space-between;gap:12px;">
                        <span>Amount Paid</span><strong>${escapeHtml(money(paid))}</strong>
                    </p>
                    <p style="display:flex;justify-content:space-between;gap:12px;">
                        <strong>Balance Due</strong><strong>${escapeHtml(money(balance))}</strong>
                    </p>
                    <p>
                        Payment Status:
                        <strong>${escapeHtml(statusLabel(getInvoiceStatus(invoice)))}</strong>
                    </p>
                </div>

                <p style="text-align:center;margin-top:32px;color:#666;">
                    Thank you for staying with ${escapeHtml(hotelInfo.name || "us")}!
                </p>
            </div>
        `;
    }

    function viewInvoice(invoiceId) {
        const invoice = allInvoices.find(
            (item) => String(item.id) === String(invoiceId)
        );

        if (!invoice) {
            showMessage("Invoice not found.", "error");
            return;
        }

        selectedInvoice = invoice;

        const modal = ensureDetailsModal();
        $("invoiceDetailsContent").innerHTML = buildInvoiceHTML(invoice);
        modal.style.display = "block";
    }

    /* ----------------------------------
       PRINT INVOICE
    ---------------------------------- */

    function printInvoice(invoice) {
        const printWindow = window.open("", "_blank");

        if (!printWindow) {
            showMessage(
                "Your browser blocked the print window. Allow pop-ups and try again.",
                "error"
            );
            return;
        }

        const content = buildInvoiceHTML(invoice);
        const title = escapeHtml(
            invoice.invoice_number || "INV-" + invoice.id
        );

        printWindow.document.open();
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>${title}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        color: #29243a;
                        padding: 24px;
                        margin: 0;
                    }
                    table { width: 100%; }
                    th, td { font-size: 12px; }
                    p { line-height: 1.5; }
                    @page { size: A4; margin: 15mm; }
                    @media print {
                        body { padding: 0; }
                        .print-invoice { border: none !important; }
                    }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        printWindow.document.close();

        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    }

    /* ----------------------------------
       EVENTS
    ---------------------------------- */

    $("invoicesTableBody")?.addEventListener("click", (event) => {
        const viewButton = event.target.closest("[data-invoice-view]");
        const printButton = event.target.closest("[data-invoice-print]");

        if (viewButton) {
            viewInvoice(viewButton.dataset.invoiceView);
        }

        if (printButton) {
            const invoice = allInvoices.find(
                (item) => String(item.id) === String(printButton.dataset.invoicePrint)
            );

            if (invoice) printInvoice(invoice);
        }
    });

    $("invoiceSearch")?.addEventListener("input", renderInvoices);

    $("invoiceStatusFilter")?.addEventListener("change", renderInvoices);

    $("invoiceFromDate")?.addEventListener("change", renderInvoices);

    $("invoiceToDate")?.addEventListener("change", renderInvoices);

    $("filterInvoicesButton")?.addEventListener("click", renderInvoices);

    $("resetInvoiceFiltersButton")?.addEventListener("click", () => {
        if ($("invoiceSearch")) $("invoiceSearch").value = "";
        if ($("invoiceStatusFilter")) $("invoiceStatusFilter").value = "";
        if ($("invoiceFromDate")) $("invoiceFromDate").value = "";
        if ($("invoiceToDate")) $("invoiceToDate").value = "";

        renderInvoices();
    });

    $("refreshInvoicesButton")?.addEventListener("click", loadInvoices);

    /* ----------------------------------
       START
    ---------------------------------- */

    initializeInvoices().catch((error) => {
        console.error("Invoice initialization error:", error);
        showMessage("An unexpected error occurred while loading invoices.", "error");
    });
});