import http from 'k6/http';
import { check, sleep } from 'k6';
export const options = {
  discardResponseBodies: true,
  scenarios: {
    contacts: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '6s',
      preAllocatedVUs: 200,
      maxVUs: 400,
    },
  },
};
// test HTTP
export default function () {
  const url = 'https://ctceth.com/';
  const payload = { originalUrl: 'https://www.google.com/'};
  const params = {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  };
  const res = http.post(url, payload, params);
  // const res = http.post('http://{your url}/api/1.0/report/payments');
  check(res, { 'status was 200': (r) => r.status == 200 });
  sleep(1);
}