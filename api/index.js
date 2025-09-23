import express from "express";
import compression from "compression";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "./schema.js";
import { eq, and, or, like, gte, lte, desc, asc, sql, inArray } from "drizzle-orm";

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', 1);

// Enable compression
app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// JWT configuration for Vercel serverless
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '24h';

// JWT utility functions
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Initialize database connection
let db;
async function initializeDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set");
  }
  
  console.log("Connecting to PostgreSQL database...");
  const client = postgres(databaseUrl);
  db = drizzle(client, { schema });
  console.log("PostgreSQL database connection established");
  
  // Initialize sample data if needed
  await initializeSampleData();
  
  return db;
}

// Initialize sample data
async function initializeSampleData() {
  try {
    // Check if we already have data
    const existingUsers = await db.select().from(schema.users).limit(1);
    const existingProperties = await db.select().from(schema.properties).limit(1);
    
    if (existingUsers.length > 0 && existingProperties.length > 0) {
      console.log("✅ Sample data already exists");
      return;
    }

    console.log("🌱 Initializing sample data for Vercel...");

    // Create admin user if not exists
    const adminExists = await db.select().from(schema.users).where(eq(schema.users.role, 'admin')).limit(1);
    let admin;
    
    if (adminExists.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      [admin] = await db.insert(schema.users).values({
        id: `user-${Date.now()}`,
        username: "admin",
        email: "admin@mapestate.com",
        password: hashedPassword,
        role: "admin",
        firstName: "Admin",
        lastName: "User",
        isVerified: true,
        allowedLanguages: ["en", "ar", "kur"]
      }).returning();
      console.log("✅ Created admin user");
    } else {
      admin = adminExists[0];
    }

    // Create sample agent if not exists
    const agentExists = await db.select().from(schema.users).where(eq(schema.users.username, 'john_agent')).limit(1);
    let agent;
    
    if (agentExists.length === 0) {
      const hashedPassword = await bcrypt.hash('agent123', 12);
      [agent] = await db.insert(schema.users).values({
        id: `agent-${Date.now()}`,
        username: "john_agent",
        email: "john@mapestate.com",
        password: hashedPassword,
        role: "user",
        firstName: "John",
        lastName: "Smith",
        phone: "+964 750 123 4567",
        isVerified: true,
        allowedLanguages: ["en"]
      }).returning();
      console.log("✅ Created sample agent");
    } else {
      agent = agentExists[0];
    }

    // Create sample properties if not exists
    if (existingProperties.length === 0) {
      const sampleProperties = [
        {
          id: "prop-1000",
          title: "ڤیلای فاخر لە هەولێر",
          description: "ڤیلایەکی زۆر جوان لە ناوەڕاستی هەولێر. ٤ ژووری نوستن، باخچە، پارکینگ.",
          type: "villa",
          listingType: "sale",
          price: "450000",
          currency: "USD",
          bedrooms: 4,
          bathrooms: 3,
          area: 3200,
          address: "شەقامی گوڵان، ناوەڕاستی هەولێر",
          city: "هەولێر",
          country: "عێراق",
          latitude: "36.1911",
          longitude: "44.0093",
          images: [
            "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
          ],
          amenities: ["مام ئاوی مەلەوان", "باخچە", "پارکینگ", "سیستەمی ئاسایش"],
          features: ["ئەیر کۆندیشن", "چێشتخانەی مۆدێرن", "بالکۆن", "ژووری کۆگا"],
          agentId: agent.id,
          isFeatured: true,
          language: "kur",
          slug: "villa-luxury-erbil-kur"
        },
        {
          id: "prop-1001",
          title: "شقة حديثة في بغداد",
          description: "شقة رائعة من غرفتي نوم في موقع متميز في بغداد. مثالية للمهنيين الشباب أو العائلات الصغيرة.",
          type: "apartment",
          listingType: "rent",
          price: "800",
          currency: "USD",
          bedrooms: 2,
          bathrooms: 2,
          area: 1200,
          address: "حي المنصور، بغداد",
          city: "بغداد",
          country: "العراق",
          latitude: "33.3152",
          longitude: "44.3661",
          images: [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
          ],
          amenities: ["مصعد", "موقف سيارات", "حماية ٢٤/٧"],
          features: ["مطبخ حديث", "شرفة", "جاهز للإنترنت"],
          agentId: agent.id,
          isFeatured: true,
          language: "ar",
          slug: "modern-apartment-baghdad-ar"
        },
        {
          id: "prop-1002",
          title: "Family House in Sulaymaniyah",
          description: "A comfortable 3-bedroom family house with a beautiful garden. Located in a quiet neighborhood perfect for families.",
          type: "house",
          listingType: "sale",
          price: "180000",
          currency: "USD",
          bedrooms: 3,
          bathrooms: 2,
          area: 2000,
          address: "Azadi Street, Sulaymaniyah",
          city: "Sulaymaniyah",
          country: "Iraq",
          latitude: "35.5651",
          longitude: "45.4305",
          images: [
            "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600"
          ],
          amenities: ["Garden", "Parking", "Basement"],
          features: ["Fireplace", "Large Windows", "Storage"],
          agentId: agent.id,
          isFeatured: false,
          language: "en",
          slug: "family-house-sulaymaniyah"
        }
      ];

      await db.insert(schema.properties).values(sampleProperties);
      console.log("✅ Created sample properties");
    }

    // Initialize currency rates if not exists
    const existingRates = await db.select().from(schema.currencyRates).limit(1);
    if (existingRates.length === 0) {
      const currencyRates = [
        {
          id: `rate-${Date.now()}-1`,
          fromCurrency: "USD",
          toCurrency: "IQD",
          rate: "1310.0",
          setBy: admin.id,
          effectiveDate: new Date(),
          isActive: true
        },
        {
          id: `rate-${Date.now()}-2`,
          fromCurrency: "USD",
          toCurrency: "EUR",
          rate: "0.92",
          setBy: admin.id,
          effectiveDate: new Date(),
          isActive: true
        },
        {
          id: `rate-${Date.now()}-3`,
          fromCurrency: "USD",
          toCurrency: "USD",
          rate: "1.0",
          setBy: admin.id,
          effectiveDate: new Date(),
          isActive: true
        }
      ];

      await db.insert(schema.currencyRates).values(currencyRates);
      console.log("✅ Created currency rates");
    }

    console.log("✅ Sample data initialization completed");
  } catch (error) {
    console.error("❌ Error initializing sample data:", error);
  }
}

