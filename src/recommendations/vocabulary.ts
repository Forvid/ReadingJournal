export const genres = {
  novel: 'Роман',
  adventure: 'Приключения',
  detective: 'Детектив',
  fantasy: 'Фэнтези',
  'science-fiction': 'Научная фантастика',
  horror: 'Литература ужасов',
  satire: 'Сатира',
  memoir: 'Мемуары',
  essay: 'Эссе',
  drama: 'Драма',
  epic: 'Эпос',
  novella: 'Повесть',
} as const;

export type GenreId = keyof typeof genres;

export const subgenres = {
  gothic: { name: 'Готический роман', genreId: 'novel' },
  bildungsroman: { name: 'Роман воспитания', genreId: 'novel' },
} as const satisfies Record<string, { name: string; genreId: GenreId }>;

export const themes = {
  'human-relationships': 'Человеческие отношения',
  society: 'Общественное устройство и неравенство',
  'moral-choice': 'Моральный выбор',
  'limits-of-knowledge': 'Границы познания',
  'unknown-intelligence': 'Нечеловеческий разум',
  identity: 'Поиск себя',
  family: 'Семья и поколения',
  friendship: 'Дружба и взаимопомощь',
  freedom: 'Свобода и несвобода',
  survival: 'Борьба за выживание',
  nature: 'Природа и живая среда',
  power: 'Власть и подчинение',
  isolation: 'Одиночество и отчуждение',
  revenge: 'Месть',
  obsession: 'Одержимость',
  journey: 'Путь и странствие',
  'coming-of-age': 'Взросление',
  truth: 'Установление истины',
  responsibility: 'Ответственность за поступки',
  war: 'Война и её последствия',
} as const;

export type ThemeId = keyof typeof themes;

export const narrativeTraits = {
  epistolary: 'Письма и дневниковые записи',
  'first-person': 'Повествование от первого лица',
} as const;

export const moods = { contemplative: 'Созерцательное', tense: 'Напряжённое' } as const;

export interface CatalogBook {
  readonly id: string;
  readonly title: string;
  readonly author: string;
  readonly genreIds: readonly GenreId[];
  readonly themeIds: readonly ThemeId[];
  readonly subgenreIds?: readonly (keyof typeof subgenres)[];
  readonly narrativeTraitIds?: readonly (keyof typeof narrativeTraits)[];
  readonly moodIds?: readonly (keyof typeof moods)[];
  readonly source: string;
  readonly basis: string;
  readonly coverId?: string;
}
