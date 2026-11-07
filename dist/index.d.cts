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
declare function generateUPIQR(options: UPIQROptions): Promise<UPIQRResult>;
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

export { PaytmGateway, PhonePeGateway, generateUPIQR };
export type { CreatePaymentOptions, PaytmConfig, PaytmPaymentOptions, PaytmStatusResult, PhonePeConfig, UPIQROptions, UPIQRResult };
