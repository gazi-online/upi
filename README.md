# upipay

[![npm version](https://img.shields.io/npm/v/@gazi-online/upi.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/@gazi-online/upi)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178c6?style=flat-square)](https://www.typescriptlang.org/)

> Zero-commission, direct UPI payment gateway and dynamic NPCI QR code generator for Node.js and TypeScript.

Accept UPI payments directly to your bank account with ₹0 platform commission. Easily generate dynamic NPCI-compliant QR codes, deep-intent links (PhonePe, Google Pay, Paytm), and integrate with PhonePe Business APIs for automated status checks and webhooks.

---

## Features

* **0% Platform Commission:** Receive funds directly into your bank via NPCI; bypass high aggregator fees.
* **Dynamic NPCI QR Generation:** Create scannable Base64 data URI QR codes on the fly.
* **Deep-link Intents:** Direct URI links for PhonePe, Paytm, and Google Pay mobile apps.
* **PhonePe Business API Support:** Seamless payment initiation, status checks, and HMAC-SHA256 webhook validation.
* **Dual Module Support:** Ships with both ES Modules (ESM) and CommonJS (CJS) alongside full TypeScript definitions.
* **Lightweight & Secure:** Minimal dependencies and zero runtime bloat.

---

## Installation

```bash
npm install upipay
```

Or using another package manager:

```bash
pnpm add upipay
# or
yarn add upipay
```

---

## Quick Start

### 1. Generate Dynamic UPI QR & App Links

Generate an NPCI-compliant UPI QR code and intent links without requiring any API keys or credentials:

```typescript
import { generateUPIQR } from 'upipay';

async function main() {
  const payment = await generateUPIQR({
    vpa: 'yourname@upi',
    name: 'Your Business Name',
    amount: 199.00,
    transactionNote: 'Order #1001',
    transactionRef: `TXN_${Date.now()}`,
  });

  console.log('UPI URI:', payment.upiUri);
  console.log('PhonePe App Link:', payment.intentLinks.phonepe);
  console.log('Base64 QR Code (use directly in <img src="..." />):');
  console.log(payment.dataUrl);
}

main();
```

---

### 2. PhonePe Business Gateway Integration

Automate transaction tracking, redirects, and status polling using official PhonePe Business credentials.

```typescript
import { PhonePeGateway } from 'upipay';

const gateway = new PhonePeGateway({
  merchantId: process.env.PHONEPE_MERCHANT_ID!,
  saltKey: process.env.PHONEPE_SALT_KEY!,
  saltIndex: 1,
  isProd: false, // Set to true for live environment
});

// Create a checkout session
async function createOrder() {
  const response = await gateway.createPayment({
    amount: 499.00, // INR
    merchantTransactionId: `TXN_${Date.now()}`,
    merchantUserId: 'CUST_101',
    callbackUrl: 'https://yourdomain.com/api/payment-callback',
    redirectUrl: 'https://yourdomain.com/order-success',
  });

  console.log(response);
}

// Check payment status
async function checkOrderStatus(transactionId: string) {
  const status = await gateway.checkStatus(transactionId);
  console.log(status);
}
```

---

### 3. Webhook Signature Verification

Secure your webhook endpoint against fraudulent payment confirmations:

```typescript
// Example using Express / Next.js API Routes
app.post('/api/payment-callback', (req, res) => {
  const xVerify = req.headers['x-verify'] as string;
  const rawBody = JSON.stringify(req.body);

  const isValid = gateway.verifyWebhook(rawBody, xVerify);

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid webhook signature' });
  }

  // Fulfill order in your database
  res.status(200).json({ status: 'SUCCESS' });
});
```

---

## API Reference

### `generateUPIQR(options)`

Generates an NPCI-compliant URI, mobile intent deep links, and a Base64 data URL for QR rendering.

#### Parameters: `UPIQROptions`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `vpa` | `string` | **Yes** | Receiver's UPI VPA (e.g., `user@okhdfcbank`, `merchant@ybl`). |
| `name` | `string` | **Yes** | Payee or business name. |
| `amount` | `number` | **Yes** | Amount in INR (formatted automatically to 2 decimal places). |
| `transactionRef` | `string` | No | Custom merchant reference ID (defaults to `TXN<timestamp>`). |
| `transactionNote` | `string` | No | Short description or order memo (defaults to `Payment`). |

#### Returns: `Promise<UPIQRResult>`

| Field | Type | Description |
| --- | --- | --- |
| `upiUri` | `string` | Raw `upi://pay` URI string. |
| `dataUrl` | `string` | Base64 encoded PNG data URI (`data:image/png;base64,...`). |
| `transactionRef` | `string` | The resolved transaction reference ID. |
| `intentLinks` | `object` | Direct intent schemes for `phonepe`, `paytm`, `gpay`, and `generic`. |

---

### `class PhonePeGateway`

#### Constructor: `new PhonePeGateway(config)`

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `merchantId` | `string` | **Yes** | PhonePe Merchant ID. |
| `saltKey` | `string` | **Yes** | API Salt Key provided in PhonePe Business dashboard. |
| `saltIndex` | `number` | **Yes** | Key index (typically `1`). |
| `isProd` | `boolean` | No | `false` uses preprod/sandbox, `true` connects to Hermes live API. |

#### Methods

* **`createPayment(params: CreatePaymentOptions): Promise<any>`**
  Initiates a payment session on PhonePe. Converts amounts automatically to paise and calculates the `X-VERIFY` header.
* **`checkStatus(merchantTransactionId: string): Promise<any>`**
  Checks the real-time status of a transaction with PhonePe Hermes API.
* **`verifyWebhook(responseBody: string, xVerifyHeader: string): boolean`**
  Validates incoming server-to-server callbacks by recalculating the SHA-256 signature against the configured Salt Key.

---

## License

This project is licensed under the [MIT License](https://www.google.com/search?q=LICENSE).