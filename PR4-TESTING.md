# PR4: Smoke Testing Checklist

## Pre-Testing Setup

```bash
# 1. Start from clean state
git checkout pr4-ui-mvp
npm install

# 2. Setup database
npm run db:push
npm run db:seed

# 3. Start dev server
npm run dev

# 4. Open browser
open http://localhost:3000
```

---

## 1. Authentication Flow ✅

### Login (OTP)
- [ ] Navigate to http://localhost:3000
- [ ] Redirects to `/login`
- [ ] Enter email: `owner@innovationportal.com`
- [ ] Click "Send Login Code"
- [ ] Check console for OTP code (development mode)
- [ ] Enter OTP code
- [ ] Click "Verify Code"
- [ ] **Expected**: Redirect to `/dashboard` (owner has profile complete)

### Invalid OTP
- [ ] Request OTP again
- [ ] Enter invalid code (e.g., 000000)
- [ ] Click "Verify Code"
- [ ] **Expected**: ErrorBanner shows "Invalid OTP code"
- [ ] **Expected**: "2 attempts remaining" displayed

### Rate Limiting
- [ ] Request OTP 4 times in a row
- [ ] **Expected**: 4th attempt shows orange ErrorBanner
- [ ] **Expected**: "Too many requests" message
- [ ] **Expected**: `resetAt` timestamp shown

### Logout
- [ ] Click "Logout" button in nav
- [ ] **Expected**: Redirect to `/login`
- [ ] **Expected**: Session cookie cleared
- [ ] Try accessing `/dashboard` directly
- [ ] **Expected**: Redirect to `/login`

---

## 2. Profile Setup Flow ✅

### First-Time User
- [ ] Create new user in database with `profileCompleted: false`
- [ ] Login with new user's email
- [ ] **Expected**: Redirect to `/setup/profile`
- [ ] Enter name (min 2 chars)
- [ ] Click "Continue"
- [ ] **Expected**: Redirect to `/dashboard`
- [ ] **Expected**: Name displayed in nav

### Already Complete
- [ ] Login with user who has `profileCompleted: true`
- [ ] **Expected**: Skip profile setup, go to `/dashboard`

---

## 3. Dashboard ✅

### Counters
- [ ] Login as user with submissions
- [ ] View dashboard
- [ ] **Expected**: "Total Submissions" shows correct count
- [ ] **Expected**: "Under Review" shows correct filtered count
- [ ] **Expected**: "Need Info" shows correct filtered count
- [ ] **Expected**: "Approved" shows correct filtered count

### Latest Submissions
- [ ] Check "Latest Submissions" section
- [ ] **Expected**: Shows max 5 submissions
- [ ] **Expected**: Each has StatusChip component (NOT plain text)
- [ ] **Expected**: StatusChip colors are semantic (green, yellow, orange, red, blue)
- [ ] **Expected**: Sorted by newest first
- [ ] Click on a submission
- [ ] **Expected**: Navigate to `/ideas/[id]`

### No Submissions
- [ ] Login as user with no submissions
- [ ] **Expected**: "No submissions yet" message
- [ ] **Expected**: "Submit Your First Idea" button
- [ ] Click button
- [ ] **Expected**: Navigate to `/ideas/new`

---

## 4. Ideas List (/ideas) ✅

### Display
- [ ] Click "My Ideas" in nav
- [ ] **Expected**: List of all user's submissions
- [ ] **Expected**: Each card shows:
  - Title
  - Description (2 lines max)
  - StatusChip (NOT plain text)
  - Priority (if set)
  - Category (if set)
  - Created date
- [ ] **Expected**: StatusChip uses semantic colors

### Search Filter
- [ ] Enter search term in search box
- [ ] **Expected**: List filters to matching titles/descriptions
- [ ] **Expected**: Shows "Showing X of Y submissions"
- [ ] Clear search
- [ ] **Expected**: All submissions shown again

### Status Filter
- [ ] Select a status from dropdown
- [ ] **Expected**: List filters to that status only
- [ ] **Expected**: Shows "Showing X of Y submissions"
- [ ] Select "All Statuses"
- [ ] **Expected**: All submissions shown

