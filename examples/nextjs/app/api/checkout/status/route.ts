import { NextResponse } from 'next/server';
import { upiClient } from '@/lib/upipay';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const txnRef = searchParams.get('txnRef');

  if (!txnRef) {
    return NextResponse.json(
      { error: 'Missing transaction reference (txnRef)' },
      { status: 400 }
    );
  }

  try {
    // যেকোনো গেটওয়ের জন্য স্ট্যান্ডার্ডাইজড রেসপন্স: SUCCESS | PENDING | FAILED
    const result = await upiClient.checkStatus(txnRef);

    return NextResponse.json({
      status: result.status,
      amount: result.amount,
      transactionId: result.transactionId,
      message: result.message,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'PENDING',
      message: error.message || 'Waiting for payment confirmation',
    });
  }
}