// Utility functions
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

const generateId = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// Middleware to populate user from JWT
const populateUser = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.userId) {
      try {
        const [user] = await db.select().from(schema.users).where(eq(schema.users.id, decoded.userId)).limit(1);
        if (user) {
          req.user = user;
        }
      } catch (error) {
        console.error("Error populating user:", error);
      }
    }
  }
  next();
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized - Please provide a valid token' });
  }
  next();
};

// Initialize database on first request
let dbInitialized = false;
const ensureDbInitialized = async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initializeDb();
      dbInitialized = true;
    } catch (error) {
      console.error("Database initialization failed:", error);
      return res.status(500).json({ message: 'Database initialization failed' });
    }
  }
  next();
};

app.use(ensureDbInitialized);
app.use(populateUser);

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'API is running on Vercel with PostgreSQL' });
});

// Authentication routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await db.select().from(schema.users)
      .where(or(eq(schema.users.email, email), eq(schema.users.username, username)))
      .limit(1);
      
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'User already exists' });
    }
    
    const hashedPassword = await hashPassword(password);
    const [user] = await db.insert(schema.users).values({
      id: `user-${generateId()}`,
      username,
      email,
      password: hashedPassword,
      role,
      allowedLanguages: ["en"]
    }).returning();
    
    const token = generateToken(user.id);
    
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json({ 
      user: userWithoutPassword, 
      token,
      message: 'Registration successful' 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const [user] = await db.select().from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
      
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = generateToken(user.id);
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ 
      user: userWithoutPassword, 
      token,
      message: 'Login successful' 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

app.post('/api/logout', (req, res) => {
  // With JWT, logout is handled on the client side by removing the token
  // No server-side session to destroy
  res.json({ message: 'Logout successful' });
});

// Get current user
app.get('/api/user', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  
  const { password: _, ...userWithoutPassword } = req.user;
  res.json({ user: userWithoutPassword });
});

// Properties routes
app.get('/api/properties', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    
    const { type, country, city, minPrice, maxPrice, bedrooms, bathrooms, listingType, sortBy, order, search } = req.query;
    
    let query = db.select({
      id: schema.properties.id,
      title: schema.properties.title,
      description: schema.properties.description,
      type: schema.properties.type,
      listingType: schema.properties.listingType,
      price: schema.properties.price,
      currency: schema.properties.currency,
      bedrooms: schema.properties.bedrooms,
      bathrooms: schema.properties.bathrooms,
      area: schema.properties.area,
      address: schema.properties.address,
      city: schema.properties.city,
      country: schema.properties.country,
      latitude: schema.properties.latitude,
      longitude: schema.properties.longitude,
      images: schema.properties.images,
      amenities: schema.properties.amenities,
      features: schema.properties.features,
      status: schema.properties.status,
      language: schema.properties.language,
      agentId: schema.properties.agentId,
      contactPhone: schema.properties.contactPhone,
      waveId: schema.properties.waveId,
      views: schema.properties.views,
      isFeatured: schema.properties.isFeatured,
      slug: schema.properties.slug,
      createdAt: schema.properties.createdAt,
      updatedAt: schema.properties.updatedAt,
      agent: {
        id: schema.users.id,
        username: schema.users.username,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        phone: schema.users.phone,
        avatar: schema.users.avatar
      }
    }).from(schema.properties)
    .leftJoin(schema.users, eq(schema.properties.agentId, schema.users.id))
    .where(eq(schema.properties.status, 'active'));

    // Apply filters
    const conditions = [eq(schema.properties.status, 'active')];
    
    if (type) conditions.push(eq(schema.properties.type, type));
    if (country) conditions.push(eq(schema.properties.country, country));
    if (city) conditions.push(eq(schema.properties.city, city));
    if (minPrice) conditions.push(gte(schema.properties.price, minPrice));
    if (maxPrice) conditions.push(lte(schema.properties.price, maxPrice));
    if (bedrooms) conditions.push(gte(schema.properties.bedrooms, parseInt(bedrooms)));
    if (bathrooms) conditions.push(gte(schema.properties.bathrooms, parseInt(bathrooms)));
    if (listingType) conditions.push(eq(schema.properties.listingType, listingType));
    if (search) {
      conditions.push(
        or(
          like(schema.properties.title, `%${search}%`),
          like(schema.properties.description, `%${search}%`),
          like(schema.properties.address, `%${search}%`)
        )
      );
    }

    query = query.where(and(...conditions));

    // Apply sorting
    if (sortBy === 'price') {
      query = query.orderBy(order === 'desc' ? desc(schema.properties.price) : asc(schema.properties.price));
    } else {
      query = query.orderBy(desc(schema.properties.createdAt));
    }

    // Get total count
    const countQuery = db.select({ count: sql`count(*)` }).from(schema.properties).where(and(...conditions));
    const [{ count }] = await countQuery;
    const totalCount = parseInt(count);
    
    // Apply pagination
    const properties = await query.limit(limit).offset(offset);
    const totalPages = Math.ceil(totalCount / limit);
    
    res.json({
      properties,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasMore: page < totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ message: 'Failed to fetch properties' });
  }
});

