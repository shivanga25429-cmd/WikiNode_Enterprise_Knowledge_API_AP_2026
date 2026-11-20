import { HttpError } from '../lib/validation.js';

export function notFound(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
}

export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Invalid JSON body' } });
  }

  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'JSON body is too large' } });
  }

  if (error.code === '23505') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'A record with that unique value already exists' } });
  }

  if (error.code === '23503' || error.code === '23001') {
    return res.status(409).json({ error: { code: 'REFERENCE_CONFLICT', message: 'Operation conflicts with a category/article reference' } });
  }

  if (error.code === '23514' || error.code === '23502') {
    return res.status(400).json({ error: { code: 'CONSTRAINT_VIOLATION', message: 'Database validation failed' } });
  }

  console.error('Unhandled request error:', error);
  return res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
}
