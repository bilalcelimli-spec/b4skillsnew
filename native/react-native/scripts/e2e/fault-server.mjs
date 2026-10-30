/** Local, deterministic UI fault fixtures. No DB, credentials or external network access.
 * Start: node scripts/e2e/fault-server.mjs
 * Configure: POST http://127.0.0.1:3002/__qa {"scenario":"writing|speaking|listening|expired","dropLaunch":true}
 * Receipts survive scenario changes so request replays can be inspected at GET /__qa.
 */
import http from 'node:http';
import fs from 'node:fs';
const receipts = new Map();
let scenario = 'writing', dropLaunch = true, submitted = false, completed = false, allowAnswers = false;
let mediaRequests = 0, debits = 0, answerPosts = 0, allowMedia = false;
let firstAnswer = null, sameAnswerOnRetry = null, recordingBytes = 0;
const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  let body = {}; try { body = JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { return json(res, 400, { error: 'Invalid JSON' }); }
  if (path === '/__qa') {
    if (req.method === 'POST') {
      if (!['writing', 'speaking', 'listening', 'expired'].includes(body.scenario)) return json(res, 400, { error: 'Invalid scenario' });
      scenario = body.scenario; dropLaunch = body.dropLaunch ?? false;
      allowAnswers = body.allowAnswers ?? false; allowMedia = body.allowMedia ?? false;
      submitted = completed = false; mediaRequests = answerPosts = 0;
      firstAnswer = sameAnswerOnRetry = null; recordingBytes = 0;
    }
    if (req.method === 'PATCH') {
      if (typeof body.dropLaunch === 'boolean') dropLaunch = body.dropLaunch;
      if (typeof body.allowAnswers === 'boolean') allowAnswers = body.allowAnswers;
      if (typeof body.allowMedia === 'boolean') allowMedia = body.allowMedia;
    }
    return json(res, 200, { scenario, dropLaunch, allowAnswers, allowMedia, debits, receipts: [...receipts], mediaRequests, answerPosts, completed, sameAnswerOnRetry, recordingBytes });
  }
  if (path === '/api/auth/me') return json(res, 200, { user: { uid: 'native-fault-fixture', email: 'native-fixture@example.test', displayName: 'Yerel Akış Testi', organizationId: 'fixture-org' } });
  if (path === '/api/auth/logout') return json(res, 200, { success: true });
  if (path === '/api/sessions/launch') {
    if (!body.launchRequestId) return json(res, 400, { error: 'Receipt required' });
    let id = receipts.get(body.launchRequestId);
    if (!id) { id = `fixture-${receipts.size + 1}`; receipts.set(body.launchRequestId, id); debits++; }
    if (dropLaunch) return req.socket.destroy();
    return json(res, 200, { sessionId: id });
  }
  const itemId = `fixture-${scenario}`;
  if (/\/sessions\/[^/]+\/status$/.test(path)) return json(res, 200, { status: completed ? 'COMPLETED' : 'IN_PROGRESS', progress: submitted ? 1 : 0, maxItems: 1, answeredItemIds: submitted ? [itemId] : [], skills: {}, cefrLevel: null, provisional: true });
  if (/\/sessions\/[^/]+\/next$/.test(path)) {
    if (completed) return json(res, 200, { stop: true });
    const skill = scenario === 'speaking' ? 'SPEAKING' : scenario === 'listening' ? 'LISTENING' : 'WRITING';
    const type = skill === 'SPEAKING' ? 'SPEAKING_PROMPT' : skill === 'LISTENING' ? 'MULTIPLE_CHOICE' : 'WRITING_PROMPT';
    return json(res, 200, { stop: false, item: { id: itemId, skill, type, metadata: {
      prompt: skill === 'SPEAKING' ? 'Speak about your favourite place.' : skill === 'LISTENING' ? 'Listen and choose the topic.' : 'Write about your favourite place. Your draft must survive a connection failure.',
      ...(skill === 'LISTENING' ? { audioUrl: '/audio/fixture.m4a', options: ['Travel', 'Cooking'] } : {}),
    } } });
  }
  if (/\/sessions\/[^/]+\/respond$/.test(path)) {
    answerPosts++;
    if (firstAnswer === null) firstAnswer = JSON.stringify(body.value);
    else sameAnswerOnRetry = firstAnswer === JSON.stringify(body.value);
    if (typeof body.value?.audio === 'string') recordingBytes = Buffer.byteLength(body.value.audio, 'base64');
    if (!allowAnswers) {
      if (scenario === 'expired') completed = true;
      return req.socket.destroy(); // Explicitly fail before committing an answer.
    }
    submitted = completed = true;
    return json(res, 200, { success: true });
  }
  if (path === '/audio/fixture.m4a') {
    mediaRequests++;
    if (!allowMedia) return json(res, 404, { error: 'Injected media failure' });
    const file = '/tmp/b4skills-apple-e2e/speech.m4a';
    if (!fs.existsSync(file)) return json(res, 503, { error: 'Run e2e:backend to prepare the synthetic audio fixture' });
    const size = fs.statSync(file).size;
    const range = /bytes=(\d+)-(\d*)/.exec(req.headers.range ?? '');
    const start = range ? Number(range[1]) : 0, end = range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    res.writeHead(range ? 206 : 200, { 'Content-Type': 'audio/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', 'Content-Length': end - start + 1, ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) });
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  return json(res, 404, { error: 'Fixture route not found' });
});
server.listen(3002, '127.0.0.1', () => console.log('Native UI fault fixtures: http://localhost:3002 (loopback only)'));
