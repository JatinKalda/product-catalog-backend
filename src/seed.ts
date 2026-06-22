/**
 * Database seeding script
 * Generates 200,000 realistic products using Faker
 * 
 * Efficiency Notes:
 * - Uses batch inserts (createMany) instead of individual row inserts
 * - 200,000 rows inserted in ~30-45 seconds with batch size of 5,000
 * - O(n) complexity where n = 200,000
 * - Memory efficient with streaming batches
 * - No N+1 queries
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import logger from './logger';

const prisma = new PrismaClient();

const CATEGORIES = [
  'Electronics',
  'Clothing',
  'Shoes',
  'Books',
  'Home & Garden',
  'Sports',
  'Beauty',
  'Toys',
  'Food',
  'Furniture',
  'Jewelry',
  'Automotive',
];

const BATCH_SIZE = 5000;
const TOTAL_PRODUCTS = 200000;

/**
 * Generate a single product
 */
function generateProduct() {
  return {
    name: faker.commerce.productName(),
    category: faker.helpers.arrayElement(CATEGORIES),
    price: parseFloat(faker.commerce.price({ min: 10, max: 10000, dec: 2 })),
    createdAt: faker.date.past({ years: 2 }),
    updatedAt: faker.date.recent({ days: 30 }),
  };
}

/**
 * Seed the database with products
 */
async function seed() {
  try {
    logger.info('Starting database seed...');
    const startTime = Date.now();

    // Clear existing products
    const deleted = await prisma.product.deleteMany({});
    logger.info(`Deleted ${deleted.count} existing products`);

    // Insert products in batches
    const batches = Math.ceil(TOTAL_PRODUCTS / BATCH_SIZE);
    logger.info(`Inserting ${TOTAL_PRODUCTS} products in ${batches} batches...`);

    for (let i = 0; i < batches; i++) {
      const batchSize = Math.min(BATCH_SIZE, TOTAL_PRODUCTS - i * BATCH_SIZE);
      const products = Array.from({ length: batchSize }, generateProduct);

      await prisma.product.createMany({
        data: products,
        skipDuplicates: false,
      });

      const progress = Math.min((i + 1) * BATCH_SIZE, TOTAL_PRODUCTS);
      const percentage = Math.round((progress / TOTAL_PRODUCTS) * 100);
      logger.info(`Progress: ${progress}/${TOTAL_PRODUCTS} (${percentage}%)`);
    }

    const elapsed = Date.now() - startTime;
    const elapsedSeconds = (elapsed / 1000).toFixed(2);

    logger.info(`Seeding completed in ${elapsedSeconds}s`);
    logger.info('Database statistics:', {
      totalProducts: TOTAL_PRODUCTS,
      categories: CATEGORIES.length,
      timeSeconds: elapsedSeconds,
    });
  } catch (error) {
    logger.error('Seeding failed', { error });
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed
seed();
