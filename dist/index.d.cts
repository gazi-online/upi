interface PhonePeConfig {
    merchantId: string;
    saltKey: string;
    saltIndex: number;
    isProd?: boolean;
}
interface CreatePaymentOptions {
    amount: number;
    merchantTransactionId: string;
    merchantUserId: string;
    callbackUrl: string;
    redirectUrl: string;
}
declare class PhonePeGateway {
    private merchantId;
    private saltKey;
    private saltIndex;
    private baseUrl;
    constructor(config: PhonePeConfig);
    private calculateChecksum;
    createPayment(params: CreatePaymentOptions): Promise<any>;
    checkStatus(merchantTransactionId: string): Promise<any>;
    verifyWebhook(responseBody: string, xVerifyHeader: string): boolean;
}

interface PaytmConfig {
    merchantId: string;
    merchantKey: string;
    websiteName?: string;
    isProd?: boolean;
}
interface PaytmPaymentOptions {
    orderId: string;
    amount: number;
    customerId: string;
    callbackUrl: string;
}
interface PaytmStatusResult {
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
declare class PaytmGateway {
    private mid;
    private mkey;
    private websiteName;
    private baseUrl;
    constructor(config: PaytmConfig);
    /**
     * ১. পেমেন্ট ইনিশিয়েট ও txnToken জেনারেশন
     */
    createPayment(options: PaytmPaymentOptions): Promise<{
        orderId: string;
        txnToken: any;
        raw: any;
        checkoutUrl: string;
    }>;
    /**
     * ২. পেমেন্ট স্ট্যাটাস চেক (Order Status API)
     */
    checkStatus(orderId: string): Promise<PaytmStatusResult>;
    /**
     * ৩. কলব্যাক/ওয়েবহুক সিগনেচার ভেরিফিকেশন
     */
    verifyWebhook(responseBody: Record<string, any>, checksum: string): Promise<boolean>;
}

type PaymentProvider = 'phonepe' | 'paytm';
type NormalizedStatus = 'SUCCESS' | 'PENDING' | 'FAILED';
interface UnifiedPaymentParams {
    orderId: string;
    amount: number;
    customerId: string;
    callbackUrl: string;
    redirectUrl: string;
}
interface UnifiedPaymentResult {
    orderId: string;
    redirectUrl: string;
    raw: any;
}
interface UnifiedStatusResult {
    orderId: string;
    status: NormalizedStatus;
    amount?: number;
    transactionId?: string;
    message?: string;
    raw: any;
}
type UPIPayConfig = {
    provider: 'phonepe';
    credentials: PhonePeConfig;
} | {
    provider: 'paytm';
    credentials: PaytmConfig;
};
declare class UPIPay {
    private provider;
    private phonepe?;
    private paytm?;
    constructor(config: UPIPayConfig);
    /**
     * ইউনিফাইড পেমেন্ট ইনিশিয়েশন
     */
    createPayment(params: UnifiedPaymentParams): Promise<UnifiedPaymentResult>;
    /**
     * ইউনিফাইড স্ট্যাটাস চেকিং
     */
    checkStatus(orderId: string): Promise<UnifiedStatusResult>;
    /**
     * ইউনিফাইড ওয়েববুক সিগনেচার ভেরিফিকেশন
     */
    verifyWebhook(body: any, signature: string): Promise<boolean>;
}

interface UPIQROptions {
    vpa: string;
    name: string;
    amount: number;
    transactionRef?: string;
    transactionNote?: string;
}
interface UPIQRResult {
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

declare function generateUPIQR(options: UPIQROptions): Promise<UPIQRResult>;

export { PaytmGateway, PhonePeGateway, UPIPay, generateUPIQR };
export type { CreatePaymentOptions, NormalizedStatus, PaymentProvider, PaytmConfig, PaytmPaymentOptions, PaytmStatusResult, PhonePeConfig, UPIPayConfig, UPIQROptions, UPIQRResult, UnifiedPaymentParams, UnifiedPaymentResult, UnifiedStatusResult };
