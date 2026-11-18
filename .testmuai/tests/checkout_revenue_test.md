---
mode: testing
url: "{{checkout_url}}"
timeout: 120
tags: [smoke, revenue-guard, web]
---
# Owned staging checkout — revenue verification

@import ./helpers/cart_seed.md

## Copy the staging promotion
Use the Copy promotion button. Assert that the clipboard matches the promotion displayed on the page. Apply that promotion to the cart.

## Verify cart persistence
Assert that localStorage contains a nonempty checkout_cart_hash. Reload the checkout and confirm the same cart and discounted total remain.

## Complete a test checkout
Use only the merchant's configured test payment method in its isolated staging environment. If a sandbox verification dialog is displayed, use the approved test confirmation; otherwise continue. Never enter real payment details or place a real order.

## Verify the response
Assert that POST /api/checkout/session returned HTTP 200 and no request returned a 5xx status. Assert that the console contains no errors or unhandled exceptions.

## Check the page and session
Assert that LCP is below 2500 ms and CLS is below 0.1. Assert that the session_id cookie is httpOnly, secure, and has the expected sameSite setting for the staging application.

## Extract the final state
Verify a confirmation is visible. Store the displayed order identifier as order_id and the charged test amount as final_price.
