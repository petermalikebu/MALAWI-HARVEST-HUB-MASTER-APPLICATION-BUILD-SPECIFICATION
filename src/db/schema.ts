import { relations } from 'drizzle-orm';
import { boolean, integer, numeric, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table with Firebase UID
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or system UID
  email: text('email').notNull(),
  password: text('password'), // Optional encrypted/stored password for email-password login
  photoUrl: text('photo_url').default(''),
  fullName: text('full_name').notNull().default('Anonymous User'),
  role: text('role').notNull().default('farmer'), // farmer | buyer | transporter | admin | finance_admin
  phoneNumber: text('phone_number').default('+265 '),
  district: text('district').notNull().default('Lilongwe'),
  region: text('region').notNull().default('Central'), // Central | Southern | Northern
  tradingArea: text('trading_area').default(''),
  village: text('village').default(''),
  // Transporter specific
  vehicleType: text('vehicle_type').default(''),
  vehicleRegistration: text('vehicle_registration').default(''),
  vehicleCapacityKg: integer('vehicle_capacity_kg').default(0),
  bankName: text('bank_name').default('National Bank of Malawi'),
  bankAccount: text('bank_account').default(''),
  bankAccountName: text('bank_account_name').default(''),
  isAvailable: boolean('is_available').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Categories table
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description').default(''),
  imageUrl: text('image_url').default(''),
  createdAt: timestamp('created_at').defaultNow(),
});

