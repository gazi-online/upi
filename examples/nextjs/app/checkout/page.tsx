'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface PaymentDetails {
  txnRef: string;
  amount: number;
  qrDataUrl: string;
  intentLinks: {
    phonepe: string;
    gpay: string;
    paytm: string;
    generic: string;
  };
}

export default function CheckoutPage() {
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'PENDING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initiatePayment = async () => {
    setLoading(true);
    setStatus('PENDING');
    setErrorMessage(null);

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 199.00 }),
    });

    const json = await res.json();
    if (json.success) {
      setPayment(json.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!payment?.txnRef || status === 'COMPLETED' || status === 'FAILED') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/checkout/status?txnRef=${payment.txnRef}`);
        const data = await res.json();

        if (data.status === 'SUCCESS') {
          setStatus('COMPLETED');
          clearInterval(interval);
        } else if (data.status === 'FAILED') {
          setStatus('FAILED');
          setErrorMessage(data.message || 'Transaction could not be processed');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [payment, status]);

  return (
    <div style={{ maxWidth: 440, margin: '40px auto', padding: 24, fontFamily: 'sans-serif', border: '1px solid #e2e8f0', borderRadius: 12, textAlign: 'center' }}>
      <h2>UPI Checkout</h2>
      <p style={{ color: '#64748b' }}>Order Total: <strong>₹199.00</strong></p>

      {status === 'IDLE' && (
        <button
          onClick={initiatePayment}
          disabled={loading}
          style={{ padding: '12px 24px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}
        >
          {loading ? 'Generating...' : 'Pay with UPI'}
        </button>
      )}

      {status === 'PENDING' && payment && (
        <div>
          <div style={{ margin: '20px 0' }}>
            <Image
              src={payment.qrDataUrl}
              alt="Scan UPI QR"
              width={260}
              height={260}
              unoptimized
              style={{ borderRadius: 8, border: '1px solid #cbd5e1' }}
            />
            <p style={{ fontSize: 13, color: '#475569', marginTop: 8 }}>
              PhonePe, Google Pay বা Paytm অ্যাপ দিয়ে স্ক্যান করুন
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', margin: '16px 0' }}>
            <a
              href={payment.intentLinks.phonepe}
              style={{ padding: '8px 12px', background: '#5f259f', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}
            >
              PhonePe
            </a>
            <a
              href={payment.intentLinks.gpay}
              style={{ padding: '8px 12px', background: '#0f9d58', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}
            >
              Google Pay
            </a>
            <a
              href={payment.intentLinks.paytm}
              style={{ padding: '8px 12px', background: '#00b9f5', color: '#fff', borderRadius: 6, textDecoration: 'none', fontSize: 13 }}
            >
              Paytm
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#eab308' }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#eab308' }} />
            <span>Waiting for payment confirmation...</span>
          </div>
          <small style={{ display: 'block', color: '#94a3b8', marginTop: 4 }}>Ref: {payment.txnRef}</small>
        </div>
      )}

      {status === 'FAILED' && (
        <div style={{ padding: '24px 0', color: '#dc2626' }}>
          <div style={{ fontSize: 48 }}>✕</div>
          <h3>Payment Failed</h3>
          <p style={{ color: '#475569' }}>{errorMessage}</p>
          <button
            onClick={() => {
              setStatus('IDLE');
              setPayment(null);
              setErrorMessage(null);
            }}
            style={{ marginTop: 16, padding: '12px 24px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 }}
          >
            Try Again
          </button>
        </div>
      )}

      {status === 'COMPLETED' && (
        <div style={{ padding: '24px 0', color: '#16a34a' }}>
          <div style={{ fontSize: 48 }}>✓</div>
          <h3>Payment Successful!</h3>
          <p style={{ color: '#475569' }}>Transaction Reference: {payment?.txnRef}</p>
        </div>
      )}
    </div>
  );
}