### Combined Filters
- [ ] Enter search term AND select status
- [ ] **Expected**: Both filters applied (AND logic)
- [ ] **Expected**: Count shows filtered results

### Navigation
- [ ] Click on a submission card
- [ ] **Expected**: Navigate to `/ideas/[id]`
- [ ] Click "New Idea" button
- [ ] **Expected**: Navigate to `/ideas/new`

---

## 5. StatusChip Component ✅

### Visual Verification
For each status, verify:

#### SUBMITTED (Blue)
- [ ] Background: light blue (`bg-blue-50`)
- [ ] Text: dark blue (`text-blue-700`)
- [ ] Border: blue (`border-blue-200`)
- [ ] Label: "Submitted"

#### UNDER_REVIEW (Orange)
- [ ] Background: light orange (`bg-orange-50`)
- [ ] Text: dark orange (`text-orange-700`)
- [ ] Border: orange (`border-orange-200`)
- [ ] Label: "Under Review"

#### NEED_INFO (Yellow)
- [ ] Background: light yellow (`bg-yellow-50`)
- [ ] Text: dark yellow (`text-yellow-700`)
- [ ] Border: yellow (`border-yellow-200`)
- [ ] Label: "Need Info"

#### APPROVED (Green)
- [ ] Background: light green (`bg-green-50`)
- [ ] Text: dark green (`text-green-700`)
- [ ] Border: green (`border-green-200`)
- [ ] Label: "Approved"

#### REJECTED (Red)
- [ ] Background: light red (`bg-red-50`)
- [ ] Text: dark red (`text-red-700`)
- [ ] Border: red (`border-red-200`)
- [ ] Label: "Rejected"

#### CONVERTED (Dark Green)
- [ ] Background: dark green (`bg-green-100`)
- [ ] Text: very dark green (`text-green-800`)
- [ ] Border: dark green (`border-green-300`)
- [ ] Label: "Converted"

### Size Variants
- [ ] Small (`size="sm"`): Smaller padding and text
- [ ] Medium (`size="md"`): Default size
- [ ] Large (`size="lg"`): Larger padding and text

### Description
- [ ] With `showDescription={true}`, shows description text below chip
- [ ] Without `showDescription`, no description shown

---

## 6. ErrorBanner Component ✅

### 401 Unauthorized (Yellow)
- [ ] Logout
- [ ] Try accessing protected page
- [ ] **Expected**: Yellow banner with warning icon
- [ ] **Expected**: Message: "Please log in to continue"

### 403 Forbidden (Yellow)
- [ ] Create submission
- [ ] Try to transition without permission
- [ ] **Expected**: Yellow banner
- [ ] **Expected**: Message: "You do not have permission..."

### 404 Not Found (Red)
- [ ] Navigate to `/ideas/nonexistent-id`
- [ ] **Expected**: Red banner with X icon
- [ ] **Expected**: Message: "The requested resource was not found"

### 429 Rate Limit (Orange)
- [ ] Request OTP 4 times quickly
- [ ] **Expected**: Orange banner
- [ ] **Expected**: Message: "Too many requests..."
- [ ] **Expected**: Reset time shown (if available)

### Validation Error (Red)
- [ ] Submit form with invalid data
- [ ] **Expected**: Red banner
- [ ] **Expected**: Message: "Please check your input..."
- [ ] **Expected**: Details shown (if available)

### Dismiss
- [ ] Click X button on any error banner
- [ ] **Expected**: Banner disappears

---

## 7. API Client Integration ✅

### HttpOnly Cookies
- [ ] Open DevTools → Network tab
- [ ] Login with OTP
- [ ] Check `/api/auth/verify-otp` request
- [ ] **Expected**: Response sets `Set-Cookie` header
- [ ] **Expected**: Cookie name: `innovation_session`
- [ ] **Expected**: Cookie attributes: `HttpOnly`, `SameSite=lax`
- [ ] Check subsequent requests
- [ ] **Expected**: `Cookie` header sent automatically

### No localStorage/sessionStorage
- [ ] Open DevTools → Application tab
- [ ] Check "Local Storage"
- [ ] **Expected**: No auth tokens stored
- [ ] Check "Session Storage"
- [ ] **Expected**: No auth tokens stored

