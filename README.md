# Star Hotel — Supabase Trial

This is a minimal test project to confirm that the website can connect to Supabase before we build the hotel database.

## Run in VS Code

1. Extract this folder.
2. Open the `star-hotel-trial` folder in VS Code.
3. Install the VS Code extension **Live Server** if needed.
4. Open `index.html`.
5. Right-click -> **Open with Live Server**.
6. The page should show **SUPABASE CONNECTED**.

## Supabase connection

`js/config.js` contains the Supabase project URL and a browser-safe publishable key.

Never put a Supabase `service_role` or secret key in this file.

## Next step

After the connection test works, we will create the hotel database tables in Supabase:
Rooms, Guests, Bookings, Stays, Restaurant Orders, Charges, Invoices, and Payments.
