# AI Voice Platform Frontend - MVP Implementation Plan

Last Updated: February 25, 2026
Scope: Frontend-only work inside `web/`.
Constraint: Do not modify backend code.

## 1) Product Roles

1. Super Admin (You only)
- Platform-level control across all tenants.
- Can create/edit/suspend tenants and monitor platform health.

2. Client Admin (Per tenant)
- Manages tenant configuration, calls, callers, and team.

3. Client Sub-Admin (Per tenant)
- 2-3 users typically.
- Can operate day-to-day workflows with restricted permissions.

## 2) MVP Feature Set (Only Necessary Features)

### A) Super Admin Panel
Routes:
- `/super-admin/dashboard`
- `/super-admin/tenants`
- `/super-admin/tenants/:tenantId`

Must-have features:
- Tenant list with search/filter/status.
- Create tenant.
- Update tenant plan/status.
- Basic platform stats cards (tenants, active, suspended, trial).

### B) Client Admin/Sub-Admin Panel
Routes:
- `/tenant/:tenantId/dashboard`
- `/tenant/:tenantId/calls`
- `/tenant/:tenantId/calls/:callId`
- `/tenant/:tenantId/callers`
- `/tenant/:tenantId/callers/:callerId`
- `/tenant/:tenantId/config/agent`
- `/tenant/:tenantId/config/phone-numbers`
- `/tenant/:tenantId/config/knowledge`
- `/tenant/:tenantId/team`

Must-have features:
- Calls list + filters + detail (transcript/extractions).
- Callers list + save/unsave + detail.
- Agent config management.
- Phone number CRUD.
- Knowledge base CRUD.
- Team member list/add/update/remove.

### C) Role Permissions (Frontend UX Gate)
- `OWNER` / Client Admin: full tenant access.
- `ADMIN` / Sub-Admin: operational access, limited critical settings.
- `MEMBER` (if used): read-only or constrained edit actions.

## 3) Implementation Phases

## Phase 0 - Foundation Cleanup
- Remove demo routes/pages from template (`tasks/apps/chats/demo auth/demo users`).
- Restructure route tree for `super-admin` and `tenant` modules.
- Normalize API client and query patterns.
- Add tenant context + role-based nav rendering.

## Phase 1 - Super Admin MVP
- Build tenants table + search/filter.
- Build create tenant flow.
- Build tenant detail/edit page.
- Build dashboard cards with available platform metrics.

## Phase 2 - Core Call Operations
- Build tenant dashboard summary.
- Build calls list/detail screens.
- Build callers list/detail with save/unsave.

## Phase 3 - Tenant Configuration
- Agent config screen.
- Phone numbers management screen.
- Knowledge base management screen.

## Phase 4 - Team Management + Hardening
- Team members CRUD screen.
- Permission-based action gating in UI.
- Loading/empty/error states.
- Basic smoke testing and UX polish.

## 4) Non-Goals (For MVP)
- No realtime/live call monitoring.
- No billing/usage metering UI.
- No advanced waveform/audio sync.
- No complex analytics drill-down.

## 5) API Dependency Handling
- Frontend will be developed from core business flows first.
- Missing APIs required for MVP are documented separately in:
- `web/UNIMPLEMENTED_APIS.md`

## 6) Definition of Done
- Super admin and tenant panels usable end-to-end for core workflows.
- Client admin can add 2-3 sub-admins and manage operations.
- All pages have basic loading/error/empty states.
- No backend files changed; only `web/` updates.