### Credentials Include
- [ ] Open DevTools → Network tab
- [ ] Make any API call (e.g., `/api/submissions`)
- [ ] Check request in Network tab
- [ ] **Expected**: `credentials: include` in request
- [ ] **Expected**: Cookies sent with request

### Error Mapping
- [ ] Cause various errors (401, 403, 404, 429)
- [ ] Check console logs
- [ ] **Expected**: `ApiClientError` instances with:
  - `message`: User-friendly message
  - `code`: Error code (e.g., 'UNAUTHORIZED')
  - `status`: HTTP status code
  - `details`: Additional info (if available)

---

## 8. Backend Integration ✅

### RBAC (No Frontend Logic)
- [ ] Login as Submitter
- [ ] Call `apiClient.submissions.list()`
- [ ] **Expected**: Returns only user's submissions
- [ ] Login as Reviewer
- [ ] Call `apiClient.submissions.list()`
- [ ] **Expected**: Returns all submissions
- [ ] **Expected**: UI never checks roles, backend filters automatically

### Valid Actions (Dynamic)
- [ ] Create submission (status: SUBMITTED)
- [ ] Call `apiClient.submissions.getValidActions(id)`
- [ ] **Expected**: Returns `['review']` (only valid action from SUBMITTED)
- [ ] Transition to UNDER_REVIEW
- [ ] Call `getValidActions` again
- [ ] **Expected**: Returns `['need_info', 'approve', 'reject']`
- [ ] **Expected**: UI shows buttons ONLY for these actions

### State Machine Enforcement
- [ ] Try invalid transition via API directly
- [ ] Example: SUBMITTED → approve (must go through review first)
- [ ] **Expected**: Returns `StateTransitionError` with code `INVALID_TRANSITION`
- [ ] **Expected**: ErrorBanner shows: "This action is not available..."
- [ ] **Expected**: Details include valid actions

---

## 9. Responsive Design

### Desktop (>1024px)
- [ ] View dashboard
- [ ] **Expected**: 4 counter cards in a row
- [ ] **Expected**: Nav shows all links
- [ ] View ideas list
- [ ] **Expected**: 2-column filter layout

### Tablet (768px-1024px)
- [ ] Resize window to tablet size
- [ ] **Expected**: 2 counter cards per row
- [ ] **Expected**: Nav items still visible

### Mobile (<768px)
- [ ] Resize to mobile size
- [ ] **Expected**: 1 counter card per row
- [ ] **Expected**: Single-column filter layout
- [ ] **Expected**: Nav collapses (if implemented)

---

## 10. Performance

### Load Times
- [ ] Dashboard loads in <2 seconds
- [ ] Ideas list loads in <2 seconds
- [ ] Status chips render instantly (no flicker)

### No Layout Shift
- [ ] StatusChip doesn't change size after render
- [ ] ErrorBanner appears smoothly
- [ ] Counters don't jump

---

## 11. Accessibility

### Keyboard Navigation
- [ ] Tab through login form
- [ ] **Expected**: Focus visible on all inputs/buttons
- [ ] Press Enter to submit
- [ ] **Expected**: Form submits

### ARIA
- [ ] ErrorBanner has `role="alert"`
- [ ] StatusChip has appropriate labels
- [ ] Buttons have descriptive text

### Color Contrast
- [ ] StatusChip text readable on background
- [ ] ErrorBanner text readable on background
- [ ] All text meets WCAG AA standards

---

## 12. Edge Cases

### Empty States
- [ ] New user with no submissions
- [ ] **Expected**: Helpful empty state message
- [ ] **Expected**: Call-to-action button

### Long Text
- [ ] Create submission with very long title
- [ ] **Expected**: Truncates with ellipsis
- [ ] Create submission with very long description
- [ ] **Expected**: Shows 2 lines max with line-clamp

### Network Errors
- [ ] Stop backend server
- [ ] Try to make API call
- [ ] **Expected**: ErrorBanner shows network error
- [ ] Restart server
- [ ] **Expected**: Retry works

### Concurrent Updates
- [ ] Open same submission in 2 tabs
- [ ] Update in tab 1
- [ ] Refresh tab 2
- [ ] **Expected**: Shows updated data

