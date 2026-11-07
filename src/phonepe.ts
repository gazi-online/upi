import crypto from 'crypto';

export interface PhonePeConfig {
  merchantId: string;
  saltKey: string;
  saltIndex: number;
  isProd?: boolean;
}

export interface CreatePaymentOptions {
  amount: number; // টাকার অঙ্কে (যেমন: 150.50)
  merchantTransactionId: string;
  merchantUserId: string;
  callbackUrl: string;
  redirectUrl: string;
}

export class PhonePeGateway {
  private merchantId: string;
  private saltKey: string;
  private saltIndex: number;
  private baseUrl: string;

  constructor(config: PhonePeConfig) {
    this.merchantId = config.merchantId;
    this.saltKey = config.saltKey;
    this.saltIndex = config.saltIndex;
    this.baseUrl = config.isProd
      ? 'https://api.phonepe.com/apis/hermes'
      : 'https://api-preprod.phonepe.com/apis/hermes';
  }

  private calculateChecksum(payloadBase64: string, endpoint: string): string {
    const stringToHash = `${payloadBase64}${endpoint}${this.saltKey}`;
    const hash = crypto.createHash('sha256').update(stringToHash).digest('hex');
    return `${hash}###${this.saltIndex}`;
  }

  async createPayment(params: CreatePaymentOptions) {
    const endpoint = '/pg/v1/pay';

    const payload = {
      merchantId: this.merchantId,
      merchantTransactionId: params.merchantTransactionId,
      merchantUserId: params.merchantUserId,
      amount: Math.round(params.amount * 100), // পয়সা হিসেবে কনভার্ট
      redirectUrl: params.redirectUrl,
      redirectMode: 'POST',
      callbackUrl: params.callbackUrl,
      paymentInstrument: {
        type: 'PAY_PAGE',
      },
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const xVerify = this.calculateChecksum(base64Payload, endpoint);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
      },
      body: JSON.stringify({ request: base64Payload }),
    });

    return await response.json();
  }

  async checkStatus(merchantTransactionId: string) {
    const endpoint = `/pg/v1/status/${this.merchantId}/${merchantTransactionId}`;
    const xVerify = this.calculateChecksum('', endpoint);

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-VERIFY': xVerify,
        'X-MERCHANT-ID': this.merchantId,
      },
    });

    return await response.json();
  }

  verifyWebhook(responseBody: string, xVerifyHeader: string): boolean {
    const [hash, index] = xVerifyHeader.split('###');
    if (Number(index) !== this.saltIndex) return false;

    const calculatedHash = crypto
      .createHash('sha256')
      .update(`${responseBody}${this.saltKey}`)
      .digest('hex');

    return hash === calculatedHash;
  }
}