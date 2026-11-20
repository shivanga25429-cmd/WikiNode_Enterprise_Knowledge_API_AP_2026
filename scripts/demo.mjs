import 'dotenv/config';

const base = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
const key = process.env.ADMIN_API_KEY;
if (!key) throw new Error('ADMIN_API_KEY is required to run the demo');

async function call(method, path, body, expected = [200, 201, 204]) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(method === 'GET' ? {} : { 'X-Admin-Key': key }),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  console.log(`${method.padEnd(6)} ${path.padEnd(38)} -> ${response.status}`);
  if (!expected.includes(response.status)) throw new Error(JSON.stringify(data));
  return data;
}

let categoryId;
let articleId;
try {
  await call('GET', '/health');
  const categories = await call('GET', '/api/categories');
  console.log('Existing categories:', categories.data.map((item) => item.name).join(', '));

  const demoName = `Faculty Demo ${Date.now()}`;
  categoryId = (await call('POST', '/api/categories', {
    name: demoName, description: 'Temporary demonstration category',
  })).data.category_id;
  await call('PUT', `/api/categories/${categoryId}`, {
    name: demoName, description: 'Updated during live faculty demo',
  });
  articleId = (await call('POST', '/api/articles', {
    category_id: categoryId,
    title: 'Demo Travel Reimbursement',
    content: 'Submit the receipt to Finance for review and reimbursement.',
  })).data.article_id;
  await call('GET', `/api/articles/${articleId}`);
  const result = await call('GET', `/api/search?q=reimbursement&category_id=${categoryId}`);
  console.log('Search matches:', result.pagination.total);
  if (result.pagination.total !== 1) throw new Error('Demo search returned an unexpected result');
  await call('PUT', `/api/articles/${articleId}`, {
    category_id: categoryId, title: 'Updated Demo Travel Policy',
    content: 'Submit an itemized receipt to Finance for approval.',
  });
  await call('GET', `/api/articles?category_id=${categoryId}`);
  await call('DELETE', `/api/articles/${articleId}`);
  articleId = undefined;
  await call('DELETE', `/api/categories/${categoryId}`);
  categoryId = undefined;
  console.log('PASS: End-to-end CRUD and keyword search demo completed; demo records removed.');
} finally {
  if (articleId) {
    try { await call('DELETE', `/api/articles/${articleId}`); } catch (error) { console.error('Article cleanup:', error.message); }
  }
  if (categoryId) {
    try { await call('DELETE', `/api/categories/${categoryId}`); } catch (error) { console.error('Category cleanup:', error.message); }
  }
}
