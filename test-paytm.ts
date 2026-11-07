import { PaytmGateway } from './src';

const paytm = new PaytmGateway({
  merchantId: process.env.PAYTM_MID || 'YOUR_MID_HERE',
  merchantKey: process.env.PAYTM_KEY || 'YOUR_KEY_HERE',
  isProd: false, // Sandbox/Staging
});

async function run() {
  const orderId = `ORDER_${Date.now()}`;

  // ১. পেমেন্ট তৈরি
  console.log('Initiating transaction...');
  const payment = await paytm.createPayment({
    orderId,
    amount: 150.00,
    customerId: 'CUST_001',
    callbackUrl: 'https://webhook.site/test',
  });

  console.log('Txn Token:', payment.txnToken);
  console.log('Checkout URL:', payment.checkoutUrl);

  // ২. স্ট্যাটাস চেক
  console.log('\nChecking order status...');
  const status = await paytm.checkStatus(orderId);
  console.log('Status Result:', status.resultInfo.resultStatus);
}

run().catch(console.error);