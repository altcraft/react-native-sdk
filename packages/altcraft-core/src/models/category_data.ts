/** Subscription category metadata. */
export type CategoryData = {
  name?: string | null;
  title?: string | null;
  steady?: boolean | null;
  active?: boolean | null;
};

/** Converts a category to a plain object for the native bridge. */
export function categoryDataToNative(
  category: CategoryData
): Record<string, unknown> {
  const map: Record<string, unknown> = {};
  if (category.name != null) map.name = category.name;
  if (category.title != null) map.title = category.title;
  if (category.steady != null) map.steady = category.steady;
  if (category.active != null) map.active = category.active;
  return map;
}

/** Creates a category from a decoded native object. */
export function categoryDataFromNative(
  value: unknown
): CategoryData | null {
  if (value == null || typeof value !== 'object') return null;
  const map = value as Record<string, unknown>;
  return {
    name: map.name != null ? String(map.name) : null,
    title: map.title != null ? String(map.title) : null,
    steady: map.steady != null ? Boolean(map.steady) : null,
    active: map.active != null ? Boolean(map.active) : null,
  };
}
