import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Language constants
export const SUPPORTED_LANGUAGES = ["en", "ar", "kur"] as const;
export const LANGUAGE_NAMES = {
  en: "English",
  ar: "Arabic", 
  kur: "Kurdish Sorani"
} as const;
export type Language = typeof SUPPORTED_LANGUAGES[number];

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
  allowedLanguages: json("allowed_languages").$type<string[]>().default(["en"]), // Languages user can add data in: "en", "ar", "ku"
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
  images: json("images").$type<string[]>().default([]),
  amenities: json("amenities").$type<string[]>().default([]),
  features: json("features").$type<string[]>().default([]),
  status: varchar("status", { length: 16 }).default("active"), // "active" | "sold" | "rented" | "pending"
  language: varchar("language", { length: 3 }).notNull().default("en"), // Language of the property data: "en", "ar", "ku"
  agentId: varchar("agent_id", { length: 36 }).references(() => users.id),
  contactPhone: text("contact_phone"), // Contact phone number for this property (WhatsApp and calls)
  waveId: varchar("wave_id", { length: 36 }).references(() => waves.id), // Wave assignment
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
  query: text("query").notNull(),
  filters: json("filters").$type<Record<string, any>>().default({}),
  results: integer("results").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerActivity = pgTable("customer_activity", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  activityType: text("activity_type").notNull(), // "property_view" | "search" | "favorite_add" | "favorite_remove" | "inquiry_sent" | "login" | "profile_update"
  propertyId: varchar("property_id", { length: 36 }).references(() => properties.id),
  metadata: json("metadata").$type<Record<string, any>>().default({}),
  points: integer("points").default(0), // Points earned for this activity
  createdAt: timestamp("created_at").defaultNow(),
});

