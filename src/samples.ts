export interface Sample {
  name: string;
  category: string;
  description: string;
  content: string;
  schema?: string;
}

export const samples: Sample[] = [
  {
    name: "User Profile",
    category: "General",
    description: "A standard profile record with common types and nesting.",
    content: `{
  "id": "usr-8k2s49",
  "username": "alex-dev-99",
  "isActive": true,
  "profile": {
    "firstName": "Alex",
    "lastName": "Rivera",
    "avatarUrl": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format",
    "bio": "Frontend developer & open source contributor"
  },
  "roles": [
    "member",
    "moderator"
  ],
  "preferences": {
    "theme": "dark",
    "notifications": {
      "email": true,
      "push": false,
      "marketing": null
    }
  },
  "createdAt": "2026-06-23T04:20:00Z"
}`,
    schema: `{
  "type": "object",
  "required": ["id", "username", "isActive", "profile", "roles"],
  "properties": {
    "id": { "type": "string" },
    "username": { "type": "string" },
    "isActive": { "type": "boolean" },
    "profile": {
      "type": "object",
      "required": ["firstName", "lastName"],
      "properties": {
        "firstName": { "type": "string" },
        "lastName": { "type": "string" },
        "bio": { "type": "string" }
      }
    },
    "roles": {
      "type": "array",
      "minItems": 1
    }
  }
}`
  },
  {
    name: "API Config",
    category: "Technical",
    description: "Dev environment configurations with arrays of objects.",
    content: `{
  "environment": "production",
  "version": "1.4.2",
  "server": {
    "host": "0.0.0.0",
    "port": 3000,
    "ssl": {
      "enabled": true,
      "certPath": "/etc/ssl/certs/server.crt",
      "keyPath": "/etc/ssl/private/server.key"
    }
  },
  "rateLimiting": {
    "windowMs": 900000,
    "maxRequests": 100,
    "whiteList": [
      "127.0.0.1",
      "10.0.0.1"
    ]
  },
  "services": [
    {
      "name": "auth-microservice",
      "url": "http://auth-cluster.internal",
      "timeoutMs": 5000,
      "retries": 3
    },
    {
      "name": "analytics-collector",
      "url": "http://collector-dns.internal",
      "timeoutMs": 10000,
      "retries": 0
    }
  ],
  "debugMode": false
}`,
    schema: `{
  "type": "object",
  "required": ["environment", "server", "services"],
  "properties": {
    "environment": { "type": "string" },
    "version": { "type": "string" },
    "server": {
      "type": "object",
      "required": ["host", "port"],
      "properties": {
        "host": { "type": "string" },
        "port": { "type": "number", "minimum": 0, "maximum": 65535 }
      }
    },
    "rateLimiting": {
      "type": "object",
      "properties": {
        "maxRequests": { "type": "number", "minimum": 1 }
      }
    }
  }
}`
  },
  {
    name: "Widget Inventory",
    category: "Complex Data",
    description: "Numerical metrics, inventory items, and detailed properties.",
    content: `{
  "storeName": "Apex Components Hub",
  "locationCode": "APX-W14",
  "metrics": {
    "totalRevenue": 47391.25,
    "orderCount": 149,
    "averageValue": 318.06
  },
  "inventory": [
    {
      "sku": "WID-992",
      "name": "Anodized Aluminum Spacer",
      "qty": 450,
      "price": 12.99,
      "tags": ["hardware", "aluminum", "spacer"]
    },
    {
      "sku": "WID-005",
      "name": "Superconducting Magnetic Coil",
      "qty": 8,
      "price": 1450.00,
      "tags": ["advanced", "coil", "superconductor"]
    },
    {
      "sku": "WID-108",
      "name": "Graphite Heat Sink Shield",
      "qty": 124,
      "price": 89.95,
      "tags": ["cooling", "graphite", "shield"]
    }
  ]
}`,
    schema: `{
  "type": "object",
  "required": ["storeName", "inventory"],
  "properties": {
    "storeName": { "type": "string" },
    "inventory": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["sku", "name", "qty", "price"]
      }
    }
  }
}`
  },
  {
    name: "Invalid JSON (Try fixing!)",
    category: "Demos",
    description: "Contains multiple errors to showcase validation diagnostics.",
    content: `{
  "title": "Welcome to AI Studio",
  "description": "This JSON highlights common formatting bugs",
  "unreadCount": 5,
  // This is a comment (unsupported in standard JSON)
  "features": [
    "Formatting",
    "Validating",
    "Syntax Colors",
  ],
  "unquoted_key": 'single quoted value',
  "nested": {
    "nestedProperty": true
  }
}`
  }
];
