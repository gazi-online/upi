import { NextResponse } from 'next/server';
import { PhonePeGateway } from '@gazi-online/upi';

const gateway = new PhonePeGateway({
  merchantId: process.env.PHONEPE_MERCHANT_ID || 'TEST_MID',
  saltKey: process.env.PHONEPE_SALT_KEY || 'TEST_KEY',
  saltIndex: 1,
  isProd: false,
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const txnRef = searchParams.get('txnRef');

  if (!txnRef) {
    return NextResponse.json({ error: 'Missing transaction reference' }, { status: 400 });
  }

  try {
    const statusResult = await gateway.checkStatus(txnRef);

    const isCompleted = statusResult?.code === 'PAYMENT_SUCCESS' || statusResult?.state === 'COMPLETED';

    return NextResponse.json({
      status: isCompleted ? 'COMPLETED' : 'PENDING',
      raw: statusResult,
    });
  } catch {
    return NextResponse.json({ status: 'PENDING' });
  }
}