---

## 13. Security

### No Token Exposure
- [ ] Check all API calls in Network tab
- [ ] **Expected**: No `Authorization` headers
- [ ] **Expected**: Only cookies for auth

### CSRF Protection
- [ ] Check POST/PUT/DELETE requests
- [ ] **Expected**: `SameSite=lax` cookie prevents CSRF

### XSS Prevention
- [ ] Enter `<script>alert('xss')</script>` in title
- [ ] **Expected**: Rendered as text, not executed

---

## Sign-Off Criteria

All critical tests (marked with ✅) must pass:
- [ ] Authentication flow works end-to-end
- [ ] StatusChip displays correctly for all states
- [ ] ErrorBanner handles all error types
- [ ] HttpOnly cookies used (no localStorage)
- [ ] Valid actions fetched from backend
- [ ] Backend is source of truth (no frontend auth logic)
- [ ] Semantic colors used correctly
- [ ] No plain text status displays

---

## Bug Report Template

If test fails:

```markdown
**Test**: [Test name]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Steps to Reproduce**:
1. ...
2. ...
3. ...
**Screenshots**: [If applicable]
**Console Errors**: [If any]
```

---

## Regression Testing

After fixing bugs:
- [ ] Re-run full checklist
- [ ] Verify fix doesn't break other features
- [ ] Check console for new errors
- [ ] Verify network calls still use httpOnly cookies

---

## 14. Create Submission (/ideas/new) ✅

### Form Validation
- [ ] Navigate to `/ideas/new`
- [ ] Try to submit with empty title
- [ ] **Expected**: HTML5 validation error
- [ ] Enter title < 5 characters
- [ ] **Expected**: HTML5 validation error
- [ ] Enter title > 200 characters
- [ ] **Expected**: HTML5 validation error
- [ ] Try to submit with empty description
- [ ] **Expected**: HTML5 validation error
- [ ] Enter description < 20 characters
- [ ] **Expected**: HTML5 validation error

### Successful Creation
- [ ] Fill all required fields:
  - Title: "Test Innovation Idea"
  - Description: "This is a test description with more than 20 characters"
- [ ] Fill optional fields:
  - Category: "Technology"
  - Priority: "High"
  - Estimated Impact: "Expected to improve efficiency by 20%"
- [ ] Click "Submit Idea"
- [ ] **Expected**: Redirect to `/ideas/[id]` (new submission details page)
- [ ] **Expected**: Submission shows status: SUBMITTED (blue StatusChip)
- [ ] **Expected**: All entered data is displayed correctly

### Cancel
- [ ] Navigate to `/ideas/new`
- [ ] Enter some data
- [ ] Click "Cancel"
- [ ] **Expected**: Redirect to `/ideas` list
- [ ] **Expected**: No submission created

### Session Guard
- [ ] Logout
- [ ] Try to access `/ideas/new` directly
- [ ] **Expected**: Redirect to `/login`

---

## 15. Submission Details (/ideas/[id]) ✅

### Display
- [ ] Navigate to an existing submission
- [ ] **Expected**: StatusChip displayed (never plain text)
- [ ] **Expected**: Shows all fields (title, description, category, priority, impact)
- [ ] **Expected**: Shows submitter name
- [ ] **Expected**: Shows created date

### NEED_INFO - Edit Mode
- [ ] Create submission or use existing in NEED_INFO status
- [ ] **Expected**: Yellow banner shows "Action Required"
- [ ] **Expected**: "Update Submission" button visible
- [ ] Click "Update Submission"
- [ ] **Expected**: Form appears with current values
- [ ] Change title and description
- [ ] Click "Save Changes"
- [ ] **Expected**: Changes saved
- [ ] **Expected**: Edit form closes
- [ ] **Expected**: Updated values displayed

### NEED_INFO - Resubmit
- [ ] After updating submission in NEED_INFO
- [ ] Check if "Resubmit for Review" button appears
- [ ] **Expected**: Only appears if user has 'review' action permission
- [ ] Click "Resubmit for Review"
- [ ] **Expected**: Status changes to UNDER_REVIEW
- [ ] **Expected**: StatusChip updates to orange
- [ ] **Expected**: Edit buttons disappear

