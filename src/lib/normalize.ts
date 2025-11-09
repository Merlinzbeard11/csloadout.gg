/**
 * Item Name Normalization Utility
 *
 * Normalizes CS2 item names for consistent search across different platform formats:
 * - Steam: "AK-47 | Case Hardened (Field-Tested)"
 * - ByMykel: "AK-47 Case Hardened"
 * - CSFloat: "ak47_case_hardened"
 *
 * All normalize to: "ak-47 case hardened field-tested"
 *
 * BDD Reference: features/01-item-database.feature:89-94
 * Spec Reference: features/01-item-database.md Gotcha #4
 */

export function normalizeItemName(name: string): string {
  if (!name) return '';

  return name
    .toLowerCase()                      // Convert to lowercase
    .replace(/[|()]/g, '')              // Remove pipes and parentheses
    .replace(/★/g, '')                  // Remove star symbol (knife/glove indicator)
    .replace(/™/g, '')                  // Remove trademark symbol
    .replace(/_/g, ' ')                 // Replace underscores with spaces
    .replace(/\s+/g, ' ')               // Collapse multiple spaces to single space
    .trim();                            // Remove leading/trailing whitespace
}
