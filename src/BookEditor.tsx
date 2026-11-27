import { useEffect, useRef, useState, type FormEvent } from 'react';
import { bookStatuses, emptyBook, type Book, type BookDraft, type BookStatus } from './books';

interface BookEditorProps {
  book: Book | null;
  onSave: (draft: BookDraft, id?: string) => boolean;
  onClose: () => void;
}

export function BookEditor({ book, onSave, onClose }: BookEditorProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    dialog.current?.showModal();
    titleInput.current?.focus();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const title = String(fields.get('title')).trim();
    if (!title) {
      setError('Введите название книги.');
      titleInput.current?.focus();
      return;
    }

    const draft: BookDraft = {
      title,
      author: String(fields.get('author')).trim(),
      genre: String(fields.get('genre')).trim(),
      status: fields.get('status') as BookStatus,
      rating: Number(fields.get('rating')),
      note: String(fields.get('note')),
    };

    if (onSave(draft, book?.id)) {
      dialog.current?.close();
    } else {
      setError('Не удалось сохранить запись. Проверьте доступ к хранилищу браузера и повторите попытку.');
    }
  }

  const initial = book ?? emptyBook;
  return (
    <dialog className="editor" ref={dialog} onClose={onClose} aria-labelledby="editor-heading">
      <div className="editor-heading">
        <h2 id="editor-heading">{book ? 'Запись о книге' : 'Добавить книгу'}</h2>
        <button className="close-button" aria-label="Закрыть" type="button" onClick={() => dialog.current?.close()}>
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <form onSubmit={submit}>
        <label>
          Название
          <input name="title" required ref={titleInput} defaultValue={initial.title} />
        </label>
        <div className="form-row">
          <label>
            Автор
            <input name="author" defaultValue={initial.author} />
          </label>
          <label>
            Жанр
            <input name="genre" defaultValue={initial.genre} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Статус
            <select name="status" defaultValue={initial.status}>
              {bookStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label>
            Оценка
            <select name="rating" defaultValue={initial.rating}>
              <option value={0}>Без оценки</option>
              {Array.from({ length: 10 }, (_, index) => (
                <option value={index + 1} key={index}>{index + 1}/10</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Впечатление
          <textarea name="note" rows={4} defaultValue={initial.note} placeholder="Что осталось с вами после чтения?" />
        </label>
        {error && <p className="editor-error" role="alert">{error}</p>}
        <div className="editor-actions">
          <button className="button" type="button" onClick={() => dialog.current?.close()}>Отмена</button>
          <button className="button primary" type="submit">Сохранить</button>
        </div>
      </form>
    </dialog>
  );
}
