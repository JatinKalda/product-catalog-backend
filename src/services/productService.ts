/**
 * Product service layer
 * Handles business logic for product operations
 */

import { PrismaClient } from '@prisma/client';
import { ProductDTO, ProductListResponse, CreateProductDTO, UpdateProductDTO, PaginationParams, EncodedCursor } from '../types';
import {
  encodeCursor,
  decodeCursor,
  validateLimit,
  buildCursorWhereClause,
} from '../utils/cursor';
import logger from '../logger';

export class ProductService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get paginated products with cursor-based pagination
   * 
   * @param params - Pagination parameters (limit, cursor, category filter)
   * @returns ProductListResponse with items and next cursor
   */
  async getProducts(params: PaginationParams): Promise<ProductListResponse> {
    const limit = validateLimit(params.limit);
    // Fetch limit + 1 to determine if there are more records
    const fetchCount = limit + 1;

    const where: any = {};

    // Apply category filter if provided
    if (params.category) {
      where.category = params.category;
    }

    // Apply cursor filter if provided
    if (params.cursor) {
      try {
        const decodedCursor = decodeCursor(params.cursor);
        where.AND = [buildCursorWhereClause(decodedCursor)];
        if (params.category) {
          where.AND.push({ category: params.category });
        }
      } catch (error) {
        logger.warn('Invalid cursor provided', { cursor: params.cursor });
        throw new Error('Invalid cursor format');
      }
    }

    // Query database
    const products = await this.prisma.product.findMany({
      where,
      orderBy: [
        { updatedAt: 'desc' },
        { id: 'desc' },
      ],
      take: fetchCount,
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.debug('Fetched products', {
      limit,
      fetchCount,
      resultCount: products.length,
      category: params.category,
    });

    // Determine if there are more records
    let hasMore = false;
    let items = products;

    if (products.length > limit) {
      hasMore = true;
      items = products.slice(0, limit);
    }

    // Build next cursor if there are more records
    let nextCursor: EncodedCursor | null = null;
    if (hasMore && items.length > 0) {
      const lastItem = items[items.length - 1];
      nextCursor = encodeCursor({
        updatedAt: lastItem.updatedAt.toISOString(),
        id: Number(lastItem.id),
      });
    }

    return {
      items: items.map(this.mapToDTO),
      nextCursor,
      hasMore,
      count: items.length,
    };
  }

  /**
   * Get a single product by ID
   * 
   * @param id - Product ID
   * @returns ProductDTO or null if not found
   */
  async getProductById(id: number): Promise<ProductDTO | null> {
    const product = await this.prisma.product.findUnique({
      where: { id: BigInt(id) },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!product) {
      return null;
    }

    return this.mapToDTO(product);
  }

  /**
   * Create a new product
   * 
   * @param data - Product creation data
   * @returns Created ProductDTO
   */
  async createProduct(data: CreateProductDTO): Promise<ProductDTO> {
    const product = await this.prisma.product.create({
      data: {
        name: data.name,
        category: data.category,
        price: data.price,
      },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info('Product created', { productId: product.id });
    return this.mapToDTO(product);
  }

  /**
   * Update a product
   * 
   * @param id - Product ID
   * @param data - Partial product data to update
   * @returns Updated ProductDTO or null if not found
   */
  async updateProduct(id: number, data: UpdateProductDTO): Promise<ProductDTO | null> {
    const product = await this.prisma.product.update({
      where: { id: BigInt(id) },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.category && { category: data.category }),
        ...(data.price !== undefined && { price: data.price }),
      },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        createdAt: true,
        updatedAt: true,
      },
    }).catch(() => null);

    if (!product) {
      return null;
    }

    logger.info('Product updated', { productId: product.id });
    return this.mapToDTO(product);
  }

  /**
   * Delete a product
   * 
   * @param id - Product ID
   * @returns true if deleted, false if not found
   */
  async deleteProduct(id: number): Promise<boolean> {
    const result = await this.prisma.product.delete({
      where: { id: BigInt(id) },
    }).catch(() => null);

    if (!result) {
      return false;
    }

    logger.info('Product deleted', { productId: id });
    return true;
  }

  /**
   * Get product count (useful for analytics)
   * 
   * @param category - Optional category filter
   * @returns Total count of products
   */
  async getProductCount(category?: string): Promise<number> {
    return this.prisma.product.count({
      where: category ? { category } : undefined,
    });
  }

  /**
   * Map Prisma product to DTO
   * Converts BigInt IDs and Decimal prices to appropriate JSON-serializable types
   */
  private mapToDTO(product: any): ProductDTO {
    return {
      id: Number(product.id),
      name: product.name,
      category: product.category,
      price: Number(product.price),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  }
}
