
/* =========================================================
   STAR HOTELS - RESTAURANT ORDERS
   File: js/orders.js

   Order statuses:
   OPEN, PREPARING, READY, SERVED, CANCELLED, PAID

   restaurant_order_items columns:
   id, hotel_id, order_id, menu_item_id, item_name,
   quantity, unit_price, total, notes, created_at
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const db = window.supabaseClient;

  if (!db) {
    console.error("Supabase client not found. Check js/supabase.js.");
    return;
  }

  const TAX_RATE = 0.05;

  let hotelId = null;
  let stays = [];
  let tables = [];
  let menuItems = [];
  let orders = [];
  let cart = [];

  const $ = (id) => document.getElementById(id);

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);

  const money = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR"
    }).format(Number(amount) || 0);

  function showMessage(message, isError = false) {
    const element = $("restOrderMessage");
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#dc2626" : "#15803d";
    element.style.display = message ? "block" : "none";
  }

  function setButtonLoading(button, loading) {
    if (!button) return;

    if (loading) {
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
      }

      button.disabled = true;
      button.textContent = "Saving...";
    } else {
      button.disabled = false;
      button.textContent =
        button.dataset.originalText || "Save Restaurant Order";
    }
  }

  async function getHotelId() {
    const { data: authData, error: authError } =
      await db.auth.getUser();

    if (authError) throw authError;

    const user = authData?.user;

    if (!user) {
      throw new Error("Please log in to manage restaurant orders.");
    }

    const { data: profile, error } = await db
      .from("profiles")
      .select("hotel_id")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    if (!profile?.hotel_id) {
      throw new Error("Your account is not linked to a hotel.");
    }

    return profile.hotel_id;
  }

  function getGuestName(guest) {
    if (!guest) return "Guest";

    return guest.full_name ||
      [guest.first_name, guest.last_name].filter(Boolean).join(" ") ||
      "Guest";
  }

  async function loadStays() {
    const { data, error } = await db
      .from("stays")
      .select("*")
      .eq("hotel_id", hotelId)
      .eq("status", "ACTIVE")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const activeStays = data || [];

    const guestIds = [...new Set(
      activeStays.map((stay) => stay.guest_id).filter(Boolean)
    )];

    const roomIds = [...new Set(
      activeStays.map((stay) => stay.room_id).filter(Boolean)
    )];

    let guests = [];
    let rooms = [];

    if (guestIds.length) {
      const { data: guestData, error: guestError } = await db
        .from("guests")
        .select("id, first_name, last_name, full_name")
        .eq("hotel_id", hotelId)
        .in("id", guestIds);

      if (guestError) throw guestError;
      guests = guestData || [];
    }

    if (roomIds.length) {
      const { data: roomData, error: roomError } = await db
        .from("rooms")
        .select("*")
        .eq("hotel_id", hotelId)
        .in("id", roomIds);

      if (roomError) throw roomError;
      rooms = roomData || [];
    }

    stays = activeStays.map((stay) => ({
      ...stay,
      guest: guests.find(
        (guest) => String(guest.id) === String(stay.guest_id)
      ),
      room: rooms.find(
        (room) => String(room.id) === String(stay.room_id)
      )
    }));

    renderStayOptions();
  }

  async function loadTables() {
    const { data, error } = await db
      .from("restaurant_tables")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("table_number", { ascending: true });

    if (error) throw error;

    tables = data || [];
    renderTableOptions();
  }

  async function loadMenuItems() {
    const { data, error } = await db
      .from("menu_items")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("name", { ascending: true });

    if (error) throw error;

    menuItems = (data || []).filter(
      (item) => item.is_available !== false
    );

    renderMenuOptions();
  }

  function renderStayOptions() {
    const select = $("restOrderStay");
    if (!select) return;

    const previousValue = select.value;

    select.innerHTML = `
      <option value="">Select an active hotel stay</option>
      ${stays.map((stay) => {
        const roomName =
          stay.room?.room_number ??
          stay.room?.room_name ??
          stay.room_id ??
          "Not assigned";

        const stayNumber = stay.stay_number || `Stay #${stay.id}`;

        return `
          <option value="${escapeHTML(stay.id)}">
            ${escapeHTML(getGuestName(stay.guest))}
            — Room ${escapeHTML(roomName)}
            — ${escapeHTML(stayNumber)}
          </option>
        `;
      }).join("")}
    `;

    if ([...select.options].some(
      (option) => option.value === previousValue
    )) {
      select.value = previousValue;
    }
  }

  function renderTableOptions() {
    const select = $("restOrderTable");
    if (!select) return;

    const previousValue = select.value;

    select.innerHTML = `
      <option value="">No table / Room service</option>
      ${tables.map((table) => `
        <option value="${escapeHTML(table.id)}">
          Table ${escapeHTML(table.table_number)}
        </option>
      `).join("")}
    `;

    if ([...select.options].some(
      (option) => option.value === previousValue
    )) {
      select.value = previousValue;
    }
  }

  function renderMenuOptions() {
    const select = $("restOrderMenuItem");
    if (!select) return;

    const previousValue = select.value;

    select.innerHTML = `
      <option value="">Select food item</option>
      ${menuItems.map((item) => `
        <option value="${escapeHTML(item.id)}">
          ${escapeHTML(item.name)} — ${money(item.price)}
        </option>
      `).join("")}
    `;

    if ([...select.options].some(
      (option) => option.value === previousValue
    )) {
      select.value = previousValue;
    }
  }

  function getTotals() {
    const subtotal = Math.round(
      cart.reduce(
        (sum, item) => sum + item.quantity * item.unit_price,
        0
      ) * 100
    ) / 100;

    const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    return { subtotal, tax, total };
  }

  function renderCart() {
    const container = $("restOrderItems");
    const { subtotal, tax, total } = getTotals();

    if (container) {
      container.innerHTML = cart.length
        ? cart.map((item, index) => `
            <div class="restaurant-order-cart-item">
              <div>
                <strong>${escapeHTML(item.item_name)}</strong>
                <p>${money(item.unit_price)} each</p>
              </div>

              <div class="restaurant-order-cart-total">
                <span>
                  ${item.quantity} × ${money(item.unit_price)}
                  = <strong>${money(item.quantity * item.unit_price)}</strong>
                </span>

                <button
                  type="button"
                  data-remove-cart-item="${index}"
                >
                  Remove
                </button>
              </div>
            </div>
          `).join("")
        : `<p class="empty-state">
             No food items added. Select a food item and click
             "Add Food Item".
           </p>`;
    }

    if ($("restOrderSubtotal")) {
      $("restOrderSubtotal").textContent = money(subtotal);
    }

    if ($("restOrderTax")) {
      $("restOrderTax").textContent = money(tax);
    }

    if ($("restOrderTotal")) {
      $("restOrderTotal").textContent = money(total);
    }

    if ($("restOrderTaxLabel")) {
      $("restOrderTaxLabel").textContent = `Tax (${TAX_RATE * 100}%)`;
    }
  }

  function addCartItem() {
    const itemId = $("restOrderMenuItem")?.value;
    const quantity = Number($("restOrderQuantity")?.value);

    if (!itemId) {
      showMessage("Please select a food item.", true);
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      showMessage("Quantity must be at least 1.", true);
      return;
    }

    const selectedItem = menuItems.find(
      (item) => String(item.id) === String(itemId)
    );

    if (!selectedItem) {
      showMessage("This food item is unavailable. Refresh the menu.", true);
      return;
    }

    const existing = cart.find(
      (item) => String(item.menu_item_id) === String(selectedItem.id)
    );

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        menu_item_id: selectedItem.id,
        item_name: selectedItem.name,
        quantity,
        unit_price: Number(selectedItem.price)
      });
    }

    if ($("restOrderQuantity")) {
      $("restOrderQuantity").value = "1";
    }

    if ($("restOrderMenuItem")) {
      $("restOrderMenuItem").value = "";
    }

    showMessage("");
    renderCart();
  }

  async function loadOrders() {
    const { data, error } = await db
      .from("restaurant_orders")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const rows = data || [];

    const guestIds = [...new Set(
      rows.map((order) => order.guest_id).filter(Boolean)
    )];

    const stayIds = [...new Set(
      rows.map((order) => order.stay_id).filter(Boolean)
    )];

    let guests = [];
    let stayRows = [];

    if (guestIds.length) {
      const { data, error } = await db
        .from("guests")
        .select("id, first_name, last_name, full_name")
        .eq("hotel_id", hotelId)
        .in("id", guestIds);

      if (error) throw error;
      guests = data || [];
    }

    if (stayIds.length) {
      const { data, error } = await db
        .from("stays")
        .select("id, stay_number, room_id")
        .eq("hotel_id", hotelId)
        .in("id", stayIds);

      if (error) throw error;
      stayRows = data || [];
    }

    orders = rows.map((order) => ({
      ...order,
      guest: guests.find(
        (guest) => String(guest.id) === String(order.guest_id)
      ),
      stay: stayRows.find(
        (stay) => String(stay.id) === String(order.stay_id)
      )
    }));

    renderOrders();
    renderOrderStats();
  }

  function renderOrderStats() {
    const today = new Date().toISOString().slice(0, 10);

    const openCount = orders.filter((order) =>
      ["OPEN", "PREPARING", "READY"].includes(order.status)
    ).length;

    const unbilledCount = orders.filter((order) =>
      !order.billed_invoice_id &&
      !["CANCELLED", "PAID"].includes(order.status)
    ).length;

    const todaySales = orders
      .filter((order) =>
        String(order.created_at || "").slice(0, 10) === today &&
        order.status !== "CANCELLED"
      )
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

    if ($("ordersTotalCount")) {
      $("ordersTotalCount").textContent = orders.length;
    }

    if ($("ordersOpenCount")) {
      $("ordersOpenCount").textContent = openCount;
    }

    if ($("ordersUnbilledCount")) {
      $("ordersUnbilledCount").textContent = unbilledCount;
    }

    if ($("ordersTodaySales")) {
      $("ordersTodaySales").textContent = money(todaySales);
    }
  }

  function getNextStatus(status) {
    return ({
      OPEN: "PREPARING",
      PREPARING: "READY",
      READY: "SERVED"
    })[status] || null;
  }

  function renderOrders() {
    const body = $("restOrdersTableBody");
    if (!body) return;

    if (!orders.length) {
      body.innerHTML = `
        <tr><td colspan="8">No restaurant orders found.</td></tr>
      `;
      return;
    }

    body.innerHTML = orders.map((order) => {
      const guestName = getGuestName(order.guest);
      const nextStatus = getNextStatus(order.status);
      const billed = Boolean(order.billed_invoice_id);

      let action = "—";

      if (nextStatus) {
        action = `
          <button
            type="button"
            data-next-order-status="${escapeHTML(order.id)}"
            data-next-status="${escapeHTML(nextStatus)}"
          >
            Mark ${escapeHTML(nextStatus)}
          </button>
        `;
      } else if (order.status === "SERVED" && !billed) {
        action = `
          <button type="button"
            data-cancel-order="${escapeHTML(order.id)}">
            Cancel
          </button>
        `;
      }

      const billingLabel = billed
        ? `Billed (#${escapeHTML(order.billed_invoice_id)})`
        : "Not billed";

      return `
        <tr>
          <td>${escapeHTML(order.order_number || order.id)}</td>
          <td>${escapeHTML(guestName)}</td>
          <td>${escapeHTML(order.stay?.stay_number || order.stay_id || "—")}</td>
          <td>${money(order.subtotal)}</td>
          <td>${money(order.total)}</td>
          <td>
            <span class="order-status order-status-${escapeHTML(
              String(order.status || "").toLowerCase()
            )}">
              ${escapeHTML(order.status)}
            </span>
          </td>
          <td>${billingLabel}</td>
          <td>${action}</td>
        </tr>
      `;
    }).join("");
  }

  async function createOrder(event) {
    event.preventDefault();
    showMessage("");

    const button = $("restSaveOrder");
    const stayId = $("restOrderStay")?.value;
    const tableId = $("restOrderTable")?.value || null;
    const notes = $("restOrderNotes")?.value.trim() || null;

    if (!stayId) {
      showMessage("Please select an active hotel stay.", true);
      return;
    }

    if (!cart.length) {
      showMessage("Please add at least one food item.", true);
      return;
    }

    const { data: verifiedStay, error: stayError } = await db
      .from("stays")
      .select("id, guest_id, status")
      .eq("id", stayId)
      .eq("hotel_id", hotelId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (stayError) {
      showMessage(stayError.message, true);
      return;
    }

    if (!verifiedStay) {
      showMessage("This hotel stay is no longer active.", true);
      await loadStays();
      return;
    }

    const { subtotal, tax, total } = getTotals();

    setButtonLoading(button, true);

    let createdOrderId = null;

    try {
      const orderNumber =
        "RO-" +
        Date.now().toString() +
        "-" +
        Math.random().toString(36).slice(2, 6).toUpperCase();

      const orderPayload = {
        hotel_id: hotelId,
        order_number: orderNumber,
        stay_id: stayId,
        guest_id: verifiedStay.guest_id,
        status: "OPEN",
        subtotal,
        tax,
        discount: 0,
        total,
        notes
      };

      if (tableId) {
        orderPayload.table_id = tableId;
      }

      const { data: createdOrder, error: orderError } = await db
        .from("restaurant_orders")
        .insert(orderPayload)
        .select()
        .single();

      if (orderError) throw orderError;

      createdOrderId = createdOrder.id;

      // FIXED: the database column is "total", not "total_price".
      const itemRows = cart.map((item) => ({
        hotel_id: hotelId,
        order_id: createdOrder.id,
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: Math.round(
          item.quantity * item.unit_price * 100
        ) / 100,
        notes: null
      }));

      const { error: itemsError } = await db
        .from("restaurant_order_items")
        .insert(itemRows);

      if (itemsError) {
        // Best-effort cleanup of the parent order if item insertion fails.
        const { error: cleanupError } = await db
          .from("restaurant_orders")
          .delete()
          .eq("id", createdOrder.id)
          .eq("hotel_id", hotelId);

        if (cleanupError) {
          console.error("Order cleanup failed:", cleanupError);
        }

        throw itemsError;
      }

      cart = [];
      renderCart();

      $("restOrderForm")?.reset();

      if ($("restOrderQuantity")) {
        $("restOrderQuantity").value = "1";
      }

      showMessage(`Restaurant order ${orderNumber} saved successfully.`);

      await Promise.all([
        loadOrders(),
        loadStays()
      ]);
    } catch (error) {
      console.error("Create restaurant order failed:", error);

      showMessage(
        error.message || "Could not save the restaurant order.",
        true
      );

      if (createdOrderId) {
        console.error("Order ID to investigate:", createdOrderId);
      }
    } finally {
      setButtonLoading(button, false);
    }
  }

  async function updateOrderStatus(button) {
    const orderId = button.dataset.nextOrderStatus;
    const nextStatus = button.dataset.nextStatus;

    const allowedStatuses = [
      "OPEN",
      "PREPARING",
      "READY",
      "SERVED",
      "CANCELLED",
      "PAID"
    ];

    if (!allowedStatuses.includes(nextStatus)) {
      alert("Invalid order status.");
      return;
    }

    button.disabled = true;

    try {
      const { error } = await db
        .from("restaurant_orders")
        .update({ status: nextStatus })
        .eq("id", orderId)
        .eq("hotel_id", hotelId);

      if (error) throw error;

      await loadOrders();
    } catch (error) {
      console.error("Update order status failed:", error);
      alert(error.message || "Could not update order status.");
    } finally {
      button.disabled = false;
    }
  }

  async function cancelOrder(button) {
    const orderId = button.dataset.cancelOrder;

    const order = orders.find(
      (entry) => String(entry.id) === String(orderId)
    );

    if (!order) return;

    if (order.billed_invoice_id) {
      alert("This order is already billed and cannot be cancelled here.");
      return;
    }

    if (!confirm("Cancel this restaurant order?")) return;

    button.disabled = true;

    try {
      const { error } = await db
        .from("restaurant_orders")
        .update({ status: "CANCELLED" })
        .eq("id", orderId)
        .eq("hotel_id", hotelId);

      if (error) throw error;

      await loadOrders();
    } catch (error) {
      console.error("Cancel order failed:", error);
      alert(error.message || "Could not cancel the order.");
    } finally {
      button.disabled = false;
    }
  }

  function wireEvents() {
    $("restAddOrderItem")?.addEventListener("click", addCartItem);

    $("restOrderForm")?.addEventListener("submit", createOrder);

    $("restOrderItems")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-cart-item]");
      if (!button) return;

      const index = Number(button.dataset.removeCartItem);

      if (
        Number.isInteger(index) &&
        index >= 0 &&
        index < cart.length
      ) {
        cart.splice(index, 1);
        renderCart();
        showMessage("");
      }
    });

    $("restOrdersTableBody")?.addEventListener("click", (event) => {
      const statusButton = event.target.closest(
        "[data-next-order-status]"
      );

      if (statusButton) {
        updateOrderStatus(statusButton);
        return;
      }

      const cancelButton = event.target.closest("[data-cancel-order]");

      if (cancelButton) {
        cancelOrder(cancelButton);
      }
    });

    $("ordersRefresh")?.addEventListener("click", async () => {
      try {
        await Promise.all([
          loadOrders(),
          loadStays(),
          loadTables(),
          loadMenuItems()
        ]);

        showMessage("Orders refreshed.");
      } catch (error) {
        console.error("Refresh orders failed:", error);
        showMessage(error.message || "Could not refresh orders.", true);
      }
    });
  }

  async function init() {
    try {
      hotelId = await getHotelId();

      wireEvents();
      renderCart();

      await Promise.all([
        loadStays(),
        loadTables(),
        loadMenuItems(),
        loadOrders()
      ]);
    } catch (error) {
      console.error("Orders initialization failed:", error);

      showMessage(
        error.message || "Could not load restaurant orders.",
        true
      );
    }
  }

  init();
});