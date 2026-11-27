export const bookStatuses = ['В планах', 'Читаю', 'Прочитано', 'Не интересно'] as const;
export type BookStatus = (typeof bookStatuses)[number];

export interface BookDraft {
  title: string;
  author: string;
  genre: string;
  status: BookStatus;
  rating: number;
  note: string;
}

export interface Book extends BookDraft {
  id: string;
}

interface BookBackup {
  version: 1;
  books: Book[];
}

export const emptyBook: BookDraft = {
  title: '',
  author: '',
  genre: '',
  status: 'В планах',
  rating: 0,
  note: '',
};

export const sampleBooks: Book[] = [
  {
    id: 'example-three-comrades',
    title: 'Три товарища',
    author: 'Эрих Мария Ремарк',
    genre: 'Роман',
    status: 'Прочитано',
    rating: 9,
    note: 'Запомнились тихие сцены, в которых герои заботятся друг о друге. Хочется перечитать диалоги.',
  },
  {
    id: 'example-mars',
    title: 'Марсианские хроники',
    author: 'Рэй Брэдбери',
    genre: 'Научная фантастика',
    status: 'Читаю',
    rating: 0,
    note: 'Пока интересно, как меняется тон от одной истории к другой.',
  },
  {
    id: 'example-bird',
    title: 'Хроники Заводной Птицы',
    author: 'Харуки Мураками',
    genre: 'Роман',
    status: 'В планах',
    rating: 0,
    note: '',
  },
];

const storageKey = 'reading-journal:books';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStatus(value: unknown): value is BookStatus {
  return bookStatuses.some((status) => status === value);
}

function readBook(value: unknown): Book {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' || value.id.trim() === '' ||
    typeof value.title !== 'string' || value.title.trim() === '' ||
    typeof value.author !== 'string' ||
    !isStatus(value.status) ||
    typeof value.rating !== 'number' || !Number.isInteger(value.rating) ||
    value.rating < 0 || value.rating > 10 ||
    typeof value.note !== 'string' ||
    (value.genre !== undefined && typeof value.genre !== 'string')
  ) {
    throw new Error('Ошибочные данные книги.');
  }

  const { id, title, author, status, rating, note } = value;
  return { id, title, author, genre: value.genre ?? '', status, rating, note };
}

export function parseBackup(text: string): Book[] {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data) || (data.version !== 1 && data.version !== 2) || !Array.isArray(data.books)) {
    throw new Error('Неизвестный формат резервной копии.');
  }
  const books = data.books.map(readBook);
  if (new Set(books.map((book) => book.id)).size !== books.length) {
    throw new Error('В копии есть повторяющиеся ID.');
  }
  return books;
}

export function makeBackup(books: Book[]): string {
  const snapshot: BookBackup = { version: 1, books };
  return JSON.stringify(snapshot, null, 2);
}

export function readBooks(): Book[] {
  const copy = window.localStorage.getItem(storageKey);
  return copy === null ? [] : parseBackup(copy);
}

export function writeBooks(books: Book[]): void {
  window.localStorage.setItem(storageKey, makeBackup(books));
}

export function isBooksStorageEvent(event: StorageEvent): boolean {
  return event.key === null || event.key === storageKey;
}

export function includeNewBooks(current: Book[], incoming: Book[]): Book[] {
  const ids = new Set(current.map((book) => book.id));
  return [...current, ...incoming.filter((book) => !ids.has(book.id))];
}

export function downloadBackup(books: Book[]): void {
  const file = new Blob([makeBackup(books)], { type: 'application/json' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'reading-journal-backup.json';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
