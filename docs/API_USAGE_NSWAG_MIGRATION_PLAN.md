# API Usage Audit and NSwag Migration Strategy

Generated on: 2026-06-20

## Purpose

This document is the migration map for moving the React client from the current generic `ApiRepository`/helper-service pattern to NSwag-generated clients, while preserving existing behavior and carefully validating the backend identifier migration from `int` to `Guid`.

No runtime code is changed by this document. Use it as the working checklist before converting each page or modal.

## Current API Architecture

| Layer | File | Role | NSwag migration note |
|---|---|---|---|
| Endpoint constants | `client/src/lib/apiRepository.ts` | Defines `API_ENDPOINTS` and `defaultApiConfig.endpoints`. | Use as source-of-truth for endpoint parity checks against OpenAPI/Swagger operation names. |
| Generic transport | `client/src/lib/apiRepository.ts` | `ApiRepository.call(endpointKey, method, data, headers, auth, pathParams)` wraps `fetch`, token auth, JSON/FormData, refresh, and error handling. | Replace with generated clients plus one shared auth/error adapter. Do not lose FormData behavior. |
| Domain facades | `client/src/lib/apiRepository.ts` | Exports `userApi`, `branchApi`, `ordersApi`, `inventoryApi`, etc. | Migrate facade-by-facade, keeping component call sites stable at first. |
| Auth helper | `client/src/lib/queryClient.ts`, `client/src/services/userService.ts` | Login/signup/logout and query request helpers. | Validate generated auth user client returns same token shape. |
| Direct fetch exceptions | `client/src/pages/reporting.tsx`, `client/src/services/signalRService.ts` | A few calls bypass repository. | Convert after generated clients support query strings and authorized calls. |

## NSwag Generation Naming Requirements

The generated `api-client.ts` must use unique operation and DTO names so no method or type is overwritten during generation.

### Method naming rule

Every generated NSwag client method must follow this exact convention:

```text
{ControllerName}{MethodName}{HttpVerb}
```

Examples:

| Controller | Backend/API action or operation | HTTP verb | Required generated method name |
|---|---|---|---|
| `User` | `Login` | `POST` | `UserLoginPost` |
| `User` | `GetUserById` | `GET` | `UserGetUserByIdGet` |
| `Branch` | `CreateBranch` | `POST` | `BranchCreateBranchPost` |
| `Branch` | `UpdateBranchConfiguration` | `PUT` | `BranchUpdateBranchConfigurationPut` |
| `MenuItem` | `UpdateStockStatus` | `PATCH` | `MenuItemUpdateStockStatusPatch` |
| `Reservations` | `UpdateReservationAction` | `PATCH` | `ReservationsUpdateReservationActionPatch` |
| `Inventory` | `ReceivePurchaseOrder` | `POST` | `InventoryReceivePurchaseOrderPost` |

Migration adapters should map the current facade method names to these generated method names. For example, the existing `branchApi.getBranchById(id)` facade can call the generated `BranchGetBranchByIdGet(id)` method internally during migration, so page components do not need to change immediately.

### DTO naming rule

Generated DTO/interface names must also be unique. Prefer a DTO naming convention that includes the controller, operation, direction, and HTTP verb:

```text
{ControllerName}{MethodName}{Request|Response}{HttpVerb}Dto
```

Examples:

| Current purpose | Required unique DTO name example |
|---|---|
| Login request body | `UserLoginRequestPostDto` |
| Login response body | `UserLoginResponsePostDto` |
| Create branch request body | `BranchCreateBranchRequestPostDto` |
| Branch detail response | `BranchGetBranchByIdResponseGetDto` |
| Update menu item request body | `MenuItemUpdateMenuItemRequestPutDto` |
| Paged issue reporting response | `IssuesReportingGetIssuesReportingResponseGetDto` |

If the backend OpenAPI document uses duplicate schema names such as `Request`, `Response`, `Result`, `PagedResult`, `CreateDto`, or `UpdateDto`, configure NSwag or the OpenAPI operation/schema metadata so the generated DTO names remain distinct. Do not hand-edit generated names in `api-client.ts`; fix naming at the generation configuration or OpenAPI metadata layer.

## Guid Migration Confirmation Checklist

