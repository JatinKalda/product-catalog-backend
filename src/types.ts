/**
 * Type definitions for cursor pagination
 */

/**
 * Cursor payload containing the position markers for keyset pagination
 * Uses updated_at and id to ensure:
 * 1. Newest products first (updated_at DESC)
 * 2. Stable ordering when timestamps are identical (id DESC)
 */
export interface CursorPayload {
  updatedAt: string; // ISO string timestamp
  id: number;
}

/**
 * Encoded cursor (base64 string passed in query parameters)
 */
export type EncodedCursor = string;

/**
 * Product response with pagination metadata
 */
export interface ProductListResponse {
  items: ProductDTO[];
  nextCursor: EncodedCursor | null;
  hasMore: boolean;
  count: number;
}

/**
 * Data Transfer Object for Product
 */
export interface ProductDTO {
  id: number;
  name: string;
  category: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Product creation request
 */
export interface CreateProductDTO {
  name: string;
  category: string;
  price: number;
}

/**
 * Product update request
 */
export interface UpdateProductDTO {
  name?: string;
  category?: string;
  price?: number;
}

/**
 * Pagination query parameters
 */
export interface PaginationParams {
  limit: number;
  cursor?: EncodedCursor;
  category?: string;
}
