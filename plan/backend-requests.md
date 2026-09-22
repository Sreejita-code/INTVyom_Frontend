# Backend Requests — INTVyom_Backend

**From:** the frontend contract audit (`plan/api-contract-alignment.md`, Phase 1).
**Repo:** `../INTVyom_Backend`, HEAD `9aedf16`. All paths below are relative to its `src/`.
The frontend does not change backend code. Each item says what the frontend does until the
backend ships the change.

## 1. Security — the create-trunk response leaks SIP credentials

`POST /api/sip/create-outbound-trunk` returns the saved Mongo document, including
`trunk_config.username` and `trunk_config.password` (`api/routes/sip.routes.js:17-21`):

```js
res.status(201).json({
  message: 'Outbound trunk created successfully locally and externally',
  trunk
});
```

**Ask:** strip `trunk_config`, or return the same allow-list as in item 2, before responding.
**Frontend meanwhile:** never reads `trunk` from the create response, and re-lists instead.

## 2. Trunk list and details should return the non-secret config fields

The list endpoint uses `.select('-trunk_config')` (`sip/sip.service.js:56-58`). The details
endpoint uses `delete safeTrunk.trunk_config` (`sip/sip.service.js:80-81`). So `address`,
`numbers` and `exotel_number` never reach the client. Result:

- the Inbound "assign number" picker has no Exotel number to offer;
- the Phone Numbers page can't show a trunk's address or registered numbers.

**Ask:** return `trunk_config` with an **allow-list** pick: `address`, `numbers`,
`exotel_number` only. Do not use a deny-list, because `trunk_config` is an untyped `Mixed`
blob (`core/db/schemas/sip.model.js`) and any other key upstream stores would leak. Update
`tests/sip/read.test.js`.
**Frontend meanwhile:**
- lists every Exotel trunk and lets the user type the number;
- shows the config fields only when they are present.

## 3. Security — `GET /api/integration/get` returns the plaintext provider key

`api/routes/integration.routes.js:49`:
`api_key: result.api_key // Return the full key here`.

`POST /store` already masks it (`:27`, `api_key_preview: \`***${…slice(-4)}\``).

**Ask:** return `api_key_preview` (and no `api_key`) from `/get` too. The frontend has no use
for the full key.
**Frontend meanwhile:** masks the key client-side and never renders it in full. The key
still reaches the browser, and only this backend change removes it.

## 4. Validation suggestions are dropped on create and update

`assistant/assistant.service.js:70-71` attaches `error.suggestions`, but
`core/middleware/errorHandler.js:21` sends only
`err.payload || { error: err.message }`. The client never sees the suggestions.

**Ask:** include `suggestions` in the error body when present, e.g.
`{ error, suggestions }`.
**Frontend meanwhile:** calls `POST /api/assistant/validate` before saving. That endpoint
does return `data.suggestions` (`assistant.service.js:230`).

## 5. Call-logs for an unknown assistant return 500

`assistant/assistant.billing.js:95` throws `new Error('Assistant not found')` with no
status, so `errorHandler` answers 500.

**Ask:** use 404, as the other assistant routes do.

## 6. Swagger corrections (`intvyom-api-docs-local`)

These swagger entries disagree with the real responses. The upstream Vyom docs and the
passthrough handlers are the source of truth.

| Endpoint | Swagger says | Actually returned |
| :--- | :--- | :--- |
| `POST /api/web-call/get-token` | top-level `{room_token, room_name}` | upstream passthrough `{success, message, data: {room_name, token}}` |
| `GET /api/assistant/list` | items with `name`, `llm_mode` | `data.assistants[]` with `assistant_*` keys, and `data.pagination` |
| `GET /api/assistant/details/{id}` | bare record `name`, `prompt`, `llm_mode`, `end_call_webhook` | `data` with `assistant_*` keys |
| `POST /api/assistant/create` | — | local Mongo doc with bare keys (`name`, `llm_mode`, `external_assistant_id`); this differs from details and should be documented |
| `GET /api/integration/resync-status` | `job_id`, `status`, `created_at` | full job: `status`, `total`, `processed`, `succeeded`, `failed[{assistant_id, error}]`, `error`; `status` can be `interrupted` (`integration/integration.service.js:57-58`), which the schema enum does not list |
| Several `{id}` routes | path params rendered `undefined (undefined)` | unresolved `$ref`s in the swagger parameters |

**Ask:** correct these entries so the MCP docs server stops sending clients the wrong way.
Also document whether `GET /api/assistant/details/{id}` returns `assistant_end_call_webhook`.
Upstream's details doc does not list it, so the editor may not be able to show saved
tuning.
