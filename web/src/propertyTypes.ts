/** Property types. The slugs are stored and filtered on; write actions refuse anything else (mcp.json). */
export const CATEGORIES = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment / Unit' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'studio', label: 'Studio' },
  { value: 'room_share', label: 'Room / Share' },
  { value: 'land', label: 'Land' },
  { value: 'other', label: 'Other' },
] as const
export type CategoryValue = (typeof CATEGORIES)[number]['value']

export const isCategory = (value: string): value is CategoryValue => CATEGORIES.some((c) => c.value === value)

/** Display label for a stored slug. Old or unknown categories read as "Other". */
export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? 'Other'
}
