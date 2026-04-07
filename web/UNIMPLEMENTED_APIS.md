# Frontend API Status

Last Updated: April 7, 2026
Purpose: Keep the frontend runtime modes honest by separating implemented backend routes from mock-only UI modules.

## Runtime Modes

1. `VITE_AUTH_MODE=mock`
- Local sign-in is handled entirely in the frontend.
- Recommended for local development.

2. `VITE_DATA_MODE=api`
- Use real backend routes where they exist.
- Some UI modules remain unavailable in this mode.

3. `VITE_DATA_MODE=mock`
- Uses seeded browser storage so the entire dashboard remains navigable.

## Implemented Backend Routes Used By The Frontend

1. `GET /v1/tenants`
2. `POST /v1/tenants`
3. `GET /v1/tenants/:id`
4. `PUT /v1/tenants/:id`
5. `DELETE /v1/tenants/:id`
6. `GET /v1/tenants/:tenantId/calls`
7. `GET /v1/tenants/:tenantId/calls/:callId`
8. `PUT /v1/tenants/:tenantId/calls/:callId`
9. `POST /v1/tenants/:tenantId/calls/outbound`
10. `GET /v1/tenants/:tenantId/callers`
11. `GET /v1/tenants/:tenantId/callers/:callerId`
12. `PUT /v1/tenants/:tenantId/callers/:callerId`
13. `POST /v1/tenants/:tenantId/callers/:callerId/save`
14. `POST /v1/tenants/:tenantId/callers/:callerId/unsave`
15. `DELETE /v1/tenants/:tenantId/callers/:callerId`
16. `GET /v1/tenants/:tenantId/agent-config`
17. `POST /v1/tenants/:tenantId/agent-config`
18. `PUT /v1/tenants/:tenantId/agent-config`
19. `DELETE /v1/tenants/:tenantId/agent-config`
20. `GET /v1/tenants/:tenantId/phone-numbers`
21. `POST /v1/tenants/:tenantId/phone-numbers`
22. `GET /v1/tenants/:tenantId/phone-numbers/:phoneNumberId`
23. `PUT /v1/tenants/:tenantId/phone-numbers/:phoneNumberId`
24. `DELETE /v1/tenants/:tenantId/phone-numbers/:phoneNumberId`
25. `GET /v1/tenants/:tenantId/knowledge`
26. `GET /v1/tenants/:tenantId/knowledge/search`
27. `GET /v1/tenants/:tenantId/knowledge/context`
28. `GET /v1/tenants/:tenantId/knowledge/:knowledgeId`
29. `POST /v1/tenants/:tenantId/knowledge`
30. `PUT /v1/tenants/:tenantId/knowledge/:knowledgeId`
31. `DELETE /v1/tenants/:tenantId/knowledge/:knowledgeId`
32. `GET /v1/tenants/:tenantId/users`
33. `POST /v1/tenants/:tenantId/users`
34. `GET /v1/tenants/:tenantId/users/:userId`
35. `PUT /v1/tenants/:tenantId/users/:userId`
36. `DELETE /v1/tenants/:tenantId/users/:userId`
37. `GET /v1/auth/me`

## Mock-Only UI Modules Today

These screens remain frontend-only when `VITE_DATA_MODE=mock`:

1. tenant analytics/dashboard aggregates not backed by `/analytics`
2. bookings/orders queue
3. omnichannel inbox/conversations
4. omnichannel channels
5. omnichannel automations
6. super-admin analytics

## Backend Gaps Still Worth Closing

1. admin-scoped tenant routes such as `/v1/admin/tenants`
2. tenant analytics summary route
3. bookings/orders CRUD routes
4. omnichannel conversation/channel/automation routes
5. invitation workflow routes for team onboarding
6. richer `GET /v1/auth/me` payload once Clerk-backed frontend auth is enabled

## Response Contract

Current backend already mostly follows:

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

Errors are not fully standardized yet across all modules. New routes should use:

```json
{
  "success": false,
  "message": "Readable error message",
  "errors": []
}
```
