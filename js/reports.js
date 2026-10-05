// =====================================================
// STAR HOTELS - REPORTS
// =====================================================

(function () {

    console.log("REPORTS.JS LOADED");

    let db = null;
    let hotelId = null;

    // -------------------------------------------------
    // ELEMENTS
    // -------------------------------------------------

    const monthlyEarnings =
        document.getElementById("monthlyEarnings");

    const totalEarnings =
        document.getElementById("totalEarnings");

    const pendingAmount =
        document.getElementById("pendingAmount");

    const monthlyProfit =
        document.getElementById("monthlyProfit");

    const roomRevenue =
        document.getElementById("roomRevenue");

    const restaurantRevenue =
        document.getElementById("restaurantRevenue");

    const invoiceCount =
        document.getElementById("invoiceCount");

    const expenseAmount =
        document.getElementById("expenseAmount");

    const totalBilled =
        document.getElementById("totalBilled");

    const monthlyPayments =
        document.getElementById("monthlyPayments");

    const tableRoomRevenue =
        document.getElementById("tableRoomRevenue");

    const tableRestaurantRevenue =
        document.getElementById("tableRestaurantRevenue");

    const tablePending =
        document.getElementById("tablePending");

    const tableProfit =
        document.getElementById("tableProfit");

    const reportMessage =
        document.getElementById("reportMessage");

    const reportMonth =
        document.getElementById("reportMonth");

    const refreshReports =
        document.getElementById("refreshReports");


    // -------------------------------------------------
    // FORMAT MONEY
    // -------------------------------------------------

    function formatMoney(value) {

        const amount = Number(value || 0);

        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2
        }).format(amount);
    }


    // -------------------------------------------------
    // MESSAGE
    // -------------------------------------------------

    function showMessage(message, type = "error") {

        if (!reportMessage) return;

        reportMessage.textContent = message;

        reportMessage.className =
            "report-message " + type;
    }


    function hideMessage() {

        if (!reportMessage) return;

        reportMessage.textContent = "";

        reportMessage.className =
            "report-message";
    }


    // -------------------------------------------------
    // GET MONTH RANGE
    // -------------------------------------------------

    function getMonthRange(type) {

        const now = new Date();

        let year = now.getFullYear();
        let month = now.getMonth();

        if (type === "previous") {

            month--;

            if (month < 0) {
                month = 11;
                year--;
            }
        }

        const start =
            new Date(year, month, 1);

        const end =
            new Date(year, month + 1, 1);

        return {
            start: start.toISOString(),
            end: end.toISOString(),
            year,
            month
        };
    }


    // -------------------------------------------------
    // GET HOTEL
    // -------------------------------------------------

    async function getHotelId() {

        if (!db) {
            throw new Error(
                "Supabase client is not available."
            );
        }

        const {
            data: sessionData,
            error: sessionError
        } = await db.auth.getSession();

        if (sessionError) {
            throw sessionError;
        }

        const user =
            sessionData?.session?.user;

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
            .select("hotel_id, full_name")
            .eq("id", user.id)
            .single();


        if (profileError) {
            throw profileError;
        }


        if (!profile?.hotel_id) {

            throw new Error(
                "Your account is not connected to a hotel."
            );
        }


        hotelId =
            profile.hotel_id;


        // Get hotel name

        const {
            data: hotel
        } = await db
            .from("hotels")
            .select("name")
            .eq("id", hotelId)
            .single();


        const hotelName =
            document.getElementById(
                "hotelReportName"
            );

        if (hotelName) {

            hotelName.textContent =
                hotel?.name ||
                "Hotel Report";
        }


        return hotelId;
    }


    // -------------------------------------------------
    // LOAD REPORT
    // -------------------------------------------------

    async function loadReport() {

        try {

            hideMessage();

            if (!db) {

                db =
                    window.supabaseClient;

                if (!db) {

                    throw new Error(
                        "Supabase client not found."
                    );
                }
            }


            await getHotelId();

            if (!hotelId) return;


            const range =
                getMonthRange(
                    reportMonth?.value ||
                    "current"
                );


            // -----------------------------------------
            // MONTHLY INVOICES
            // -----------------------------------------

            const {
                data: invoices,
                error: invoiceError
            } = await db
                .from("invoices")
                .select(`
                    id,
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
                .eq("hotel_id", hotelId)
                .gte("created_at", range.start)
                .lt("created_at", range.end);


            if (invoiceError) {
                throw invoiceError;
            }


            const invoiceList =
                invoices || [];


            // -----------------------------------------
            // CALCULATE INVOICE TOTALS
            // -----------------------------------------

            let billed = 0;
            let invoicePaid = 0;
            let invoicePending = 0;


            invoiceList.forEach(invoice => {

                billed +=
                    Number(invoice.total || 0);

                invoicePaid +=
                    Number(invoice.amount_paid || 0);

                invoicePending +=
                    Number(invoice.balance_due || 0);

            });


            // -----------------------------------------
            // MONTHLY PAYMENTS
            // -----------------------------------------

            const {
                data: payments,
                error: paymentError
            } = await db
                .from("payments")
                .select(`
                    id,
                    amount,
                    payment_method,
                    invoice_id,
                    created_at
                `)
                .eq("hotel_id", hotelId)
                .gte("created_at", range.start)
                .lt("created_at", range.end);


            if (paymentError) {
                throw paymentError;
            }


            const paymentList =
                payments || [];


            let monthPayments = 0;


            paymentList.forEach(payment => {

                monthPayments +=
                    Number(payment.amount || 0);

            });


            // -----------------------------------------
            // ALL-TIME PAYMENTS
            // -----------------------------------------

            const {
                data: allPayments,
                error: allPaymentError
            } = await db
                .from("payments")
                .select("amount")
                .eq("hotel_id", hotelId);


            if (allPaymentError) {
                throw allPaymentError;
            }


            let allTimeEarnings = 0;


            (allPayments || []).forEach(payment => {

                allTimeEarnings +=
                    Number(payment.amount || 0);

            });


            // -----------------------------------------
            // INVOICE ITEMS
            // -----------------------------------------

            const {
                data: items,
                error: itemError
            } = await db
                .from("invoice_items")
                .select(`
                    id,
                    invoice_id,
                    description,
                    quantity,
                    unit_price,
                    total,
                    item_type,
                    created_at
                `)
                .eq("hotel_id", hotelId)
                .gte("created_at", range.start)
                .lt("created_at", range.end);


            if (itemError) {
                throw itemError;
            }


            let rooms = 0;
            let restaurant = 0;


            (items || []).forEach(item => {

                const amount =
                    Number(item.total || 0);

                const type =
                    String(
                        item.item_type || ""
                    ).toUpperCase();


                if (
                    type.includes("ROOM") ||
                    type.includes("STAY")
                ) {

                    rooms += amount;

                } else if (
                    type.includes("RESTAURANT") ||
                    type.includes("FOOD") ||
                    type.includes("ORDER")
                ) {

                    restaurant += amount;

                }

            });


            // -----------------------------------------
            // PROFIT
            // -----------------------------------------

            /*
             * There is currently no confirmed
             * expenses table in your database.
             *
             * Therefore we cannot calculate REAL
             * net profit.
             *
             * For now:
             *
             * Profit Before Expenses =
             * Monthly Payments Received
             */

            const expenses = 0;

            const profitBeforeExpenses =
                monthPayments - expenses;


            // -----------------------------------------
            // UPDATE UI
            // -----------------------------------------

            if (monthlyEarnings) {

                monthlyEarnings.textContent =
                    formatMoney(monthPayments);
            }


            if (totalEarnings) {

                totalEarnings.textContent =
                    formatMoney(allTimeEarnings);
            }


            if (pendingAmount) {

                pendingAmount.textContent =
                    formatMoney(invoicePending);
            }


            if (monthlyProfit) {

                monthlyProfit.textContent =
                    formatMoney(
                        profitBeforeExpenses
                    );
            }


            if (roomRevenue) {

                roomRevenue.textContent =
                    formatMoney(rooms);
            }


            if (restaurantRevenue) {

                restaurantRevenue.textContent =
                    formatMoney(restaurant);
            }


            if (invoiceCount) {

                invoiceCount.textContent =
                    invoiceList.length;
            }


            if (expenseAmount) {

                expenseAmount.textContent =
                    formatMoney(expenses);
            }


            if (totalBilled) {

                totalBilled.textContent =
                    formatMoney(billed);
            }


            if (monthlyPayments) {

                monthlyPayments.textContent =
                    formatMoney(monthPayments);
            }


            if (tableRoomRevenue) {

                tableRoomRevenue.textContent =
                    formatMoney(rooms);
            }


            if (tableRestaurantRevenue) {

                tableRestaurantRevenue.textContent =
                    formatMoney(restaurant);
            }


            if (tablePending) {

                tablePending.textContent =
                    formatMoney(invoicePending);
            }


            if (tableProfit) {

                tableProfit.textContent =
                    formatMoney(
                        profitBeforeExpenses
                    );
            }


            showMessage(
                "Report updated successfully.",
                "success"
            );


            console.log(
                "REPORT LOADED",
                {
                    hotelId,
                    monthPayments,
                    allTimeEarnings,
                    billed,
                    invoicePending,
                    rooms,
                    restaurant,
                    profitBeforeExpenses
                }
            );


        } catch (error) {

            console.error(
                "REPORT ERROR:",
                error
            );


            showMessage(
                "Unable to load report: " +
                (error.message || error),
                "error"
            );
        }
    }


    // -------------------------------------------------
    // EVENTS
    // -------------------------------------------------

    if (refreshReports) {

        refreshReports.addEventListener(
            "click",
            loadReport
        );
    }


    if (reportMonth) {

        reportMonth.addEventListener(
            "change",
            loadReport
        );
    }


    // -------------------------------------------------
    // START
    // -------------------------------------------------

    document.addEventListener(
        "DOMContentLoaded",
        function () {

            db =
                window.supabaseClient;

            loadReport();

        }
    );

})();