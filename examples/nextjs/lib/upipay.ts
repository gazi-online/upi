import { UPIPay } from '@gazi-online/upi';

const provider = (process.env.PAYMENT_PROVIDER as 'phonepe' | 'paytm') || 'phonepe';
const isProd = process.env.NODE_ENV === 'production';

export const upiClient = new UPIPay(
  provider === 'phonepe'
    ? {
        provider: 'phonepe',
        credentials: {
          merchantId: process.env.PHONEPE_MERCHANT_ID || 'TEST_MID',
          saltKey: process.env.PHONEPE_SALT_KEY || 'TEST_SALT_KEY',
          saltIndex: Number(process.env.PHONEPE_SALT_INDEX) || 1,
          isProd,
        },
      }
    : {
        provider: 'paytm',
        credentials: {
          merchantId: process.env.PAYTM_MERCHANT_ID || 'TEST_PAYTM_MID',
          merchantKey: process.env.PAYTM_MERCHANT_KEY || 'TEST_PAYTM_KEY',
          isProd,
        },
      }
);