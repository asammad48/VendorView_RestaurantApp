// Local type definitions to replace @shared/schema
import { z } from "zod";

// Reservation types
export type ReservationStatus = 0 | 1 | 2;
export interface ReservationDetail {
  id: number;
  locationId: number;
  branchId: number;
  reservationName: string;
  reservationDate: string; // ISO
  reservationTime?: string | null;
  emailAddress: string;
  specialRequest?: string | null;
  isActive: boolean;
  createdDate: string;
  modifiedDate?: string | null;
  actionDate?: string | null;
  actionTaken: ReservationStatus;
  remarks?: string | null;
  userId: number;
}

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

// Subscription Enums
export enum SubscriptionType {
  Basic = 1,
  Standard = 2,
  Premium = 3
}

export enum BillingCycle {
  Monthly = 0,
  Yearly = 1
}

// Subscription types
export interface SubscriptionPrice {
  currencyCode: string;
  price: number;
  billingCycle: BillingCycle;
}

export interface SubscriptionDiscount {
  billingCycle: BillingCycle;
  discountPercentage: number | null;
  discountAmount: number | null;
  validUntil: string | null;
}

export interface SubscriptionDetail {
  feature: string;
}

export interface Subscription {
  id: number;
  subscriptionType: SubscriptionType | string;
  trialPeriodInDays: number;
  gracePeriodInDays: number;
  name: string;
  description: string;
  details: SubscriptionDetail[];
  prices: SubscriptionPrice[];
  discounts: SubscriptionDiscount[];
  startDate?: string;
  endDate?: string;
  paymentStatus?: string;
  branchSubscriptionId?: number;
}

export interface ApplySubscriptionRequest {
  branchId: number;
  subscriptionId: number;
  billingCycle: BillingCycle;
  currencyCode: string;
  paymentMethodId: string;
}

export interface ApplySubscriptionResponse {
  branchSubscriptionId: number;
  status: string;
}

export interface CalculateProratedAmountRequest {
  branchId: number;
  newSubscriptionId: number;
  billingCycle: BillingCycle;
}

export interface CalculateProratedAmountResponse {
  remainingAmount: number;
  newPlanAmount: number;
  amountDue: number;
}

export interface ChangeSubscriptionRequest {
  branchId: number;
  newSubscriptionId: number;
  billingCycle: BillingCycle;
  currencyCode: string;
}

export interface ChangeSubscriptionResponse {
  newBranchSubscriptionId: number;
  status: string;
  amountDue: number;
}

export interface CancelSubscriptionRequest {
  branchId: number;
  cancelImmediately: boolean;
}

export interface CancelSubscriptionResponse {
  status: string;
}

export interface UploadPaymentProofRequest {
  branchSubscriptionId: number;
  proofOfPayment: File;
}

export interface UploadPaymentProofResponse {
  status: string;
  filePath: string;
}

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

// Bug Report types for Issues Reporting API
export interface BugSeverity {
  id: number;
  name: string;
}

export interface BugCategory {
  id: number;
  name: string;
}

export interface BugReport {
  id: number;
  title: string;
  description: string;
  attachmentUrl: string;
  category: number;
  status: number;
  severity: number;
  createdDate: string;
}

export const insertBugReportSchema = z.object({
  Title: z.string().min(1, "Title is required"),
  Description: z.string().min(1, "Description is required"),
  Category: z.number().min(1, "Category is required"),
  Severity: z.number().min(1, "Severity is required"),
  Attachment: z.any().optional(), // File
});

export type InsertBugReport = z.infer<typeof insertBugReportSchema>;