Before any NSwag code conversion, confirm these with backend/API owners:

1. **All route IDs now use `Guid` strings**, including `{id}`, `{branchId}`, `{entityId}`, `{orderId}`, `{locationId}`, `{userId}`, `{menuItemId}`, `{reservationId}`, `{purchaseOrderId}`, and inventory IDs.
2. **Swagger/OpenAPI schema reflects Guid format** as `type: string`, `format: uuid`; no generated client method should still accept `number` for an ID parameter.
3. **Response DTOs changed from numeric IDs to Guid strings** consistently in list, detail, lookup/simple, nested child objects, SignalR payloads, and pagination data.
4. **Frontend route params are strings**, not `parseInt`/`Number`, before calling generated methods.
5. **Local state, filters, selected IDs, maps, and form values use `string` for IDs**; remove numeric comparisons after page-by-page conversion.
6. **Temporary compatibility wrappers should be explicit** if the backend still returns mixed numeric and Guid IDs during rollout.

## Migration Strategy

### Phase 1 - Freeze and compare current behavior

- Keep existing `client/src/lib/apiRepository.ts` facades intact.
- Generate NSwag clients into a new isolated folder, for example `client/src/generated/nswag/`.
- Do not import generated clients directly into pages at first.
- Create thin adapter modules per domain (`userClientAdapter`, `branchClientAdapter`, etc.) that expose the same method names currently used by components.
- Add a parity checklist for every adapter method: current endpoint key, HTTP method, URL, request shape, response shape, auth requirement, error behavior, and FormData usage.

### Phase 2 - Convert domain facades one at a time

Recommended order:

1. Generic/auth lookups: roles, entities-and-branches, currencies, timezones, status types, allergens.
2. Entity and branch management.
3. Users and profile.
4. Location/table management.
5. Menu category, submenu, menu item, deals, discounts.
6. Orders and reservations.
7. Inventory categories, suppliers, items, stock, purchase orders, recipes, wastage, utility expenses.
8. Reporting, feedback, printer, SignalR special cases.

For each domain:

- Replace facade internals only; keep component imports and method names stable.
- Convert ID types to `string`/Guid at the facade boundary.
- Run TypeScript after each domain migration.
- Only then simplify component-level types and remove compatibility casting.

### Phase 3 - Component cleanup

- Replace page/modal imports from current facades with generated client adapters only when all methods in that domain are stable.
- Remove dynamic `apiRepository.updateEndpoint(...)` query-string mutations and use generated methods or explicit query params.
- Remove direct `fetch` calls in pages/services after generated clients cover the same endpoint.
- Remove legacy numeric ID types from `client/src/types/schema.ts` and local component interfaces.

## Page and Button/API Usage Audit

Legend:

- **Page/Component**: React file currently calling APIs directly or through a domain facade.
- **API calls**: Current facade method or repository endpoint key observed in source.
- **Trigger/source**: Where the call is used from the UI or component lifecycle.
- **NSwag priority**: Suggested migration order/risk.

### Pages

