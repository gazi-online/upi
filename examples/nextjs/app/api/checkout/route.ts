import { NextResponse } from 'next/server';
import { generateUPIQR } from '@gazi-online/upi';

export async function POST(req: Request) {
  try {
    const { amount, orderId } = await req.json();

    const txnRef = orderId || `TXN_${Date.now()}`;

    const paymentData = await generateUPIQR({
      vpa: process.env.MERCHANT_UPI_VPA || 'yourbusiness@okhdfcbank',
      name: 'Gazi Online',
      amount: Number(amount) || 199.00,
      transactionRef: txnRef,
      transactionNote: `Payment for ${txnRef}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        txnRef,
        amount,
        qrDataUrl: paymentData.dataUrl,
        intentLinks: paymentData.intentLinks,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}