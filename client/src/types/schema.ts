// Local type definitions to replace @shared/schema
import { z } from "zod";

// User types
export const insertUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().min(1, "Role is required"),
  status: z.string().default("active"),
  entityId: z.string().optional(),
  assignedBranch: z.string().optional(),
  assignedTable: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = InsertUser & { id: string; createdAt: Date; };

// Entity types based on API response
export const insertEntitySchema = z.object({
  Name: z.string().min(1, "Entity name is required"),
  Phone: z.string().min(1, "Phone is required"),
  Address: z.string().min(1, "Address is required"),
  Type: z.number().min(1).max(2), // 1 for hotel, 2 for restaurant
  ProfilePicture: z.any().optional(), // File
  CertificateFile: z.any().optional(), // File
});

export type InsertEntity = z.infer<typeof insertEntitySchema>;

// Entity type based on API response structure
export interface Entity {
  id: number;
  userId: number;
  name: string;
  phone: string;
  address: string;
  profilePictureUrl: string;
  certificateUrl: string;
  type: number; // 1 for hotel, 2 for restaurant
  entityDetails: {
    primaryColor: string;
  };
  // Helper properties for UI compatibility
  entityType?: string;
  image?: string;
}

// Helper function to transform API entity to UI entity
export const transformEntityForUI = (apiEntity: Entity): Entity => ({
  ...apiEntity,
  entityType: apiEntity.type === 1 ? 'hotel' : 'restaurant',
  image: apiEntity.profilePictureUrl,
});

// MenuCategory types (matching API response)
export interface MenuCategory {
  id: number;
  branchId: number;
  name: string;
  isActive: boolean;
}

export const insertMenuCategorySchema = z.object({
  branchId: z.number().min(1, "Branch ID is required"),
  name: z.string().min(1, "Category name is required"),
});

export type InsertMenuCategory = z.infer<typeof insertMenuCategorySchema>;

// Branch types (matching API response)
export type Branch = {
  id: number;
  entityId: number;
  userId: number;
  name: string;
  address: string;
  subscriptionId: number;
  contactNumber?: string;
  trialEndDate: string;
  gracePeriodEndDate: string;
  billingStartDate: string;
  restaurantLogo: string;
  restaurantBanner: string;
  instagramLink: string;
  whatsappLink: string;
  facebookLink: string;
  googleMapsLink: string;
  timeZone: string;
  currency: string;
  isBranchConfigured?: boolean;
  // UI helper properties
  restaurantType?: string;
  status?: string;
};

// Branch creation/update schema for forms
export const insertBranchSchema = z.object({
  Name: z.string().min(1, "Branch name is required"),
  Address: z.string().min(1, "Address is required"),
  ContactNumber: z.string().optional(),
  EntityId: z.number().min(1, "Entity ID is required"),
  SubscriptionId: z.number().default(1),
  InstagramLink: z.string().optional(),
  WhatsappLink: z.string().optional(),
  FacebookLink: z.string().optional(),
  GoogleMapsLink: z.string().optional(),
  TimeZone: z.string().min(1, "Time zone is required"),
  Currency: z.string().min(1, "Currency is required"),
});

export type InsertBranch = z.infer<typeof insertBranchSchema>;

// Menu item types for API
export interface MenuItemVariant {
  name: string;
  price: number;
  personServing: number;
  outOfStock: boolean;
}

export interface MenuItemModifier {
  name: string;
  price: number;
}

export interface MenuItemCustomizationOption {
  id: number;
  name: string;
}

export interface MenuItemCustomization {
  id: number;
  name: string;
  options: MenuItemCustomizationOption[];
}

export interface MenuItem {
  id: number;
  menuCategoryId: number;
  name: string;
  description: string;
  isActive: boolean;
  preparationTime: number;
  menuItemPicture: string;
  disountName?: string;  // Note: API has typo in field name
  isOutOfStock?: boolean;  // Root level stock status for entire menu item
  variants: MenuItemVariant[];
  modifiers: MenuItemModifier[];
  customizations: MenuItemCustomization[];
}

