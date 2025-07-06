# Gatcha Game

This repository contains a Flask-based gacha game.

## New Features

- **Profile Management** allows players to update their email, change passwords
  and select a profile image.
- **Admin Panel** lets administrators grant resources, manage PayPal settings,
  ban or unban users and edit the Message of the Day, event text, or bug report link.
- **Batch Grants** allow admins to distribute gems, gold or energy to every player at once.
- **Energy System** introduces separate energy for the campaign and dungeons
  which regenerates over time.
- **Premium Store** now verifies purchases server‑side and refreshes after each
  attempt.
- **Email Confirmation** is required for new accounts with a link sent via email.
- **Equipment Loot** drops from dungeons can be equipped from the Armory screen.
- **Improved Registration** includes email validation and a password reset flow.
- **Security Update** now stores passwords hashed and requires acceptance of a Terms of Service during registration.
- **UI Updates** provide refreshed hero modals and combat log readability.
- **Static Translations** use only the bundled Spanish and Japanese dictionaries and never contact external services.

## PayPal Integration

The store can now process payments via PayPal. Configure your PayPal client ID and secret from the Admin Panel. Once configured, PayPal buttons appear in the store for premium currency purchases. Admins may switch between **Sandbox** and **Live** mode as needed.

During checkout the client captures the order and sends its `order_id` to `/api/paypal_complete`.
The server verifies the purchase with PayPal's API and credits Platinum to the player.
If the client fails to report the purchase, PayPal will notify `/api/paypal_webhook` and the
server will automatically grant the currency based on the webhook data.

The old JavaScript prompt for fake receipts has been removed; real purchases are now handled entirely through PayPal Checkout.

### Managing PayPal Credentials
1. Login as an admin user.
2. Open the **Admin** tab.
3. Fill in `PayPal Client ID` and `PayPal Secret` fields.
4. Choose either **Sandbox** or **Live** mode.
5. Click **Save PayPal** to apply the settings.
6. Add a PayPal webhook for `https://<your-domain>/api/paypal_webhook` and
   subscribe to checkout order events.

These values are stored in the database and used by the server when rendering PayPal buttons.

## Email Configuration

Admins may configure SMTP credentials from the **Admin Panel**. Enter the host, port, username and password under the Email section and click **Save Email**. If no settings are provided, outgoing emails will be written to `sent_emails.log`.

## Database Configuration

The application can use either the bundled SQLite file or a PostgreSQL database. To connect to PostgreSQL set the `DATABASE_URL` environment variable to your connection string before starting the app. When `DATABASE_URL` is present the code connects using `psycopg2`; otherwise it falls back to `database.db`.
