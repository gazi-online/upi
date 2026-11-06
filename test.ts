import { generateUPIQR } from './src';

async function test() {
  console.log('Testing UPI QR generation...');

  const result = await generateUPIQR({
    vpa: 'testuser@upi',
    name: 'Gazi Test Store',
    amount: 199.00,
    transactionNote: 'Order #001',
  });

  console.log('✓ Generated URI:', result.upiUri);
  console.log('✓ PhonePe Intent Link:', result.intentLinks.phonepe);
  console.log('✓ QR Data URL preview:', result.dataUrl.slice(0, 40) + '...');
}

test().catch(console.error);