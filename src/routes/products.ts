/**
 * Product API routes
 */

import { Router, Request, Response } from 'express';
import { ProductService } from '../services/productService';
import { validateCreateProduct, validateUpdateProduct } from '../utils/validation';
import logger from '../logger';

export function createProductRouter(productService: ProductService): Router {
  const router = Router();

  /**
   * GET /products
   * Get paginated list of products with cursor-based pagination
   * 
   * Query Parameters:
   * - limit: number (1-100, default 20) - items per page
   * - cursor: string (optional) - encoded cursor for next page
   * - category: string (optional) - filter by category
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { limit, cursor, category } = req.query;

      const result = await productService.getProducts({
        limit: Number(limit) || 20,
        cursor: cursor as string | undefined,
        category: category as string | undefined,
      });

      return res.status(200).json(result);
    } catch (error) {
      logger.error('Error fetching products', { error });
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to fetch products',
      });
    }
  });

  /**
   * GET /products/:id
   * Get a single product by ID
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }

      const product = await productService.getProductById(id);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json(product);
    } catch (error) {
      logger.error('Error fetching product', { error });
      return res.status(500).json({ error: 'Failed to fetch product' });
    }
  });

  /**
   * POST /products
   * Create a new product
   */
  router.post('/', async (req: Request, res: Response) => {
    try {
      const validatedData = validateCreateProduct(req.body);
      const product = await productService.createProduct(validatedData);

      return res.status(201).json(product);
    } catch (error) {
      logger.error('Error creating product', { error });
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to create product',
      });
    }
  });

  /**
   * PUT /products/:id
   * Update a product
   */
  router.put('/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }

      const validatedData = validateUpdateProduct(req.body);
      const product = await productService.updateProduct(id, validatedData);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(200).json(product);
    } catch (error) {
      logger.error('Error updating product', { error });
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to update product',
      });
    }
  });

  /**
   * DELETE /products/:id
   * Delete a product
   */
  router.delete('/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id, 10);

      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid product ID' });
      }

      const deleted = await productService.deleteProduct(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Product not found' });
      }

      return res.status(204).send();
    } catch (error) {
      logger.error('Error deleting product', { error });
      return res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  return router;
}
