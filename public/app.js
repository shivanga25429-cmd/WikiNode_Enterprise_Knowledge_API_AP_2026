const $ = (id) => document.getElementById(id);

const PAGE_SIZE = 12;
const state = {
  categories: [],
  articles: [],
  categoryId: '',
  search: '',
  total: 0,
  selectedArticle: null,
  editingArticleId: null,
  requestNumber: 0,
};

const categoryIcons = { hr: '◈', it: '⌘', finance: '▤' };
let toastTimeout;
let searchTimeout;

async function api(path, { method = 'GET', body, admin = false } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (admin) {
    const key = $('admin-key').value.trim();
    if (key.length < 16) throw new Error('Enter your administrator API key (at least 16 characters).');
    headers['X-Admin-Key'] = key;
  }

  let response;
  try {
    response = await fetch(path, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error('Cannot connect to WikiNode. Make sure npm start is running.');
  }

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error?.message || `Request failed (${response.status}).`);
  return payload;
}

function iconFor(category) {
  const name = String(category || '').toLowerCase();
  return { icon: categoryIcons[name] || '▦', tone: ['hr', 'it', 'finance'].includes(name) ? name : '' };
}

function el(tag, className = '', value = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value) node.textContent = value;
  return node;
}

function formatDate(input) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

function toast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('is-visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => $('toast').classList.remove('is-visible'), 3200);
}

function feedback(message, error = false) {
  $('admin-feedback').textContent = message;
  $('admin-feedback').classList.toggle('is-error', error);
}

function navButton(id, name) {
  const button = el('button', 'nav-item');
  button.type = 'button';
  button.dataset.category = String(id);
  if (String(id) === state.categoryId) {
    button.classList.add('is-active');
    button.setAttribute('aria-current', 'page');
  }
  const icon = el('span', 'nav-symbol', id === '' ? '▦' : iconFor(name).icon);
  icon.setAttribute('aria-hidden', 'true');
  button.append(icon, el('span', '', name));
  button.addEventListener('click', () => {
    state.categoryId = String(id);
    renderCategories();
    void loadArticles();
  });
  return button;
}

function renderCategories() {
  const buttons = [navButton('', 'All articles')];
  for (const category of state.categories) buttons.push(navButton(category.category_id, category.name));
  $('category-nav').replaceChildren(...buttons);

  const previousArticleCategory = $('article-edit-category').value;
  const options = state.categories.map((category) => new Option(category.name, String(category.category_id)));
  $('article-edit-category').replaceChildren(...options);
  if (options.some((option) => option.value === previousArticleCategory)) $('article-edit-category').value = previousArticleCategory;

  const previousCategoryEditor = $('category-edit-select').value;
  const categoryOptions = [new Option('+ Create a new category', '')];
  for (const category of state.categories) categoryOptions.push(new Option(category.name, String(category.category_id)));
  $('category-edit-select').replaceChildren(...categoryOptions);
  if (categoryOptions.some((option) => option.value === previousCategoryEditor)) $('category-edit-select').value = previousCategoryEditor;
}

async function loadCategories() {
  const result = await api('/api/categories');
  state.categories = result.data;
  if (state.categoryId && !state.categories.some((category) => String(category.category_id) === state.categoryId)) state.categoryId = '';
  renderCategories();
}

function renderArticleCard(article) {
  const card = el('button', 'article-card');
  card.type = 'button';
  card.setAttribute('aria-label', `Read ${article.title}`);

  const top = el('span', 'card-top');
  const { icon, tone } = iconFor(article.category_name);
  const cardIcon = el('span', `card-icon ${tone}`, icon);
  cardIcon.setAttribute('aria-hidden', 'true');
  const arrow = el('span', 'card-arrow', '↗');
  arrow.setAttribute('aria-hidden', 'true');
  top.append(cardIcon, arrow);

  const summary = String(article.content || '').replace(/\s+/g, ' ').trim();
  card.append(
    top,
    el('span', 'card-category', article.category_name),
    el('strong', '', article.title),
    el('span', 'card-summary', summary),
    el('span', 'card-footer', `Updated ${formatDate(article.updated_at)}`),
  );
  card.addEventListener('click', () => openArticle(article));
  return card;
}