// Feedback types (matching API response)
export interface Feedback {
  orderId: number;
  orderNumber: string;
  price: number;
  comments: string;
  stars: number;
  branchName: string;
  entityName: string;
  // UI helper properties for existing display logic
  id?: string;
  customerName?: string;
  customerImage?: string;
  rating?: number;
  comment?: string;
  timestamp?: Date;
  feedbackDate?: string;
  createdAt?: Date;
  response?: string;
  status?: "new" | "responded" | "archived";
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

export interface OrderStatusHistoryItem {
  orderStatus: string;
  statusChangesDate: string;
  statusComment: string;
}

export interface DetailedOrder {
  id: number;
  orderNumber: string;
  branchId: number;
  branchName: string;
  locationId: number;
  locationName: string;
  userId: number;
  username: string;
  deviceInfo: string;
  serviceCharges: number;
  deliveryCharges: number;
  orderAmount: number;
  subTotal: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  discountAmount: number;
  orderStatus: string;
  orderType: string;
  createdAt: string;
  completionTimeMinutes: number;
  currency: string;
  specialInstruction: string;
  orderDeliveryDetails?: OrderDeliveryDetails;
  orderPickupDetails?: OrderPickupDetails;
  allergens: string[];
  orderItems: OrderItem[];
  orderPackages: OrderPackage[];
  splitBills: SplitBill[];
  orderStatusHistory: OrderStatusHistoryItem[];
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

// Reservation types (matching API response structure)
export interface Reservation {
  id: number;
  reservationName: string;
  reservationDate: string;
  reservationTime: string;
  actionTaken: number | null;
  tableName: string;
  numberOfGuests: number;
}

// Reservation status type (from Generic API)
export interface ReservationStatusType {
  id: number;
  name: string;
}

// Pagination response structure
export interface PaginatedResponse<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export const insertReservationSchema = z.object({
  reservationName: z.string().min(1, "Reservation name is required"),
  reservationDate: z.string().min(1, "Reservation date is required"),
  reservationTime: z.string().min(1, "Reservation time is required"),
  tableName: z.string().min(1, "Table name is required"),
  numberOfGuests: z.number().min(1, "Number of guests must be at least 1"),
  actionTaken: z.number().optional(),
});

export type InsertReservation = z.infer<typeof insertReservationSchema>;

// Issues Reporting types based on API response
export interface IssueReporting {
  id: number;
  title: string;
  description: string;
  category: number;
  severity: number;
  status: number;
  imageUrls: string[];
  createdOn: string;
}

// Detailed Issue for view modal
export interface IssueReportingDetail {
  id: number;
  userId: number;
  userName: string;
  title: string;
  description: string;
  attachmentUrl: string;
  category: number;
  status: number;
  severity: number;
  createdDate: string;
  modifiedDate: string | null;
  resolutionDate: string | null;
  comments: string | null;
}

// Insert schema for creating new issues
export const insertIssueReportingSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.number().min(1, "Category is required"),
  severity: z.number().min(1, "Severity is required"),
  attachmentFile: z.any().optional(), // File
});

export type InsertIssueReporting = z.infer<typeof insertIssueReportingSchema>;

// Recipe types based on API response
export interface RecipeItem {
  id?: number;
  inventoryItemId: number;
  inventoryItemName?: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: number;
  name: string;
  type: string;
  branchId: number;
}

export interface RecipeDetail {
  id: number;
  menuItemId?: number;
  menuItemName?: string;
  variantId?: number;
  variantName?: string;
  subMenuItemId?: number;
  subMenuItemName?: string;
  branchId: number;
  items: RecipeItem[];
}

// Insert schema for creating new recipes
export const insertRecipeItemSchema = z.object({
  id: z.number().optional(),
  inventoryItemId: z.number().min(1, "Inventory item is required"),
  quantity: z.number().min(0.001, "Quantity must be greater than 0").multipleOf(0.001, "Quantity can have up to 3 decimal places"),
  unit: z.string().min(1, "Unit is required"),
});

export const insertRecipeSchema = z.object({
  menuItemId: z.number().optional(),
  variantId: z.number().optional(),
  subMenuItemId: z.number().optional(),
  branchId: z.number().min(1, "Branch is required"),
  items: z.array(insertRecipeItemSchema).min(1, "At least one item is required"),
});

export type InsertRecipeItem = z.infer<typeof insertRecipeItemSchema>;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;

// Inventory Item types for recipe management
export interface InventoryItemSimple {
  id: number;
  branchId: number;
  name: string;
  categoryName: string;
  unit: string;
  reorderLevel: number;
  defaultSupplierName: string | null;
}

// Menu Item Search types for recipe selection
export interface MenuItemSearchVariant {
  id: number;
  menuItemId: number;
  name: string;
}

export interface MenuItemSearchMenuItem {
  id: number;
  name: string;
}

export interface MenuItemSearchSubMenuItem {
  id: number;
  name: string;
}

export interface MenuItemSearchData {
  menuItems: MenuItemSearchMenuItem[];
  variants: MenuItemSearchVariant[];
  subMenuItems: MenuItemSearchSubMenuItem[];
}