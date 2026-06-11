import { spawn } from 'child_process';
import http from 'http';

const PORT = 3998;

function req(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      host: '127.0.0.1', port: PORT, path, method,
      headers: { 'Content-Type': 'application/json', ...headers }
    }, (res) => {
      let buf = '';
      res.on('data', c => { buf += c; });
      res.on('end', () => {
        let parsed; try { parsed = JSON.parse(buf); } catch { parsed = buf; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

function waitForServer(proc) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('server start timeout')), 15000);
    proc.stdout.on('data', d => {
      if (String(d).includes('CORRIENDO LOCALMENTE')) { clearTimeout(timer); resolve(); }
    });
    proc.stderr.on('data', d => process.stderr.write('[server-err] ' + d));
    proc.on('exit', code => { clearTimeout(timer); reject(new Error('server exited ' + code)); });
  });
}

(async () => {
  const server = spawn('node', ['server.js'], { env: { ...process.env, PORT: String(PORT) } });
  let failures = 0;
  const assert = (cond, msg) => { console.log((cond ? 'PASS' : 'FAIL') + ' - ' + msg); if (!cond) failures++; };
  try {
    await waitForServer(server);

    const loginRes = await req('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
    const token = loginRes.body && loginRes.body.token;
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

    const pick = await req('GET', '/api/inventario/regularizacion/picking');
    assert(pick.status === 200 && Array.isArray(pick.body), 'GET picking returns 200 + array');

    const monta = await req('GET', '/api/inventario/regularizacion/montacarguista');
    assert(monta.status === 200 && Array.isArray(monta.body), 'GET montacarguista returns 200 + array');

    const bad = await req('POST', '/api/inventario/regularizacion/aplicar', { zona: 'PICKING' }, authHeader);
    assert(bad.status === 400, 'POST aplicar without ajustes array returns 400');

    const ok = await req('POST', '/api/inventario/regularizacion/aplicar', { zona: 'PICKING', ajustes: [] }, authHeader);
    assert(ok.status === 200 && ok.body && ok.body.success === true && ok.body.ajustes_aplicados === 0,
      'POST aplicar with empty ajustes returns 200 success, 0 applied');

    const notFound = await req('GET', '/api/inventario/regularizacion/inexistente');
    assert(notFound.status === 404, 'Unknown regularizacion route returns 404');
  } catch (e) {
    console.error('ERROR:', e.message); failures++;
  } finally {
    server.kill();
  }
  console.log(failures === 0 ? 'ALL_TESTS_PASSED' : `TESTS_FAILED:${failures}`);
  process.exit(failures === 0 ? 0 : 1);
})();