// Menu item creation/update schema for forms
export const insertMenuItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  category: z.string().min(1, "Category is required"),
  image: z.string().optional(),
  status: z.string().default("active"),
  restaurantId: z.string().optional(),
  preparationTime: z.number().min(1, "Preparation time must be at least 1 minute"),
  addOns: z.array(z.string()).optional(),
  customizations: z.array(z.string()).optional(),
  variants: z.array(z.string()).optional(),
});

export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

// Category types
export const insertCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  restaurantId: z.string().optional(),
});

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = InsertCategory & { id: string; createdAt: Date; };

// SubMenu types
export const insertSubMenuSchema = z.object({
  name: z.string().min(1, "SubMenu name is required"),
  price: z.number().min(0, "Price must be positive"),
  branchId: z.number().min(1, "Branch ID is required"),
});

export type InsertSubMenu = z.infer<typeof insertSubMenuSchema>;

export interface SubMenu {
  id: number;
  branchId: number;
  name: string;
  price: number;
  isActive: boolean;
}

// Simple SubMenuItem types for deals (from API response)
export interface SimpleSubMenuItem {
  id: number;
  name: string;
  price: number;
}

// Simple Menu Item types for deals (from API response)
export interface SimpleMenuItem {
  menuItemId: number;
  menuItemName: string;
  variants: Array<{
    id: number;
    name: string;
    price: number;
  }>;
}

// Deal types (matching API structure)
export interface DealMenuItem {
  menuItemId: number;
  variants: Array<{
    variantId: number;
    quantity: number;
  }>;
}

export interface Deal {
  id: number;
  branchId: number;
  name: string;
  description: string;
  price: number;
  packagePicture: string;
  expiryDate: string;
  isActive: boolean;
  disountName?: string;  // Note: API has typo in field name
  menuItems: Array<{
    menuItemId: number;
    menuItemName?: string; // Added for display
    variants: Array<{
      variantId: number;
      variantName?: string; // Added for display 
      quantity: number;
    }>;
  }>;
  subMenuItems: Array<{
    subMenuItemId: number;
    subMenuItemName?: string; // Added for display
    quantity: number;
  }>;
}

