export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const badRequest = (message) => new HttpError(400, 'BAD_REQUEST', message);

export function parsePositiveId(value, field = 'id') {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw badRequest(`${field} must be a positive integer`);
  }
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number > 2147483647) {
    throw badRequest(`${field} is out of range`);
  }
  return number;
}

export function parsePagination(query) {
  function parse(value, fallback, max, name) {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^\d+$/.test(value)) {
      throw badRequest(`${name} must be a non-negative integer`);
    }
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number > max || (name === 'limit' && number === 0)) {
      throw badRequest(`${name} must be between ${name === 'limit' ? 1 : 0} and ${max}`);
    }
    return number;
  }
  return { limit: parse(query.limit, 20, 100, 'limit'), offset: parse(query.offset, 0, 1000000, 'offset') };
}

export function parseBody(body, fields, required) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('Body must be a JSON object');
  }
  const unknown = Object.keys(body).filter((key) => !fields.includes(key));
  if (unknown.length) throw badRequest(`Unknown field(s): ${unknown.join(', ')}`);
  for (const key of required) {
    if (!Object.hasOwn(body, key)) throw badRequest(`${key} is required`);
  }
  return body;
}

export function requiredText(value, field, maxLength) {
  if (typeof value !== 'string') throw badRequest(`${field} must be a string`);
  const text = value.trim();
  if (!text) throw badRequest(`${field} must not be blank`);
  if (text.length > maxLength) throw badRequest(`${field} must be at most ${maxLength} characters`);
  return text;
}

export function optionalDescription(value) {
  if (value === undefined || value === null) return null;
  return requiredText(value, 'description', 2000);
}

export function requireArticleFields(body) {
  parseBody(body, ['category_id', 'title', 'content'], ['category_id', 'title', 'content']);
  if (!Number.isInteger(body.category_id) || body.category_id <= 0 || body.category_id > 2147483647) {
    throw badRequest('category_id must be a positive integer');
  }
  return {
    category_id: body.category_id,
    title: requiredText(body.title, 'title', 300),
    content: requiredText(body.content, 'content', 50000),
  };
}

export function escapeLikePattern(text) {
  return text.replace(/[\\%_]/g, '\\$&');
}
