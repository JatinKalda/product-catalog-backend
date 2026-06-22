/**
 * Cursor Pagination Utility
 * 
 * Implements keyset (cursor-based) pagination to solve issues with OFFSET:
 * - No missing records when data is inserted/deleted during pagination
 * - No duplicate records between pages
 * - Constant O(1) performance regardless of cursor position
 * - Better for real-time data and concurrent updates
 */

import { CursorPayload, EncodedCursor } from '../types';

/**
 * Encode cursor to base64 string for URL-safe transmission
 * @param payload - CursorPayload containing position markers
 * @returns Base64 encoded string
 */
export function encodeCursor(payload: CursorPayload): EncodedCursor {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * Decode base64 cursor to CursorPayload
 * @param cursor - Encoded cursor string
 * @returns Decoded CursorPayload
 * @throws Error if cursor is invalid
 */
export function decodeCursor(cursor: EncodedCursor): CursorPayload {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded) as CursorPayload;
  } catch (error) {
    throw new Error('Invalid cursor format');
  }
}

/**
 * Validate pagination limit
 * @param limit - Requested limit
 * @returns Validated limit (capped at MAX_LIMIT)
 */
export function validateLimit(limit?: number | string): number {
  const MAX_LIMIT = 100;
  const DEFAULT_LIMIT = 20;

  if (!limit) return DEFAULT_LIMIT;

  const parsed = typeof limit === 'string' ? parseInt(limit, 10) : limit;

  if (isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT;
  if (parsed > MAX_LIMIT) return MAX_LIMIT;

  return parsed;
}

/**
 * Build cursor-based WHERE clause for pagination
 * Supports filtering by category while maintaining cursor position
 * 
 * @param decodedCursor - Decoded cursor with updated_at and id
 * @returns Prisma where clause for cursor position
 */
export function buildCursorWhereClause(decodedCursor: CursorPayload) {
  return {
    OR: [
      {
        updatedAt: {
          lt: new Date(decodedCursor.updatedAt),
        },
      },
      {
        AND: [
          {
            updatedAt: new Date(decodedCursor.updatedAt),
          },
          {
            id: {
              lt: decodedCursor.id,
            },
          },
        ],
      },
    ],
  };
}

/**
 * Explanation of why cursor pagination is superior for this use case:
 * 
 * OFFSET pagination problems:
 * 1. Performance degrades with large offsets - requires scanning millions of rows
 * 2. Missing records: If rows are inserted, offset shifts and you miss products
 * 3. Duplicate records: If rows are deleted, you see products twice
 * 4. Unsustainable at scale (200k+ products)
 * 
 * Cursor (Keyset) pagination benefits:
 * 1. Constant O(log n) performance using index scan, regardless of position
 * 2. Cursor embeds the position (updated_at, id) so insertions don't affect others
 * 3. Lexicographically ordered comparison ensures no duplicates
 * 4. Works perfectly with real-time data updates
 * 5. Resilient to concurrent modifications
 * 
 * Trade-off: Cannot jump to arbitrary page numbers (e.g., page 50)
 * Solution: Front-end stores cursor for "next" navigation, not random access
 */