// Discount types (matching new API format)
export const insertDiscountSchema = z.object({
  name: z.string().min(1, "Discount name is required"),
  discountType: z.number().min(1).max(2, "Please select a valid discount type"),
  discountValue: z.number().min(0, "Discount value must be positive"),
  maxDiscountAmount: z.number().min(0, "Max discount amount must be positive").optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

export type InsertDiscount = z.infer<typeof insertDiscountSchema>;

export interface Discount {
  id: number;
  branchId: number;
  name: string;
  discountType: number; // 1 = Flat, 2 = Percentage  
  discountValue: number;
  maxDiscountAmount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

// Helper functions for discount type conversion
export const DISCOUNT_TYPES = {
  FLAT: 1,
  PERCENTAGE: 2,
} as const;

export const getDiscountTypeLabel = (type: number): string => {
  switch (type) {
    case DISCOUNT_TYPES.FLAT:
      return "Flat";
    case DISCOUNT_TYPES.PERCENTAGE:
      return "Percentage";
    default:
      return "Unknown";
  }
};

export const insertDealSchema = z.object({
  branchId: z.number().min(1, "Branch ID is required"),
  name: z.string().min(1, "Deal name is required"),
  description: z.string().min(1, "Description is required"),
  price: z.number().min(0, "Price must be positive"),
  packagePicture: z.string().optional(),
  expiryDate: z.string().optional(),
  menuItems: z.array(z.object({
    menuItemId: z.number(),
    variants: z.array(z.object({
      variantId: z.number(),
      quantity: z.number().min(1),
    })).min(1, "At least one variant is required"),
  })).optional(),
  subMenuItems: z.array(z.object({
    subMenuItemId: z.number(),
    quantity: z.number().min(1),
  })).optional(),
}).refine(data => (data.menuItems && data.menuItems.length > 0) || (data.subMenuItems && data.subMenuItems.length > 0), {
  message: "At least one menu item or sub menu item is required",
});

export type InsertDeal = z.infer<typeof insertDealSchema>;

// Ticket types
export const insertTicketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  type: z.enum(["bug", "feature", "support"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.string().default("open"),
  assignedTo: z.string().optional(),
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = InsertTicket & { id: string; createdAt: Date; };

// Feedback types
export interface Feedback {
  id: string;
  customerName: string;
  customerImage?: string;
  rating: number;
  comment: string;
  orderNumber: string;
  timestamp: Date;
  response?: string;
  status: "new" | "responded" | "archived";
}

// Analytics types
export interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  customerSatisfaction: number;
}

export interface TopPerformingItems {
  name: string;
  revenue: number;
  orders: number;
}

export interface OccupancyData {
  name: string;
  value: number;
  fill: string;
}

export interface HourlyOrders {
  hour: string;
  orders: number;
}

// Table types
export interface Table {
  id: string;
  number: string;
  seatingCapacity: number;
  status: "available" | "occupied" | "reserved" | "maintenance";
  assignedWaiter?: string;
  restaurantId?: string;
}

// Order types based on API response
export interface OrderDeliveryDetails {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  deliveryAddress: string;
  streetAddress: string;
  apartment: string;
  deliveryInstruction: string;
  prefferedDeliveryTime: string;
  longitude: number;
  latitude: number;
}

export interface OrderPickupDetails {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  pickupInstruction: string;
  prefferedPickupTime: string;
}

export interface OrderItemModifier {
  id: number;
  modifierId: number;
  modifierName: string;
  price: number;
  quantity: number;
}

export interface OrderItemCustomization {
  id: number;
  customizationName: string;
  optionName: string;
}

export interface OrderItem {
  id: number;
  menuItemId: number;
  variantId: number;
  itemName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  variantName: string;
  personServing: string;
  orderItemModifiers: OrderItemModifier[];
  orderItemCustomizations: OrderItemCustomization[];
}

export interface OrderPackageItem {
  id: number;
  menuPackageItemId: number;
  menuPackageItemVariantId: number;
  itemName: string;
  variantName: string;
  quantity: number;
}

export interface OrderPackageSubItem {
  id: number;
  menuPackageSubItemId: number;
  subItemName: string;
  price: number;
  quantity: number;
}

export interface OrderPackage {
  id: number;
  menuPackageId: number;
  packageName: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  expiryDate: string;
  orderPackageItems: OrderPackageItem[];
  orderPackageSubItems: OrderPackageSubItem[];
}

export interface SplitBill {
  id: number;
  splitType: string;
  price: number;
  mobileNumber: string;
  itemName: string;
}

export interface DetailedOrder {
  id: number;
  orderNumber: string;
  branchId: number;
  locationId: number;
  userId: number;
  username: string;
  deviceInfo: string;
  serviceCharges: number;
  deliveryCharges: number;
  orderAmount: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  orderStatus: string;
  orderType: string;
  createdAt: string;
  subTotal: number;
  discountAmount: number;
  completionTimeMinutes: number;
  branchName: string;
  orderDeliveryDetails?: OrderDeliveryDetails;
  orderPickupDetails?: OrderPickupDetails;
  allergens: string[];
  orderItems: OrderItem[];
  orderPackages: OrderPackage[];
  splitBills: SplitBill[];
}

// Simple Order interface for display in tables (existing)
export interface Order {
  id: string;
  orderNumber: string;
  tableNumber: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  status: "pending" | "preparing" | "ready" | "served" | "completed";
  timestamp: Date;
  customerName?: string;
}

// Service types (matching API response structure)
export interface Service {
  id: number;
  name: string;
  type: number; // Type from API (2 for restaurant services)
  description: string;
  price: number; // Price in cents
  picture: string;
}

// Branch Service types (matching branch services API response)
export interface BranchService {
  serviceId: number;
  serviceName: string;
  price: number;
  picture: string;
}

export const insertServiceSchema = z.object({
  name: z.string().min(1, "Service name is required"),
  type: z.enum(["service", "paid"]),
  price: z.number().min(0),
  description: z.string().optional(),
  status: z.string().default("active"),
});

export type InsertService = z.infer<typeof insertServiceSchema>;