const ENT = {
  books: {
    label: 'Книги',
    fields: [
      { k: 'title', label: 'Название' },
      { k: 'author_id', label: 'Автор', ref: 'authors' },
      { k: 'genre_id', label: 'Жанр', ref: 'genres' },
      { k: 'publisher_id', label: 'Издательство', ref: 'publishers' },
      { k: 'year', label: 'Год', type: 'number' },
    ],
  },
  authors: { label: 'Авторы', fields: [{ k: 'name', label: 'Имя' }] },
  genres: { label: 'Жанры', fields: [{ k: 'name', label: 'Название' }] },
  publishers: { label: 'Издательства', fields: [{ k: 'name', label: 'Название' }] },
};

const $ = s => document.querySelector(s);
const el = (tag, attrs = {}, ...kids) => {
  const n = document.createElement(tag);
  Object.assign(n, attrs);
  kids.forEach(k => n.append(k));
  return n;
};

async function api(path, opts) {
  const r = await fetch(path, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Ошибка ' + r.status);
  return data;
}

function say(text, bad = false) {
  const m = $('#msg');
  m.textContent = text;
  m.className = bad ? 'bad' : 'ok';
}

let current = 'books';

async function show(name) {
  current = name;
  const cfg = ENT[name];
  $('#title').textContent = cfg.label;
  document.querySelectorAll('#tabs button').forEach(b =>
    b.setAttribute('aria-current', String(b.dataset.name === name)));
  try {
    const refs = {};
    for (const f of cfg.fields) {
      if (f.ref && !refs[f.ref]) refs[f.ref] = await api('/' + f.ref);
    }
    const rows = await api('/' + name);
    renderForm(cfg, refs);
    renderTable(cfg, refs, rows);
    if (Object.values(refs).some(list => list.length === 0)) {
      say('Чтобы добавить книгу, сначала создайте автора, жанр и издательство.');
    }
  } catch (e) {
    say(e.message, true);
  }
}

function renderForm(cfg, refs) {
  const form = $('#form');
  form.replaceChildren();
  cfg.fields.forEach(f => {
    let input;
    if (f.ref) {
      input = el('select', { name: f.k, required: true });
      input.append(el('option', { value: '', textContent: 'Выберите' }));
      refs[f.ref].forEach(r => input.append(el('option', { value: r.id, textContent: r.name })));
    } else {
      input = el('input', { name: f.k, type: f.type || 'text', required: true });
    }
    form.append(el('label', {}, f.label, input));
  });
  form.append(el('button', { type: 'submit', textContent: 'Добавить' }));
}

function renderTable(cfg, refs, rows) {
  const table = $('#list');
  table.replaceChildren();
  const head = el('tr', {}, el('th', { textContent: 'ID' }));
  cfg.fields.forEach(f => head.append(el('th', { textContent: f.label })));
  head.append(el('th'));
  table.append(head);

  if (rows.length === 0) {
    table.append(el('tr', {}, el('td', {
      className: 'empty', colSpan: cfg.fields.length + 2,
      textContent: 'Пока пусто. Добавьте первую запись в форме выше.',
    })));
    return;
  }

  rows.forEach(row => {
    const tr = el('tr', {}, el('td', { textContent: row.id }));
    cfg.fields.forEach(f => {
      let value = row[f.k];
      if (f.ref) {
        const found = refs[f.ref].find(r => r.id === value);
        value = found ? found.name : value;
      }
      tr.append(el('td', { textContent: value }));
    });
    const del = el('button', { className: 'del', textContent: 'Удалить' });
    del.addEventListener('click', async () => {
      try {
        await api(`/${current}/${row.id}`, { method: 'DELETE' });
        say('Запись удалена');
        await show(current);
      } catch (e) {
        say(e.message, true);
      }
    });
    tr.append(el('td', {}, del));
    table.append(tr);
  });
}

$('#form').addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  ENT[current].fields.forEach(f => {
    if (f.ref || f.type === 'number') data[f.k] = Number(data[f.k]);
  });
  try {
    await api('/' + current, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    await show(current);
    say('Запись добавлена');
  } catch (err) {
    say(err.message, true);
  }
});

Object.entries(ENT).forEach(([name, cfg]) => {
  const b = el('button', { type: 'button', textContent: cfg.label });
  b.dataset.name = name;
  b.addEventListener('click', () => show(name));
  $('#tabs').append(b);
});

show(current);
