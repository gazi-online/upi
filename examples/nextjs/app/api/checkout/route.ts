import { NextResponse } from 'next/server';
import { generateUPIQR } from '@gazi-online/upi';
import { upiClient } from '@/lib/upipay';

export async function POST(req: Request) {
  try {
    const { amount, orderId } = await req.json();
    const txnRef = orderId || `ORD_${Date.now()}`;
    const payableAmount = Number(amount) || 199.0;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // ১. ইউনিফাইড গেটওয়ে দিয়ে পেমেন্ট সেশন তৈরি (PhonePe/Paytm যাই কনফিগার করা থাকুক)
    const paymentSession = await upiClient.createPayment({
      orderId: txnRef,
      amount: payableAmount,
      customerId: 'CUST_DEMO',
      callbackUrl: `${appUrl}/api/checkout/webhook`,
      redirectUrl: `${appUrl}/checkout?txnRef=${txnRef}&status=success`,
    });

    // ২. অন-স্ক্রিন স্ক্যানের জন্য ডাইনামিক NPCI QR কোড ও ইন্টেন্ট লিংক তৈরি
    const qrData = await generateUPIQR({
      vpa: process.env.MERCHANT_UPI_VPA || 'merchant@upi',
      name: process.env.MERCHANT_NAME || 'Store Payment',
      amount: payableAmount,
      transactionRef: txnRef,
      transactionNote: `Order ${txnRef}`,
    });

    return NextResponse.json({
      success: true,
      data: {
        txnRef,
        amount: payableAmount,
        redirectUrl: paymentSession.redirectUrl,
        qrDataUrl: qrData.dataUrl,
        intentLinks: qrData.intentLinks,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Payment initiation failed' },
      { status: 500 }
    );
  }
}