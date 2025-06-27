# Gatcha Game

This repository contains a Flask-based gacha game.

## New Features

- **Profile Management** allows players to update their email, change passwords
  and select a profile image.
- **Admin Panel** lets administrators grant resources, manage PayPal settings,
  ban or unban users and edit the Message of the Day or event text.
- **Batch Grants** allow admins to distribute gems, gold or energy to every player at once.
- **Energy System** introduces separate energy for the campaign and dungeons
  which regenerates over time.
- **Premium Store** now verifies purchases server‑side and refreshes after each
  attempt.
- **Equipment Loot** drops from dungeons can be equipped from the Armory screen.
- **Improved Registration** includes email validation and a password reset flow.
- **Security Update** now stores passwords hashed and requires acceptance of a Terms of Service during registration.
- **UI Updates** provide refreshed hero modals and combat log readability.

## PayPal Integration

The store can now process payments via PayPal. Configure your PayPal client ID and secret from the Admin Panel. Once configured, PayPal buttons appear in the store for premium currency purchases.

During checkout the client sends a PayPal `order_id` to `/api/paypal_complete`.
The server verifies the order with PayPal's API and uses `grant_currency()` to credit Platinum to the player.

The old JavaScript prompt for fake receipts has been removed; real purchases are now handled entirely through PayPal Checkout.

### Managing PayPal Credentials
1. Login as an admin user.
2. Open the **Admin** tab.
3. Fill in `PayPal Client ID` and `PayPal Secret` fields.
4. Click **Save PayPal** to apply the settings.

These values are stored in the database and used by the server when rendering PayPal buttons.