app.get('/api/properties/featured', async (req, res) => {
  try {
    const featuredProperties = await db.select({
      id: schema.properties.id,
      title: schema.properties.title,
      description: schema.properties.description,
      type: schema.properties.type,
      listingType: schema.properties.listingType,
      price: schema.properties.price,
      currency: schema.properties.currency,
      bedrooms: schema.properties.bedrooms,
      bathrooms: schema.properties.bathrooms,
      area: schema.properties.area,
      address: schema.properties.address,
      city: schema.properties.city,
      country: schema.properties.country,
      latitude: schema.properties.latitude,
      longitude: schema.properties.longitude,
      images: schema.properties.images,
      amenities: schema.properties.amenities,
      features: schema.properties.features,
      status: schema.properties.status,
      language: schema.properties.language,
      agentId: schema.properties.agentId,
      contactPhone: schema.properties.contactPhone,
      waveId: schema.properties.waveId,
      views: schema.properties.views,
      isFeatured: schema.properties.isFeatured,
      slug: schema.properties.slug,
      createdAt: schema.properties.createdAt,
      updatedAt: schema.properties.updatedAt,
      agent: {
        id: schema.users.id,
        username: schema.users.username,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        phone: schema.users.phone,
        avatar: schema.users.avatar
      }
    }).from(schema.properties)
    .leftJoin(schema.users, eq(schema.properties.agentId, schema.users.id))
    .where(and(
      eq(schema.properties.status, 'active'),
      eq(schema.properties.isFeatured, true)
    ))
    .orderBy(desc(schema.properties.createdAt))
    .limit(6);
    
    res.json(featuredProperties);
  } catch (error) {
    console.error('Error fetching featured properties:', error);
    res.status(500).json({ message: 'Failed to fetch featured properties' });
  }
});

