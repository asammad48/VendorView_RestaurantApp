You are working in the repository at:

/workspace/VendorView_RestaurantApp

Context:
This is a React + TypeScript + Vite single-page application using Wouter for routing. Before touching the large Generic API Repository cleanup, we need to fix immediate UX/navigation issues first.

Primary goal:
Fix page refresh / full reload behavior, pagination styling inconsistencies, table styling inconsistencies, and obvious design inconsistencies. Do NOT start the apiGenericRepository/apiRepository refactor yet.

Very important design requirement:
Pagination style and table style should match the Order screen in the restaurant-management page.

Reference screen:
- Route: /restaurant-management
- File: client/src/pages/orders.tsx
- Use the Orders section/table/pagination styling from this page as the visual standard.
- Any page/table/pagination touched in this task should align with that style as closely as practical.
- Do not invent a new pagination/table design.
- Do not redesign the whole app; just standardize inconsistent tables/pagination to match the Order screen style.

Important:
- This is a SPA. Internal navigation must not cause full browser reloads.
- Avoid `window.location.href` and `window.location.reload()` for internal app navigation.
- Use Wouter navigation (`useLocation`) or component state/props.
- Where values are currently being read from URL query params only because a page refresh happens, stop relying on URL-driven page refresh behavior. Prefer passing state between components/pages where practical.
- Keep changes focused and incremental.
- Do not do the Generic API Repository cleanup in this task.

Known issues to investigate and fix:

1. Login page hard refresh
   File:
   - client/src/pages/login.tsx

   Current issue:
   - Login success uses `window.location.href = "/dashboard"` which reloads the whole app.

   Required fix:
   - Replace it with Wouter SPA navigation.
   - Use `const [, navigate] = useLocation();`
   - After successful login, call `navigate("/dashboard")` or equivalent Wouter navigation.
   - Ensure login still works and the auth state updates correctly.

2. Entities page hard refresh
   File:
   - client/src/pages/entities.tsx

   Current issue:
   - `handleManage` uses:
     `window.location.href = /branches?entityId=...&entityType=...`
   - This causes a full reload.

   Required fix:
   - Replace with Wouter navigation.
   - Prefer passing selected entity state/component data instead of depending only on URL query params where practical.
   - If URL query params are still needed for deep-link compatibility, do not use `window.location.href`; use Wouter navigation.
   - Make sure clicking Manage on an entity opens the correct branches/management flow without a full page refresh.

3. API auth failure hard redirect
   File:
   - client/src/lib/apiRepository.ts

   Current issue:
   - `handleAuthenticationFailure` uses `window.location.href = "/login"`.

   Required fix for this task:
   - Keep this change minimal.
   - Avoid a full reload if possible.
   - If direct Wouter navigation is not cleanly available in this low-level API file, introduce a small app-level/session navigation mechanism or dispatch an auth/session-expired event that the app/auth layer can handle.
   - Do not refactor the whole API repository yet.
   - Preserve existing behavior: tokens are cleared, user storage is cleared, and the user ends up at login.

4. Inventory Management invalid route and hash link
   File:
   - client/src/pages/inventory-management.tsx

   Current issues:
   - There is a link with `href="#"` used only to switch tabs. This can cause scroll/hash behavior and feel like a refresh.
   - There is a link to `/branch-management`, but the app routes define `/restaurant-management` and `/hotel-management`, not `/branch-management`.

   Required fix:
   - Replace `href="#"` tab-switching link with a button using `type="button"` and `onClick`.
   - Replace `/branch-management` with the correct SPA route, likely `/restaurant-management`.
   - Preserve any required entity/branch context. Prefer passing state/component data if possible. If query params remain necessary, use Wouter navigation rather than hard reload.

5. Chef retry hard reload
   File:
   - client/src/pages/chef.tsx

   Current issue:
   - Retry button uses `window.location.reload()`.

   Required fix:
   - Replace with React Query `refetch` behavior or existing local refetch functions.
   - Do not reload the full page.
   - Preserve the visible Retry behavior.

