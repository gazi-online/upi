import PaytmChecksum from 'paytmchecksum';

export interface PaytmConfig {
  merchantId: string;
  merchantKey: string;
  websiteName?: string; // Staging-এ 'WEBSTAGING', Production-এ 'DEFAULT'
  isProd?: boolean;
}

export interface PaytmPaymentOptions {
  orderId: string;
  amount: number; // เช่น: 199.00
  customerId: string;
  callbackUrl: string;
}

export interface PaytmStatusResult {
  resultInfo: {
    resultStatus: 'TXN_SUCCESS' | 'TXN_FAILURE' | 'PENDING';
    resultCode: string;
    resultMsg: string;
  };
  txnId?: string;
  bankTxnId?: string;
  orderId?: string;
  txnAmount?: string;
  txnDate?: string;
}

export class PaytmGateway {
  private mid: string;
  private mkey: string;
  private websiteName: string;
  private baseUrl: string;

  constructor(config: PaytmConfig) {
    this.mid = config.merchantId;
    this.mkey = config.merchantKey;
    this.websiteName = config.websiteName || (config.isProd ? 'DEFAULT' : 'WEBSTAGING');
    this.baseUrl = config.isProd
      ? 'https://securegw.paytm.in'
      : 'https://securegw-stage.paytm.in';
  }

  /**
   * ১. পেমেন্ট ইনিশিয়েট ও txnToken জেনারেশন
   */
  async createPayment(options: PaytmPaymentOptions) {
    const paytmParams: Record<string, any> = {
      body: {
        requestType: 'Payment',
        mid: this.mid,
        websiteName: this.websiteName,
        orderId: options.orderId,
        callbackUrl: options.callbackUrl,
        txnAmount: {
          value: options.amount.toFixed(2),
          currency: 'INR',
        },
        userInfo: {
          custId: options.customerId,
        },
      },
    };

    // Body স্ট্রিংয়ের ওপর চেকসাম তৈরি
    const signature = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      this.mkey
    );

    paytmParams.head = { signature };

    const endpoint = `/theia/api/v1/initiateTransaction?mid=${this.mid}&orderId=${options.orderId}`;
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paytmParams),
    });

    const data = await response.json();

    return {
      orderId: options.orderId,
      txnToken: data.body?.txnToken,
      raw: data.body,
      // ওয়েব বা মোবাইলে চেকআউটের রিডাইরেক্ট URL
      checkoutUrl: `${this.baseUrl}/theia/api/v1/showPaymentPage?mid=${this.mid}&orderId=${options.orderId}`,
    };
  }

  /**
   * ২. পেমেন্ট স্ট্যাটাস চেক (Order Status API)
   */
  async checkStatus(orderId: string): Promise<PaytmStatusResult> {
    const paytmParams: Record<string, any> = {
      body: {
        mid: this.mid,
        orderId: orderId,
      },
    };

    const signature = await PaytmChecksum.generateSignature(
      JSON.stringify(paytmParams.body),
      this.mkey
    );

    paytmParams.head = { signature };

    const endpoint = `/v3/order/status`;
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paytmParams),
    });

    const data = await response.json();
    return data.body as PaytmStatusResult;
  }

  /**
   * ৩. কলব্যাক/ওয়েবহুক সিগনেচার ভেরিফিকেশন
   */
  async verifyWebhook(responseBody: Record<string, any>, checksum: string): Promise<boolean> {
    // পেটিএম রেসপন্স থেকে CHECKSUMHASH ফিল্ড বাদ দিয়ে বাকি ডাটা ভেরিফাই করতে হয়
    const bodyToVerify = { ...responseBody };
    delete bodyToVerify.CHECKSUMHASH;

    return await PaytmChecksum.verifySignature(bodyToVerify, this.mkey, checksum);
  }
}