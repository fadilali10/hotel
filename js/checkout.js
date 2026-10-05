/* =========================================================
   STAR HOTELS — COMBINED BILLING & CHECKOUT
   File: js/checkout.js

   Includes:
   - Room charges
   - Served, unbilled restaurant orders
   - Optional extra charges
   - Discounts
   - Payments
   - Invoice creation
   - Invoice items
   - Restaurant order billing
   - Checkout
   - Room status update
   - Invoice printing

   IMPORTANT:
   The payments table currently does NOT contain
   a received_by column, so payment insertion does
   NOT send received_by.

   Uses:
   restaurant_order_items.total
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {

  // =====================================================
  // SUPABASE CLIENT
  // =====================================================

  const db = window.supabaseClient;

  if (!db) {
    console.error("❌ Supabase client is unavailable.");
    return;
  }

  console.log("✓ CHECKOUT.JS: Supabase client available");


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

  const required = [
    staySelect,
    checkoutDate,
    discountInput,
    paymentInput,
    paymentMethod,
    paymentReference,
    paymentNotes,
    message,
    preview
  ];

  if (required.some((element) => !element)) {

    console.error(
      "❌ Checkout HTML is missing one or more required element IDs."
    );

    return;
  }


  // =====================================================
  // STATE
  // =====================================================

  let hotelId = null;
  let stays = [];
  let selectedStay = null;
  let currentBill = null;
  let currentInvoice = null;
  let generating = false;


  // =====================================================
  // MONEY
  // =====================================================

  const money = (value) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR"
    }).format(Number(value) || 0);


  const round2 = (value) =>
    Math.round((Number(value) + Number.EPSILON) * 100) / 100;


  // =====================================================
  // HTML ESCAPE
  // =====================================================

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);


  // =====================================================
  // TODAY
  // =====================================================

  function today() {

    const date = new Date();

    date.setMinutes(
      date.getMinutes() - date.getTimezoneOffset()
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
  // MESSAGE
  // =====================================================

  function showMessage(text, isError = false) {

    message.textContent = text || "";

    message.style.color =
      isError
        ? "#b42318"
        : "#167647";
  }


  // =====================================================
  // BUTTON BUSY STATE
  // =====================================================

  function setBusy(
    button,
    busy,
    busyText = "Please wait..."
  ) {

    if (!button) return;

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
  // NUMBER OF NIGHTS
  // =====================================================

  function numberOfNights(start, end) {

    const startTime =
      Date.parse(`${dateOnly(start)}T00:00:00`);

    const endTime =
      Date.parse(`${dateOnly(end)}T00:00:00`);


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


    // Same-day checkout = 1 night
    return Math.max(
      1,
      Math.ceil(
        (endTime - startTime) / 86400000
      )
    );
  }


  // =====================================================
  // GET HOTEL ID
  // =====================================================

  async function getHotelId() {

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


    const {
      data: profile,
      error: profileError
    } = await db
      .from("profiles")
      .select("hotel_id")
      .eq("id", data.user.id)
      .single();


    if (profileError) {
      throw profileError;
    }


    if (!profile?.hotel_id) {

      throw new Error(
        "Your account is not linked to a hotel."
      );
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
        guest_id,
        room_id,
        actual_check_in,
        expected_check_out,
        status
      `)
      .eq("hotel_id", hotelId)
      .eq("status", "ACTIVE")
      .order("actual_check_in", {
        ascending: false
      });


    if (error) {
      throw error;
    }


    const rows = data || [];


    const guestIds = [
      ...new Set(
        rows
          .map((stay) => stay.guest_id)
          .filter(Boolean)
      )
    ];


    const roomIds = [
      ...new Set(
        rows
          .map((stay) => stay.room_id)
          .filter(Boolean)
      )
    ];


    let guests = [];
    let rooms = [];


    // ===================================================
    // GUESTS
    // ===================================================

    if (guestIds.length) {

      const result = await db
        .from("guests")
        .select(
          "id, first_name, last_name, full_name"
        )
        .eq("hotel_id", hotelId)
        .in("id", guestIds);


      if (result.error) {
        throw result.error;
      }


      guests = result.data || [];
    }


    // ===================================================
    // ROOMS
    // ===================================================

    if (roomIds.length) {

      const result = await db
        .from("rooms")
        .select(
          "id, room_number, price, room_type_id"
        )
        .eq("hotel_id", hotelId)
        .in("id", roomIds);


      if (result.error) {
        throw result.error;
      }


      rooms = result.data || [];
    }


    // ===================================================
    // COMBINE
    // ===================================================

    stays = rows.map((stay) => {

      const guest =
        guests.find(
          (g) =>
            String(g.id) ===
            String(stay.guest_id)
        );


      const room =
        rooms.find(
          (r) =>
            String(r.id) ===
            String(stay.room_id)
        );


      return {

        ...stay,

        guestName:
          guest?.full_name ||
          [
            guest?.first_name,
            guest?.last_name
          ]
            .filter(Boolean)
            .join(" ") ||
          "Guest",

        roomNumber:
          room?.room_number ||
          "—",

        roomPrice:
          Number(room?.price) ||
          0
      };
    });


    // ===================================================
    // FILL SELECT
    // ===================================================

    staySelect.innerHTML =
      '<option value="">Select an active stay</option>';


    stays.forEach((stay) => {

      const option =
        document.createElement("option");


      option.value =
        stay.id;


      option.textContent =
        `${stay.stay_number || `Stay #${stay.id}`} — ` +
        `${stay.guestName} — Room ${stay.roomNumber}`;


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
      .eq("hotel_id", hotelId)
      .eq("stay_id", stayId)
      .eq("status", "SERVED")
      .is("billed_invoice_id", null)
      .order("created_at", {
        ascending: true
      });


    if (error) {
      throw error;
    }


    const orders = data || [];


    if (!orders.length) {
      return [];
    }


    // ===================================================
    // LOAD ORDER ITEMS
    // ===================================================

    const orderIds =
      orders.map(
        (order) => order.id
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
      .eq("hotel_id", hotelId)
      .in("order_id", orderIds);


    if (itemsError) {
      throw itemsError;
    }


    // ===================================================
    // GROUP ITEMS
    // ===================================================

    const itemsByOrder =
      new Map();


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

    /*
      Optional feature.

      If your database does not have a charges table,
      this function simply returns an empty array.
    */


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
      .eq("hotel_id", hotelId)
      .eq("stay_id", stayId);


    if (error) {

      // PostgreSQL table doesn't exist
      if (
        error.code === "42P01" ||
        error.code === "PGRST205"
      ) {

        console.warn(
          "Charges table not available. Continuing without extra charges."
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


    // ===================================================
    // CHECK EXISTING INVOICE
    // ===================================================

    const {
      data: existing,
      error: invoiceError
    } = await db
      .from("invoices")
      .select(
        "id, invoice_number, status"
      )
      .eq("hotel_id", hotelId)
      .eq("stay_id", stay.id)
      .limit(1);


    if (invoiceError) {
      throw invoiceError;
    }


    if (existing?.length) {

      throw new Error(
        `Invoice ${
          existing[0].invoice_number ||
          existing[0].id
        } already exists for this stay. ` +
        `Open Invoices to review it.`
      );
    }


    // ===================================================
    // ROOM
    // ===================================================

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


    // ===================================================
    // RESTAURANT + EXTRA
    // ===================================================

    const [
      orders,
      charges
    ] = await Promise.all([

      loadRestaurantOrders(
        stay.id
      ),

      loadExtraCharges(
        stay.id
      )

    ]);


    // ===================================================
    // RESTAURANT TOTAL
    // ===================================================

    const restaurantTotal =
      round2(
        orders.reduce(
          (sum, order) =>
            sum +
            Number(
              order.total || 0
            ),
          0
        )
      );


    // ===================================================
    // EXTRA TOTAL
    // ===================================================

    const extraTotal =
      round2(
        charges.reduce(
          (sum, charge) =>
            sum +
            Number(
              charge.total || 0
            ),
          0
        )
      );


    // ===================================================
    // SUBTOTAL
    // =====================================================

    const subtotal =
      round2(
        roomTotal +
        restaurantTotal +
        extraTotal
      );


    // ===================================================
    // DISCOUNT
    // =====================================================

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


    // ===================================================
    // TAX
    // ===================================================

    /*
      Restaurant order totals may already include tax.

      Therefore this version does not add another tax
      amount at invoice level.
    */

    const tax = 0;


    // ===================================================
    // FINAL TOTAL
    // ===================================================

    const total =
      round2(
        subtotal +
        tax -
        discount
      );


    // ===================================================
    // INVOICE ITEMS
    // ===================================================

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


    // ===================================================
    // RESTAURANT ITEMS
    // ===================================================

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
              Number(
                item.quantity || 1
              ),

            unit_price:
              Number(
                item.unit_price || 0
              ),

            total:
              Number(
                item.total || 0
              )
          });
        }

      } else {

        // Fallback if no item rows exist

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
            Number(
              order.total || 0
            ),

          total:
            Number(
              order.total || 0
            )
        });
      }
    }


    // ===================================================
    // EXTRA CHARGES
    // ===================================================

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


    // ===================================================
    // DISCOUNT ITEM
    // ===================================================

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
  // RENDER TOTALS
  // =====================================================

  function renderTotals(bill) {

    if ($("checkoutRoomTotal")) {

      $("checkoutRoomTotal").textContent =
        money(bill.roomTotal);
    }


    if ($("checkoutRestaurantTotal")) {

      $("checkoutRestaurantTotal").textContent =
        money(bill.restaurantTotal);
    }


    if ($("checkoutExtraTotal")) {

      $("checkoutExtraTotal").textContent =
        money(bill.extraTotal);
    }


    if ($("checkoutDiscountTotal")) {

      $("checkoutDiscountTotal").textContent =
        `− ${money(bill.discount)}`;
    }


    if ($("checkoutGrandTotal")) {

      $("checkoutGrandTotal").textContent =
        money(bill.total);
    }


    if ($("checkoutTaxTotal")) {

      $("checkoutTaxTotal").textContent =
        money(bill.tax);
    }


    if ($("checkoutBalanceDue")) {

      const payment =
        Math.max(
          0,
          Number(
            paymentInput.value
          ) || 0
        );


      $("checkoutBalanceDue").textContent =
        money(
          Math.max(
            0,
            bill.total -
            payment
          )
        );
    }
  }


  // =====================================================
  // GUEST DETAILS
  // =====================================================

  function renderGuestDetails(stay) {

    if (!$("checkoutGuestDetails")) {
      return;
    }


    $("checkoutGuestDetails").innerHTML = `

      <p>
        <strong>Guest:</strong>
        ${escapeHtml(stay.guestName)}
      </p>

      <p>
        <strong>Stay:</strong>
        ${escapeHtml(
          stay.stay_number ||
          stay.id
        )}
      </p>

      <p>
        <strong>Room:</strong>
        ${escapeHtml(
          stay.roomNumber
        )}
      </p>

      <p>
        <strong>Check-in:</strong>
        ${escapeHtml(
          dateOnly(
            stay.actual_check_in
          )
        )}
      </p>

      <p>
        <strong>Nightly rate:</strong>
        ${money(
          stay.roomPrice
        )}
      </p>
    `;
  }


  // =====================================================
  // REFRESH BILL
  // =====================================================

  async function refreshBill() {

    currentBill = null;
    currentInvoice = null;

    preview.innerHTML = "";


    const stayId =
      staySelect.value;


    if (!stayId) {

      selectedStay = null;


      if ($("checkoutGuestDetails")) {

        $("checkoutGuestDetails").textContent =
          "Select an active stay to view guest details.";
      }


      renderTotals({

        roomTotal: 0,
        restaurantTotal: 0,
        extraTotal: 0,
        discount: 0,
        tax: 0,
        total: 0
      });


      return;
    }


    selectedStay =
      stays.find(
        (stay) =>
          String(stay.id) ===
          String(stayId)
      );


    if (!selectedStay) {

      throw new Error(
        "Could not find the selected stay. Refresh and try again."
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
      `Bill calculated: ${
        currentBill.nights
      } night(s), ${
        currentBill.orders.length
      } restaurant order(s). Review before generating.`
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


    let invoiceId = null;


    try {

      // =================================================
      // CHECK DUPLICATE INVOICE
      // =================================================

      const {
        data: existing,
        error: checkError
      } = await db
        .from("invoices")
        .select(
          "id, invoice_number"
        )
        .eq("hotel_id", hotelId)
        .eq("stay_id", selectedStay.id)
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
      // GET CURRENT USER
      // =================================================

      const {
        data: authData,
        error: authError
      } = await db.auth.getUser();


      if (authError) {
        throw authError;
      }


      if (!authData?.user) {

        throw new Error(
          "Please log in again."
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
      // INVOICE STATUS
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
        `INV-${
          today().replaceAll("-", "")
        }-${
          selectedStay.id
        }`;


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


      invoiceId =
        invoice.id;


      console.log(
        "✓ Invoice created:",
        invoice.invoice_number
      );


      // =================================================
      // CREATE INVOICE ITEMS
      // =================================================

      const itemRows =
        currentBill.items.map(
          (item) => ({

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

        console.error(
          "Invoice item error:",
          itemError
        );


        // Attempt cleanup

        const {
          error: cleanupError
        } = await db
          .from("invoices")
          .delete()
          .eq("hotel_id", hotelId)
          .eq("id", invoice.id);


        if (cleanupError) {

          console.error(
            "Invoice cleanup failed:",
            cleanupError
          );
        }


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
      // RECORD PAYMENT
      // =================================================

      /*
        IMPORTANT:

        The current payments table does NOT contain
        received_by.

        Therefore we intentionally DO NOT send:

        received_by: authData.user.id

        This fixes:

        "Could not find the 'received_by' column
        of 'payments' in the schema cache"
      */

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


        console.log(
          "Recording payment:",
          paymentData
        );


        const {
          error: paymentError
        } = await db
          .from("payments")
          .insert(paymentData);


        if (paymentError) {

          console.error(
            "Payment recording failed:",
            paymentError
          );


          /*
            Try to clean up the invoice because
            payment was not recorded.
          */

          const {
            error: cleanupItemsError
          } = await db
            .from("invoice_items")
            .delete()
            .eq("hotel_id", hotelId)
            .eq("invoice_id", invoice.id);


          if (cleanupItemsError) {

            console.error(
              "Invoice items cleanup failed:",
              cleanupItemsError
            );
          }


          const {
            error: cleanupInvoiceError
          } = await db
            .from("invoices")
            .delete()
            .eq("hotel_id", hotelId)
            .eq("id", invoice.id);


          if (cleanupInvoiceError) {

            console.error(
              "Invoice cleanup failed:",
              cleanupInvoiceError
            );
          }


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
      // MARK RESTAURANT ORDERS AS BILLED
      // =================================================

      if (
        currentBill.orders.length
      ) {

        const orderIds =
          currentBill.orders.map(
            (order) =>
              order.id
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
          .eq("hotel_id", hotelId)
          .in("id", orderIds)
          .is(
            "billed_invoice_id",
            null
          )
          .select("id");


        if (orderUpdateError) {

          throw new Error(
            `Invoice ${
              invoice.invoice_number
            } was saved, but restaurant orders could not be marked billed: ${
              orderUpdateError.message
            }`
          );
        }


        if (
          (updatedOrders || []).length !==
          orderIds.length
        ) {

          throw new Error(
            "Invoice was saved, but one or more restaurant orders were billed elsewhere or changed. Check the invoice before retrying."
          );
        }


        console.log(
          "✓ Restaurant orders marked as billed"
        );
      }


      // =================================================
      // SAVE CURRENT INVOICE
      // =================================================

      currentInvoice =
        invoice;


      // =================================================
      // DISPLAY PREVIEW
      // =================================================

      renderInvoicePreview(
        invoice,
        itemRows
      );


      showMessage(
        `Invoice ${
          invoice.invoice_number
        } created successfully.`
      );


      console.log(
        "✓ Invoice generation completed successfully"
      );

    } catch (error) {

      console.error(
        "❌ Invoice generation failed:",
        error
      );


      if (invoiceId) {

        console.error(
          "Invoice ID:",
          invoiceId
        );
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
  // RENDER INVOICE PREVIEW
  // =====================================================

  function renderInvoicePreview(
    invoice,
    items
  ) {

    preview.innerHTML = `

      <div class="print-invoice">

        <h2>INVOICE</h2>

        <p>
          <strong>Invoice No:</strong>
          ${escapeHtml(
            invoice.invoice_number
          )}
        </p>

        <p>
          <strong>Guest:</strong>
          ${escapeHtml(
            selectedStay.guestName
          )}
        </p>

        <p>
          <strong>Stay:</strong>
          ${escapeHtml(
            selectedStay.stay_number ||
            selectedStay.id
          )}
        </p>

        <p>
          <strong>Room:</strong>
          ${escapeHtml(
            selectedStay.roomNumber
          )}
        </p>

        <p>
          <strong>Checkout date:</strong>
          ${escapeHtml(
            checkoutDate.value
          )}
        </p>


        <table>

          <thead>

            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Total</th>
            </tr>

          </thead>


          <tbody>

            ${items.map(
              (item) => `

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


        <p>
          Subtotal:
          ${money(
            invoice.subtotal
          )}
        </p>

        <p>
          Tax:
          ${money(
            invoice.tax
          )}
        </p>

        <p>
          Discount:
          ${money(
            invoice.discount
          )}
        </p>

        <h3>
          Total:
          ${money(
            invoice.total
          )}
        </h3>

        <p>
          Paid:
          ${money(
            invoice.amount_paid
          )}
        </p>

        <p>
          Balance due:
          ${money(
            invoice.balance_due
          )}
        </p>

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


    // ===================================================
    // VERIFY STAY
    // ===================================================

    const {
      data: latestStay,
      error: stayError
    } = await db
      .from("stays")
      .select(
        "id, status, room_id"
      )
      .eq("hotel_id", hotelId)
      .eq("id", selectedStay.id)
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


    // ===================================================
    // CHECKOUT TIME
    // ===================================================

    const now =
      new Date().toISOString();


    // ===================================================
    // UPDATE STAY
    // ===================================================

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
      .eq("hotel_id", hotelId)
      .eq("id", selectedStay.id)
      .eq("status", "ACTIVE")
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


    // ===================================================
    // UPDATE ROOM STATUS
    // ===================================================

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
      .eq("hotel_id", hotelId)
      .eq("id", latestStay.room_id);


    if (roomError) {

      showMessage(

        "Stay checked out, but room status could not be updated: " +
        roomError.message,

        true
      );

      return;
    }


    // ===================================================
    // SUCCESS
    // ===================================================

    showMessage(
      "Checkout completed successfully. Room status is now CLEANING."
    );


    console.log(
      "✓ Checkout completed:",
      selectedStay.id
    );


    // ===================================================
    // REFRESH STAYS
    // ===================================================

    await loadActiveStays();


    staySelect.value = "";


    selectedStay = null;
    currentBill = null;
    currentInvoice = null;


    preview.innerHTML = "";


    renderTotals({

      roomTotal: 0,
      restaurantTotal: 0,
      extraTotal: 0,
      discount: 0,
      tax: 0,
      total: 0

    });


    if ($("checkoutGuestDetails")) {

      $("checkoutGuestDetails").textContent =
        "Select an active stay to view guest details.";
    }
  }


  // =====================================================
  // SAFE EVENT BINDING
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

    } else {

      console.warn(
        `Checkout element not found: #${id}`
      );
    }
  }


  // =====================================================
  // REFRESH BILL BUTTON
  // =====================================================

  safelyBind(
    "refreshCheckoutBillButton",
    "click",
    async () => {

      try {

        await refreshBill();

      } catch (error) {

        console.error(
          "Refresh bill error:",
          error
        );

        showMessage(
          error.message ||
          "Could not calculate bill.",
          true
        );
      }
    }
  );


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
  // PAYMENT AMOUNT
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

      if (
        !confirm(
          "Complete checkout for this guest? The room will be marked CLEANING."
        )
      ) {
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
  // PRINT INVOICE
  // =====================================================

  safelyBind(
    "printCheckoutInvoiceButton",
    "click",
    () => {

      if (!currentInvoice) {

        showMessage(
          "Generate an invoice before printing.",
          true
        );

        return;
      }


      window.print();
    }
  );


  // =====================================================
  // INITIAL DATE
  // =====================================================

  checkoutDate.value =
    today();


  // =====================================================
  // INITIALIZE BILLING
  // =====================================================

  try {

    hotelId =
      await getHotelId();


    console.log(
      "✓ Billing hotel ID:",
      hotelId
    );


    await loadActiveStays();


    showMessage(
      "Billing is ready. Select an active stay."
    );


    console.log(
      "✓ CHECKOUT.JS INITIALIZED"
    );

  } catch (error) {

    console.error(
      "❌ Checkout initialization failed:",
      error
    );


    showMessage(
      error.message ||
      "Could not initialize Billing.",
      true
    );
  }

});