export const customerPoints = pgTable("customer_points", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull().unique(),
  totalPoints: integer("total_points").default(0),
  currentLevel: varchar("current_level", { length: 20 }).default("Bronze"), // Bronze, Silver, Gold, Platinum
  pointsThisMonth: integer("points_this_month").default(0),
  lastActivity: timestamp("last_activity").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// User preference profiles for personalized recommendations
export const userPreferences = pgTable("user_preferences", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull().unique(),
  preferredPropertyTypes: json("preferred_property_types").$type<string[]>().default([]), // ["apartment", "house", "villa"]
  preferredListingTypes: json("preferred_listing_types").$type<string[]>().default([]), // ["sale", "rent"]
  budgetRange: json("budget_range").$type<{ min: number; max: number; currency: string }>(),
  preferredLocations: json("preferred_locations").$type<string[]>().default([]), // ["erbil", "baghdad"]
  preferredBedrooms: json("preferred_bedrooms").$type<number[]>().default([]), // [2, 3, 4]
  preferredAmenities: json("preferred_amenities").$type<string[]>().default([]), // ["parking", "pool"]
  viewingHistory: json("viewing_history").$type<Record<string, number>>().default({}), // propertyId -> view_count
  interactionScores: json("interaction_scores").$type<Record<string, number>>().default({}), // propertyId -> score
  lastRecommendationUpdate: timestamp("last_recommendation_update").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// AI-generated recommendations for users
export const userRecommendations = pgTable("user_recommendations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  propertyId: varchar("property_id", { length: 36 }).references(() => properties.id).notNull(),
  recommendationType: text("recommendation_type").notNull(), // "personalized", "similar", "trending", "location_based"
  confidence: decimal("confidence", { precision: 3, scale: 2 }).notNull().default("0.50"), // 0.0 - 1.0
  reasoning: json("reasoning").$type<string[]>().default([]), // ["matches_price_range", "similar_to_favorites"]
  isViewed: boolean("is_viewed").default(false),
  isClicked: boolean("is_clicked").default(false),
  isFavorited: boolean("is_favorited").default(false),
  feedbackScore: integer("feedback_score"), // User feedback: -1 (negative), 0 (neutral), 1 (positive)
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").default(sql`(NOW() + INTERVAL '7 days')`),
});

// Property similarity matrix for content-based recommendations
export const propertySimilarity = pgTable("property_similarity", {
  id: varchar("id", { length: 36 }).primaryKey(),
  propertyId1: varchar("property_id_1", { length: 36 }).references(() => properties.id).notNull(),
  propertyId2: varchar("property_id_2", { length: 36 }).references(() => properties.id).notNull(),
  similarityScore: decimal("similarity_score", { precision: 3, scale: 2 }).notNull(), // 0.0 - 1.0
  similarityFactors: json("similarity_factors").$type<Record<string, number>>().default({}), // {"price": 0.8, "location": 0.9}
  calculatedAt: timestamp("calculated_at").defaultNow(),
});

// Recommendation analytics and performance tracking
export const recommendationAnalytics = pgTable("recommendation_analytics", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id),
  recommendationType: text("recommendation_type").notNull(),
  totalGenerated: integer("total_generated").default(0),
  totalViewed: integer("total_viewed").default(0),
  totalClicked: integer("total_clicked").default(0),
  totalFavorited: integer("total_favorited").default(0),
  clickThroughRate: decimal("click_through_rate", { precision: 3, scale: 2 }).default("0.00"),
  conversionRate: decimal("conversion_rate", { precision: 3, scale: 2 }).default("0.00"),
  avgConfidenceScore: decimal("avg_confidence_score", { precision: 3, scale: 2 }).default("0.50"),
  period: text("period").notNull(), // "daily", "weekly", "monthly"
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Currency exchange rates management
export const currencyRates = pgTable("currency_rates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fromCurrency: varchar("from_currency", { length: 3 }).notNull().default("USD"), // Base currency (always USD)
  toCurrency: text("to_currency").notNull(), // Target currency (IQD, AED, EUR, etc.)
  rate: decimal("rate", { precision: 12, scale: 6 }).notNull(), // Exchange rate (e.g., 1173.0 for USD to IQD)
  isActive: boolean("is_active").default(true),
  setBy: varchar("set_by", { length: 36 }).references(() => users.id), // Super admin who set this rate
  effectiveDate: timestamp("effective_date").defaultNow(), // When this rate becomes effective
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// Wave management tables
export const waves = pgTable("waves", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#3B82F6"), // Hex color for map display
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by", { length: 36 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

export const customerWavePermissions = pgTable("customer_wave_permissions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).references(() => users.id).notNull(),
  waveId: varchar("wave_id", { length: 36 }).references(() => waves.id).notNull(),
  maxProperties: integer("max_properties").notNull().default(1), // How many properties customer can assign to this wave
  usedProperties: integer("used_properties").default(0), // How many properties customer has already assigned
  grantedBy: varchar("granted_by", { length: 36 }).references(() => users.id), // Super admin who granted permission
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdateFn(() => new Date()),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  properties: many(properties),
  inquiries: many(inquiries),
  favorites: many(favorites),
  searchHistory: many(searchHistory),
  customerActivity: many(customerActivity),
  customerPoints: one(customerPoints),
  wavePermissions: many(customerWavePermissions),
  createdWaves: many(waves),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  agent: one(users, {
    fields: [properties.agentId],
    references: [users.id],
  }),
  wave: one(waves, {
    fields: [properties.waveId],
    references: [waves.id],
  }),
  inquiries: many(inquiries),
  favorites: many(favorites),
}));

export const wavesRelations = relations(waves, ({ one, many }) => ({
  properties: many(properties),
  permissions: many(customerWavePermissions),
  createdBy: one(users, {
    fields: [waves.createdBy],
    references: [users.id],
  }),
}));

export const customerWavePermissionsRelations = relations(customerWavePermissions, ({ one }) => ({
  user: one(users, {
    fields: [customerWavePermissions.userId],
    references: [users.id],
  }),
  wave: one(waves, {
    fields: [customerWavePermissions.waveId],
    references: [waves.id],
  }),
  grantedBy: one(users, {
    fields: [customerWavePermissions.grantedBy],
    references: [users.id],
  }),
}));

export const currencyRatesRelations = relations(currencyRates, ({ one }) => ({
  setBy: one(users, {
    fields: [currencyRates.setBy],
    references: [users.id],
  }),
}));

export const inquiriesRelations = relations(inquiries, ({ one }) => ({
  property: one(properties, {
    fields: [inquiries.propertyId],
    references: [properties.id],
  }),
  user: one(users, {
    fields: [inquiries.userId],
    references: [users.id],
  }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [favorites.propertyId],
    references: [properties.id],
  }),
}));

