/**
 * Validation utilities for API requests
 */

import { CreateProductDTO, UpdateProductDTO } from '../types';

const VALIDATION_RULES = {
  name: {
    minLength: 1,
    maxLength: 255,
  },
  category: {
    minLength: 1,
    maxLength: 100,
  },
  price: {
    min: 0,
    max: 999999.99,
  },
};

/**
 * Validate product creation request
 */
export function validateCreateProduct(data: unknown): CreateProductDTO {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  const body = data as Record<string, unknown>;

  // Validate name
  if (typeof body.name !== 'string') {
    throw new Error('Name must be a string');
  }
  if (
    body.name.length < VALIDATION_RULES.name.minLength ||
    body.name.length > VALIDATION_RULES.name.maxLength
  ) {
    throw new Error(
      `Name must be between ${VALIDATION_RULES.name.minLength} and ${VALIDATION_RULES.name.maxLength} characters`
    );
  }

  // Validate category
  if (typeof body.category !== 'string') {
    throw new Error('Category must be a string');
  }
  if (
    body.category.length < VALIDATION_RULES.category.minLength ||
    body.category.length > VALIDATION_RULES.category.maxLength
  ) {
    throw new Error(
      `Category must be between ${VALIDATION_RULES.category.minLength} and ${VALIDATION_RULES.category.maxLength} characters`
    );
  }

  // Validate price
  if (typeof body.price !== 'number') {
    throw new Error('Price must be a number');
  }
  if (body.price < VALIDATION_RULES.price.min || body.price > VALIDATION_RULES.price.max) {
    throw new Error(
      `Price must be between ${VALIDATION_RULES.price.min} and ${VALIDATION_RULES.price.max}`
    );
  }

  return {
    name: body.name,
    category: body.category,
    price: body.price,
  };
}

/**
 * Validate product update request
 */
export function validateUpdateProduct(data: unknown): UpdateProductDTO {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid request body');
  }

  const body = data as Record<string, unknown>;
  const update: UpdateProductDTO = {};

  // Optional: validate name if provided
  if (body.name !== undefined) {
    if (typeof body.name !== 'string') {
      throw new Error('Name must be a string');
    }
    if (
      body.name.length < VALIDATION_RULES.name.minLength ||
      body.name.length > VALIDATION_RULES.name.maxLength
    ) {
      throw new Error(
        `Name must be between ${VALIDATION_RULES.name.minLength} and ${VALIDATION_RULES.name.maxLength} characters`
      );
    }
    update.name = body.name;
  }

  // Optional: validate category if provided
  if (body.category !== undefined) {
    if (typeof body.category !== 'string') {
      throw new Error('Category must be a string');
    }
    if (
      body.category.length < VALIDATION_RULES.category.minLength ||
      body.category.length > VALIDATION_RULES.category.maxLength
    ) {
      throw new Error(
        `Category must be between ${VALIDATION_RULES.category.minLength} and ${VALIDATION_RULES.category.maxLength} characters`
      );
    }
    update.category = body.category;
  }

  // Optional: validate price if provided
  if (body.price !== undefined) {
    if (typeof body.price !== 'number') {
      throw new Error('Price must be a number');
    }
    if (body.price < VALIDATION_RULES.price.min || body.price > VALIDATION_RULES.price.max) {
      throw new Error(
        `Price must be between ${VALIDATION_RULES.price.min} and ${VALIDATION_RULES.price.max}`
      );
    }
    update.price = body.price;
  }

  if (Object.keys(update).length === 0) {
    throw new Error('At least one field must be provided for update');
  }

  return update;
}
