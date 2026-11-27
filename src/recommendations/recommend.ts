import type { Book } from '../books';
import { catalog } from './catalog';
import { themes, type CatalogBook, type ThemeId } from './vocabulary';

// Дополнительные поля существуют только на входе расчёта, отдельно от формата копии.
export interface RecommendationInputBook extends Pick<Book, 'id' | 'title' | 'author' | 'status' | 'rating'> {
  readonly catalogBookId?: string;
  readonly themeIds?: readonly ThemeId[];
}

export type Preferences = Partial<Record<ThemeId, 1 | -1>>;

interface RatingEvidence {
  bookId: string;
  title: string;
  rating: number;
  source: 'confirmed' | 'catalog';
}

interface Reason {
  themeId: ThemeId;
  weight: number;
  preference: number;
  ratings: readonly RatingEvidence[];
}

export interface Recommendation {
  book: CatalogBook;
  score: number;
  planned: boolean;
  reasons: Reason[];
}

function titleAuthorKey(book: Pick<Book, 'title' | 'author'>): string | undefined {
  const normalize = (text: string) => text.normalize('NFC').trim().toLowerCase().replace(/\s+/gu, ' ');
  const author = normalize(book.author);
  if (author) return JSON.stringify([normalize(book.title), author]);
}

// Индекс массива соответствует оценке от 0 до 10. Ноль отдельно исключён из профиля.
const ratingWeights = [0, -2, -2, -2, -1, 0, 1, 1, 2, 3, 3];

export function recommend(
  library: readonly RecommendationInputBook[],
  preferences: Readonly<Preferences> = {},
  candidates: readonly CatalogBook[] = catalog,
) {
  const byId = new Map(candidates.map(book => [book.id, book]));
  const byName = new Map<string, CatalogBook | null>();
  for (const book of byId.values()) {
    const key = titleAuthorKey(book);
    if (key) byName.set(key, byName.has(key) ? null : book);
  }

  const excluded = new Set<string>();
  const planned = new Set<string>();
  const seenRatings = new Set<string>();
  const evidence = new Map<ThemeId, RatingEvidence[]>();
  for (const entry of library) {
    const key = titleAuthorKey(entry);
    const match = entry.catalogBookId ? byId.get(entry.catalogBookId) : byName.get(key ?? '');
    if (match) {
      if (entry.status === 'В планах') planned.add(match.id);
      else excluded.add(match.id);
    }
    if (entry.status !== 'Прочитано' || !Number.isInteger(entry.rating) || entry.rating < 1 || entry.rating > 10) continue;
    const ratingKey = match ? 'catalog:' + match.id : 'shelf:' + entry.id;
    if (seenRatings.has(ratingKey)) continue;
    const confirmed = entry.themeIds?.filter(id => Object.hasOwn(themes, id)) ?? [];
    const themeIds = confirmed.length ? confirmed : match?.themeIds ?? [];
    if (!themeIds.length) continue;
    seenRatings.add(ratingKey);
    const observation: RatingEvidence = {
      bookId: entry.id, title: entry.title, rating: entry.rating,
      source: confirmed.length ? 'confirmed' : 'catalog',
    };
    for (const id of new Set(themeIds)) {
      const ratings = evidence.get(id) ?? [];
      ratings.push(observation);
      evidence.set(id, ratings);
    }
  }

  const profile = new Map<ThemeId, Reason>();
  for (const themeId of Object.keys(themes) as ThemeId[]) {
    const ratings = evidence.get(themeId) ?? [];
    const mean = ratings.length ? ratings.reduce((sum, item) => sum + ratingWeights[item.rating], 0) / ratings.length : 0;
    const preference = preferences[themeId] ?? 0;
    const weight = mean + preference;
    if (weight !== 0) profile.set(themeId, { themeId, weight, preference, ratings });
  }

  const recommendations: Recommendation[] = [];
  for (const book of byId.values()) {
    if (excluded.has(book.id)) continue;
    const reasons: Reason[] = [];
    const uniqueThemes = new Set(book.themeIds);
    for (const id of uniqueThemes) {
      const reason = profile.get(id);
      if (reason) reasons.push(reason);
    }
    const sum = reasons.reduce((total, reason) => total + reason.weight, 0);
    recommendations.push({
      book, planned: planned.has(book.id), reasons,
      score: uniqueThemes.size ? sum / Math.sqrt(uniqueThemes.size) : 0,
    });
  }
  recommendations.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.book.id === b.book.id) return 0;
    return a.book.id < b.book.id ? -1 : 1;
  });
  const ratedBooks = seenRatings.size;
  const mode = !profile.size ? 'neutral' : ratedBooks < 2 ? 'preliminary' : 'personalized';
  return { mode, ratedBooks, recommendations } as const;
}