function emptyState(title, detail) {
  const box = el('div', 'empty-state');
  box.append(el('span', 'empty-icon', '⌕'), el('h3', '', title), el('p', '', detail));
  return box;
}

function renderArticles() {
  $('article-count').textContent = `${state.total} ${state.total === 1 ? 'article' : 'articles'}`;
  const category = state.categories.find((item) => String(item.category_id) === state.categoryId);
  $('active-filter').textContent = state.search
    ? `Results for “${state.search}”${category ? ` in ${category.name}` : ''}`
    : category ? `Showing ${category.name} articles` : 'Showing all articles';
  $('clear-filters').hidden = !state.categoryId && !state.search;

  $('articles').replaceChildren(...(
    state.articles.length
      ? state.articles.map(renderArticleCard)
      : [emptyState('Nothing found yet', state.search ? 'Try another search term or clear the filters.' : 'No articles in this category yet.')]
  ));
  $('load-more').hidden = state.articles.length >= state.total;
}

async function loadArticles({ more = false } = {}) {
  const requestNumber = ++state.requestNumber;
  const offset = more ? state.articles.length : 0;
  const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
  if (state.categoryId) params.set('category_id', state.categoryId);
  const keyword = state.search;
  const endpoint = keyword ? '/api/search' : '/api/articles';
  if (keyword) params.set('q', keyword);

  $('articles').setAttribute('aria-busy', 'true');
  $('load-more').disabled = true;
  if (!more) $('article-count').textContent = 'Loading…';
  try {
    const response = await api(`${endpoint}?${params}`);
    if (requestNumber !== state.requestNumber) return;
    state.total = response.pagination.total;
    state.articles = more ? [...state.articles, ...response.data] : response.data;
    renderArticles();
  } catch (error) {
    if (requestNumber !== state.requestNumber) return;
    if (!more) {
      state.articles = [];
      state.total = 0;
      $('article-count').textContent = 'Unavailable';
      $('articles').replaceChildren(emptyState('Could not load articles', error.message));
    }
    toast(error.message);
  } finally {
    if (requestNumber === state.requestNumber) {
      $('articles').setAttribute('aria-busy', 'false');
      $('load-more').disabled = false;
    }
  }
}

function openArticle(article) {
  state.selectedArticle = article;
  $('article-category').textContent = article.category_name;
  $('article-title').textContent = article.title;
  $('article-meta').textContent = `Updated ${formatDate(article.updated_at)} · Article #${article.article_id}`;
  $('article-body').textContent = article.content;
  $('article-dialog').showModal();
}

function selectTab(name) {
  const isArticle = name === 'articles';
  $('article-panel').hidden = !isArticle;
  $('category-panel').hidden = isArticle;
  $('article-tab').classList.toggle('is-selected', isArticle);
  $('category-tab').classList.toggle('is-selected', !isArticle);
  $('article-tab').setAttribute('aria-selected', String(isArticle));
  $('category-tab').setAttribute('aria-selected', String(!isArticle));
  feedback('');
}

function openAdmin(tab = 'articles') {
  selectTab(tab);
  if (!$('admin-dialog').open) $('admin-dialog').showModal();
}

function resetArticleForm() {
  state.editingArticleId = null;
  $('article-form').reset();
  $('article-form-title').textContent = 'New article';
  $('delete-article').hidden = true;
  feedback('');
}

function editArticle(article) {
  state.editingArticleId = article.article_id;
  $('article-form-title').textContent = 'Edit article';
  $('article-edit-category').value = String(article.category_id);
  $('article-edit-title').value = article.title;
  $('article-edit-content').value = article.content;
  $('delete-article').hidden = false;
  $('article-dialog').close();
  openAdmin('articles');
}

