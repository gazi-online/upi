import { SmsObserverServer } from './src/server.js';

const apiBase = process.env.PAYMENT_API_URL
  || process.env.BASE_PAYMENT_API_URL
  || process.env.PUBLIC_APP_URL
  || process.env.CHECKOUT_PUBLIC_URL
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:6100');

const observer = new SmsObserverServer({
  apiBaseUrl: apiBase
});
const server = observer.createServer();

export default function handler(req, res) {
  return server.emit('request', req, res);
}
