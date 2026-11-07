import { PhonePeGateway, PhonePeConfig } from './phonepe';
import { PaytmGateway, PaytmConfig } from './paytm';

export type PaymentProvider = 'phonepe' | 'paytm';
export type NormalizedStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export interface UnifiedPaymentParams {
  orderId: string;
  amount: number; // INR (যেমন: 199.00)
  customerId: string;
  callbackUrl: string;
  redirectUrl: string;
}

export interface UnifiedPaymentResult {
  orderId: string;
  redirectUrl: string; // ব্যবহারকারীকে রিডাইরেক্ট করার চূড়ান্ত URL
  raw: any;
}

export interface UnifiedStatusResult {
  orderId: string;
  status: NormalizedStatus;
  amount?: number;
  transactionId?: string;
  message?: string;
  raw: any;
}

export type UPIPayConfig =
  | { provider: 'phonepe'; credentials: PhonePeConfig }
  | { provider: 'paytm'; credentials: PaytmConfig };

export class UPIPay {
  private provider: PaymentProvider;
  private phonepe?: PhonePeGateway;
  private paytm?: PaytmGateway;

  constructor(config: UPIPayConfig) {
    this.provider = config.provider;

    if (config.provider === 'phonepe') {
      this.phonepe = new PhonePeGateway(config.credentials);
    } else if (config.provider === 'paytm') {
      this.paytm = new PaytmGateway(config.credentials);
    }
  }

  /**
   * ইউনিফাইড পেমেন্ট ইনিশিয়েশন
   */
  async createPayment(params: UnifiedPaymentParams): Promise<UnifiedPaymentResult> {
    if (this.provider === 'phonepe' && this.phonepe) {
      const response = await this.phonepe.createPayment({
        merchantTransactionId: params.orderId,
        merchantUserId: params.customerId,
        amount: params.amount,
        callbackUrl: params.callbackUrl,
        redirectUrl: params.redirectUrl,
      });

      // PhonePe PAY_PAGE রিডাইরেক্ট URL এক্সট্র্যাক্ট
      const redirectUrl =
        response?.data?.instrumentResponse?.redirectInfo?.url || '';

      return {
        orderId: params.orderId,
        redirectUrl,
        raw: response,
      };
    }

    if (this.provider === 'paytm' && this.paytm) {
      const response = await this.paytm.createPayment({
        orderId: params.orderId,
        amount: params.amount,
        customerId: params.customerId,
        callbackUrl: params.callbackUrl,
      });

      return {
        orderId: params.orderId,
        redirectUrl: response.checkoutUrl,
        raw: response.raw,
      };
    }

    throw new Error(`Unsupported payment provider: ${this.provider}`);
  }

  /**
   * ইউনিফাইড স্ট্যাটাস চেকিং
   */
  async checkStatus(orderId: string): Promise<UnifiedStatusResult> {
    if (this.provider === 'phonepe' && this.phonepe) {
      const res = await this.phonepe.checkStatus(orderId);
      const isSuccess = res?.code === 'PAYMENT_SUCCESS' || res?.data?.responseCode === 'SUCCESS';
      const isPending = res?.code === 'PAYMENT_PENDING';

      return {
        orderId,
        status: isSuccess ? 'SUCCESS' : isPending ? 'PENDING' : 'FAILED',
        amount: res?.data?.amount ? res.data.amount / 100 : undefined, // পয়সা থেকে টাকায় রূপান্তর
        transactionId: res?.data?.transactionId,
        message: res?.message || res?.code,
        raw: res,
      };
    }

    if (this.provider === 'paytm' && this.paytm) {
      const res = await this.paytm.checkStatus(orderId);
      const resultStatus = res?.resultInfo?.resultStatus;

      return {
        orderId,
        status:
          resultStatus === 'TXN_SUCCESS'
            ? 'SUCCESS'
            : resultStatus === 'PENDING'
            ? 'PENDING'
            : 'FAILED',
        amount: res?.txnAmount ? parseFloat(res.txnAmount) : undefined,
        transactionId: res?.txnId,
        message: res?.resultInfo?.resultMsg,
        raw: res,
      };
    }

    throw new Error(`Unsupported payment provider: ${this.provider}`);
  }

  /**
   * ইউনিফাইড ওয়েববুক সিগনেচার ভেরিফিকেশন
   */
  async verifyWebhook(body: any, signature: string): Promise<boolean> {
    if (this.provider === 'phonepe' && this.phonepe) {
      const stringBody = typeof body === 'string' ? body : JSON.stringify(body);
      return this.phonepe.verifyWebhook(stringBody, signature);
    }

    if (this.provider === 'paytm' && this.paytm) {
      const parsedBody = typeof body === 'string' ? JSON.parse(body) : body;
      return await this.paytm.verifyWebhook(parsedBody, signature);
    }

    return false;
  }
}