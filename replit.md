# Restaurant Management System

## Overview
This is a full-stack restaurant and hotel management application. Its main purpose is to provide comprehensive entity management functionality for both hotels and restaurants, including user management, analytics, and reporting through an intuitive dashboard. It supports multiple entities with role-based access control for managers, waiters, and chefs, aiming to streamline operations and enhance decision-making in the hospitality sector. Key capabilities include dynamic page routing, mobile responsiveness, subscription plan integration, comprehensive orders and menu management (including deals and services), ticket reporting, user management, and advanced analytics.

## Recent Changes
Last updated: October 2, 2025

### localStorage Consistency Fix - COMPLETE
- Fixed inconsistent localStorage usage across authentication and user management
- Consolidated user data storage to single source of truth: `STORAGE_KEYS.CURRENT_USER`
- Removed redundant individual field storage (auth_token, user_email, user_mobile, user_fullname, user_profile_picture, user_roles, user_role)
- Standardized token storage to access_token and refresh_token only (managed by ApiRepository)
- Fixed update-profile-modal to use consistent storage keys
- Eliminated data synchronization issues and improved maintainability

### Replit Environment Setup - COMPLETE (October 2, 2025)
- Successfully imported GitHub repository to Replit environment
- Frontend application is fully configured and running on port 5000 with webview output
- All npm dependencies installed and working properly (431 packages)
- Vite development server configured correctly:
  - Port 5000 with host 0.0.0.0 for Replit proxy compatibility
  - allowedHosts: true to bypass host header verification
  - Proper asset and component path aliases configured
- Workflow "Start application" configured with npm run dev
- Deployment configuration set up for autoscale target with build and serve commands
- External API integration working correctly with development tunnel endpoints
- Login page verified and displaying correctly in Replit webview

### Issues Reporting API Integration - COMPLETE
- Integrated real Issues Reporting API with proper pagination support
- Replaced mock data with live API endpoints using Generic API Repository pattern
- Added comprehensive view details modal with image/video attachment support
- Implemented proper pagination controls matching project standards
- Added API endpoints for GetIssuesReporting (paginated) and individual issue details
- Enhanced reporting page with real-time search, sorting, and pagination functionality
- Added loading states, error handling, and proper TypeScript typing
- Issues display includes ID, date, title, category, status, and severity information
- Details modal shows complete issue information including attachments and comments

### Import Configuration Details
- **Project Type**: Frontend-only React application
- **Build System**: Vite with TypeScript  
- **Port Configuration**: Frontend on port 5000 (webview output)
- **Host Configuration**: 0.0.0.0 to work with Replit proxy
- **API Integration**: External development API endpoints via tunnels
- **Deployment**: Configured for autoscale with npm build and serve

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
- **External API Integration**: Generic API repository pattern for all external API calls.
- **Data Storage**: localStorage for session management and authentication tokens.
- **Real API Integration**: Users API, Roles API, Entities/Branches API with proper authentication.
- **API Repository**: Centralized error handling, token management, and configurable endpoints, handling 400/401/403/404/422/500 status codes.
- **Pagination System**: Generic pagination utilities with configurable page sizes (5, 10, 20, 50, 100).
- **Server Removal**: All Node.js/Express server code, database dependencies (Drizzle ORM, PostgreSQL) have been removed.

### Authentication & Authorization
- **Strategy**: Username/password authentication with role-based access.
- **Roles**: Manager, Waiter, Chef with distinct permissions.
- **Session Persistence**: localStorage for client-side session management.
- **Protected Routes**: Route-level protection with authentication checks.

### Core Features & Design
- **Unified Entity Management**: Supports both hotels and restaurants, replacing previous restaurant-only system.
- **File Upload**: Image-only file upload for profile/certificate pictures (Base64 encoding, FormData for API).
- **Mobile Responsiveness**: Full responsive design across all components.
- **Comprehensive Management Systems**: Includes Orders, Menu (with CRUD, add-ons, customizations), Deals, Services, and Tickets.
- **User Management**: Comprehensive Add/Edit User modal with profile pictures, role, and branch assignment, real API integration.
- **Dashboard Analytics**: Sales summary, item performance, occupancy, peak hours, customer feedback with date range toggles and 7 specialized categories.
- **Appearance Customization**: Gradient color picker for real-time UI previews.
- **Enhanced Search**: Name-only search filter in user table with real-time API integration.
- **Card Design**: Attractive entity and branch cards with gradient overlays, hover effects, and animated buttons.
- **Generic Pagination**: Reusable pagination system with configurable page sizes and proper API integration.
- **Advanced MenuItem Management**: Enhanced Add/Edit MenuItem modal with API-based modifier section using SubMenuItems with multi-select functionality. Modifiers now use the required API format with `subMenuItemId` structure for all CRUD operations.

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
- **Configuration File**: `client/src/config/environment.ts` - Centralized environment management
- **Development API**: `https://5dtrtpzg-7261.inc1.devtunnels.ms` (used in Replit)
- **QA API**: `https://restaurant-app-web-qa-001-eecdfsadcfgxevc9.centralindia-01.azurewebsites.net`
- **Environment Detection**: Automatic detection based on hostname or explicit `VITE_API_BASE_URL` environment variable
- **SignalR Integration**: Automatically derives SignalR hub URL from API base URL (`${apiBaseUrl}/orderHub`)
- **Production Safety**: Includes validation warnings to prevent development URLs in production

### API Endpoints
- **Base URL**: Configured via environment detection (see Environment Configuration above)
- **Signup API**: `${apiBaseUrl}/api/User/restaurant-owner`
- **Entity API**: `${apiBaseUrl}/api/Entity`
- **MenuCategory API**: `${apiBaseUrl}/api/MenuCategory`
- **SubMenuItems API**: `${apiBaseUrl}/api/SubMenuItems`
  - GET `/api/SubMenuItems/branch/{branchId}/simple` - Fetch simple SubMenuItems for modifiers
  - PUT `/api/SubMenuItems/{id}` - Update SubMenuItem 
  - DELETE `/api/SubMenuItems/{id}` - Delete SubMenuItem