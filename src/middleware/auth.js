import { timingSafeEqual } from 'node:crypto';

export function requireAdmin(adminKey) {
  return (req, res, next) => {
    const candidate = req.get('X-Admin-Key');
    const expected = Buffer.from(adminKey ?? '', 'utf8');
    const supplied = Buffer.from(candidate ?? '', 'utf8');
    if (expected.length === 0 || supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Valid X-Admin-Key required' } });
    }
    next();
  };
}
