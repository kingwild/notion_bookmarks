import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function passwordHash(password: string, salt = randomBytes(16).toString('hex')) {
  return `${salt}:${scryptSync(password, salt, 32).toString('hex')}`;
}
export function checkPassword(password: string, stored: string) {
  if (password.length > 200 || !/^[a-f0-9]{32}:[a-f0-9]{64}$/.test(stored)) return false;
  const actual = Buffer.from(passwordHash(password, stored.split(':')[0]).split(':')[1], 'hex');
  return timingSafeEqual(actual, Buffer.from(stored.split(':')[1], 'hex'));
}
export function issueSession(key: string, version: string, now = Date.now()) {
  const payload = `${now + 12 * 3600000}.${randomBytes(16).toString('hex')}`;
  return `${payload}.${createHmac('sha256', key).update(`${version}:${payload}`).digest('hex')}`;
}
export function validSession(token: string, key: string, version: string, now = Date.now()) {
  if (!key || !version || !/^\d{13}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(token)) return false;
  const [expiry, nonce, signature] = token.split('.');
  if (+expiry <= now || +expiry > now + 12 * 3600000) return false;
  const expected = createHmac('sha256', key).update(`${version}:${expiry}.${nonce}`).digest();
  return timingSafeEqual(Buffer.from(signature, 'hex'), expected);
}