### Non-NEED_INFO Status
- [ ] View submission in SUBMITTED, UNDER_REVIEW, or APPROVED status
- [ ] **Expected**: No edit button shown
- [ ] **Expected**: Read-only display

### Error Handling
- [ ] Try to access non-existent submission: `/ideas/invalid-id`
- [ ] **Expected**: ErrorBanner with "Resource not found"
- [ ] Try to access submission you don't have permission for
- [ ] **Expected**: ErrorBanner with permission error

---

## 16. Admin Review Queue (/admin/review) ✅

### Display
- [ ] Login as Admin or Reviewer
- [ ] Navigate to `/admin/review`
- [ ] **Expected**: Table shows all submissions (based on backend permissions)
- [ ] **Expected**: Columns: Title, Submitter, StatusChip, Priority, Created, Actions
- [ ] **Expected**: Each row has "Review" button

### Filters - Search
- [ ] Enter submission title in search
- [ ] **Expected**: List filters to matching titles
- [ ] Enter submitter name in search
- [ ] **Expected**: List filters to matching submitters
- [ ] Clear search
- [ ] **Expected**: All submissions shown

### Filters - Status
- [ ] Select "UNDER_REVIEW" from status dropdown
- [ ] **Expected**: Only UNDER_REVIEW submissions shown
- [ ] **Expected**: Count shows filtered results
- [ ] Select "All Statuses"
- [ ] **Expected**: All submissions shown

### Filters - Priority
- [ ] Select "High" from priority dropdown
- [ ] **Expected**: Only High priority submissions shown
- [ ] Select "All Priorities"
- [ ] **Expected**: All submissions shown

### Combined Filters
- [ ] Set search + status + priority
- [ ] **Expected**: All three filters apply (AND logic)
- [ ] **Expected**: Count accurate

### Navigation
- [ ] Click "Review" button on a submission
- [ ] **Expected**: Navigate to `/admin/ideas/[id]`

### Empty State
- [ ] Login as user with no submission permissions
- [ ] **Expected**: "No submissions to review" message (if backend returns empty array)

### Session Guard
- [ ] Logout
- [ ] Try to access `/admin/review`
- [ ] **Expected**: Redirect to `/login`

---

## 17. Admin Review Details (/admin/ideas/[id]) ✅

### Display
- [ ] Navigate to `/admin/ideas/[id]`
- [ ] **Expected**: Shows full submission details
- [ ] **Expected**: StatusChip prominently displayed
- [ ] **Expected**: All fields visible

### Dynamic Action Buttons
- [ ] View submission in SUBMITTED status
- [ ] **Expected**: Only "Start Review" button shown (if user has permission)
- [ ] View submission in UNDER_REVIEW status
- [ ] **Expected**: Shows "Request More Info", "Approve", "Reject" buttons (based on permissions)
- [ ] View submission in REJECTED status
- [ ] **Expected**: No action buttons (terminal state)

### Action Flow - Approve
- [ ] View UNDER_REVIEW submission
- [ ] Click "Approve" button
- [ ] **Expected**: Comment field appears
- [ ] **Expected**: Shows selected action: "Approve"
- [ ] Enter comment: "Great idea, approved!"
- [ ] Click "Confirm Action"
- [ ] **Expected**: Status changes to APPROVED
- [ ] **Expected**: StatusChip updates to green
- [ ] **Expected**: Action buttons update (now shows "Convert to Initiative")

### Action Flow - Reject
- [ ] View UNDER_REVIEW submission
- [ ] Click "Reject" button (red, destructive variant)
- [ ] Enter comment: "Does not meet criteria"
- [ ] Click "Confirm Action"
- [ ] **Expected**: Status changes to REJECTED
- [ ] **Expected**: StatusChip updates to red
- [ ] **Expected**: No action buttons shown (terminal state)

### Action Flow - Request Info
- [ ] View UNDER_REVIEW submission
- [ ] Click "Request More Info"
- [ ] Enter comment: "Please provide more details on implementation"
- [ ] Click "Confirm Action"
- [ ] **Expected**: Status changes to NEED_INFO
- [ ] **Expected**: StatusChip updates to yellow