| Page | API calls currently used | Button/table/modal/pagination usage | NSwag migration notes |
|---|---|---|---|
| `client/src/pages/users.tsx` | `userApi.getUsers`, `userApi.deleteUser` | Page load/table refresh uses `getUsers`; **Add User** opens `AddUserModal`; table row delete action uses `deleteUser`. | Verify user `id` Guid in row actions and delete confirmation. |
| `client/src/pages/users-old.tsx` | `userApi.getUsers` | Page load and clear/filter actions; **Add User** opens modal. | Legacy page; decide whether to migrate or retire. |
| `client/src/pages/entities.tsx` | `apiRepository.call('getEntities')` | Page load; **Add Entity** / **Add Your First Entity** open add modal; card actions likely invoke edit/delete modals. | Replace direct repository call with entity facade/NSwag client. Entity IDs must be Guid strings. |
| `client/src/pages/branches.tsx` | `branchApi.getBranchesByEntity`, `branchApi.deleteBranch` | Page load based on entity route; **Add Branch** opens modal; branch card delete/table action uses `deleteBranch`; appearance navigation button. | Entity route param and branch IDs must be Guid. |
| `client/src/pages/orders.tsx` | `ordersApi.getOrdersByBranch`, `ordersApi.updateOrderStatus`, `ordersApi.getOrderStatusTypes`, `branchApi.getBranchById`, `locationApi.getLocationsByBranch`, `locationApi.deleteLocation`, `menuCategoryApi.getMenuCategoriesByBranch`, `subMenuItemApi.getSubMenuItemsByBranch`, `menuItemApi.getMenuItemsByBranch`, `apiRepository.call('getDealsByBranch')`, `discountsApi.getDiscountsByBranch`, `servicesApi.getBranchServices`, `subscriptionsApi.*`, delete calls for categories/submenus/items/deals/discounts/reservations | **Create Order** opens order modal; **Print** opens printer modal; order table row status action calls update status; order pagination calls page state/refetch; menu tab **Add Item/Add Category/Add SubMenu**, table row edit/delete/toggle-stock; tables tab **Add Table**, row **View QR Code/Edit/Delete**; reservation tab **Add Reservation**, row view/edit/delete; deals/discounts/subscription modal buttons; pagination for orders/menu/deals/reservations. | Highest-risk page. Convert after branch/location/menu/order facades are stable. Audit every ID in tab state and row actions. |
| `client/src/pages/chef.tsx` | `chefApi.getChefBranch`, `ordersApi.getOrdersByBranch`, `ordersApi.updateOrderStatus`, `ordersApi.getOrderStatusTypes`, `reservationApi.getReservationsByBranch`, `reservationApi.deleteReservation` | **Retry/Refresh** buttons refetch; order table row **View/Update Status**; pagination; **Add Reservation**; reservation row view/edit/delete; delete/status confirmation modal buttons. | Chef branch response currently typed `{ branchId: number }`; must become Guid string. |
| `client/src/pages/inventory-management.tsx` | `branchApi.getBranchById`, `inventoryApi.getInventoryCategories`, `getInventoryCategoriesSimple`, `deleteInventoryCategory`, `getInventorySuppliers`, `getInventorySupplierById`, `deleteInventorySupplier`, `getInventoryItemsByBranch`, `getInventoryItemById`, `deleteInventoryItem`, `getInventoryStockByBranch`, `getInventoryLowStockByBranch`, `getPurchaseOrdersByBranch`, `getInventoryWastageByBranch`, `getUtilityExpensesByBranch`, `deleteUtilityExpense`, `getRecipesByBranch`, `getRecipeById`, `deleteRecipe` | Tab load/refetch; **Add Category/Supplier/Item/Purchase Order/Wastage/Utility Expense/Recipe** open modals; row view/edit/delete/stock update/receive/cancel actions; many pagination buttons. | Convert inventory as its own phase; many IDs and nested line-item IDs require Guid validation. |
| `client/src/pages/reporting.tsx` | direct authorized `fetch` for paged issues, `apiRepository.call('getIssueReportingById')` | Page query/filter/pagination; **Add Ticket** opens modal; issue table row view opens detail dialog; **Try Again** buttons refetch. | Replace direct fetch with generated client method supporting query params. |
| `client/src/pages/feedbacks.tsx` | `genericApi.getEntitiesAndBranches`, dynamic `apiRepository.call('getVendorDashboardFeedbacks')` with query params | Page load/filter; pagination buttons. | Remove `updateEndpoint` mutation; generated client should expose explicit query params. |
| `client/src/pages/forgot-password.tsx` | `apiRepository.call('forgotPassword')` | Submit button sends email. | Auth/user client conversion; no Guid concerns. |
| `client/src/pages/printer.tsx` | `apiRepository.call('getOrderById')`, SignalR connect | Printer connect/disconnect/test/receipt actions; fetches order details for receipt. | Order ID must be Guid in route/path and SignalR payload. |
| `client/src/pages/restaurants.tsx` | `apiRequest('DELETE', '/api/restaurants/${id}')` | **Add Branch** opens modal; pagination; delete action. | Endpoint appears outside current `API_ENDPOINTS`; verify still valid or legacy before NSwag. |
| `client/src/pages/appearance.tsx` | `entityApi.getEntityPrimaryColor`, `entityApi.updateEntityPrimaryColor` | Preview mode buttons; save color action; branch navigation. | Entity ID must be Guid. |

