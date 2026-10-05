
/* =========================================================
   STAR HOTELS - RESTAURANT MANAGEMENT
   File: js/restaurant.js

   Manages:
   - Restaurant tables
   - Menu categories
   - Food menu items
   - Menu availability

   Requires:
   window.supabaseClient
   profiles.hotel_id for the logged-in user
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const db = window.supabaseClient;

  if (!db) {
    console.error("Supabase client not found. Check js/supabase.js.");
    return;
  }

  let hotelId = null;
  let tables = [];
  let categories = [];
  let menuItems = [];

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

  function showMessage(id, message, isError = false) {
    const element = $(id);
    if (!element) return;

    element.textContent = message;
    element.style.color = isError ? "#dc2626" : "#15803d";
    element.style.display = message ? "block" : "none";
  }

  function setButtonLoading(button, loading, text = "Save") {
    if (!button) return;

    if (loading) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.textContent = "Saving...";
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || text;
    }
  }

  async function getHotelId() {
    const { data: authData, error: authError } =
      await db.auth.getUser();

    if (authError) throw authError;

    const user = authData?.user;

    if (!user) {
      throw new Error("Please log in to manage the restaurant.");
    }

    const { data: profile, error } = await db
      .from("profiles")
      .select("hotel_id")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    if (!profile?.hotel_id) {
      throw new Error(
        "Your account is not linked to a hotel. Check your profile settings."
      );
    }

    return profile.hotel_id;
  }

  async function loadTables() {
    const { data, error } = await db
      .from("restaurant_tables")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("table_number", { ascending: true });

    if (error) throw error;

    tables = data || [];
    renderTables();
  }

  async function loadCategories() {
    const { data, error } = await db
      .from("menu_categories")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("display_order", { ascending: true });

    if (error) throw error;

    categories = data || [];
    renderCategories();
    populateCategorySelect();
  }

  async function loadMenuItems() {
    const { data, error } = await db
      .from("menu_items")
      .select("*")
      .eq("hotel_id", hotelId)
      .order("name", { ascending: true });

    if (error) throw error;

    menuItems = data || [];
    renderMenuItems();
  }

  function renderTables() {
    const grid = $("restTablesGrid");

    if (grid) {
      if (!tables.length) {
        grid.innerHTML = `
          <div class="empty-state">
            No restaurant tables added yet.
          </div>`;
      } else {
        grid.innerHTML = tables.map((table) => `
          <div class="restaurant-table-card">
            <div class="restaurant-table-card-header">
              <strong>
                Table ${escapeHTML(table.table_number)}
              </strong>
              <span class="restaurant-status">
                ${escapeHTML(table.status || "Available")}
              </span>
            </div>
            <p>Capacity: ${escapeHTML(table.capacity ?? "—")}</p>
            ${
              table.notes
                ? `<p>${escapeHTML(table.notes)}</p>`
                : ""
            }
          </div>
        `).join("");
      }
    }

    if ($("restTableCount")) {
      $("restTableCount").textContent = tables.length;
    }

    // Also support a table-based layout if your HTML uses it.
    const tableBody = $("restTablesTableBody");

    if (tableBody) {
      tableBody.innerHTML = tables.length
        ? tables.map((table) => `
            <tr>
              <td>${escapeHTML(table.table_number)}</td>
              <td>${escapeHTML(table.capacity ?? "—")}</td>
              <td>${escapeHTML(table.status || "Available")}</td>
              <td>${escapeHTML(table.notes || "—")}</td>
            </tr>
          `).join("")
        : `<tr><td colspan="4">No tables found.</td></tr>`;
    }

    const orderTableSelect = $("restOrderTable");

    if (orderTableSelect) {
      const previousValue = orderTableSelect.value;

      orderTableSelect.innerHTML = `
        <option value="">No table / Room service</option>
        ${tables.map((table) => `
          <option value="${escapeHTML(table.id)}">
            Table ${escapeHTML(table.table_number)}
          </option>
        `).join("")}
      `;

      if (
        previousValue &&
        [...orderTableSelect.options].some(
          (option) => option.value === previousValue
        )
      ) {
        orderTableSelect.value = previousValue;
      }
    }
  }

  function renderCategories() {
    const list = $("restCategoriesList");

    if (list) {
      list.innerHTML = categories.length
        ? categories.map((category) => `
            <div class="restaurant-category-item">
              <strong>${escapeHTML(category.name)}</strong>
              ${
                category.description
                  ? `<p>${escapeHTML(category.description)}</p>`
                  : ""
              }
            </div>
          `).join("")
        : `<p class="empty-state">No food categories added yet.</p>`;
    }
  }

  function populateCategorySelect() {
    const select = $("restMenuCategory");
    if (!select) return;

    const previousValue = select.value;

    select.innerHTML = `
      <option value="">Select category</option>
      ${categories.map((category) => `
        <option value="${escapeHTML(category.id)}">
          ${escapeHTML(category.name)}
        </option>
      `).join("")}
    `;

    if (
      previousValue &&
      [...select.options].some(
        (option) => option.value === previousValue
      )
    ) {
      select.value = previousValue;
    }
  }

  function renderMenuItems() {
    const body = $("restMenuTableBody");

    if (body) {
      body.innerHTML = menuItems.length
        ? menuItems.map((item) => {
            const category = categories.find(
              (entry) => String(entry.id) === String(item.category_id)
            );

            const available = item.is_available !== false;

            return `
              <tr>
                <td>${escapeHTML(item.name)}</td>
                <td>${escapeHTML(category?.name || "Uncategorized")}</td>
                <td>${money(item.price)}</td>
                <td>
                  <span class="${available ? "status-available" : "status-unavailable"}">
                    ${available ? "Available" : "Unavailable"}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    data-menu-toggle="${escapeHTML(item.id)}"
                    data-available="${available ? "true" : "false"}"
                  >
                    ${available ? "Mark unavailable" : "Mark available"}
                  </button>
                </td>
              </tr>
            `;
          }).join("")
        : `<tr><td colspan="5">No food items added yet.</td></tr>`;
    }

    const grid = $("restMenuGrid");

    if (grid) {
      grid.innerHTML = menuItems.length
        ? menuItems.map((item) => {
            const category = categories.find(
              (entry) => String(entry.id) === String(item.category_id)
            );

            const available = item.is_available !== false;

            return `
              <div class="restaurant-menu-card">
                <div>
                  <strong>${escapeHTML(item.name)}</strong>
                  <p>${escapeHTML(category?.name || "Uncategorized")}</p>
                  ${
                    item.description
                      ? `<p>${escapeHTML(item.description)}</p>`
                      : ""
                  }
                </div>
                <strong>${money(item.price)}</strong>
                <span>${available ? "Available" : "Unavailable"}</span>
              </div>
            `;
          }).join("")
        : `<div class="empty-state">No food items added yet.</div>`;
    }

    const availableCount = menuItems.filter(
      (item) => item.is_available !== false
    ).length;

    if ($("restMenuCount")) {
      $("restMenuCount").textContent = menuItems.length;
    }

    if ($("restAvailableCount")) {
      $("restAvailableCount").textContent = availableCount;
    }

    // Keep the Orders food-item dropdown in sync.
    const orderItemSelect = $("restOrderMenuItem");

    if (orderItemSelect) {
      const previousValue = orderItemSelect.value;

      orderItemSelect.innerHTML = `
        <option value="">Select food item</option>
        ${menuItems
          .filter((item) => item.is_available !== false)
          .map((item) => `
            <option value="${escapeHTML(item.id)}">
              ${escapeHTML(item.name)} — ${money(item.price)}
            </option>
          `).join("")}
      `;

      if (
        previousValue &&
        [...orderItemSelect.options].some(
          (option) => option.value === previousValue
        )
      ) {
        orderItemSelect.value = previousValue;
      }
    }
  }

  async function addTable(event) {
    event.preventDefault();

    const button = $("restSaveTable");

    const tableNumber = $("restTableNumber")?.value.trim();
    const capacity = Number($("restTableCapacity")?.value);
    const notes = $("restTableNotes")?.value.trim() || null;

    showMessage("restTableMessage", "");

    if (!tableNumber) {
      showMessage("restTableMessage", "Enter a table number.", true);
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1) {
      showMessage("restTableMessage", "Capacity must be at least 1.", true);
      return;
    }

    setButtonLoading(button, true);

    try {
      // Leave status to the database default so its status constraint
      // is respected.
      const { error } = await db
        .from("restaurant_tables")
        .insert({
          hotel_id: hotelId,
          table_number: tableNumber,
          capacity,
          ...(notes ? { notes } : {})
        });

      if (error) throw error;

      $("restTableForm")?.reset();

      await loadTables();

      showMessage("restTableMessage", "Restaurant table added.");
    } catch (error) {
      console.error("Add restaurant table failed:", error);
      showMessage(
        "restTableMessage",
        error.message || "Could not add restaurant table.",
        true
      );
    } finally {
      setButtonLoading(button, false, "Save Table");
    }
  }

  async function addCategory(event) {
    event.preventDefault();

    const button = $("restSaveCategory");

    const name = $("restCategoryName")?.value.trim();
    const description =
      $("restCategoryDescription")?.value.trim() || null;

    showMessage("restCategoryMessage", "");

    if (!name) {
      showMessage("restCategoryMessage", "Enter a category name.", true);
      return;
    }

    setButtonLoading(button, true);

    try {
      const nextDisplayOrder = categories.reduce(
        (max, category) =>
          Math.max(max, Number(category.display_order) || 0),
        0
      ) + 1;

      const { error } = await db
        .from("menu_categories")
        .insert({
          hotel_id: hotelId,
          name,
          description,
          display_order: nextDisplayOrder,
          is_active: true
        });

      if (error) throw error;

      $("restCategoryForm")?.reset();

      await loadCategories();

      showMessage("restCategoryMessage", "Food category added.");
    } catch (error) {
      console.error("Add menu category failed:", error);
      showMessage(
        "restCategoryMessage",
        error.message || "Could not add category.",
        true
      );
    } finally {
      setButtonLoading(button, false, "Save Category");
    }
  }

  async function addMenuItem(event) {
    event.preventDefault();

    const button = $("restSaveMenu");

    const name = $("restMenuName")?.value.trim();
    const categoryId = $("restMenuCategory")?.value;
    const price = Number($("restMenuPrice")?.value);
    const description =
      $("restMenuDescription")?.value.trim() || null;

    showMessage("restMenuMessage", "");

    if (!name) {
      showMessage("restMenuMessage", "Enter a food item name.", true);
      return;
    }

    if (!categoryId) {
      showMessage("restMenuMessage", "Select a food category.", true);
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      showMessage("restMenuMessage", "Enter a valid price.", true);
      return;
    }

    setButtonLoading(button, true);

    try {
      const { error } = await db
        .from("menu_items")
        .insert({
          hotel_id: hotelId,
          category_id: categoryId,
          name,
          description,
          price,
          is_available: true
        });

      if (error) throw error;

      $("restMenuForm")?.reset();

      await loadMenuItems();

      showMessage("restMenuMessage", "Food item added to the menu.");
    } catch (error) {
      console.error("Add menu item failed:", error);
      showMessage(
        "restMenuMessage",
        error.message || "Could not add food item.",
        true
      );
    } finally {
      setButtonLoading(button, false, "Save Food Item");
    }
  }

  async function toggleMenuItem(button) {
    const itemId = button.dataset.menuToggle;
    const currentlyAvailable = button.dataset.available === "true";
    const nextAvailable = !currentlyAvailable;

    button.disabled = true;

    try {
      const { error } = await db
        .from("menu_items")
        .update({ is_available: nextAvailable })
        .eq("id", itemId)
        .eq("hotel_id", hotelId);

      if (error) throw error;

      await loadMenuItems();
    } catch (error) {
      console.error("Update menu availability failed:", error);
      alert(error.message || "Could not update food availability.");
    } finally {
      button.disabled = false;
    }
  }

  function wireEvents() {
    $("restTableForm")?.addEventListener("submit", addTable);
    $("restCategoryForm")?.addEventListener("submit", addCategory);
    $("restMenuForm")?.addEventListener("submit", addMenuItem);

    $("restMenuTableBody")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-menu-toggle]");
      if (button) toggleMenuItem(button);
    });

    $("restaurantRefresh")?.addEventListener("click", async () => {
      try {
        await Promise.all([
          loadTables(),
          loadCategories(),
          loadMenuItems()
        ]);
      } catch (error) {
        console.error("Refresh restaurant failed:", error);
        alert(error.message || "Could not refresh restaurant data.");
      }
    });
  }

  async function init() {
    try {
      hotelId = await getHotelId();

      wireEvents();

      await Promise.all([
        loadTables(),
        loadCategories()
      ]);

      await loadMenuItems();
    } catch (error) {
      console.error("Restaurant initialization failed:", error);

      const message =
        error.message || "Could not load restaurant information.";

      showMessage("restTableMessage", message, true);
      showMessage("restCategoryMessage", message, true);
      showMessage("restMenuMessage", message, true);
    }
  }

  init();
});