// Commodities (Marketplace listings)
export const commodities = pgTable('commodities', {
  id: serial('id').primaryKey(),
  farmerId: integer('farmer_id').references(() => users.id).notNull(),
  farmerUid: text('farmer_uid').notNull(),
  farmerName: text('farmer_name').notNull().default('Farmer'),
  commodityName: text('commodity_name').notNull(),
  category: text('category').notNull(),
  quantity: integer('quantity').notNull(), // remaining available kg
  initialQuantity: integer('initial_quantity').notNull(),
  unit: text('unit').notNull().default('kg'),
  pricePerUnit: numeric('price_per_unit').notNull(), // MWK per unit
  district: text('district').notNull(),
  location: text('location').notNull(),
  region: text('region').notNull().default('Central'),
  quality: text('quality').notNull().default('Grade A - Premium'),
  availabilityDate: text('availability_date').notNull(),
  description: text('description').default(''),
  imageUrl: text('image_url').default(''),
  status: text('status').notNull().default('available'), // available | reserved | sold_out | cancelled
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Orders
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull().unique(),
  buyerId: integer('buyer_id').references(() => users.id).notNull(),
  buyerUid: text('buyer_uid').notNull(),
  buyerName: text('buyer_name').notNull(),
  buyerPhone: text('buyer_phone').default(''),
  farmerId: integer('farmer_id').references(() => users.id).notNull(),
  farmerUid: text('farmer_uid').notNull(),
  farmerName: text('farmer_name').notNull(),
  farmerPhone: text('farmer_phone').default(''),
  commodityId: integer('commodity_id').references(() => commodities.id).notNull(),
  commodityName: text('commodity_name').notNull(),
  quantity: integer('quantity').notNull(),
  unit: text('unit').notNull().default('kg'),
  unitPrice: numeric('unit_price').notNull(),
  commoditySubtotal: numeric('commodity_subtotal').notNull(),
  transportFee: numeric('transport_fee').notNull().default('0'),
  platformCommissionRate: numeric('platform_commission_rate').notNull().default('0.04'),
  platformCommissionFee: numeric('platform_commission_fee').notNull().default('0'),
  totalAmount: numeric('total_amount').notNull(),
  deliveryLocation: text('delivery_location').notNull(),
  deliveryDistrict: text('delivery_district').notNull(),
  deliveryDate: text('delivery_date').notNull(),
  notes: text('notes').default(''),
  paymentMethod: text('payment_method').default('Airtel Money (+265 999 036 912)'),
  paymentRef: text('payment_ref'),
  financeApprovedAt: timestamp('finance_approved_at'),
  financeApprovedBy: text('finance_approved_by'),
  farmerConfirmedAt: timestamp('farmer_confirmed_at'),
  farmerConfirmedBy: text('farmer_confirmed_by'),
  disbursedAt: timestamp('disbursed_at'),
  disbursedBy: text('disbursed_by'),
  disbursedRef: text('disbursed_ref'),
  status: text('status').notNull().default('pending'), 
  // pending | pending_payment_verification | accepted | declined | transport_requested | transport_assigned | picked_up | in_transit | delivered | completed | cancelled
  paymentStatus: text('payment_status').notNull().default('pending'), // pending | escrow_pending_finance_approval | escrow_held | paid | escrowed | released | disbursed_to_farmer | refunded
  cancellationReason: text('cancellation_reason'),
  cancelledByUid: text('cancelled_by_uid'),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Transport Requests / Jobs
export const transportJobs = pgTable('transport_jobs', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id),
  orderNumber: text('order_number').notNull(),
  farmerId: integer('farmer_id').references(() => users.id),
  farmerUid: text('farmer_uid'),
  farmerName: text('farmer_name'),
  farmerPhone: text('farmer_phone'),
  transporterId: integer('transporter_id').references(() => users.id),
  transporterUid: text('transporter_uid'),
  transporterName: text('transporter_name'),
  transporterPhone: text('transporter_phone'),
  commodityName: text('commodity_name').notNull(),
  quantityKg: integer('quantity_kg').notNull(),
  pickupLocation: text('pickup_location').notNull(),
  pickupDistrict: text('pickup_district').notNull(),
  destinationLocation: text('destination_location').notNull(),
  destinationDistrict: text('destination_district').notNull(),
  requiredVehicleType: text('required_vehicle_type').notNull(),
  preferredDate: text('preferred_date').notNull(),
  specialRequirements: text('special_requirements').default(''),
  transportFee: numeric('transport_fee').notNull(),
  paymentStatus: text('payment_status').default('pending_payment'), // pending_payment | paid_pending_approval | verified_by_finance | refunded
  paymentRef: text('payment_ref'),
  paymentMethod: text('payment_method').default('Airtel Money / TNM Mpamba Escrow'),
  financeApprovedBy: text('finance_approved_by'),
  financeApprovedAt: timestamp('finance_approved_at'),
  financeRecommendationNotes: text('finance_recommendation_notes'),
  recommendedDriverId: integer('recommended_driver_id'),
  recommendedDriverName: text('recommended_driver_name'),
  status: text('status').notNull().default('requested'),
  // requested | pending_finance_approval | driver_assigned | picked_up | in_transit | delivered | completed | cancelled
  currentLocation: text('current_location').default(''),
  estimatedArrival: text('estimated_arrival').default(''),
  acceptedAt: timestamp('accepted_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Platform Revenue Ledger (auditable, permanent)
export const revenueLedger = pgTable('revenue_ledger', {
  id: serial('id').primaryKey(),
  revenueId: text('revenue_id').notNull().unique(), // e.g. REV-2026-001
  transactionId: text('transaction_id').notNull(),
  sourceType: text('source_type').notNull(), // commodity_commission | transport_fee | marketplace_trade
  sourceOrderId: integer('source_order_id').references(() => orders.id),
  sourceOrderNumber: text('source_order_number').notNull(),
  grossTransactionAmount: numeric('gross_transaction_amount').notNull(),
  commissionRate: numeric('commission_rate').notNull(),
  commissionAmount: numeric('commission_amount').notNull(),
  transportFee: numeric('transport_fee').notNull().default('0'),
  farmerEarnings: numeric('farmer_earnings').notNull(),
  transporterEarnings: numeric('transporter_earnings').notNull().default('0'),
  status: text('status').notNull().default('recorded'), // recorded | settled | reversed
  createdSource: text('created_source').notNull().default('system_escrow_engine'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Synchronized Transaction Ledger
export const transactions = pgTable('transactions', {
  id: serial('id').primaryKey(),
  transactionId: text('transaction_id').notNull().unique(), // e.g. TX-9021
  orderId: integer('order_id').references(() => orders.id).notNull(),
  orderNumber: text('order_number').notNull(),
  farmerId: integer('farmer_id').references(() => users.id).notNull(),
  farmerName: text('farmer_name').notNull(),
  buyerId: integer('buyer_id').references(() => users.id).notNull(),
  buyerName: text('buyer_name').notNull(),
  commodityName: text('commodity_name').notNull(),
  grossAmount: numeric('gross_amount').notNull(),
  platformCommission: numeric('platform_commission').notNull(),
  transportFee: numeric('transport_fee').notNull().default('0'),
  netFarmerAmount: numeric('net_farmer_amount').notNull(),
  netTransporterAmount: numeric('net_transporter_amount').notNull().default('0'),
  status: text('status').notNull().default('pending'), // pending | completed | cancelled | refunded
  paymentMethod: text('payment_method').default('Airtel Money / TNM Mpamba Escrow'),
  cancellationReason: text('cancellation_reason'),
  cancelledBy: text('cancelled_by'),
  cancelledAt: timestamp('cancelled_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Platform Settings (configurable commission, etc.)
export const platformSettings = pgTable('platform_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  description: text('description').default(''),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Notifications
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(), // or 'all' for platform-wide broadcasts
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull().default('order'), // order | transport | finance | system
  relatedOrderId: integer('related_order_id'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

// Audit Logs (immutable action history)
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userUid: text('user_uid').notNull(),
  userEmail: text('user_email').notNull(),
  userName: text('user_name').notNull(),
  role: text('role').notNull(),
  action: text('action').notNull(), // e.g. ORDER_CANCELLED, COMMODITY_CREATED, etc.
  recordAffected: text('record_affected').notNull(),
  previousValue: text('previous_value'),
  newValue: text('new_value'),
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Support Tickets & Suggestions / User Queries
export const supportTickets = pgTable('support_tickets', {
  id: serial('id').primaryKey(),
  ticketNumber: text('ticket_number').notNull().unique(),
  userId: integer('user_id'),
  userUid: text('user_uid').notNull(),
  userName: text('user_name').notNull(),
  userEmail: text('user_email').notNull(),
  userPhone: text('user_phone').default(''),
  userRole: text('user_role').notNull(), // farmer | buyer | transporter | admin | finance_admin
  userDistrict: text('user_district').default('Lilongwe'),
  category: text('category').notNull().default('problem'), // problem | suggestion | payment_query | transport_query | commodity_query | other
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('pending'), // pending | in_progress | replied | resolved
  priority: text('priority').notNull().default('normal'), // normal | high | urgent
  adminReply: text('admin_reply').default(''),
  repliedByAdminName: text('replied_by_admin_name').default(''),
  repliedByAdminUid: text('replied_by_admin_uid').default(''),
  repliedAt: timestamp('replied_at'),
  replies: text('replies').default('[]'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  commodities: many(commodities),
  buyerOrders: many(orders, { relationName: 'buyerOrders' }),
  farmerOrders: many(orders, { relationName: 'farmerOrders' }),
  transportJobs: many(transportJobs),
}));

export const commoditiesRelations = relations(commodities, ({ one, many }) => ({
  farmer: one(users, {
    fields: [commodities.farmerId],
    references: [users.id],
  }),
  orders: many(orders),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  buyer: one(users, {
    fields: [orders.buyerId],
    references: [users.id],
    relationName: 'buyerOrders',
  }),
  farmer: one(users, {
    fields: [orders.farmerId],
    references: [users.id],
    relationName: 'farmerOrders',
  }),
  commodity: one(commodities, {
    fields: [orders.commodityId],
    references: [commodities.id],
  }),
  transportJobs: many(transportJobs),
  transactions: many(transactions),
  revenueEntries: many(revenueLedger),
}));

export const transportJobsRelations = relations(transportJobs, ({ one }) => ({
  order: one(orders, {
    fields: [transportJobs.orderId],
    references: [orders.id],
  }),
  transporter: one(users, {
    fields: [transportJobs.transporterId],
    references: [users.id],
  }),
}));
