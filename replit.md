# Scannify - Restaurant & Hotel Management System

## Overview
This full-stack restaurant and hotel management application provides comprehensive entity management functionality for both hotels and restaurants. It includes user management, analytics, and reporting via an intuitive dashboard. The system supports multiple entities with role-based access control for managers, waiters, and chefs, aiming to streamline operations and enhance decision-making in the hospitality sector. Key capabilities include dynamic page routing, mobile responsiveness, subscription plan integration, comprehensive orders and menu management (including deals and services), ticket reporting, user management, and advanced analytics. Recent additions include a full inventory management system with stock tracking, low stock monitoring, purchase order capabilities, stock wastage tracking with date-filtered historical viewing, and expense management with utility expense tracking.

## User Preferences
Preferred communication style: Simple, everyday language.
Technical preferences:
- Integrate real API endpoints for user management with proper authentication
- Implement generic pagination system with configurable page sizes
- User table: Only keep name search filter, remove all other search filters
- Use FormData format for user creation with profile pictures
- Password field should have show/hide toggle functionality
- API integration: Users list API with name filtering and pagination support
- Generic pagination configuration stored in centralized location
- Real-time API integration with proper error handling and loading states

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI Components**: Radix UI primitives and shadcn/ui.
- **Styling**: Tailwind CSS with CSS variables for theming.
- **Routing**: Wouter for client-side routing.
- **State Management**: TanStack Query for server state.
- **Authentication**: Custom auth context with localStorage persistence.
- **Form Handling**: React Hook Form with Zod validation.
- **Charts**: Recharts for data visualization.

### Data Management (Frontend-Only with External APIs)
- **Architecture**: Pure client-side React application with real API integration.
- **External API Integration**: Generic API repository pattern for all external API calls, handling 400/401/403/404/422/500 status codes.
- **Data Storage**: localStorage for session management and authentication tokens.
- **Real API Integration**: Users API, Roles API, Entities/Branches API with proper authentication.
- **Pagination System**: Generic pagination utilities with configurable page sizes (5, 10, 20, 50, 100).
- **Server-Side Pagination**: All inventory management tables support server-side pagination with query parameters (PageNumber, PageSize, SortBy, IsAscending, SearchTerm). Frontend is ready to consume PaginationResponse structure from backend.
- **PaginationResponse Handling**: All inventory endpoints (Categories, Items, Suppliers, Stock, Low Stock, Purchase Orders, Wastage, Utility Expenses, Recipes) use defensive data extraction pattern: `Array.isArray(data) ? data : (data as any)?.items || []` to support both direct array responses and PaginationResponse<T> format with backward compatibility.

### Authentication & Authorization
- **Strategy**: Username/password authentication with role-based access.
- **Roles**: Manager, Waiter, Chef with distinct permissions.
- **Session Persistence**: localStorage for client-side session management.
- **Protected Routes**: Route-level protection with authentication checks.

### Core Features & Design
- **Unified Entity Management**: Supports both hotels and restaurants.
- **File Upload**: Image-only file upload for profile/certificate pictures (Base64 encoding, FormData for API).
- **Mobile Responsiveness**: Full responsive design across all components.
- **Comprehensive Management Systems**: Includes Orders, Menu (with CRUD, add-ons, customizations), Deals, Services, Tickets, User, Inventory (Categories, Suppliers, Items, Stock, Purchase Orders, Stock Wastage), and Expense Management (Utility Expenses).
- **Inventory Management Search**: All inventory tables include search functionality with search bars for filtering by name/relevant field. Search queries are sent as SearchTerm query parameter to the API.
- **User Management**: Add/Edit User modal with profile pictures, role, and branch assignment, with real API integration and name-only search filtering.
- **Dashboard Analytics**: Sales summary, item performance, occupancy, peak hours, customer feedback with date range toggles and 7 specialized categories.
- **Appearance Customization**: Gradient color picker for real-time UI previews.
- **Card Design**: Attractive entity and branch cards with gradient overlays, hover effects, and animated buttons.
- **Advanced MenuItem Management**: Enhanced Add/Edit MenuItem modal with API-based modifier section using SubMenuItems with multi-select functionality.

## External Dependencies

### UI and Styling
- **@radix-ui/react-***: UI primitives.
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: Type-safe variant API.
- **clsx**: Conditional CSS class utility.

### Data Management
- **@tanstack/react-query**: Server state management.
- **react-hook-form**: Form state management.
- **zod**: Runtime type validation.
- **date-fns**: Date manipulation.

### Development Tools
- **vite**: Build tool and development server.
- **typescript**: Static type checking.
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay.
- **@replit/vite-plugin-cartographer**: Development tooling integration.

### Charts and Visualization
- **recharts**: React charting library.

### Routing and Navigation
- **wouter**: Minimalist routing library.

### Environment Configuration
- **Configuration File**: `client/src/config/environment.ts`
- **Development API**: `https://5dtrtpzg-7261.inc1.devtunnels.ms`
- **QA API**: `https://restaurant-app-web-qa-001-eecdfsadcfgxevc9.centralindia-01.azurewebsites.net`
- **Environment Detection**: Automatic detection or explicit `VITE_API_BASE_URL`.
- **SignalR Integration**: Automatically derives SignalR hub URL (`${apiBaseUrl}/orderHub`).

### API Endpoints
- **Base URL**: Configured via environment detection.
- **Signup API**: `${apiBaseUrl}/api/User/restaurant-owner`
- **Entity API**: `${apiBaseUrl}/api/Entity`
- **MenuCategory API**: `${apiBaseUrl}/api/MenuCategory`
- **SubMenuItems API**: `${apiBaseUrl}/api/SubMenuItems`
- **Inventory Wastage API**: 
  - POST `${apiBaseUrl}/api/inventory/wastage` - Create wastage entry
  - GET `${apiBaseUrl}/api/inventory/wastage?branchId={id}&from={date}&to={date}` - Retrieve wastage records with date filtering

### Stock Wastage Feature
- **Location**: Inventory Management > Stock > Stock Wastage sub-tab
- **Functionality**: Track and record inventory wastage with reasons
- **Date Filters**: Default range is 3 months before to 1 day after current date
- **Components**:
  - Stock Wastage Modal: Form to add new wastage entries (item, quantity, reason)
  - Wastage Table: Displays historical wastage records with date, item name, quantity, and reason
  - Date Range Filters: From/To date inputs for filtering wastage records
- **Integration**: Real-time API integration with automatic cache invalidation on new entries

### Expense Management Feature
- **Location**: Inventory Management > Expense Management main tab
- **Functionality**: Track and manage utility expenses (Electric, Water, Gas, Internet, Phone, Other)
- **API Endpoints**:
  - POST `/api/facilityutilityrecords` - Create utility expense
  - GET `/api/facilityutilityrecords/branch/{branchId}` - Get all expenses for a branch
  - GET `/api/facilityutilityrecords/{id}` - Get single expense by ID
  - PUT `/api/facilityutilityrecords/{id}` - Update expense
  - DELETE `/api/facilityutilityrecords/{id}` - Delete expense
- **Components**:
  - Utility Expense Modal: Form to add new utility expenses with automatic total cost calculation
  - View/Edit Expense Modal: View expense details with inline editing capability
  - Expense Table: Displays all utility expenses with type, usage, costs, billing period, and status
- **Features**:
  - Automatic total cost calculation (usage × unit cost)
  - Active/Inactive status toggle
  - Billing period date range selection
  - Real-time data refresh after Add/Update/Delete operations
  - Full CRUD operations with proper cache invalidation