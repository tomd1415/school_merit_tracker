
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';
const FULL_PIN = '999999';

const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  maxRedirects: 0,
  validateStatus: status => status >= 200 && status < 400
});

let sessionCookie = "";

async function login() {
  try {
    const res = await client.post('/check-pin', `pin=${FULL_PIN}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const setCookie = res.headers['set-cookie'];
    if (setCookie && setCookie.length > 0) {
      sessionCookie = setCookie[0].split(';')[0];
      console.log("[PASS] Logged in successfully.");
    } else {
      console.error("[FAIL] No session cookie received.");
      process.exit(1);
    }
  } catch (err) {
    console.error("[ERROR] Login failed:", err.message);
    process.exit(1);
  }
}

async function runTests() {
  let form_id = null;
  let prize_id = null;
  let pupil_id = null;

  // Fetch valid form_id
  try {
    const res = await client.get('/forms/all', { headers: { 'Cookie': sessionCookie } });
    if (res.data.length > 0) {
      form_id = res.data[0].form_id;
    } else {
      console.log("[WARN] No forms available for Add Pupil test.");
    }
  } catch {
    console.log("[ERROR] Failed to fetch forms.");
  }

  // Fetch valid prize_id
  try {
    const res = await client.get('/prizes/all/json', { headers: { 'Cookie': sessionCookie } });
    if (res.data.length > 0) {
      prize_id = res.data[0].prize_id;
    } else {
      console.log("[WARN] No prizes available for Purchase test.");
    }
  } catch {
    console.log("[ERROR] Failed to fetch prizes.");
  }

  // Fetch valid pupil_id
  try {
    const res = await client.get('/pupils/all/json', { headers: { 'Cookie': sessionCookie } });
    if (res.data.length > 0) {
      pupil_id = res.data[0].pupil_id;
    } else {
      console.log("[WARN] No pupils available for Purchase test.");
    }
  } catch {
    console.log("[ERROR] Failed to fetch pupils.");
  }

  // Standard GET tests
  const getTests = [
    { name: 'Pupils JSON', url: '/pupils/all/json' },
    { name: 'Prizes JSON', url: '/prizes/all/json' },
    { name: 'Forms JSON', url: '/forms/all' },
    { name: 'Search Purchase', url: '/purchase/searchPupil?query=Test' }
  ];

  for (let test of getTests) {
    try {
      const res = await client.get(test.url, { headers: { 'Cookie': sessionCookie } });
      if (res.status >= 200 && res.status < 300) {
        console.log(`[PASS] ${test.name}`);
      } else {
        console.log(`[FAIL] ${test.name} - Status: ${res.status}`);
      }
    } catch (err) {
      console.log(`[ERROR] ${test.name} - ${err.message}`);
    }
  }

  // Add Pupil Test
  if (form_id) {
    try {
      const res = await client.post('/pupils/add', { first_name: "Test", last_name: "User", form_id: form_id }, {
        headers: { 'Cookie': sessionCookie }
      });
      if (res.status >= 200 && res.status < 300) {
        console.log("[PASS] Add Pupil");
      } else {
        console.log("[FAIL] Add Pupil - Status: " + res.status);
      }
    } catch (err) {
      console.log("[ERROR] Add Pupil - " + err.message);
    }
  }

  // Add Prize Test (FormData)
  try {
    const form = new FormData();
    form.append('description', 'Test Prize');
    form.append('cost_merits', '10');
    form.append('cost_money', '5');
    form.append('image', fs.createReadStream('dummy.jpg'));

    const res = await client.post('/prizes/add', form, {
      headers: {
        ...form.getHeaders(),
        'Cookie': sessionCookie
      }
    });

    if (res.status >= 200 && res.status < 300) {
      console.log("[PASS] Add Prize");
    } else {
      console.log("[FAIL] Add Prize - Status: " + res.status);
    }
  } catch (err) {
    console.log("[ERROR] Add Prize - " + err.message);
  }

  // Purchase Create Test
  if (prize_id && pupil_id) {
    try {
      const res = await client.post('/purchase/create', { prize_id: prize_id, pupil_id: pupil_id }, {
        headers: { 'Cookie': sessionCookie }
      });
      if (res.status >= 200 && res.status < 300) {
        console.log("[PASS] Purchase Create");
      } else {
        console.log("[FAIL] Purchase Create - Status: " + res.status);
      }
    } catch (err) {
      console.log("[ERROR] Purchase Create - " + err.message);
    }
  }
}

(async () => {
  await login();
  await runTests();
})();