6. Shared Button default behavior
   File:
   - client/src/components/ui/button.tsx

   Current issue:
   - The shared Button component renders a native `<button>` but does not default to `type="button"`.
   - In HTML, buttons inside forms default to submit. This can cause accidental form submits and refresh-like behavior.

   Required fix:
   - Update the Button component to default to `type="button"` when rendering a native button.
   - Preserve explicit submit buttons by allowing `type="submit"` to override the default.
   - Be careful with `asChild`: do not pass invalid button props to non-button children.
   - After this change, review obvious form submit buttons and make sure actual submit actions still explicitly use `type="submit"`.

7. Pagination styling consistency
   Areas to inspect:
   - client/src/components/ui/pagination.tsx
   - client/src/pages/orders.tsx
   - client/src/pages/inventory-management.tsx
   - client/src/pages/reporting.tsx
   - client/src/pages/users.tsx
   - client/src/pages/feedbacks.tsx
   - client/src/pages/chef.tsx

   Current issue:
   - Pagination appears implemented manually in multiple pages with inconsistent styling and behavior.
   - Some pagination may use raw anchors or inconsistent button variants.

   Required fix:
   - Standardize pagination UI styling to match the Order screen in /restaurant-management.
   - Use the pagination style already present in client/src/pages/orders.tsx as the reference.
   - Prefer buttons for state-based pagination, not raw anchors.
   - Ensure pagination controls do not cause page refresh.
   - Keep disabled states, active page state, spacing, and hover styles consistent with the Order screen.
   - If using the shared pagination component, ensure it visually matches the Order screen and does not cause full page reloads for internal pagination.

8. Table styling consistency
   Areas to inspect:
   - client/src/pages/orders.tsx
   - client/src/pages/inventory-management.tsx
   - client/src/pages/reporting.tsx
   - client/src/pages/users.tsx
   - client/src/pages/feedbacks.tsx
   - client/src/pages/chef.tsx
   - Other pages with visible data tables if directly related to this issue

   Current issue:
   - Tables across pages have inconsistent layout, spacing, borders, header style, empty states, row hover behavior, and action-button styling.

   Required fix:
   - Use the Order screen table styling from /restaurant-management as the standard.
   - Align table wrappers, border radius, header background, text sizes, row spacing, hover states, and action button styles with the Order screen.
   - Do not change business logic while standardizing the UI.
   - Do not redesign unrelated cards/modals.
   - Keep the changes focused on tables and pagination.

9. Design consistency pass
   Scope:
   - Only fix obvious inconsistencies directly related to navigation buttons, pagination controls, table controls, and page transition UX.
   - Do not redesign the whole app.
   - Keep colors, spacing, variants, and button states consistent with the existing green/white dashboard style and the Order screen table/pagination pattern.
   - Avoid broad unrelated visual rewrites.

Specific technical expectations:
- Search for and remove/replace internal uses of:
  - `window.location.href`
  - `window.location.reload`
  - `href="#"`
  - invalid internal route `/branch-management`
- Do not remove external links that should open files/downloads, such as attachment links.
- For internal routes, use Wouter `Link` or `useLocation` navigation.
- For tab/state changes, use buttons, not links.
- For form helper/cancel/toggle buttons, use `type="button"`.
- For actual form submits, keep or add `type="submit"`.
- For tables and pagination, visually match the Orders screen in `client/src/pages/orders.tsx`.

Testing/checks to run:
- `npm run check`
- `npm run build`

Manual behavior to verify:
- Login redirects to dashboard without a full page reload.
- Entity Manage opens the correct branch/management page without a full page reload.
- Inventory “Go to Inventory Items” switches tabs without URL hash jump or reload.
- Inventory “Go to Branch Management” goes to the correct existing SPA route.
- Chef Retry refetches data without reloading the browser.
- Pagination controls do not reload the page.
- Pagination styling matches the Order screen in /restaurant-management.
- Table styling matches the Order screen in /restaurant-management.
- Forms still submit correctly where intended.

Do not do:
- Do not start the Generic API Repository cleanup.
- Do not split apiRepository.ts in this task.
- Do not change API endpoint definitions unless required for the navigation issue.
- Do not perform a broad redesign.
- Do not introduce a new routing library.
- Do not invent a new table or pagination design; use the Order screen as the standard.

Deliverables:
1. Code changes for the SPA refresh/navigation fixes.
2. Pagination styling consistency fixes matching the Order screen.
3. Table styling consistency fixes matching the Order screen.
4. Minimal design consistency improvements related to these controls.
5. A short summary of changed files.
6. Test results for `npm run check` and `npm run build`.