app.get('/api/properties/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try to find by slug first, then by id
    const [property] = await db.select({
      id: schema.properties.id,
      title: schema.properties.title,
      description: schema.properties.description,
      type: schema.properties.type,
      listingType: schema.properties.listingType,
      price: schema.properties.price,
      currency: schema.properties.currency,
      bedrooms: schema.properties.bedrooms,
      bathrooms: schema.properties.bathrooms,
      area: schema.properties.area,
      address: schema.properties.address,
      city: schema.properties.city,
      country: schema.properties.country,
      latitude: schema.properties.latitude,
      longitude: schema.properties.longitude,
      images: schema.properties.images,
      amenities: schema.properties.amenities,
      features: schema.properties.features,
      status: schema.properties.status,
      language: schema.properties.language,
      agentId: schema.properties.agentId,
      contactPhone: schema.properties.contactPhone,
      waveId: schema.properties.waveId,
      views: schema.properties.views,
      isFeatured: schema.properties.isFeatured,
      slug: schema.properties.slug,
      createdAt: schema.properties.createdAt,
      updatedAt: schema.properties.updatedAt,
      agent: {
        id: schema.users.id,
        username: schema.users.username,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        phone: schema.users.phone,
        avatar: schema.users.avatar
      }
    }).from(schema.properties)
    .leftJoin(schema.users, eq(schema.properties.agentId, schema.users.id))
    .where(
      or(
        eq(schema.properties.slug, identifier),
        eq(schema.properties.id, identifier)
      )
    )
    .limit(1);
    
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }
    
    // Increment view count
    await db.update(schema.properties)
      .set({ views: sql`${schema.properties.views} + 1` })
      .where(eq(schema.properties.id, property.id));
    
    res.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ message: 'Failed to fetch property' });
  }
});

// Currency rates
app.get('/api/currency-rates', async (req, res) => {
  try {
    const rates = await db.select().from(schema.currencyRates)
      .where(eq(schema.currencyRates.isActive, true))
      .orderBy(desc(schema.currencyRates.effectiveDate));
    
    res.json(rates);
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    res.status(500).json({ message: 'Failed to fetch currency rates' });
  }
});

