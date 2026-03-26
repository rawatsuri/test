# Unimplemented APIs Required for Core Business MVP

Last Updated: February 25, 2026
Purpose: API contracts needed by frontend MVP but not yet available (or not finalized).
Scope: Documentation only. No backend file changes.

## 1) Super Admin APIs (Platform-Level)

1. List tenants (admin scope)
- `GET /v1/admin/tenants?page=&limit=&search=&status=&plan=&industry=`

2. Get tenant detail (admin scope)
- `GET /v1/admin/tenants/:tenantId`

3. Create tenant
- `POST /v1/admin/tenants`

4. Update tenant
- `PUT /v1/admin/tenants/:tenantId`

5. Update tenant status
- `PUT /v1/admin/tenants/:tenantId/status`
- Body: `{ status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' }`

6. Update tenant plan
- `PUT /v1/admin/tenants/:tenantId/plan`
- Body: `{ plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE' }`

7. Platform dashboard stats
- `GET /v1/admin/analytics?period=last_30_days`

## 2) Tenant Dashboard APIs

1. Tenant analytics summary
- `GET /v1/tenants/:tenantId/analytics?period=last_30_days`
- Returns: totalCalls, avgDuration, totalCallers, activePhoneNumbers, callsTrend, callsByStatus

## 3) Calls APIs (Enhancements)

1. Call recording retrieval
- `GET /v1/tenants/:tenantId/calls/:callId/recording`
- Returns downloadable/streamable URL

2. Call transcript endpoint (if not embedded in call detail)
- `GET /v1/tenants/:tenantId/calls/:callId/transcripts`

3. Call extractions endpoint (if not embedded in call detail)
- `GET /v1/tenants/:tenantId/calls/:callId/extractions`

## 4) Team/Sub-Admin APIs (Tenant Scope)

1. Invite sub-admin (optional but recommended)
- `POST /v1/tenants/:tenantId/users/invite`
- Body: `{ email, role }`

2. List pending invites
- `GET /v1/tenants/:tenantId/users/invites`

3. Revoke pending invite
- `DELETE /v1/tenants/:tenantId/users/invites/:inviteId`

## 5) Auth/Identity APIs

1. Current user profile with platform role + tenant roles
- `GET /v1/auth/me`
- Must include enough role data to drive nav and permissions in UI.

## 6) Response Contract Standardization (Needed for Frontend Stability)

Recommended unified envelope for all endpoints:
- Success:
```json
{
  "success": true,
  "data": {},
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

- Error:
```json
{
  "success": false,
  "message": "Readable error message",
  "errors": []
}
```

## 7) Priority for Core MVP

P0 (must have):
1. `/v1/admin/tenants` (list/create/update)
2. `/v1/admin/tenants/:tenantId/status`
3. `/v1/tenants/:tenantId/analytics`
4. `/v1/auth/me` role payload

P1 (should have):
1. call recording endpoint
2. invite workflow endpoints

P2 (optional for next release):
1. dedicated transcript/extraction endpoints (if call detail already embeds them)

## 8) Bookings / Orders APIs (New Frontend Module)

1. List booking/order queue
- `GET /v1/tenants/:tenantId/bookings-orders?page=&limit=&type=&status=&search=`

2. Update booking/order status
- `PUT /v1/tenants/:tenantId/bookings-orders/:id`
- Body example: `{ status: 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' }`

3. Get booking/order detail (optional)
- `GET /v1/tenants/:tenantId/bookings-orders/:id`