### Action Flow - Cancel
- [ ] Click any action button
- [ ] Enter some comment text
- [ ] Click "Cancel"
- [ ] **Expected**: Form closes
- [ ] **Expected**: Comment cleared
- [ ] **Expected**: Action not executed

### No Actions Available
- [ ] View submission where user has no valid actions
- [ ] **Expected**: "No actions available" message
- [ ] **Expected**: No action buttons shown

### Error Handling
- [ ] Try invalid transition (simulate by modifying request)
- [ ] **Expected**: ErrorBanner shows "This action is not available..."
- [ ] Try action without permission
- [ ] **Expected**: ErrorBanner shows permission error (403)

### Session Guard
- [ ] Logout
- [ ] Try to access `/admin/ideas/[id]`
- [ ] **Expected**: Redirect to `/login`

---

## 18. End-to-End Flow ✅

### Complete Submission Lifecycle
1. **Submitter Creates Idea**
   - [ ] Login as Submitter
   - [ ] Navigate to `/ideas/new`
   - [ ] Fill form and submit
   - [ ] **Expected**: Status = SUBMITTED (blue)

2. **Reviewer Starts Review**
   - [ ] Login as Reviewer
   - [ ] Navigate to `/admin/review`
   - [ ] Find submission
   - [ ] Click "Review"
   - [ ] Click "Start Review"
   - [ ] **Expected**: Status = UNDER_REVIEW (orange)

3. **Reviewer Requests Info**
   - [ ] Click "Request More Info"
   - [ ] Add comment: "Please clarify implementation details"
   - [ ] Confirm action
   - [ ] **Expected**: Status = NEED_INFO (yellow)

4. **Submitter Updates**
   - [ ] Login as Submitter
   - [ ] Navigate to `/ideas/[id]`
   - [ ] **Expected**: Yellow "Action Required" banner
   - [ ] Click "Update Submission"
   - [ ] Update description
   - [ ] Save changes
   - [ ] **Expected**: Changes saved

5. **Submitter Resubmits**
   - [ ] Click "Resubmit for Review"
   - [ ] **Expected**: Status = UNDER_REVIEW (orange)

6. **Reviewer Approves**
   - [ ] Login as Reviewer
   - [ ] Navigate to submission via `/admin/review`
   - [ ] Click "Approve"
   - [ ] Add comment: "Approved for implementation"
   - [ ] Confirm action
   - [ ] **Expected**: Status = APPROVED (green)

7. **Admin Converts**
   - [ ] Login as Admin (if different from Reviewer)
   - [ ] Navigate to approved submission
   - [ ] Click "Convert to Initiative"
   - [ ] Confirm action
   - [ ] **Expected**: Status = CONVERTED (dark green)
   - [ ] **Expected**: No further actions available

### Verify Throughout
- [ ] At each step, StatusChip color is correct
- [ ] At each step, validActions match expected
- [ ] At each step, audit logs created (check backend)
- [ ] At each step, only allowed actions shown

---

## Final Checklist ✅

### All Pages
- [ ] 8 pages implemented and functional
- [ ] All use StatusChip (never plain text)
- [ ] All use ErrorBanner for errors
- [ ] All use apiClient for API calls
- [ ] All have session guards
- [ ] No localStorage/sessionStorage usage

### Backend Integration
- [ ] Actions strictly from validActions API
- [ ] No frontend permission logic
- [ ] Backend filters submissions by permission
- [ ] State machine enforces transitions

### Visual Consistency
- [ ] All StatusChips use semantic colors
- [ ] All error banners color-coded correctly
- [ ] All forms have consistent styling
- [ ] All navigation consistent

### Accessibility
- [ ] All forms keyboard navigable
- [ ] All buttons have clear labels
- [ ] All errors announced to screen readers
- [ ] All status chips have proper contrast

---

## Production Readiness ✅

- [ ] All 18 test sections pass
- [ ] No console errors
- [ ] No React warnings
- [ ] HttpOnly cookies working
- [ ] All transitions audit logged
- [ ] Error handling complete
- [ ] StatusChip everywhere
- [ ] Backend source of truth verified

**Sign-off**: Once all tests pass, PR4 is ready for production deployment.
