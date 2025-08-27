import { DocumentSchema } from '../types';

export const predefinedSchemas: DocumentSchema[] = [
  {
    id: 'user-profile',
    name: 'User Profile',
    description: 'Standard user profile with personal information and preferences',
    category: 'Users',
    fields: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'Unique user identifier',
        example: 'user_123456'
      },
      {
        name: 'email',
        type: 'email',
        required: true,
        description: 'User email address',
        example: 'john.doe@example.com'
      },
      {
        name: 'firstName',
        type: 'string',
        required: true,
        description: 'User first name',
        example: 'John'
      },
      {
        name: 'lastName',
        type: 'string',
        required: true,
        description: 'User last name',
        example: 'Doe'
      },
      {
        name: 'age',
        type: 'number',
        required: false,
        description: 'User age in years',
        example: 28,
        validation: { min: 13, max: 120 }
      },
      {
        name: 'isActive',
        type: 'boolean',
        required: true,
        description: 'Whether the user account is active',
        example: true
      },
      {
        name: 'preferences',
        type: 'object',
        required: false,
        description: 'User preferences and settings',
        example: { theme: 'dark', notifications: true, language: 'en' }
      },
      {
        name: 'tags',
        type: 'array',
        required: false,
        description: 'User tags or categories',
        example: ['premium', 'early-adopter']
      },
      {
        name: 'createdAt',
        type: 'timestamp',
        required: true,
        description: 'Account creation timestamp',
        example: new Date().toISOString()
      }
    ],
    examples: [
      {
        id: 'user_001',
        email: 'alice@example.com',
        firstName: 'Alice',
        lastName: 'Johnson',
        age: 32,
        isActive: true,
        preferences: { theme: 'light', notifications: true, language: 'en' },
        tags: ['premium', 'verified'],
        createdAt: new Date().toISOString()
      }
    ]
  },
  {
    id: 'product-catalog',
    name: 'Product Catalog',
    description: 'E-commerce product with pricing, inventory, and metadata',
    category: 'E-commerce',
    fields: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'Unique product identifier',
        example: 'prod_123456'
      },
      {
        name: 'name',
        type: 'string',
        required: true,
        description: 'Product name',
        example: 'Wireless Bluetooth Headphones'
      },
      {
        name: 'description',
        type: 'string',
        required: true,
        description: 'Product description',
        example: 'High-quality wireless headphones with noise cancellation'
      },
      {
        name: 'price',
        type: 'number',
        required: true,
        description: 'Product price in cents',
        example: 9999,
        validation: { min: 0 }
      },
      {
        name: 'category',
        type: 'string',
        required: true,
        description: 'Product category',
        example: 'Electronics',
        validation: { enum: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'] }
      },
      {
        name: 'inStock',
        type: 'boolean',
        required: true,
        description: 'Whether product is in stock',
        example: true
      },
      {
        name: 'inventory',
        type: 'number',
        required: true,
        description: 'Available inventory count',
        example: 50,
        validation: { min: 0 }
      },
      {
        name: 'images',
        type: 'array',
        required: false,
        description: 'Product image URLs',
        example: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg']
      },
      {
        name: 'specifications',
        type: 'object',
        required: false,
        description: 'Product specifications',
        example: { weight: '250g', battery: '20 hours', connectivity: 'Bluetooth 5.0' }
      },
      {
        name: 'createdAt',
        type: 'timestamp',
        required: true,
        description: 'Product creation timestamp',
        example: new Date().toISOString()
      }
    ],
    examples: [
      {
        id: 'prod_001',
        name: 'Premium Wireless Headphones',
        description: 'Professional-grade wireless headphones with active noise cancellation',
        price: 29999,
        category: 'Electronics',
        inStock: true,
        inventory: 25,
        images: ['https://example.com/headphones1.jpg'],
        specifications: { weight: '280g', battery: '30 hours', connectivity: 'Bluetooth 5.2' },
        createdAt: new Date().toISOString()
      }
    ]
  },
  {
    id: 'blog-post',
    name: 'Blog Post',
    description: 'Blog post with content, metadata, and SEO fields',
    category: 'Content',
    fields: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'Unique post identifier',
        example: 'post_123456'
      },
      {
        name: 'title',
        type: 'string',
        required: true,
        description: 'Blog post title',
        example: 'Getting Started with React Hooks'
      },
      {
        name: 'slug',
        type: 'string',
        required: true,
        description: 'URL-friendly post identifier',
        example: 'getting-started-react-hooks'
      },
      {
        name: 'content',
        type: 'string',
        required: true,
        description: 'Blog post content in markdown',
        example: '# Introduction\n\nReact Hooks are a powerful feature...'
      },
      {
        name: 'excerpt',
        type: 'string',
        required: true,
        description: 'Short post summary',
        example: 'Learn the basics of React Hooks and how to use them effectively'
      },
      {
        name: 'author',
        type: 'string',
        required: true,
        description: 'Post author name',
        example: 'Jane Smith'
      },
      {
        name: 'published',
        type: 'boolean',
        required: true,
        description: 'Whether the post is published',
        example: true
      },
      {
        name: 'tags',
        type: 'array',
        required: false,
        description: 'Post tags',
        example: ['react', 'javascript', 'tutorial']
      },
      {
        name: 'readTime',
        type: 'number',
        required: false,
        description: 'Estimated read time in minutes',
        example: 5,
        validation: { min: 1 }
      },
      {
        name: 'seo',
        type: 'object',
        required: false,
        description: 'SEO metadata',
        example: { metaTitle: 'React Hooks Guide', metaDescription: 'Complete guide to React Hooks' }
      },
      {
        name: 'publishedAt',
        type: 'timestamp',
        required: true,
        description: 'Publication timestamp',
        example: new Date().toISOString()
      }
    ],
    examples: [
      {
        id: 'post_001',
        title: 'Understanding JavaScript Closures',
        slug: 'understanding-javascript-closures',
        content: '# Understanding JavaScript Closures\n\nClosures are a fundamental concept...',
        excerpt: 'A comprehensive guide to understanding closures in JavaScript',
        author: 'Alex Developer',
        published: true,
        tags: ['javascript', 'programming', 'tutorial'],
        readTime: 8,
        seo: { metaTitle: 'JavaScript Closures Explained', metaDescription: 'Learn closures in JavaScript' },
        publishedAt: new Date().toISOString()
      }
    ]
  },
  {
    id: 'order-record',
    name: 'Order Record',
    description: 'E-commerce order with items, customer, and fulfillment details',
    category: 'E-commerce',
    fields: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'Unique order identifier',
        example: 'order_123456'
      },
      {
        name: 'customerId',
        type: 'string',
        required: true,
        description: 'Customer identifier',
        example: 'customer_789'
      },
      {
        name: 'status',
        type: 'string',
        required: true,
        description: 'Order status',
        example: 'processing',
        validation: { enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] }
      },
      {
        name: 'items',
        type: 'array',
        required: true,
        description: 'Order items',
        example: [{ productId: 'prod_001', quantity: 2, price: 2999 }]
      },
      {
        name: 'totalAmount',
        type: 'number',
        required: true,
        description: 'Total order amount in cents',
        example: 5998,
        validation: { min: 0 }
      },
      {
        name: 'shippingAddress',
        type: 'object',
        required: true,
        description: 'Shipping address details',
        example: { street: '123 Main St', city: 'New York', state: 'NY', zip: '10001' }
      },
      {
        name: 'paymentMethod',
        type: 'string',
        required: true,
        description: 'Payment method used',
        example: 'credit_card'
      },
      {
        name: 'notes',
        type: 'string',
        required: false,
        description: 'Order notes or special instructions',
        example: 'Leave at front door'
      },
      {
        name: 'createdAt',
        type: 'timestamp',
        required: true,
        description: 'Order creation timestamp',
        example: new Date().toISOString()
      }
    ],
    examples: [
      {
        id: 'order_001',
        customerId: 'customer_123',
        status: 'processing',
        items: [{ productId: 'prod_001', quantity: 1, price: 29999 }],
        totalAmount: 29999,
        shippingAddress: { street: '456 Oak Ave', city: 'San Francisco', state: 'CA', zip: '94102' },
        paymentMethod: 'credit_card',
        notes: 'Gift wrap requested',
        createdAt: new Date().toISOString()
      }
    ]
  }
];

export const getSchemaById = (id: string): DocumentSchema | undefined => {
  return predefinedSchemas.find(schema => schema.id === id);
};

export const getSchemasByCategory = (category: string): DocumentSchema[] => {
  return predefinedSchemas.filter(schema => schema.category === category);
};

export const getAllCategories = (): string[] => {
  return [...new Set(predefinedSchemas.map(schema => schema.category))];
};