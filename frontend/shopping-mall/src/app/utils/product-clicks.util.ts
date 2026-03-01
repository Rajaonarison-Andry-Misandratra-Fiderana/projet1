const PRODUCT_CLICKS_KEY = 'shopping_mall_product_clicks';

function readClicksMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(PRODUCT_CLICKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeClicksMap(map: Record<string, number>): void {
  localStorage.setItem(PRODUCT_CLICKS_KEY, JSON.stringify(map));
}

export function incrementProductClick(productId: string): void {
  if (!productId) return;
  const map = readClicksMap();
  map[productId] = (map[productId] || 0) + 1;
  writeClicksMap(map);
}

export function getProductClicks(productId: string): number {
  if (!productId) return 0;
  const map = readClicksMap();
  return map[productId] || 0;
}
