// types/index.ts

export type Store = {
    // ... (existing Store type)
    id: string;
    user_id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    zip_code?: string | null;
    created_at: string;
    updated_at?: string | null;
    latitude?: number | null; // Added from previous step
    longitude?: number | null;// Added from previous step
  };
  
  // From master_medicines table
  export type MasterMedicine = {
    id: string;
    name: string;
    manufacturer?: string | null;
    description?: string | null;
    // created_at, updated_at (optional for display)
  };
  
  // From inventory table
  export type InventoryItem = {
    id: string;
    store_id: string;
    medicine_id: string;
    batch_number?: string | null;
    quantity: number;
    purchase_price?: number | string | null; // Use string if inputting, number otherwise
    mrp?: number | string | null;           // Use string if inputting, number otherwise
    expiry_date?: string | null; // Store as YYYY-MM-DD string
    created_at: string;
    updated_at?: string | null;
    // Joined data (optional, define if needed elsewhere, fetched in component)
    master_medicines?: {
        name: string;
        manufacturer?: string | null;
    } | null;
  };
  
  // ... other types

  // types/index.ts

// ... (Store, MasterMedicine, InventoryItem from previous steps) ...

// Representing an item added to the current bill/cart in the UI state
export type BillItem = {
    inventoryItem: InventoryItem; // Holds the original details (id, available qty, mrp, etc.)
    quantitySold: number;
    unitPrice: number; // Price per unit for this sale (usually inventoryItem.mrp)
    totalItemPrice: number;
  };
  
  // From sales table
  export type Sale = {
    id: string;
    store_id: string;
    bill_number: string;
    customer_name?: string | null;
    total_amount: number;
    sale_date: string;
    created_at: string;
    // updated_at?
  };
  
  // From sale_items table
  export type SaleItem = {
    id: string;
    sale_id: string;
    inventory_id: string; // Link to specific inventory batch sold
    medicine_name: string; // Denormalized for bill display
    quantity_sold: number;
    price_per_unit: number;
    total_price: number;
    // created_at?
  };

  // types/index.ts

// ... (Store, MasterMedicine, InventoryItem, BillItem, Sale, SaleItem) ...

// From user_settings table
// Define structure based on your table columns
export type UserSettings = {
  id: string;
  user_id: string;
  preferences: {
    // Define specific preferences you might store
    theme?: 'light' | 'dark' | 'system';
    notificationsEnabled?: boolean;
    itemsPerPage?: number;
    // Add other preferences as needed
  } | null; // Preferences might be null initially
  sync_enabled?: boolean | null; // Example setting
  created_at: string;
  updated_at?: string | null;
};

// A version for the form state, allowing partial updates and defaults
export type SettingsFormData = {
    id?: string; // Include ID if updating existing record
    preferences: {
        theme: 'light' | 'dark' | 'system';
        notificationsEnabled: boolean;
        itemsPerPage: number;
    };
    sync_enabled: boolean;
};