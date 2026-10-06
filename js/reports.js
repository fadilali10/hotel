// =====================================================
// STAR HOTELS - REPORTS
// Complete Reports Module
// =====================================================

(function () {

    "use strict";


    console.log("=================================");
    console.log("STAR HOTELS - REPORTS.JS");
    console.log("=================================");


    // =====================================================
    // GLOBAL STATE
    // =====================================================

    let db = null;

    let hotelId = null;

    let hotelInfo = {};

    let hotelCurrency = "INR";


    // =====================================================
    // DOM HELPERS
    // =====================================================

    function $(id) {
        return document.getElementById(id);
    }


    // =====================================================
    // ELEMENTS
    // =====================================================

    const monthlyEarnings =
        $("monthlyEarnings");

    const totalEarnings =
        $("totalEarnings");

    const pendingAmount =
        $("pendingAmount");

    const monthlyProfit =
        $("monthlyProfit");

    const roomRevenue =
        $("roomRevenue");

    const restaurantRevenue =
        $("restaurantRevenue");

    const invoiceCount =
        $("invoiceCount");

    const expenseAmount =
        $("expenseAmount");

    const totalBilled =
        $("totalBilled");

    const monthlyPayments =
        $("monthlyPayments");

    const tableRoomRevenue =
        $("tableRoomRevenue");

    const tableRestaurantRevenue =
        $("tableRestaurantRevenue");

    const tablePending =
        $("tablePending");

    const tableProfit =
        $("tableProfit");

    const reportMessage =
        $("reportMessage");

    const reportMonth =
        $("reportMonth");

    const refreshReports =
        $("refreshReports");

    const topUserName =
        $("topUserName");

    const hotelReportName =
        $("hotelReportName");


    // =====================================================
    // MONEY FORMATTER
    // =====================================================

    function formatMoney(value) {

        const amount =
            Number(value || 0);


        return new Intl.NumberFormat(
            "en-IN",
            {
                style: "currency",

                currency:
                    hotelCurrency || "INR",

                maximumFractionDigits: 2
            }
        ).format(amount);

    }


    // =====================================================
    // NUMBER
    // =====================================================

    function number(value) {

        const result =
            Number(value);

        return Number.isFinite(result)
            ? result
            : 0;

    }


    // =====================================================
    // MESSAGE
    // =====================================================

    function showMessage(
        message,
        type = "info"
    ) {

        if (!reportMessage) {
            return;
        }


        reportMessage.textContent =
            message;


        reportMessage.className =
            "report-message " +
            type;

    }


    function hideMessage() {

        if (!reportMessage) {
            return;
        }


        reportMessage.textContent =
            "";

        reportMessage.className =
            "report-message";

    }


    // =====================================================
    // BUTTON LOADING
    // =====================================================

    function setRefreshLoading(isLoading) {

        if (!refreshReports) {
            return;
        }


        refreshReports.disabled =
            isLoading;


        refreshReports.textContent =
            isLoading
                ? "Loading..."
                : "↻ Refresh";

    }


    // =====================================================
    // GET MONTH RANGE
    // =====================================================

    function getMonthRange(type) {

        const now =
            new Date();


        let year =
            now.getFullYear();

        let month =
            now.getMonth();


        if (type === "previous") {

            month -= 1;


            if (month < 0) {

                month = 11;

                year -= 1;

            }

        }


        const start =
            new Date(
                year,
                month,
                1,
                0,
                0,
                0,
                0
            );


        const end =
            new Date(
                year,
                month + 1,
                1,
                0,
                0,
                0,
                0
            );


        return {

            start:
                start.toISOString(),

            end:
                end.toISOString(),

            year,

            month

        };

    }


    // =====================================================
    // GET HOTEL / PROFILE
    // =====================================================

    async function getHotelInformation() {

        if (!db) {

            throw new Error(
                "Supabase client is not available."
            );

        }


        const {
            data: sessionData,
            error: sessionError
        } =
            await db.auth.getSession();


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


        // -------------------------------------------------
        // PROFILE
        // -------------------------------------------------

        const {
            data: profile,
            error: profileError
        } =
            await db
                .from("profiles")
                .select(`
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


        if (!profile?.hotel_id) {

            throw new Error(
                "Your account is not connected to a hotel."
            );

        }


        hotelId =
            profile.hotel_id;


        // -------------------------------------------------
        // USER NAME
        // -------------------------------------------------

        if (topUserName) {

            topUserName.textContent =
                profile.full_name ||
                user.email?.split("@")[0] ||
                "User";

        }


        // -------------------------------------------------
        // HOTEL
        // -------------------------------------------------

        const {
            data: hotel,
            error: hotelError
        } =
            await db
                .from("hotels")
                .select(`
                    id,
                    name,
                    currency
                `)
                .eq(
                    "id",
                    hotelId
                )
                .maybeSingle();


        if (hotelError) {

            console.warn(
                "Hotel information warning:",
                hotelError
            );

        }


        hotelInfo =
            hotel || {};


        hotelCurrency =
            hotelInfo.currency ||
            "INR";


        // -------------------------------------------------
        // HOTEL NAME
        // -------------------------------------------------

        if (hotelReportName) {

            hotelReportName.textContent =
                hotelInfo.name ||
                "Hotel Report";

        }


        return hotelId;

    }


    // =====================================================
    // LOAD REPORT
    // =====================================================

    async function loadReport() {

        try {

            setRefreshLoading(true);

            hideMessage();


            // -------------------------------------------------
            // SUPABASE
            // -------------------------------------------------

            db =
                window.supabaseClient;


            if (!db) {

                throw new Error(
                    "Supabase client not found. Please refresh the page."
                );

            }


            // -------------------------------------------------
            // HOTEL
            // -------------------------------------------------

            const currentHotel =
                await getHotelInformation();


            if (!currentHotel) {
                return;
            }


            // -------------------------------------------------
            // DATE RANGE
            // -------------------------------------------------

            const range =
                getMonthRange(
                    reportMonth?.value ||
                    "current"
                );


            console.log(
                "Report range:",
                range
            );


            // =================================================
            // LOAD MONTHLY INVOICES
            // =================================================

            const {
                data: invoices,
                error: invoiceError
            } =
                await db
                    .from("invoices")
                    .select(`
                        id,
                        hotel_id,
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
                    .gte(
                        "created_at",
                        range.start
                    )
                    .lt(
                        "created_at",
                        range.end
                    );


            if (invoiceError) {
                throw invoiceError;
            }


            const invoiceList =
                invoices || [];


            // =================================================
            // INVOICE TOTALS
            // =================================================

            let billed =
                0;

            let invoicePending =
                0;


            invoiceList.forEach(
                function (invoice) {

                    billed +=
                        number(
                            invoice.total
                        );


                    let balance;


                    if (
                        invoice.balance_due !== null &&
                        invoice.balance_due !== undefined
                    ) {

                        balance =
                            number(
                                invoice.balance_due
                            );

                    } else {

                        balance =
                            Math.max(
                                0,
                                number(invoice.total) -
                                number(invoice.amount_paid)
                            );

                    }


                    invoicePending +=
                        Math.max(
                            0,
                            balance
                        );

                }
            );


            // =================================================
            // MONTHLY PAYMENTS
            // =================================================

            const {
                data: payments,
                error: paymentError
            } =
                await db
                    .from("payments")
                    .select(`
                        id,
                        amount,
                        payment_method,
                        invoice_id,
                        created_at
                    `)
                    .eq(
                        "hotel_id",
                        hotelId
                    )
                    .gte(
                        "created_at",
                        range.start
                    )
                    .lt(
                        "created_at",
                        range.end
                    );


            if (paymentError) {
                throw paymentError;
            }


            const paymentList =
                payments || [];


            let monthPayments =
                0;


            paymentList.forEach(
                function (payment) {

                    monthPayments +=
                        number(
                            payment.amount
                        );

                }
            );


            // =================================================
            // ALL-TIME PAYMENTS
            // =================================================

            const {
                data: allPayments,
                error: allPaymentError
            } =
                await db
                    .from("payments")
                    .select(`
                        id,
                        amount
                    `)
                    .eq(
                        "hotel_id",
                        hotelId
                    );


            if (allPaymentError) {
                throw allPaymentError;
            }


            let allTimeEarnings =
                0;


            (allPayments || [])
                .forEach(
                    function (payment) {

                        allTimeEarnings +=
                            number(
                                payment.amount
                            );

                    }
                );


            // =================================================
            // LOAD INVOICE ITEMS
            // =================================================

            const {
                data: items,
                error: itemError
            } =
                await db
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
                    .gte(
                        "created_at",
                        range.start
                    )
                    .lt(
                        "created_at",
                        range.end
                    );


            if (itemError) {
                throw itemError;
            }


            let rooms =
                0;

            let restaurant =
                0;


            (items || [])
                .forEach(
                    function (item) {

                        const amount =
                            number(
                                item.total
                            );


                        const type =
                            String(
                                item.item_type ||
                                ""
                            )
                                .trim()
                                .toUpperCase();


                        const description =
                            String(
                                item.description ||
                                ""
                            )
                                .trim()
                                .toUpperCase();


                        // -------------------------------------------------
                        // ROOM / STAY
                        // -------------------------------------------------

                        if (

                            type.includes("ROOM") ||

                            type.includes("STAY") ||

                            description.includes("ROOM") ||

                            description.includes("STAY")

                        ) {

                            rooms +=
                                amount;

                            return;

                        }


                        // -------------------------------------------------
                        // RESTAURANT
                        // -------------------------------------------------

                        if (

                            type.includes("RESTAURANT") ||

                            type.includes("FOOD") ||

                            type.includes("ORDER") ||

                            description.includes("RESTAURANT") ||

                            description.includes("FOOD") ||

                            description.includes("ORDER")

                        ) {

                            restaurant +=
                                amount;

                        }

                    }
                );


            // =================================================
            // EXPENSES
            // =================================================

            /*
             * No confirmed expenses table is currently
             * available in the Star Hotels schema.
             *
             * Therefore:
             *
             * expenses = 0
             *
             * and:
             *
             * Profit Before Expenses =
             * Payments Received
             */

            const expenses =
                0;


            const profitBeforeExpenses =
                monthPayments -
                expenses;


            // =================================================
            // UPDATE UI
            // =================================================

            if (monthlyEarnings) {

                monthlyEarnings.textContent =
                    formatMoney(
                        monthPayments
                    );

            }


            if (totalEarnings) {

                totalEarnings.textContent =
                    formatMoney(
                        allTimeEarnings
                    );

            }


            if (pendingAmount) {

                pendingAmount.textContent =
                    formatMoney(
                        invoicePending
                    );

            }


            if (monthlyProfit) {

                monthlyProfit.textContent =
                    formatMoney(
                        profitBeforeExpenses
                    );

            }


            if (roomRevenue) {

                roomRevenue.textContent =
                    formatMoney(
                        rooms
                    );

            }


            if (restaurantRevenue) {

                restaurantRevenue.textContent =
                    formatMoney(
                        restaurant
                    );

            }


            if (invoiceCount) {

                invoiceCount.textContent =
                    invoiceList.length;

            }


            if (expenseAmount) {

                expenseAmount.textContent =
                    formatMoney(
                        expenses
                    );

            }


            if (totalBilled) {

                totalBilled.textContent =
                    formatMoney(
                        billed
                    );

            }


            if (monthlyPayments) {

                monthlyPayments.textContent =
                    formatMoney(
                        monthPayments
                    );

            }


            if (tableRoomRevenue) {

                tableRoomRevenue.textContent =
                    formatMoney(
                        rooms
                    );

            }


            if (tableRestaurantRevenue) {

                tableRestaurantRevenue.textContent =
                    formatMoney(
                        restaurant
                    );

            }


            if (tablePending) {

                tablePending.textContent =
                    formatMoney(
                        invoicePending
                    );

            }


            if (tableProfit) {

                tableProfit.textContent =
                    formatMoney(
                        profitBeforeExpenses
                    );

            }


            // =================================================
            // SUCCESS
            // =================================================

            const monthName =
                new Date(
                    range.year,
                    range.month,
                    1
                ).toLocaleDateString(
                    "en-IN",
                    {
                        month: "long",
                        year: "numeric"
                    }
                );


            showMessage(
                `Report updated successfully for ${monthName}.`,
                "success"
            );


            console.log(
                "✓ REPORT LOADED",
                {
                    hotelId,
                    hotelName:
                        hotelInfo.name,

                    month:
                        monthName,

                    monthlyPayments:
                        monthPayments,

                    allTimeEarnings,

                    billed,

                    invoicePending,

                    roomRevenue:
                        rooms,

                    restaurantRevenue:
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
                (
                    error?.message ||
                    "Unknown error"
                ),
                "error"
            );

        } finally {

            setRefreshLoading(false);

        }

    }


    // =====================================================
    // MOBILE SIDEBAR
    // =====================================================

    function setupMobileMenu() {

        const mobileMenu =
            $("mobileMenu");

        const sidebar =
            $("sidebar");

        const backdrop =
            $("sidebarBackdrop");


        if (
            !mobileMenu ||
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


        mobileMenu.addEventListener(
            "click",
            function () {

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


        document
            .querySelectorAll(
                ".sidebar .nav-item"
            )
            .forEach(
                function (link) {

                    link.addEventListener(
                        "click",
                        closeSidebar
                    );

                }
            );

    }


    // =====================================================
    // AUTH STATE
    // =====================================================

    function setupAuthListener() {

        if (!db) {
            return;
        }


        db.auth.onAuthStateChange(
            function (
                event,
                session
            ) {

                console.log(
                    "REPORTS AUTH EVENT:",
                    event
                );


                if (
                    event === "SIGNED_OUT"
                ) {

                    window.location.href =
                        "login.html";

                    return;

                }


                /*
                 * Do not reload on TOKEN_REFRESHED.
                 *
                 * SIGNED_IN is handled only if the
                 * page has a valid session.
                 */

                if (
                    event === "SIGNED_IN" &&
                    session?.user
                ) {

                    loadReport();

                }

            }
        );

    }


    // =====================================================
    // EVENTS
    // =====================================================

    function setupEvents() {

        if (refreshReports) {

            refreshReports.addEventListener(
                "click",
                function () {

                    loadReport();

                }
            );

        }


        if (reportMonth) {

            reportMonth.addEventListener(
                "change",
                function () {

                    loadReport();

                }
            );

        }

    }


    // =====================================================
    // INITIALIZE
    // =====================================================

    async function initialize() {

        try {

            db =
                window.supabaseClient;


            if (!db) {

                showMessage(
                    "Supabase client is not available. Please refresh the page.",
                    "error"
                );

                return;

            }


            setupMobileMenu();

            setupEvents();

            setupAuthListener();


            await loadReport();


            console.log(
                "✓ Reports module initialized."
            );

        } catch (error) {

            console.error(
                "Reports initialization error:",
                error
            );


            showMessage(
                "Unable to initialize reports: " +
                (
                    error?.message ||
                    "Unknown error"
                ),
                "error"
            );

        }

    }


    // =====================================================
    // START
    // =====================================================

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initialize
        );

    } else {

        initialize();

    }

})();