### Modals and reusable components

| Component | API calls currently used | Button/table/modal trigger | NSwag migration notes |
|---|---|---|---|
| `client/src/components/add-user-modal.tsx` | `genericApi.getRoles`, `genericApi.getEntitiesAndBranches`, `userApi.createUser`, `userApi.getUserById`, `userApi.updateUser` | Modal open loads roles/entities; **Browse** selects image; submit creates/updates. | User/entity/branch selected IDs must be Guid strings; FormData upload behavior must be preserved. |
| `client/src/components/add-entity-modal-fixed.tsx` | `apiRepository.call('createEntity')` | File remove/choose buttons; cancel; submit. | Preserve multipart FormData. |
| `client/src/components/edit-entity-modal.tsx` | `apiRepository.call('updateEntity')` | Cancel; submit. | Path `id` Guid and FormData. |
| `client/src/components/edit-entity-modal-fixed.tsx` | `apiRepository.call('updateEntity')` | Choose file buttons; cancel; submit. | Path `id` Guid and FormData. |
| `client/src/components/delete-confirmation-modal.tsx` | `apiRepository.call('deleteEntity')` | Cancel/delete confirmation. | Entity ID Guid. |
| `client/src/components/add-branch-modal.tsx` | `branchApi.createBranch`, `branchApi.getBranchById`, `branchApi.updateBranch`, `genericApi.getCurrencies`, `genericApi.getTimezones` | Modal open for edit loads branch; upload logo/banner buttons; cancel/submit. | Branch/entity IDs Guid; preserve FormData/images. |
| `client/src/components/branch-config-modal.tsx` | `branchApi.getBranchConfiguration`, `branchApi.updateBranchConfiguration` | Modal open loads config; clear time buttons; cancel/submit. | Branch ID Guid. |
| `client/src/components/add-table-modal.tsx` | `locationApi.createLocation` | Submit **Create Table**. | Branch/location IDs Guid. |
| `client/src/components/edit-table-modal.tsx` | `locationApi.getLocationById`, `locationApi.updateLocation` | Modal open loads table; cancel/submit. | Location ID Guid. |
| `client/src/components/create-order-modal.tsx` | `apiRepository.call('getBranchById')`, `getBranchConfiguration`, `getLocationsByBranch`, `getCustomerSearchMenu`, `createOrder` | Modal open loads branch/config/tables/menu; **Add** menu/deal buttons; delivery/pickup save buttons; remove/quantity buttons; final **Create Order** submit; modifier modal add/cancel. | Very high risk: branch/location/menu/deal/modifier/order IDs must be Guid strings across cart state and payload. |
| `client/src/components/printer-modal.tsx` | `apiRepository.call('getOrderById')` | Printer action/disconnect buttons. | Order ID Guid. |
| `client/src/components/add-category-modal.tsx` | `apiRepository.call('createMenuCategory')`, `updateMenuCategory` | Submit/cancel in category modal. | Category and branch IDs Guid. |
| `client/src/components/add-submenu-modal.tsx` | `apiRepository.call('createSubMenu')`, `updateSubMenu` | Cancel/submit. | Submenu/category/branch IDs Guid. |
| `client/src/components/add-menu-modal.tsx` | `apiRepository.call('getAllergens')`, `getMenuItemById`, `menuItemCreate`, `updateMenuItem`, `menuCategoryApi.getMenuCategoriesSimpleByBranch`, `subMenuItemApi.getSimpleSubMenuItemsByBranch` | Modal open loads lookups/detail; navigation buttons to category/submenu tabs; image browse; modifier/customization/variant add/remove buttons; submit. | Preserve multipart; menu/category/submenu/allergen IDs Guid; verify nested customization IDs. |
| `client/src/components/view-menu-modal.tsx` | `apiRepository.call('getMenuItemById')`, `getMenuCategoriesByBranch`, `getSubMenusSimpleByBranch` | View modal open loads detail/lookups. | Read-only but ID types must match generated schemas. |
| `client/src/components/add-deals-modal.tsx` | `dealsApi.createDeal`, `dealsApi.getDealById`, `dealsApi.updateDeal`, `menuItemApi.getSimpleMenuItemsByBranch`, `subMenuItemApi.getSimpleSubMenuItemsByBranch` | Modal open loads detail/menu choices; navigation buttons; image upload; submit. | Deal/menu/submenu IDs Guid; preserve multipart if image is sent. |
| `client/src/components/view-deals-modal.tsx` | `dealsApi.getDealById` | View modal open. | Deal ID Guid. |
| `client/src/components/add-discount-modal.tsx` | `discountsApi.createDiscount`, `discountsApi.getDiscountById`, `discountsApi.updateDiscount` | Close button; submit. | Discount ID Guid. |
| `client/src/components/apply-discount-modal.tsx` | `discountsApi.getDiscountsSimpleByBranch`, `getDealsSimpleByBranch`, `getMenuItemsSimpleByBranch`, `applyBulkDiscountToDeals`, `applyBulkDiscountToMenu` | Modal open loads discounts/items; select-all; submit. | Selected item IDs and discount IDs Guid arrays. |
| `client/src/components/add-reservation-modal.tsx` | `locationApi.getLocationsByBranch`, `reservationApi.createReservation`, `reservationApi.updateReservation` | Modal open loads tables; cancel/submit. | Reservation/location/branch IDs Guid. |
| `client/src/components/view-reservation-modal.tsx` | `reservationApi.getReservationDetail`, `reservationApi.updateReservationAction`, `genericApi.getReservationStatusTypes` | Retry/close/status submit. | Reservation ID Guid; status type may remain numeric/enum unless backend changed. |
| `client/src/components/add-ticket-modal.tsx` | `genericApi.getBugSeverities`, `genericApi.getBugCategories`, `bugReportingApi.createBugReport` | Modal open loads lookups; browse attachment; submit. | Preserve FormData; no primary Guid risk except user/context fields. |
| `client/src/components/add-services-modal.tsx` | `servicesApi.getServicesByType`, `servicesApi.updateBranchServices` | Modal open loads services; service submit button. | Branch ID Guid; service IDs may be Guid or enum; verify OpenAPI. |
| `client/src/components/reset-password-modal.tsx` | `apiRepository.call('resetPassword')` | Cancel/submit. | Auth flow; no Guid. |
| `client/src/components/update-profile-modal.tsx` | `apiRepository.call('updateUserProfile')` | Browse profile picture; submit. | Preserve multipart. |
| `client/src/components/add-inventory-category-modal.tsx` | `inventoryApi.createInventoryCategory` | Cancel/submit. | Category/branch IDs Guid. |
| `client/src/components/add-inventory-supplier-modal.tsx` | `inventoryApi.createInventorySupplier`, `inventoryApi.updateInventorySupplier` | Cancel/submit. | Supplier/branch IDs Guid. |
| `client/src/components/add-inventory-item-modal.tsx` | `inventoryApi.createInventoryItem`, `inventoryApi.updateInventoryItem` | Cancel/submit. | Item/category/supplier/branch IDs Guid. |
| `client/src/components/stock-update-modal.tsx` | `inventoryApi.updateInventoryStock` | Cancel/submit. | Inventory item/branch IDs Guid. |
| `client/src/components/stock-wastage-modal.tsx` | `inventoryApi.createInventoryWastage` | Cancel/submit. | Item/branch IDs Guid. |
| `client/src/components/purchase-order-modal.tsx` | `inventoryApi.getInventorySuppliers`, `getInventoryItemsByBranch`, `createPurchaseOrder` | Modal open loads suppliers/items; **Add Item**, row remove; cancel/submit. | Supplier/item/branch IDs Guid; line items arrays. |
| `client/src/components/purchase-order-view-modal.tsx` | `inventoryApi.getPurchaseOrderById`, `receivePurchaseOrder`, `cancelPurchaseOrder` | Modal open loads details; receive form cancel/submit; close; cancel order; receive order. | Purchase order and line item IDs Guid. |
| `client/src/components/recipe-modal.tsx` | `branchApi.getBranchById`, `inventoryApi.getInventoryItemsSimpleByBranch`, `getMenuItemsSearch`, `createRecipe`, `updateRecipe` | Modal open loads branch/items/menu search; cancel/submit. | Recipe/menu item/inventory item/branch IDs Guid. |
| `client/src/components/utility-expense-modal.tsx` | `inventoryApi.createUtilityExpense` | Cancel/submit. | Branch ID Guid. |
| `client/src/components/view-utility-expense-modal.tsx` | `inventoryApi.updateUtilityExpense` | **Edit** enables edit mode; submit. | Utility expense ID Guid. |

