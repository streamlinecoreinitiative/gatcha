# Gatcha Game

This repository contains a Flask-based gacha game.

## PayPal Integration

The store can now process payments via PayPal. Configure your PayPal client ID and secret from the Admin Panel. Once configured, PayPal buttons appear in the store for premium currency purchases.

### Managing PayPal Credentials
1. Login as an admin user.
2. Open the **Admin** tab.
3. Fill in `PayPal Client ID` and `PayPal Secret` fields.
4. Click **Save PayPal** to apply the settings.

These values are stored in the database and used by the server when rendering PayPal buttons.
