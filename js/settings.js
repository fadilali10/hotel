
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    const supabase = window.supabaseClient;
    const $ = (id) => document.getElementById(id);

    const form = $("hotelSettingsForm");
    if (!form) return;

    if (!supabase) {
        console.error("Supabase client is not initialized.");
        return;
    }

    let hotelId = null;
    let originalHotel = null;

    function showMessage(elementId, message, isError = false) {
        const element = $(elementId);
        if (!element) return;

        element.textContent = message;
        element.className = "settings-message " +
            (isError ? "error" : "success");
    }

    function setButtonBusy(button, busy, normalText) {
        if (!button) return;
        button.disabled = busy;
        button.textContent = busy ? "Saving..." : normalText;
    }

    function setField(id, value) {
        const element = $(id);
        if (element) element.value = value ?? "";
    }

    function fillHotelFields(hotel) {
        setField("settingHotelName", hotel.name);
        setField("settingHotelPhone", hotel.phone);
        setField("settingHotelEmail", hotel.email);
        setField("settingHotelWebsite", hotel.website);
        setField("settingHotelAddress", hotel.address);
        setField("settingHotelCity", hotel.city);
        setField("settingHotelState", hotel.state);
        setField("settingHotelCountry", hotel.country);
        setField("settingHotelTax", hotel.tax_number);
        setField("settingCurrency", hotel.currency || "INR");
    }

    async function loadSettings() {
        const { data: authData, error: authError } =
            await supabase.auth.getUser();

        if (authError) throw authError;

        if (!authData?.user) {
            window.location.href = "login.html";
            return;
        }

        const user = authData.user;

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("hotel_id, full_name, role")
            .eq("id", user.id)
            .single();

        if (profileError) throw profileError;

        if (!profile?.hotel_id) {
            throw new Error("Your account is not linked to a hotel.");
        }

        hotelId = profile.hotel_id;

        const { data: hotel, error: hotelError } = await supabase
            .from("hotels")
            .select(
                "id, name, phone, email, website, address, city, state, country, tax_number, currency"
            )
            .eq("id", hotelId)
            .single();

        if (hotelError) throw hotelError;

        originalHotel = hotel;
        fillHotelFields(hotel);

        setField("settingAccountEmail", user.email);
        setField(
            "settingAccountName",
            profile.full_name ||
                user.user_metadata?.full_name ||
                user.email
        );
        setField("settingAccountRole", profile.role || "USER");
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!hotelId) {
            showMessage(
                "hotelSettingsMessage",
                "Hotel profile is not loaded. Refresh and try again.",
                true
            );
            return;
        }

        const button = $("saveHotelSettings");
        setButtonBusy(button, true, "Save Changes");

        const updatedHotel = {
            name: $("settingHotelName").value.trim(),
            phone: $("settingHotelPhone").value.trim() || null,
            email: $("settingHotelEmail").value.trim() || null,
            website: $("settingHotelWebsite").value.trim() || null,
            address: $("settingHotelAddress").value.trim() || null,
            city: $("settingHotelCity").value.trim() || null,
            state: $("settingHotelState").value.trim() || null,
            country: $("settingHotelCountry").value.trim() || null,
            tax_number: $("settingHotelTax").value.trim() || null,
            updated_at: new Date().toISOString()
        };

        if (!updatedHotel.name) {
            showMessage(
                "hotelSettingsMessage",
                "Hotel name is required.",
                true
            );
            setButtonBusy(button, false, "Save Changes");
            return;
        }

        try {
            const { data, error } = await supabase
                .from("hotels")
                .update(updatedHotel)
                .eq("id", hotelId)
                .select()
                .single();

            if (error) throw error;

            originalHotel = data;

            // Update the regional selector from the latest saved record.
            setField("settingCurrency", data.currency || "INR");

            showMessage(
                "hotelSettingsMessage",
                "Hotel profile saved successfully."
            );

            // Refresh any hotel name labels in the current page, if present.
            document.querySelectorAll("[data-hotel-name]").forEach((node) => {
                node.textContent = data.name;
            });

        } catch (error) {
            console.error("Save hotel settings error:", error);
            showMessage(
                "hotelSettingsMessage",
                error.message || "Could not save hotel profile.",
                true
            );
        } finally {
            setButtonBusy(button, false, "Save Changes");
        }
    });

    form.addEventListener("reset", () => {
        setTimeout(() => {
            if (originalHotel) fillHotelFields(originalHotel);
            showMessage("hotelSettingsMessage", "");
        }, 0);
    });

    // Regional preferences
    $("regionalSettingsForm")?.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!hotelId) {
            showMessage(
                "regionalSettingsMessage",
                "Hotel profile is not loaded.",
                true
            );
            return;
        }

        const button = $("saveRegionalSettings");
        setButtonBusy(button, true, "Save Preferences");

        try {
            const currency = $("settingCurrency").value;

            const { data, error } = await supabase
                .from("hotels")
                .update({
                    currency,
                    updated_at: new Date().toISOString()
                })
                .eq("id", hotelId)
                .select("id, currency")
                .single();

            if (error) throw error;

            if (originalHotel) originalHotel.currency = data.currency;

            showMessage(
                "regionalSettingsMessage",
                "Regional preferences saved successfully."
            );
        } catch (error) {
            console.error("Save regional settings error:", error);
            showMessage(
                "regionalSettingsMessage",
                error.message || "Could not save preferences.",
                true
            );
        } finally {
            setButtonBusy(button, false, "Save Preferences");
        }
    });

    // Settings tabs
    document.querySelectorAll("[data-settings-tab]").forEach((button) => {
        button.addEventListener("click", () => {
            const target = button.dataset.settingsTab;

            document.querySelectorAll("[data-settings-tab]").forEach((tab) => {
                tab.classList.toggle("active", tab === button);
            });

            document.querySelectorAll(".settings-panel").forEach((panel) => {
                panel.classList.remove("active");
            });

            const panels = {
                hotel: "hotelSettingsPanel",
                regional: "regionalSettingsPanel",
                account: "accountSettingsPanel"
            };

            $(panels[target])?.classList.add("active");
        });
    });

    $("settingsLogoutButton")?.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to log out?")) return;

        const { error } = await supabase.auth.signOut();

        if (error) {
            alert("Logout failed: " + error.message);
            return;
        }

        window.location.href = "login.html";
    });

    loadSettings().catch((error) => {
        console.error("Settings initialization error:", error);
        showMessage(
            "hotelSettingsMessage",
            error.message || "Could not load hotel settings.",
            true
        );
    });
});