export const searchHistoryRelations = relations(searchHistory, ({ one }) => ({
  user: one(users, {
    fields: [searchHistory.userId],
    references: [users.id],
  }),
}));

export const customerActivityRelations = relations(customerActivity, ({ one }) => ({
  user: one(users, {
    fields: [customerActivity.userId],
    references: [users.id],
  }),
  property: one(properties, {
    fields: [customerActivity.propertyId],
    references: [properties.id],
  }),
}));

export const customerPointsRelations = relations(customerPoints, ({ one }) => ({
  user: one(users, {
    fields: [customerPoints.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  isExpired: true, // This will be computed based on expiresAt
}).extend({
  allowedLanguages: z.array(z.enum(SUPPORTED_LANGUAGES)).default(["en"]).optional(),
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  views: true,
  slug: true, // Slug will be auto-generated
}).extend({
  language: z.enum(SUPPORTED_LANGUAGES).default("en"),
});

export const updatePropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  views: true,
  slug: true, // Slug will be auto-regenerated if needed
}).extend({
  language: z.enum(SUPPORTED_LANGUAGES).optional(), // No default for updates
}).partial();

export const insertInquirySchema = createInsertSchema(inquiries).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  createdAt: true,
});

export const insertSearchHistorySchema = createInsertSchema(searchHistory).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerActivitySchema = createInsertSchema(customerActivity).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerPointsSchema = createInsertSchema(customerPoints).omit({
  id: true,
  lastActivity: true,
  updatedAt: true,
});

export const insertWaveSchema = createInsertSchema(waves).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomerWavePermissionSchema = createInsertSchema(customerWavePermissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCurrencyRateSchema = createInsertSchema(currencyRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  effectiveDate: true,
});

export const updateCurrencyRateSchema = createInsertSchema(currencyRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  effectiveDate: true,
}).partial();

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Inquiry = typeof inquiries.$inferSelect;
export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type SearchHistory = typeof searchHistory.$inferSelect;
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type CustomerActivity = typeof customerActivity.$inferSelect;
export type InsertCustomerActivity = z.infer<typeof insertCustomerActivitySchema>;
export type CustomerPoints = typeof customerPoints.$inferSelect;
export type InsertCustomerPoints = z.infer<typeof insertCustomerPointsSchema>;
export type Wave = typeof waves.$inferSelect;
export type InsertWave = z.infer<typeof insertWaveSchema>;
export type CustomerWavePermission = typeof customerWavePermissions.$inferSelect;
export type InsertCustomerWavePermission = z.infer<typeof insertCustomerWavePermissionSchema>;
export type CurrencyRate = typeof currencyRates.$inferSelect;
export type InsertCurrencyRate = z.infer<typeof insertCurrencyRateSchema>;
export type UpdateCurrencyRate = z.infer<typeof updateCurrencyRateSchema>;

// Property with relations
export type PropertyWithAgent = Property & {
  agent: User | null;
  wave: Wave | null;
  customerContact?: {
    name: string;
    phone: string | null;
    email: string;
  } | null;
};

export type PropertyWithDetails = PropertyWithAgent & {
  inquiries: Inquiry[];
  favorites: Favorite[];
};

// Wave with permissions
export type WaveWithPermissions = Wave & {
  permissions: CustomerWavePermission[];
  properties: Property[];
};

// Property filters type
export interface PropertyFilters {
  type?: string;
  listingType?: "sale" | "rent";
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  city?: string;
  country?: string;
  language?: Language;
  features?: string[];
  search?: string;
  sortBy?: "price" | "date" | "views";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}
