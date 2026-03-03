export const PRODUCT_CATEGORIES: string[] = [
  'Mode',
  'Électronique',
  'Maison et jardin',
  'Livres',
  'Sports',
  'Beauté',
  'Alimentation',
  'Jouets',
  'Santé',
  'Automobile',
];

const CATEGORY_TRANSLATIONS: Record<string, string> = {
  fashion: 'Mode',
  mode: 'Mode',
  electronics: 'Électronique',
  electronique: 'Électronique',
  'électronique': 'Électronique',
  'home & garden': 'Maison et jardin',
  'home and garden': 'Maison et jardin',
  'maison et jardin': 'Maison et jardin',
  books: 'Livres',
  livres: 'Livres',
  sports: 'Sports',
  beauté: 'Beauté',
  beaute: 'Beauté',
  beauty: 'Beauté',
  food: 'Alimentation',
  alimentation: 'Alimentation',
  toys: 'Jouets',
  jouets: 'Jouets',
  health: 'Santé',
  sante: 'Santé',
  'santé': 'Santé',
  automotive: 'Automobile',
  automobile: 'Automobile',
};

export const toFrenchCategory = (value: string | undefined | null): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const key = raw.toLowerCase();
  return CATEGORY_TRANSLATIONS[key] || raw;
};
