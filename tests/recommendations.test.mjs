import assert from 'node:assert/strict';
import test from 'node:test';
import { makeBackup, parseBackup, sampleBooks } from '../src/books.ts';
import { catalog } from '../src/recommendations/catalog.ts';
import { recommend } from '../src/recommendations/recommend.ts';
import { genres, themes, subgenres, narrativeTraits, moods } from '../src/recommendations/vocabulary.ts';

const solaris = { id: 's1', title: 'Солярис', author: 'Станислав Лем', status: 'Прочитано', rating: 9 };
const find = (result, id) => result.recommendations.find(item => item.book.id === id);

test('Каталог содержит уникальные произведения, источники и известные метки', () => {
  assert.ok(catalog.length >= 30 && catalog.length <= 40);
  assert.equal(new Set(catalog.map(b => b.id)).size, catalog.length);
  assert.equal(new Set(catalog.map(b => JSON.stringify([b.title, b.author]))).size, catalog.length);
  for (const book of catalog) {
    assert.match(book.id, /^[a-z][a-z0-9-]*$/);
    assert.ok(book.title && book.author && book.basis.trim());
    assert.equal(new URL(book.source).protocol, 'https:');
    assert.ok(book.themeIds.length >= 2 && book.genreIds.length > 0);
    for (const [ids, vocabulary] of [[book.genreIds, genres], [book.themeIds, themes],
      [book.subgenreIds ?? [], subgenres], [book.narrativeTraitIds ?? [], narrativeTraits], [book.moodIds ?? [], moods]]) {
      assert.equal(new Set(ids).size, ids.length);
      for (const id of ids) assert.ok(Object.hasOwn(vocabulary, id), book.id + ' / ' + id);
    }
  }
  for (const subgenre of Object.values(subgenres)) assert.ok(Object.hasOwn(genres, subgenre.genreId));
});

test('Смена 9 на 2 перемещает совпадающие книги ниже нейтральных', () => {
  for (const [rating, weight] of [[9, 3], [2, -2]]) {
    const result = recommend([{ ...solaris, rating }]);
    const candidate = find(result, 'flatland');
    assert.equal(result.mode, 'preliminary');
    assert.equal(candidate.score, weight / Math.sqrt(2));
    assert.deepEqual(candidate.reasons, [{
      themeId: 'limits-of-knowledge', weight, preference: 0,
      ratings: [{ bookId: 's1', title: 'Солярис', rating, source: 'catalog' }],
    }]);
    const neutral = find(result, 'walden');
    assert.deepEqual(neutral.reasons, []);
    assert.equal(result.recommendations.indexOf(candidate) < result.recommendations.indexOf(neutral), rating === 9);
  }
});

test('Пустая полка, отсутствие оценок, оценка 5 или неизвестная книга дают нейтральную выдачу', () => {
  for (const library of [[], [{ ...solaris, rating: 0 }], [{ ...solaris, rating: 5 }],
    [{ ...solaris, title: 'Тестовая книга', note: 'Текст про океан и познание' }]]) {
    const result = recommend(library);
    assert.equal(result.mode, 'neutral');
    assert.ok(result.recommendations.every(item => item.score === 0 && !item.reasons.length));
    const ids = result.recommendations.map(item => item.book.id);
    assert.deepEqual(ids, [...ids].sort());
  }
});

test('Начальные предпочтения со знаком работают без оценок', () => {
  const result = recommend([], { nature: 1, society: -1 });
  assert.equal(result.mode, 'preliminary');
  assert.equal(result.ratedBooks, 0);
  assert.deepEqual(find(result, 'walden').reasons, [{ themeId: 'nature', preference: 1, weight: 1, ratings: [] }]);
  assert.ok(find(result, 'dead-souls').score < 0);
});

test('Подтверждённые темы имеют приоритет. Веса усредняются по книгам', () => {
  const source = { ...solaris, themeIds: ['nature', 'nature'] };
  const second = { ...source, id: 's2', title: 'Другая книга', rating: 2 };
  const result = recommend([source, second], { nature: 1 });
  assert.equal(result.mode, 'personalized');
  assert.equal(find(result, 'flatland').score, 0);
  const [reason] = find(result, 'walden').reasons;
  assert.equal(reason.weight, 1.5);
  assert.deepEqual(reason.ratings.map(r => [r.source, r.rating]), [['confirmed', 9], ['confirmed', 2]]);
});

test('Статусы исключают кандидата или отмечают его в планах', () => {
  for (const status of ['Прочитано', 'Читаю', 'Не интересно', 'В планах']) {
    const result = recommend([{ ...solaris, status }]);
    assert.equal(result.ratedBooks, Number(status === 'Прочитано'));
    if (status === 'В планах') assert.equal(find(result, 'solaris').planned, true);
    else assert.equal(find(result, 'solaris'), undefined);
  }
  assert.equal(find(recommend([solaris, { ...solaris, id: 's2', status: 'В планах' }]), 'solaris'), undefined);
});

test('Связь по ID приоритетна, совпадение без ID требует однозначной пары', () => {
  const renamed = { ...solaris, title: 'Другое название', catalogBookId: 'solaris' };
  assert.equal(find(recommend([renamed]), 'solaris'), undefined);
  const spaced = { ...solaris, title: ' СОЛЯРИС  ', author: 'Станислав   Лем' };
  assert.equal(find(recommend([spaced]), 'solaris'), undefined);
  assert.ok(find(recommend([{ ...solaris, author: '' }]), 'solaris'));
  const other = { ...catalog.find(b => b.id === 'solaris'), id: 'similar' };
  const ambiguous = recommend([solaris], {}, [...catalog, other]);
  assert.equal(ambiguous.ratedBooks, 0);
  assert.ok(find(ambiguous, 'solaris') && find(ambiguous, 'similar'));
});

test('Повторы входных записей и кандидатов не увеличивают топ или вес темы', () => {
  const expected = recommend([solaris]);
  const repeated = recommend([solaris, { ...solaris, id: 'copy' }], {}, [...catalog, ...catalog].reverse());
  assert.deepEqual(repeated, expected);
  assert.deepEqual(recommend([solaris]), expected);
});

test('Ядро принимает записи v0.1 и сохраняет данные копии без изменений', () => {
  const original = makeBackup(sampleBooks);
  const library = parseBackup(original);
  const result = recommend(library);
  assert.equal(result.ratedBooks, 1);
  assert.equal(find(result, 'three-comrades'), undefined);
  assert.equal(makeBackup(library), original);
});
