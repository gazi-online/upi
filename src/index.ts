import QRCode from 'qrcode';
import crypto from 'crypto';
import { PhonePeGateway, PhonePeConfig, CreatePaymentOptions } from './phonepe';

// --- Type Definitions ---
export interface UPIQROptions {
  vpa: string;
  name: string;
  amount: number;
  transactionRef?: string;
  transactionNote?: string;
}

export interface UPIQRResult {
  upiUri: string;
  dataUrl: string;
  transactionRef: string;
  intentLinks: {
    phonepe: string;
    paytm: string;
    gpay: string;
    generic: string;
  };
}

// Re-export PhonePe types
export type { PhonePeConfig, CreatePaymentOptions };

// --- 1. Dynamic NPCI UPI QR Generator ---
export async function generateUPIQR(options: UPIQROptions): Promise<UPIQRResult> {
  const {
    vpa,
    name,
    amount,
    transactionRef = `TXN${Date.now()}`,
    transactionNote = 'Payment',
  } = options;

  const upiUri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(name)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}&tr=${encodeURIComponent(transactionRef)}`;

  const intentLinks = {
    phonepe: upiUri.replace(/^upi:\/\/pay/, 'phonepe://pay'),
    paytm: upiUri.replace(/^upi:\/\/pay/, 'paytmmp://pay'),
    gpay: upiUri.replace(/^upi:\/\/pay/, 'gpay://upi/pay'),
    generic: upiUri,
  };

  const dataUrl = await QRCode.toDataURL(upiUri, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 300,
  });

  return {
    upiUri,
    dataUrl,
    transactionRef,
    intentLinks,
  };
}

export * from './phonepe';
export * from './paytm';
export * from './client';