// Favorites routes
app.get('/api/favorites', requireAuth, async (req, res) => {
  try {
    const userFavorites = await db.select({
      id: schema.properties.id,
      title: schema.properties.title,
      description: schema.properties.description,
      type: schema.properties.type,
      listingType: schema.properties.listingType,
      price: schema.properties.price,
      currency: schema.properties.currency,
      bedrooms: schema.properties.bedrooms,
      bathrooms: schema.properties.bathrooms,
      area: schema.properties.area,
      address: schema.properties.address,
      city: schema.properties.city,
      country: schema.properties.country,
      latitude: schema.properties.latitude,
      longitude: schema.properties.longitude,
      images: schema.properties.images,
      amenities: schema.properties.amenities,
      features: schema.properties.features,
      status: schema.properties.status,
      language: schema.properties.language,
      agentId: schema.properties.agentId,
      contactPhone: schema.properties.contactPhone,
      waveId: schema.properties.waveId,
      views: schema.properties.views,
      isFeatured: schema.properties.isFeatured,
      slug: schema.properties.slug,
      createdAt: schema.properties.createdAt,
      updatedAt: schema.properties.updatedAt,
      agent: {
        id: schema.users.id,
        username: schema.users.username,
        firstName: schema.users.firstName,
        lastName: schema.users.lastName,
        email: schema.users.email,
        phone: schema.users.phone,
        avatar: schema.users.avatar
      }
    }).from(schema.favorites)
    .innerJoin(schema.properties, eq(schema.favorites.propertyId, schema.properties.id))
    .leftJoin(schema.users, eq(schema.properties.agentId, schema.users.id))
    .where(eq(schema.favorites.userId, req.user.id));
    
    res.json(userFavorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Failed to fetch favorites' });
  }
});

app.post('/api/favorites', requireAuth, async (req, res) => {
  try {
    const { propertyId } = req.body;
    
    if (!propertyId) {
      return res.status(400).json({ message: 'Property ID is required' });
    }
    
    // Check if already favorited
    const [existingFavorite] = await db.select().from(schema.favorites)
      .where(and(
        eq(schema.favorites.userId, req.user.id),
        eq(schema.favorites.propertyId, propertyId)
      ))
      .limit(1);
      
    if (existingFavorite) {
      return res.status(409).json({ message: 'Property already in favorites' });
    }
    
    const [favorite] = await db.insert(schema.favorites).values({
      id: `fav-${generateId()}`,
      userId: req.user.id,
      propertyId
    }).returning();
    
    res.status(201).json(favorite);
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ message: 'Failed to add favorite' });
  }
});

app.delete('/api/favorites/:propertyId', requireAuth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    const result = await db.delete(schema.favorites)
      .where(and(
        eq(schema.favorites.userId, req.user.id),
        eq(schema.favorites.propertyId, propertyId)
      ))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ message: 'Favorite not found' });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ message: 'Failed to remove favorite' });
  }
});

// Inquiries routes
app.post('/api/inquiries', requireAuth, async (req, res) => {
  try {
    const { propertyId, name, email, phone, message } = req.body;
    
    if (!propertyId || !name || !email || !message) {
      return res.status(400).json({ message: 'Property ID, name, email, and message are required' });
    }
    
    const [inquiry] = await db.insert(schema.inquiries).values({
      id: `inq-${generateId()}`,
      propertyId,
      userId: req.user.id,
      name,
      email,
      phone,
      message,
      status: 'pending'
    }).returning();
    
    res.status(201).json(inquiry);
  } catch (error) {
    console.error('Error creating inquiry:', error);
    res.status(500).json({ message: 'Failed to create inquiry' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// Handle 404 for API routes
app.use((req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Export the Express app for Vercel
export default app;