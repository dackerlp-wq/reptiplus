import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  role: text('role').notNull().default('customer'), // customer | admin
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  nameCs: text('name_cs').notNull(),
  nameEn: text('name_en').notNull(),
  nameDe: text('name_de').notNull(),
  descriptionCs: text('description_cs'),
  image: text('image'),
  parentId: text('parent_id'),
  sortOrder: integer('sort_order').default(0),
})

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  sku: text('sku').notNull().unique(),
  nameCs: text('name_cs').notNull(),
  nameEn: text('name_en').notNull(),
  nameDe: text('name_de').notNull(),
  descriptionCs: text('description_cs'),
  descriptionEn: text('description_en'),
  descriptionDe: text('description_de'),
  categoryId: text('category_id').references(() => categories.id),
  price: real('price').notNull(), // price incl. VAT
  priceExcl: real('price_excl').notNull(), // price excl. VAT
  vatRate: real('vat_rate').notNull().default(21),
  comparePrice: real('compare_price'), // original price for sale items
  stock: integer('stock').notNull().default(0),
  lowStockThreshold: integer('low_stock_threshold').default(5),
  images: text('images').default('[]'), // JSON array of image URLs
  parameters: text('parameters').default('{}'), // JSON key-value pairs
  isActive: integer('is_active').notNull().default(1),
  isFeatured: integer('is_featured').default(0),
  isNew: integer('is_new').default(0),
  isSale: integer('is_sale').default(0),
  weight: real('weight'), // kg
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  userId: text('user_id').references(() => users.id),
  status: text('status').notNull().default('pending'), // pending | paid | processing | shipped | delivered | cancelled | refunded
  paymentStatus: text('payment_status').notNull().default('unpaid'), // unpaid | paid | refunded
  paymentMethod: text('payment_method'), // card | bank_transfer | cash_on_delivery
  paymentId: text('payment_id'), // Comgate transaction ID
  shippingMethod: text('shipping_method'), // zasilkovna | ppl | personal_pickup
  shippingPrice: real('shipping_price').default(0),
  subtotal: real('subtotal').notNull(),
  discount: real('discount').default(0),
  total: real('total').notNull(),
  couponCode: text('coupon_code'),
  // customer info (stored directly for orders)
  email: text('email').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  phone: text('phone'),
  // shipping address
  street: text('street').notNull(),
  city: text('city').notNull(),
  zip: text('zip').notNull(),
  country: text('country').notNull().default('CZ'),
  company: text('company'),
  ico: text('ico'),
  dic: text('dic'),
  note: text('note'),
  trackingNumber: text('tracking_number'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
})

export const orderItems = sqliteTable('order_items', {
  id: text('id').primaryKey(),
  orderId: text('order_id').notNull().references(() => orders.id),
  productId: text('product_id').references(() => products.id),
  productName: text('product_name').notNull(),
  productSku: text('product_sku').notNull(),
  quantity: integer('quantity').notNull(),
  price: real('price').notNull(),
  total: real('total').notNull(),
})

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  userId: text('user_id').references(() => users.id),
  authorName: text('author_name').notNull(),
  rating: integer('rating').notNull(), // 1-5
  title: text('title'),
  body: text('body'),
  isApproved: integer('is_approved').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const coupons = sqliteTable('coupons', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  type: text('type').notNull(), // percent | fixed
  value: real('value').notNull(),
  minOrderAmount: real('min_order_amount').default(0),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').default(0),
  isActive: integer('is_active').default(1),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const wishlist = sqliteTable('wishlist', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  productId: text('product_id').notNull().references(() => products.id),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const addresses = sqliteTable('addresses', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  isDefault: integer('is_default').default(0),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  street: text('street').notNull(),
  city: text('city').notNull(),
  zip: text('zip').notNull(),
  country: text('country').notNull().default('CZ'),
  company: text('company'),
  phone: text('phone'),
})

export const blogPosts = sqliteTable('blog_posts', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  titleCs: text('title_cs').notNull(),
  titleEn: text('title_en'),
  titleDe: text('title_de'),
  contentCs: text('content_cs'),
  contentEn: text('content_en'),
  contentDe: text('content_de'),
  excerpt: text('excerpt'),
  image: text('image'),
  authorId: text('author_id').references(() => users.id),
  isPublished: integer('is_published').default(0),
  publishedAt: text('published_at'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const newsletterSubscribers = sqliteTable('newsletter_subscribers', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value'),
})
