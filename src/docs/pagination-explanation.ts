/**
 * Cursor Pagination Explanation
 * Why PostgreSQL and Cursor-Based Pagination?
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * Example: Demonstrating cursor pagination vs OFFSET pagination
 * 
 * SCENARIO: 200,000 products, user fetches 20 items at a time
 * 
 * === OFFSET PAGINATION PROBLEMS ===
 * 
 * GET /products?page=1&limit=20
 * SQL: SELECT * FROM products ORDER BY created_at DESC LIMIT 20 OFFSET 0
 * - Cost: O(n) - scans 20 rows, index efficient
 * 
 * GET /products?page=100&limit=20
 * SQL: SELECT * FROM products ORDER BY created_at DESC LIMIT 20 OFFSET 1980
 * - Cost: O(n) - scans AND DISCARDS 1,980 rows first! Bad for large offsets
 * 
 * GET /products?page=5000&limit=20
 * SQL: SELECT * FROM products ORDER BY created_at DESC LIMIT 20 OFFSET 99,980
 * - Cost: O(n) - scans AND DISCARDS 99,980 rows! Terrible performance
 * - At 200k products, user can't even access products > page 10,000
 * 
 * PROBLEM 1: Missing Records
 * - User on page 50, new product inserted with created_at = now()
 * - All rows shift down
 * - User jumps to page 51, but sees records from page 50 again (duplicates)
 * 
 * PROBLEM 2: Duplicate Records
 * - User on page 50, product deleted from page 40
 * - All rows shift up
 * - User jumps to page 51, but now sees a product they already saw
 * 
 * PROBLEM 3: Performance Cliff
 * - OFFSET 100,000 = scan 100k rows and throw away
 * - OFFSET 1,000,000 = scan 1M rows and throw away
 * - Not viable for real datasets
 * 
 * === CURSOR PAGINATION SOLUTION ===
 * 
 * First Request:
 * GET /products?limit=20
 * SQL: SELECT * FROM products ORDER BY updated_at DESC, id DESC LIMIT 21
 * - Returns: 20 products + cursor containing (updated_at, id) of last product
 * - Cost: O(log n) index scan - constant time!
 * 
 * Second Request:
 * GET /products?cursor=eyJ1cGRhdGVkQXQiOiIyMDI0LTAxLTE1VDEwOjMwOjAwWiIsImlkIjo5OTk5fQ==&limit=20
 * Decoded cursor: { updated_at: "2024-01-15T10:30:00Z", id: 9999 }
 * 
 * SQL (using keyset pagination):
 * SELECT * FROM products
 * WHERE (updated_at < '2024-01-15T10:30:00Z')
 *    OR (updated_at = '2024-01-15T10:30:00Z' AND id < 9999)
 * ORDER BY updated_at DESC, id DESC
 * LIMIT 21
 * 
 * - Uses composite index (updated_at, id) for instant lookup
 * - Cost: O(log n) index scan - ALWAYS constant time!
 * - No rows discarded, seeks directly to position
 * 
 * WHY NO DUPLICATES?
 * - Cursor embeds the position (updated_at + id)
 * - If rows inserted before cursor position, they don't affect current request
 * - If rows deleted, cursor still points to correct position
 * - Lexicographically ordered comparison guarantees no skips
 * 
 * WHY NO MISSING RECORDS?
 * - Cursor position is immutable
 * - Even if 1000 products inserted, they go to top of list
 * - Cursor still fetches next 20 from exact same position
 * - No row shifting due to insertions
 * 
 * INDEXES FOR CURSOR PAGINATION:
 * 1. (updated_at DESC, id DESC)
 *    - Primary pagination index
 *    - Sorts newest first, breaks ties with id
 *    - Enables WHERE clause: updated_at < ? OR (updated_at = ? AND id < ?)
 * 
 * 2. (category, updated_at DESC, id DESC)
 *    - Filtered pagination
 *    - When user filters by category, still uses keyset
 *    - PostgreSQL uses partial index scan on category
 * 
 * 3. (created_at DESC)
 *    - For analytics queries
 *    - "Products created last 30 days"
 * 
 * 4. (name)
 *    - Search support
 *    - Can be upgraded to GIN index for full-text search
 * 
 * === PERFORMANCE COMPARISON ===
 * 
 * 200,000 products, getting page 10,000:
 * 
 * OFFSET pagination:
 * - SELECT * FROM products ORDER BY created_at DESC LIMIT 20 OFFSET 199,980
 * - Must scan and discard 199,980 rows
 * - ~2,000ms on standard hardware
 * - Memory spike as it buffers rows
 * 
 * CURSOR pagination:
 * - SELECT * FROM products WHERE created_at < ? ORDER BY ... LIMIT 20
 * - Index seek directly to position
 * - ~5ms on standard hardware
 * - Constant memory usage
 * - 400x faster!
 * 
 * === TRADEOFF ===
 * 
 * OFFSET pagination allows:
 * - Random page access ("jump to page 50")
 * - "Show me page numbers: 1 2 3 4 5... 50"
 * - Seeing total count easily
 * 
 * CURSOR pagination requires:
 * - Sequential navigation ("next", "previous")
 * - Infinite scroll style UX
 * - Frontend stores cursor for "next" request
 * - No random access to arbitrary pages
 * 
 * For mobile apps and modern UIs, cursor pagination is the standard because:
 * - Infinite scroll is better UX
 * - Works with real-time updates
 * - Scales to billions of records
 * - Database doesn't degrade with deep pagination
 */

// Example implementation showing cursor encoding/decoding
export async function demonstrateCursorPagination() {
  // Cursor payload: position markers
  const cursorPayload = {
    updatedAt: '2024-01-15T10:30:00.000Z',
    id: 9999,
  };

  // Encode to base64 for URL transmission
  const encodedCursor = Buffer.from(JSON.stringify(cursorPayload)).toString('base64');
  console.log('Encoded cursor:', encodedCursor);
  // Output: eyJ1cGRhdGVkQXQiOiIyMDI0LTAxLTE1VDEwOjMwOjAwLjAwMFoiLCJpZCI6OTk5OX0=

  // Decode from base64
  const decoded = JSON.parse(Buffer.from(encodedCursor, 'base64').toString('utf-8'));
  console.log('Decoded cursor:', decoded);
  // Output: { updatedAt: '2024-01-15T10:30:00.000Z', id: 9999 }

  // Build WHERE clause for next fetch
  const whereClause = {
    OR: [
      {
        updatedAt: {
          lt: new Date(decoded.updatedAt),
        },
      },
      {
        AND: [
          {
            updatedAt: new Date(decoded.updatedAt),
          },
          {
            id: {
              lt: decoded.id,
            },
          },
        ],
      },
    ],
  };

  console.log('WHERE clause for next fetch:', JSON.stringify(whereClause, null, 2));
}