### Non-visual services/hooks with API usage

| File | API usage | Migration note |
|---|---|---|
| `client/src/services/userService.ts` | `apiRepository.call('login')`, `apiRepository.call('signup')` | Keep token storage semantics identical. |
| `client/src/services/signalRService.ts` | Direct `fetch(${apiBaseUrl}/api/Order/${payload.orderId})` | Replace with generated order client or shared order detail adapter; `payload.orderId` must be Guid. |
| `client/src/hooks/useBranchCurrency.ts` | `branchApi.getBranchById` | Branch ID Guid; hook can remain facade-based. |
| `client/src/lib/queryClient.ts` | `authApi.login`, generic `apiRequest` | Avoid duplicating transport once generated clients own API calls. |
| `client/src/lib/apiHelpers.ts` | Generic wrappers over `apiRepository.call` | Likely retire after NSwag migration. |

## Endpoint Parity Matrix

Use this matrix to verify every generated NSwag operation exists and maps to the old route.

| Current endpoint key | HTTP usage | Current route |
|---|---|---|
| `login` | POST | `/api/User/login` |
| `signup` | POST | `/api/User/restaurant-owner` |
| `refreshToken` | POST | `/api/auth/refresh` |
| `forgotPassword` | POST | `/api/User/forgot-password` |
| `resetPassword` | POST | `/api/User/reset-password` |
| `getUsers` | GET | `/api/User/users` |
| `getUserById` | GET | `/api/User/user/{id}` |
| `createUser` | POST | `/api/User/user` |
| `updateUser` | PUT | `/api/User/user` |
| `deleteUser` | DELETE | `/api/User/user/{id}` |
| `getChefBranch` | GET | `/api/User/chef/branch` |
| `updateUserProfile` | PUT/PATCH | `/api/User/profile` |
| `getRoles` | GET | `/api/Generic/roles` |
| `getEntitiesAndBranches` | GET | `/api/Generic/entities-and-branches` |
| `getCurrencies` | GET | `/api/Generic/currencies` |
| `getTimezones` | GET | `/api/Generic/timezones` |
| `getOrderStatusTypes` | GET | `/api/Generic/orderstatustype` |
| `getReservationStatusTypes` | GET | `/api/Generic/reservationstatustype` |
| `getAllergens` | GET | `/api/Generic/allergens` |
| `getBugSeverities` | GET | `/api/Generic/bug-severities` |
| `getBugCategories` | GET | `/api/Generic/bug-categories` |
| `getEntities/createEntity` | GET/POST | `/api/Entity` |
| `getEntityById/updateEntity/deleteEntity` | GET/PUT/DELETE | `/api/Entity/{id}` |
| `getEntityPrimaryColor/updateEntityPrimaryColor` | GET/PUT | `/api/Entity/{id}/primary-color` |
| `getBranches/createBranch` | GET/POST | `/api/Branch` |
| `getBranchById/updateBranch/deleteBranch` | GET/PUT/DELETE | `/api/Branch/{id}` |
| `getBranchesByEntity` | GET | `/api/Branch/entity/{entityId}` |
| `getBranchConfiguration/updateBranchConfiguration` | GET/PUT | `/api/Branch/{id}/configuration` |
| `getLocations/createLocation` | GET/POST | `/api/Location` |
| `getLocationById/updateLocation/deleteLocation` | GET/PUT/DELETE | `/api/Location/{id}` |
| `getLocationsByBranch` | GET | `/api/Location/branch/{branchId}` |
| `getMenuItems/createMenuItem/menuItemCreate` | GET/POST | `/api/menu-items` and `/api/MenuItem` |
| `getMenuItemById/updateMenuItem/deleteMenuItem` | GET/PUT/DELETE | `/api/MenuItem/{id}` |
| `getMenuItemsByBranch` | GET | `/api/MenuItem/branch/{branchId}` |
| `getMenuItemsSimpleByBranch` | GET | `/api/MenuItem/branch/{branchId}/simple` |
| `updateMenuItemStockStatus` | PATCH/PUT | `/api/MenuItem/{id}/stock-status` |
| `getMenuCategories/createMenuCategory` | GET/POST | `/api/MenuCategory` |
| `getMenuCategoryById/updateMenuCategory/deleteMenuCategory` | GET/PUT/DELETE | `/api/MenuCategory/{id}` |
| `getMenuCategoriesByBranch` | GET | `/api/MenuCategory/branch/{branchId}` |
| `getMenuCategoriesSimpleByBranch` | GET | `/api/MenuCategory/branch/{branchId}/simple` |
| `getSubMenus/createSubMenu` | GET/POST | `/api/SubMenuItems` |
| `getSubMenuById/updateSubMenu/deleteSubMenu` | GET/PUT/DELETE | `/api/SubMenuItems/{id}` |
| `getSubMenusByBranch` | GET | `/api/SubMenuItems/branch/{branchId}` |
| `getSubMenusSimpleByBranch` | GET | `/api/SubMenuItems/branch/{branchId}/simple` |
| `getDeals/createDeal` | GET/POST | `/api/Deals` |
| `getDealById/updateDeal/deleteDeal` | GET/PUT/DELETE | `/api/Deals/{id}` |
| `getDealsByBranch` | GET | `/api/Deals/branch/{branchId}` |
| `getDealsSimpleByBranch` | GET | `/api/Deals/branch/{branchId}/simple` |
| `getDiscounts/createDiscount` | GET/POST | `/api/Discount` |
| `getDiscountById/updateDiscount/deleteDiscount` | GET/PUT/DELETE | `/api/Discount/{id}` |
| `getDiscountsByBranch` | GET | `/api/Discount/branch/{branchId}` |
| `getDiscountsSimpleByBranch` | GET | `/api/Discount/branch/{branchId}/simple` |
| `bulkDiscountDeals` | POST | `/api/Deals/bulk-discount` |
| `bulkDiscountMenu` | POST | `/api/MenuItem/bulk-discount` |
| `getOrders/createOrder` | GET/POST | `/api/orders` and `/api/order` |
| `getOrderById/updateOrder/deleteOrder` | GET/PUT/DELETE | `/api/orders/{id}` |
| `getOrdersByBranch` | GET | `/api/Order/ByBranch` |
| `updateOrderStatus` | PUT/PATCH | `/api/Order` |
| `getInventoryCategories/createInventoryCategory` | GET/POST | `/api/inventory/categories` |
| `getInventoryCategoriesSimple` | GET | `/api/inventory/categories/simple/{branchId}` |
| `deleteInventoryCategory` | DELETE | `/api/inventory/categories/{id}` |
| `getInventorySuppliers/createInventorySupplier` | GET/POST | `/api/inventory/suppliers` |
| `getInventorySupplierById/updateInventorySupplier/deleteInventorySupplier` | GET/PUT/DELETE | `/api/inventory/suppliers/{id}` |
| `getInventoryItems/createInventoryItem` | GET/POST | `/api/inventory/items` |
| `getInventoryItemsByBranch` | GET | `/api/inventory/items/branch/{branchId}` |
| `getInventoryItemsSimpleByBranch` | GET | `/api/inventory/items/branch/{branchId}/simple` |
| `getInventoryItemById/updateInventoryItem/deleteInventoryItem` | GET/PUT/DELETE | `/api/inventory/items/{id}` |
| `getInventoryStockByBranch` | GET | `/api/inventory/branch/{branchId}/stock` |
| `updateInventoryStock` | PUT/POST | `/api/inventory/branch/{branchId}/stock/update` |
| `getInventoryLowStockByBranch` | GET | `/api/inventory/branch/{branchId}/low-stock` |
| `createInventoryWastage` | POST | `/api/inventory/wastage` |
| `getInventoryWastageByBranch` | GET | `/api/inventory/wastage` |
| `createUtilityExpense` | POST | `/api/facilityutilityrecords` |
| `getUtilityExpensesByBranch` | GET | `/api/facilityutilityrecords/branch/{branchId}` |
| `getUtilityExpenseById/updateUtilityExpense/deleteUtilityExpense` | GET/PUT/DELETE | `/api/facilityutilityrecords/{id}` |
| `createPurchaseOrder` | POST | `/api/inventory/purchase-orders` |
| `getPurchaseOrdersByBranch` | GET | `/api/inventory/purchase-orders/branch/{branchId}` |
| `getPurchaseOrderById` | GET | `/api/inventory/purchase-orders/{id}` |
| `receivePurchaseOrder` | POST/PUT | `/api/inventory/purchase-orders/{id}/receive` |
| `cancelPurchaseOrder` | POST/PUT | `/api/inventory/purchase-orders/{id}/cancel` |
| `getRecipes/createRecipe` | GET/POST | `/api/inventory/recipes` |
| `getRecipeById/updateRecipe/deleteRecipe` | GET/PUT/DELETE | `/api/inventory/recipes/{id}` |
| `getMenuItemsSearch` | GET | `/api/MenuItem/search/{branchId}` |
| `getServicesByType` | GET | `/api/Generic/services/{entityType}` |
| `getBranchServices/updateBranchServices` | GET/PUT | `/api/BranchServices/{branchId}/services` |
| `getSubscriptionsByBranch` | GET | `/api/Subscriptions/subscriptionsByBranch` |
| `applySubscription` | POST | `/api/Subscriptions/apply` |
| `getCurrentSubscription` | GET | `/api/Subscriptions/current` |
| `calculateProratedAmount` | POST | `/api/Subscriptions/calculate-prorated-amount` |
| `changeSubscription` | POST | `/api/Subscriptions/change` |
| `cancelSubscription` | POST | `/api/Subscriptions/cancel` |
| `uploadPaymentProof` | POST | `/api/Subscriptions/upload-proof` |
| `getReservationsByBranch` | GET | `/api/Reservations/branch/{branchId}` |
| `getReservationById/updateReservation/deleteReservation` | GET/PUT/DELETE | `/api/Reservations/{id}` |
| `updateReservationAction` | PUT/PATCH | `/api/Reservations/{id}/action` |
| `createReservation` | POST | `/api/Reservations` |
| `getCustomerSearchMenu` | GET | `/api/customer-search/branch/{branchId}` |
| `getFeedbacks` | GET | `/api/feedbacks` |
| `getVendorDashboardFeedbacks` | GET | `/api/VendorDashboard/feedbacks` |
| `getTickets` | GET | `/api/tickets` |
| `getIssuesReporting/createIssueReport` | GET/POST | `/api/IssuesReporting` |
| `getIssueReportingById` | GET | `/api/IssuesReporting/{id}` |
| `getIssuesReportingPaged` | GET | `/api/IssuesReporting/GetIssuesReporting` |

