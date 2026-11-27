import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { BookEditor } from './BookEditor';
import {
  bookStatuses, downloadBackup, includeNewBooks, isBooksStorageEvent, parseBackup, readBooks, sampleBooks, writeBooks,
  type Book, type BookDraft, type BookStatus,
} from './books';

const statusStyles: Record<BookStatus, string> = {
  'В планах': 'planned',
  'Читаю': 'reading',
  'Прочитано': 'finished',
  'Не интересно': 'dismissed',
};

function getShelf(): { books: Book[]; error: boolean } {
  try {
    return { books: readBooks(), error: false };
  } catch {
    return { books: [], error: true };
  }
}

function BookCard({ book, onOpen }: { book: Book; onOpen: () => void }) {
  const color = [...book.title].reduce((sum, char) => sum + (char.codePointAt(0) ?? 0), 0) % 5;

  return (
    <button type="button" className="book-card" onClick={onOpen} aria-label={'Открыть запись «' + book.title + '»'}>
      <span className={'book-cover cover-' + color} aria-hidden="true">
        <span className="cover-title">{book.title}</span>
        {book.author && <span className="cover-author">{book.author}</span>}
      </span>
      <span className="book-info">
        <span className="book-title">{book.title}</span>
        {book.author && <span className="book-author">{book.author}</span>}
        {book.note && <span className="book-note">{book.note}</span>}
        <span className="book-attributes">
          <span className={'status ' + statusStyles[book.status]}>{book.status}</span>
          {book.rating > 0 && <span className="rating">{book.rating}/10</span>}
        </span>
      </span>
    </button>
  );
}

