/**
 * Where an account-security event came from, for the user's Login Activity:
 *   { method, device: "Chrome 129 on macOS", location: "Boston, MA", ip: "203.0.113.x" }
 * Read from the request headers on the server, so the sign-in page can't
 * supply its own. Location comes from Vercel's geo headers and is missing in
 * local dev. The IP is kept masked; it is stored but not shown.
 */
const BROWSERS = [
  [/Edg(?:e|A|iOS)?\/(\d+)/, 'Edge'],
  [/OPR\/(\d+)/, 'Opera'],
  [/Firefox\/(\d+)/, 'Firefox'],
  [/FxiOS\/(\d+)/, 'Firefox'],
  [/CriOS\/(\d+)/, 'Chrome'],
  [/Chrome\/(\d+)/, 'Chrome'],
  [/Version\/(\d+)[\d.]* (?:Mobile\/\S+ )?Safari/, 'Safari'],
];
const SYSTEMS = [
  [/iPhone|iPad|iPod/, 'iOS'],
  [/Android/, 'Android'],
  [/Mac OS X|Macintosh/, 'macOS'],
  [/Windows/, 'Windows'],
  [/CrOS/, 'ChromeOS'],
  [/Linux/, 'Linux'],
];

export function describeDevice(ua = '') {
  if (!ua) return '';
  const browser = BROWSERS.map(([re, name]) => [re.exec(ua), name]).find(([m]) => m);
  const os = SYSTEMS.find(([re]) => re.test(ua))?.[1];
  const name = browser ? `${browser[1]} ${browser[0][1]}` : 'Unknown browser';
  return os ? `${name} on ${os}` : name;
}

const header = (req, name) => {
  const v = req.headers?.[name];
  return Array.isArray(v) ? v[0] : v || '';
};
const decode = (v) => { try { return decodeURIComponent(v); } catch { return v; } };

export function describeLocation(req) {
  const city = decode(header(req, 'x-vercel-ip-city'));
  const region = header(req, 'x-vercel-ip-country-region');
  const country = header(req, 'x-vercel-ip-country');
  const area = country === 'US' ? region : (region && country ? `${region}, ${country}` : country);
  return [city, area].filter(Boolean).join(', ');
}

export function maskedIp(req) {
  const ip = header(req, 'x-forwarded-for').split(',')[0].trim() || req.socket?.remoteAddress || '';
  if (ip.includes('.')) return ip.replace(/\.\d+$/, '.x');
  if (ip.includes(':')) return `${ip.split(':').slice(0, 3).join(':')}::x`;
  return '';
}

export function requestContext(req, method) {
  const ctx = {
    method: method || '',
    device: describeDevice(header(req, 'user-agent')),
    location: describeLocation(req),
    ip: maskedIp(req),
  };
  return Object.fromEntries(Object.entries(ctx).filter(([, v]) => v));
}
