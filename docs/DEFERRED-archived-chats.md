# DEFERRED: Archived Chats

**Status:** Deferred (to be implemented later)

## Requirements

1. **Add a folder: Archived Chats**
   - In the chat list UI, show a section or folder **Archived Chats** (in addition to existing lists e.g. Their Plans, My Plans, Groups).

2. **When to archive**
   - After **2 days** of **event completion**, move that event’s chat into Archived Chats.
   - Event completion = event end date (or last date of the event) has passed.
   - Archive rule: `event_end_date + 2 days` → chat becomes archived.

3. **When to unarchive**
   - When **someone sends a new message** in that group, move the chat back out of Archived Chats (e.g. back to the appropriate list like My Plans / Their Plans / Groups).

## Implementation notes (for when you implement)

- **Backend**
  - Store `archived_at` (timestamp or boolean) per group, or derive “archived” from event end date + 2 days.
  - In `GET /chat/lists` (or equivalent), include an `archived` flag or a separate list `archived_groups` / `archived_chats`.
  - When archiving: either a cron job that marks groups as archived when `event_end_date + 2 days < now`, or compute archived status when returning the list.
  - When a new message is sent in a group (`POST /chat/send`): clear archived state for that group so it appears in the main list again.

- **Frontend**
  - Chat list screen: add an **Archived Chats** section. Only show it when there is at least one archived chat (optional).
  - List archived groups from the API (same shape as other chats, with `archived: true` or from a dedicated `archived` array).
  - Tapping an archived chat opens the same group chat screen; when the user (or anyone) sends a message, the backend should unarchive so the next time the list is fetched it appears in the main list again.

- **Data model**
  - Option A: Add `archived_at: Date | null` on the group (or on a join table). `null` = not archived; set when archiving; clear when a message is sent.
  - Option B: Derive archived from `plan.end_date` (or event end date): if `end_date + 2 days < now` and no message after that, consider archived. Unarchive when a new message is sent (no extra field needed, but logic is in “list” and “send” endpoints).

- **Event end date**
  - Ensure event/plan has an end date or last date (e.g. `plan.date` for single-day, or `plan.end_date` / last occurrence for multi-day). Use that for “event completion”.