export function App() {
  const [shelf, setShelf] = useState(getShelf);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<BookStatus | 'all'>('all');
  const [editor, setEditor] = useState<{ book: Book | null } | null>(null);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const dataMenu = useRef<HTMLDetailsElement>(null);
  const books = shelf.books;

  useEffect(() => {
    function refresh(event: StorageEvent) {
      if (event.storageArea === window.localStorage && isBooksStorageEvent(event)) setShelf(getShelf());
    }
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  const counts = {
    all: books.length,
    reading: books.filter((book) => book.status === 'Читаю').length,
    finished: books.filter((book) => book.status === 'Прочитано').length,
  };
  const search = query.trim().toLocaleLowerCase('ru');
  const visible = books.filter((book) => (
    (filter === 'all' || book.status === filter) &&
    (book.title.toLocaleLowerCase('ru').includes(search) || book.author.toLocaleLowerCase('ru').includes(search))
  ));

  function updateBooks(transform: (current: Book[]) => Book[]): boolean {
    try {
      const next = transform(readBooks());
      writeBooks(next);
      setShelf({ books: next, error: false });
      return true;
    } catch {
      return false;
    }
  }

  function saveBook(draft: BookDraft, id?: string): boolean {
    const book = { ...draft, id: id ?? crypto.randomUUID() };
    const saved = updateBooks((current) => current.some((entry) => entry.id === book.id)
      ? current.map((entry) => entry.id === book.id ? book : entry)
      : [book, ...current]);

    if (saved) {
      setQuery('');
      setFilter('all');
      setNotice(null);
    }
    return saved;
  }

  function loadExamples() {
    const saved = updateBooks((current) => includeNewBooks(current, sampleBooks));
    setQuery('');
    setFilter('all');
    setNotice(saved
      ? { text: 'Добавлены примеры с вымышленными заметками.' }
      : { text: 'Не удалось добавить примеры. Проверьте доступ к хранилищу браузера.', error: true });
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selected = input.files?.[0];
    input.value = '';
    if (!selected) return;

    let incoming: Book[];
    try {
      incoming = parseBackup(await selected.text());
    } catch {
      setNotice({ text: 'Файл не подходит. Выберите JSON-копию дневника версии 1 или 2.', error: true });
      return;
    }

    let added = 0;
    const saved = updateBooks((current) => {
      const next = includeNewBooks(current, incoming);
      added = next.length - current.length;
      return next;
    });

    if (!saved) {
      setNotice({ text: 'Не удалось сохранить импорт. Проверьте доступ к хранилищу браузера.', error: true });
      return;
    }

    setFilter('all');
    setQuery('');
    setNotice({ text: added ? 'Добавлено записей: ' + added + '.' : 'Все записи из копии уже на полке.' });
  }

  return (
    <div className="layout">
      <header className="masthead">
        <div className="brand">
          <img src={import.meta.env.BASE_URL + 'icon-192.png'} width="40" height="40" alt="" />
          <span>Читательский дневник</span>
        </div>
        <details className="data-menu" ref={dataMenu}>
          <summary className="button">Данные</summary>
          <div className="data-menu-panel">
            <button type="button" onClick={() => {
              dataMenu.current?.removeAttribute('open');
              const current = getShelf();
              if (current.error) {
                setNotice({ text: 'Не удалось прочитать данные для копии.', error: true });
                return;
              }
              downloadBackup(current.books);
            }}>Скачать копию</button>
            <button type="button" onClick={() => {
              dataMenu.current?.removeAttribute('open');
              file.current?.click();
            }}>Импорт JSON</button>
          </div>
        </details>
        <input type="file" accept=".json,application/json" hidden ref={file} onChange={importBackup} />
      </header>

      <main>
        <div className="shelf-heading">
          <h1>Моя книжная полка</h1>
          <button className="button primary" type="button" onClick={() => setEditor({ book: null })}>
            <span className="plus" aria-hidden="true">+</span> Добавить книгу
          </button>
        </div>

        <dl className="shelf-stats">
          <div><dt>Всего книг</dt><dd>{counts.all}</dd></div>
          <div><dt>Читаю</dt><dd>{counts.reading}</dd></div>
          <div><dt>Прочитано</dt><dd>{counts.finished}</dd></div>
        </dl>

        {shelf.error && (
          <p className="notice error" role="alert">Не удалось прочитать дневник из хранилища браузера.</p>
        )}
        {notice && (
          <p className={'notice' + (notice.error ? ' error' : '')} role={notice.error ? 'alert' : 'status'}>{notice.text}</p>
        )}

        {books.length > 0 ? (
          <section aria-label="Список книг">
            <div className="toolbar">
              <label className="search">
                <span className="search-icon" aria-hidden="true" />
                <input type="search" aria-label="Поиск по названию или автору" placeholder="Название или автор"
                  value={query} onChange={(event) => setQuery(event.target.value)} />
              </label>
              <div className="filters" role="group" aria-label="Статус чтения">
                <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Все</button>
                {bookStatuses.map((status) => (
                  <button key={status} type="button" aria-pressed={filter === status}
                    onClick={() => setFilter(status)}>{status}</button>
                ))}
              </div>
            </div>
            {visible.length > 0
              ? <div className="books">{visible.map((book) => (
                <BookCard key={book.id} book={book} onOpen={() => setEditor({ book })} />
              ))}</div>
              : <p className="empty-results" role="status">Книги не найдены. Измените запрос или статус.</p>}
          </section>
        ) : !shelf.error && (
          <section className="empty-shelf" aria-labelledby="empty-title">
            <div className="empty-books" aria-hidden="true"><i /><i /><i /></div>
            <h2 id="empty-title">Полка пока пуста</h2>
            <p>Добавьте первую книгу или посмотрите, как выглядят записи в дневнике.</p>
            <button type="button" className="button" onClick={loadExamples}>Показать примеры</button>
          </section>
        )}
      </main>

      <footer>Дневник сохраняется в этом браузере. Копию можно скачать в меню «Данные».</footer>

      {editor && <BookEditor book={editor.book} onSave={saveBook} onClose={() => setEditor(null)} />}
    </div>
  );
}
