import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, json } from "drizzle-orm/pg-core";

// Language constants
export const SUPPORTED_LANGUAGES = ["en", "ar", "kur"];
export const LANGUAGE_NAMES = {
  en: "English",
  ar: "Arabic", 
  kur: "Kurdish Sorani"
};

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  username: varchar("username", { length: 191 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("user"), // "user" | "admin" | "super_admin"
  firstName: text("first_name"),
  lastName: text("last_name"),
  phone: text("phone"),
  avatar: text("avatar"),
  isVerified: boolean("is_verified").default(false),
  waveBalance: integer("wave_balance").default(10), // Number of waves user can assign to properties
  expiresAt: timestamp("expires_at"), // User account expiration date
  isExpired: boolean("is_expired").default(false), // Computed or manual flag for expiration status
  allowedLanguages: json("allowed_languages").$type().default(["en"]), // Languages user can add data in: "en", "ar", "ku"
  createdAt: timestamp("created_at").defaultNow(),
});

export const properties = pgTable("properties", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(), // "house" | "apartment" | "villa" | "land"
  listingType: text("listing_type").notNull(), // "sale" | "rent"
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  area: integer("area"), // in square meters
  address: text("address").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  images: json("images").$type().default([]),
  amenities: json("amenities").$type().default([]),
  features: json("features").$type().default([]),
  status: varchar("status", { length: 16 }).default("active"), // "active" | "sold" | "rented" | "pending"
  language: varchar("language", { length: 3 }).notNull().default("en"), // Language of the property data: "en", "ar", "ku"
  agentId: varchar("agent_id", { length: 36 }).references(() => users.id),
  contactPhone: text("contact_phone"), // Contact phone number for this property (WhatsApp and calls)
  waveId: varchar("wave_id", { length: 36 }),
  views: integer("views").default(0),
  isFeatured: boolean("is_featured").default(false),
  slug: varchar("slug", { length: 255 }).unique(), // SEO-friendly URL slug (nullable for backward compatibility)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

export const inquiries = pgTable("inquiries", {
  id: varchar("id", { length: 36 }).primaryKey(),
  propertyId: varchar("property_id", { length: 36 }).references(() => properties.id),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  status: varchar("status", { length: 16 }).default("pending"), // "pending" | "replied" | "closed"
  createdAt: timestamp("created_at").defaultNow(),
});

export const favorites = pgTable("favorites", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  propertyId: varchar("property_id", { length: 36 }).references(() => properties.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const searchHistory = pgTable("search_history", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  searchQuery: text("search_query").notNull(),
  filters: json("filters").$type(), // Stored as JSON
  resultsCount: integer("results_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerActivity = pgTable("customer_activity", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  activityType: varchar("activity_type", { length: 50 }).notNull(), // "login", "view_property", "favorite", "search", "inquiry"
  targetId: varchar("target_id", { length: 36 }), // Property ID, search ID, etc.
  metadata: json("metadata").$type(), // Additional data about the activity
  points: integer("points").default(0), // Points earned for this activity
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerPoints = pgTable("customer_points", {
  userId: varchar("user_id", { length: 36 }).primaryKey().references(() => users.id),
  totalPoints: integer("total_points").default(0),
  lifetimePoints: integer("lifetime_points").default(0), // Total points ever earned (never decreases)
  level: varchar("level", { length: 20 }).default("bronze"), // "bronze", "silver", "gold", "platinum"
  lastActivityAt: timestamp("last_activity_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

export const waves = pgTable("waves", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  maxProperties: integer("max_properties").default(1), // How many properties can have this wave
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

export const customerWavePermissions = pgTable("customer_wave_permissions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  waveId: varchar("wave_id", { length: 36 }).references(() => waves.id),
  grantedBy: varchar("granted_by", { length: 36 }).references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow(),
  expiresAt: timestamp("expires_at"), // Null = permanent
  isActive: boolean("is_active").default(true),
});

export const currencyRates = pgTable("currency_rates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fromCurrency: varchar("from_currency", { length: 3 }).notNull().default("USD"),
  toCurrency: varchar("to_currency", { length: 3 }).notNull(),
  rate: decimal("rate", { precision: 12, scale: 6 }).notNull(),
  setBy: varchar("set_by", { length: 36 }).references(() => users.id),
  effectiveDate: timestamp("effective_date").notNull().defaultNow(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  properties: many(properties, { relationName: "UserProperties" }),
  inquiries: many(inquiries, { relationName: "UserInquiries" }),
  favorites: many(favorites, { relationName: "UserFavorites" }),
  searchHistory: many(searchHistory, { relationName: "UserSearchHistory" }),
  customerActivity: many(customerActivity, { relationName: "UserCustomerActivity" }),
  customerPoints: many(customerPoints, { relationName: "UserCustomerPoints" }),
  waves: many(waves, { relationName: "UserWaves" }),
  customerWavePermissions: many(customerWavePermissions, { relationName: "UserCustomerWavePermissions" }),
  grantedWavePermissions: many(customerWavePermissions, { relationName: "GrantedCustomerWavePermissions" }),
  currencyRates: many(currencyRates, { relationName: "UserCurrencyRates" }),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  agent: one(users, {
    fields: [properties.agentId],
    references: [users.id],
    relationName: "UserProperties",
  }),
  wave: one(waves, {
    fields: [properties.waveId],
    references: [waves.id],
    relationName: "WaveProperties",
  }),
  inquiries: many(inquiries, { relationName: "PropertyInquiries" }),
  favorites: many(favorites, { relationName: "PropertyFavorites" }),
}));

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  property: one(properties, {
    fields: [inquiries.propertyId],
    references: [properties.id],
    relationName: "PropertyInquiries",
  }),
  user: one(users, {
    fields: [inquiries.userId],
    references: [users.id],
    relationName: "UserInquiries",
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
    relationName: "UserFavorites",
  }),
  property: one(properties, {
    fields: [favorites.propertyId],
    references: [properties.id],
    relationName: "PropertyFavorites",
  }),
}));

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.id],
    relationName: "UserSearchHistory",
  }),
}));

export const customerActivityRelations = relations(customerActivity, ({ one }) => ({
  user: one(users, {
    fields: [customerActivity.userId],
    references: [users.id],
    relationName: "UserCustomerActivity",
  }),
}));

export const customerPointsRelations = relations(customerPoints, ({ one }) => ({
  user: one(users, {
    fields: [customerPoints.userId],
    references: [users.id],
    relationName: "UserCustomerPoints",
  }),
}));

export const wavesRelations = relations(waves, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [waves.createdBy],
    references: [users.id],
    relationName: "UserWaves",
  }),
  properties: many(properties, { relationName: "WaveProperties" }),
  customerWavePermissions: many(customerWavePermissions, { relationName: "WaveCustomerWavePermissions" }),
}));

export const customerWavePermissionsRelations = relations(customerWavePermissions, ({ one }) => ({
  user: one(users, {
    fields: [customerWavePermissions.userId],
    references: [users.id],
    relationName: "UserCustomerWavePermissions",
  }),
  wave: one(waves, {
    fields: [customerWavePermissions.waveId],
    references: [waves.id],
    relationName: "WaveCustomerWavePermissions",
  }),
  grantedBy: one(users, {
    fields: [customerWavePermissions.grantedBy],
    references: [users.id],
    relationName: "GrantedCustomerWavePermissions",
  }),
}));

export const currencyRatesRelations = relations(currencyRates, ({ one }) => ({
  setBy: one(users, {
    fields: [currencyRates.setBy],
    references: [users.id],
    relationName: "UserCurrencyRates",
  }),
}));