# sm-api

Lightweight NestJS service for subscription management (plans, subscriptions, Stripe integration).

## Overview

This service provides user authentication, plan listing, subscription creation, cancellation, and a Stripe webhook endpoint to process subscription events. It's a NestJS project intended to run locally or in a containerized environment.

## Prerequisites

- Node.js >= 18
- npm or yarn
- (Optional) Stripe CLI for local webhook testing

## Install

Clone the repo and install dependencies:

```bash
git clone <repo-url>
cd sm-api
npm install
# or
yarn install
```

## Environment

Create a `.env` file in the project root with the variables below. Replace placeholders with your local values / Stripe test keys.

Required environment variables

- `PORT` - port app listens on (default: `3000`)
- `JWT_SECRET` - secret used to sign JWTs
- `STRIPE_SECRET_KEY` - Stripe secret key (test)
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret (for verifying incoming webhook requests)
- `MONGO_URI` - MongoDB connection string (if using Mongo)

Example `.env`:

```
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
STRIPE_SECRET_KEY=<your_stripe_test_secret>
STRIPE_WEBHOOK_SECRET=<your_stripe_webhook_secret>
MONGO_URI=mongodb://localhost:27017/subscription-api
```

## Running

Start in development mode (watch mode):

```bash
npm run start:dev
# or
yarn start:dev
```

Run tests (unit):

```bash
npm run test
```

## API Endpoints (common)

The codebase exposes controllers for authentication, plans, and subscriptions. Below are typical endpoints and example usages — adapt request bodies to your implementation.

- Auth
  - `POST /auth/signup` — creates user and returns JWT
    - Body: `{ "email": "user@example.com", "password": "password" }`
  - `POST /auth/login` — returns JWT
    - Body: `{ "email": "user@example.com", "password": "password" }`

- Plans
  - `GET /plans` — list available plans

- Subscriptions
  - `GET /subscriptions` — shows a current subscription of the user
  -  `POST /subscriptions/checkout` — starts payment checkout process
    - Example body: `{"planId": "standard"}`
  - `POST /subscriptions/webhook` — Stripe webhook endpoint (configured to receive events from Stripe)
    - Exmple body `
{
  "type": "checkout.session.completed",
  "data": {
    "object": {
      "id": "cs_test_a19q9VuhJaWNrdl061mWuAq4jgTumSDrf1kaswbd3zBKD250GTKHpKbueo",
      "object": "checkout.session",
      "subscription": "sub_1SiIsj9m5gBf38FJ3tWiucKg"
    }
  }
}
`

## Stripe (test) setup

1. Get your Stripe test API keys from the Stripe Dashboard (or create an account).
   - Test secret key example format: `sk_test_XXXXXXXXXXXXXXXXXXXXXXXX` (DO NOT use these example values in production).
   - Test publishable key example format: `pk_test_XXXXXXXXXXXXXXXXXXXXXXXX`.

2. Set `STRIPE_SECRET_KEY` in your `.env` to the test secret key.

3. Webhook testing (recommended: use Stripe CLI):

Install Stripe CLI: https://stripe.com/docs/stripe-cli

Start listening and forward events to your local webhook endpoint (adjust port/path):

```bash
stripe listen --forward-to localhost:3000/subscriptions/webhook
```

The Stripe CLI will print a webhook signing secret (starts with `whsec_...`). Put that value into `STRIPE_WEBHOOK_SECRET`.

4. Test payments

Use Stripe test cards when creating PaymentMethods during testing. Common test card:

- Card number: `4242 4242 4242 4242` (any future expiry, CVC `123`) — successful charge

See Stripe docs for more test cards and scenarios: https://stripe.com/docs/testing

## Webhook signature verification

The webhook endpoint should verify the `Stripe-Signature` header using `STRIPE_WEBHOOK_SECRET` before processing events. If you use the Stripe SDK, use `stripe.webhooks.constructEvent(payload, sigHeader, webhookSecret)` to validate.

## Common Troubleshooting

- 401 Unauthorized: Ensure `JWT_SECRET` matches the secret used to sign tokens and that Authorization header is `Bearer <token>`.
- Webhook 400/500: Check that `STRIPE_WEBHOOK_SECRET` is set and that the payload is passed raw (no body parsing middleware that modifies it before verification).

## Security & Production Notes

- Use real secrets management (Vault, cloud provider secrets) in production.
- Use HTTPS and set secure cookie flags if using cookies.
- Validate and sanitize all incoming data.

## Contributing

Open issues or PRs with improvements. For large changes, create a feature branch and open a PR.

## Where to look in the code

- Auth controller: `src/auth/auth.controller.ts`
- Plans controller: `src/plans/plans.controller.ts`
- Subscriptions & webhook: `src/subscriptions/subscriptions.controller.ts`