## Known Risk Areas Before Implementing

1. **Dynamic endpoint mutation**: several methods mutate endpoint URLs to append query strings. Generated clients should remove this pattern.
2. **Mixed route casing**: routes include `/api/order`, `/api/orders`, and `/api/Order`; confirm OpenAPI names and backend casing before assuming one generated client.
3. **FormData uploads**: entity, branch, menu item, deal, ticket, user/profile, subscription proof uploads must keep browser-generated multipart boundaries.
4. **Token refresh and SignalR auth**: generated clients need the same bearer token and refresh behavior as `ApiRepository`.
5. **Pagination response shape**: preserve current page/total pages/total count handling for orders, inventory, feedbacks, reporting, tables, reservations, deals, etc.
6. **Guid conversion**: TypeScript will catch only typed places. Search for `parseInt`, `Number(...)`, numeric comparisons, and `id: number` interfaces during each domain phase.

## Pre-implementation Questions to Confirm

- Should generated NSwag clients be committed into `client/src/generated/nswag/`, or generated during build/CI only?
- Which OpenAPI document URL/file should be used for generation per environment?
- Are all IDs now Guid, or are lookup/status/service IDs still numeric enums?
- Should page/components continue importing domain facades during migration, or should final code import generated clients directly?
- Can backend Swagger operation IDs/schema names be updated so NSwag naturally generates `{ControllerName}{MethodName}{HttpVerb}` methods and unique `{ControllerName}{MethodName}{Request|Response}{HttpVerb}Dto` DTOs?
