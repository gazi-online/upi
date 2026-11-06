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

export { PhonePeGateway, generateUPIQR };
export type { CreatePaymentOptions, PhonePeConfig, UPIQROptions, UPIQRResult };