function selectCategoryForEditing() {
  const id = $('category-edit-select').value;
  const category = state.categories.find((item) => String(item.category_id) === id);
  $('category-edit-name').value = category?.name || '';
  $('category-edit-description').value = category?.description || '';
  $('delete-category').hidden = !category;
  feedback('');
}

async function withSubmitButton(button, task) {
  button.disabled = true;
  try { await task(); } catch (error) { feedback(error.message, true); } finally { button.disabled = false; }
}

$('search-input').addEventListener('input', (event) => {
  clearTimeout(searchTimeout);
  const query = event.target.value.trim();
  searchTimeout = setTimeout(() => { state.search = query; void loadArticles(); }, 280);
});

$('clear-filters').addEventListener('click', () => {
  clearTimeout(searchTimeout);
  state.search = '';
  state.categoryId = '';
  $('search-input').value = '';
  renderCategories();
  void loadArticles();
});
$('load-more').addEventListener('click', () => void loadArticles({ more: true }));
$('open-admin').addEventListener('click', () => openAdmin());
$('edit-article').addEventListener('click', () => { if (state.selectedArticle) editArticle(state.selectedArticle); });
$('article-tab').addEventListener('click', () => selectTab('articles'));
$('category-tab').addEventListener('click', () => selectTab('categories'));
$('reset-article').addEventListener('click', resetArticleForm);
$('category-edit-select').addEventListener('change', selectCategoryForEditing);
document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => $(button.dataset.close).close());
});
$('admin-dialog').addEventListener('close', () => { $('admin-key').value = ''; });

$('article-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const data = {
    category_id: Number($('article-edit-category').value),
    title: $('article-edit-title').value.trim(),
    content: $('article-edit-content').value.trim(),
  };
  const id = state.editingArticleId;
  await withSubmitButton($('save-article'), async () => {
    await api(id ? `/api/articles/${id}` : '/api/articles', { method: id ? 'PUT' : 'POST', body: data, admin: true });
    resetArticleForm();
    feedback(id ? 'Article updated successfully.' : 'Article created successfully.');
    await loadArticles();
    toast(id ? 'Article updated' : 'Article created');
  });
});

$('delete-article').addEventListener('click', async () => {
  const id = state.editingArticleId;
  if (!id || !window.confirm('Delete this article permanently?')) return;
  await withSubmitButton($('delete-article'), async () => {
    await api(`/api/articles/${id}`, { method: 'DELETE', admin: true });
    resetArticleForm();
    feedback('Article deleted.');
    await loadArticles();
    toast('Article deleted');
  });
});

$('category-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const id = $('category-edit-select').value;
  const data = { name: $('category-edit-name').value.trim(), description: $('category-edit-description').value.trim() };
  await withSubmitButton($('save-category'), async () => {
    const result = await api(id ? `/api/categories/${id}` : '/api/categories', { method: id ? 'PUT' : 'POST', body: data, admin: true });
    await loadCategories();
    $('category-edit-select').value = String(result.data.category_id);
    selectCategoryForEditing();
    feedback(id ? 'Category updated successfully.' : 'Category created successfully.');
    await loadArticles();
    toast(id ? 'Category updated' : 'Category created');
  });
});

$('delete-category').addEventListener('click', async () => {
  const id = $('category-edit-select').value;
  if (!id || !window.confirm('Delete this category? It must have no articles.')) return;
  await withSubmitButton($('delete-category'), async () => {
    await api(`/api/categories/${id}`, { method: 'DELETE', admin: true });
    $('category-edit-select').value = '';
    await loadCategories();
    $('category-edit-select').value = '';
    selectCategoryForEditing();
    feedback('Category deleted.');
    await loadArticles();
    toast('Category deleted');
  });
});

async function initialize() {
  try {
    await loadCategories();
    await loadArticles();
  } catch (error) {
    $('article-count').textContent = 'Unavailable';
    $('articles').replaceChildren(emptyState('Unable to connect', error.message));
    $('articles').setAttribute('aria-busy', 'false');
  }
}

void initialize();
