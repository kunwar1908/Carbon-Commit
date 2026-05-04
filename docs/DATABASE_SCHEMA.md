# Carbon Commit Database Schema - Complete Reference

## 📋 Overview

The enhanced database schema includes complete support for:
- User management and role-based access control
- Activity logging and audit trails
- Real-time analytics caching
- Notifications system
- Admin action tracking
- Database-level data integrity with triggers and functions
- Row-level security (RLS) policies

---

## 📦 Tables

### 1. **user_profiles** - User Management
Stores authenticated user profiles linked to Supabase Auth.

```sql
Columns:
- id (TEXT, PRIMARY KEY)          -- Supabase user UUID
- email (TEXT, UNIQUE)            -- User email
- full_name (TEXT)                -- User's full name
- department (TEXT)               -- Department assignment
- role (user_role)                -- USER, MANAGER, ADMIN
- dept_id (INTEGER, FK)           -- Linked department
- is_active (BOOLEAN)             -- Account status
- created_at (TIMESTAMP)          -- Creation timestamp
- updated_at (TIMESTAMP)          -- Last update timestamp
```

**Relationships:**
- `dept_id` → `dept_master.id` (nullable, SET NULL on delete)

---

### 2. **dept_master** - Department Information
Enhanced with additional fields and audit capabilities.

```sql
Columns:
- id (INTEGER, PRIMARY KEY)       -- Auto-increment
- name (TEXT, UNIQUE)             -- Department name
- baseline (DECIMAL 12,2)         -- Carbon quota
- description (TEXT)              -- Department description
- manager (TEXT)                  -- Manager name
- is_active (BOOLEAN)             -- Active/inactive flag
- created_at (TIMESTAMP)          -- Creation timestamp
- updated_at (TIMESTAMP)          -- Last update timestamp
```

---

### 3. **emission_ref** - Emission Factors
Enhanced with categorization and descriptions.

```sql
Columns:
- activity_type (TEXT, PRIMARY KEY)  -- Activity name (e.g., "Electricity")
- factor (DECIMAL 12,6)              -- CO2e factor
- unit (TEXT)                        -- Measurement unit
- description (TEXT)                 -- Factor description
- category (TEXT)                    -- Category (Energy, Water, Transport, Waste)
- is_active (BOOLEAN)                -- Active/inactive flag
- created_at (TIMESTAMP)             -- Creation timestamp
- updated_at (TIMESTAMP)             -- Last update timestamp
```

---

### 4. **activity_logs** - User Activity Records
Enhanced with user tracking and notes.

```sql
Columns:
- id (INTEGER, PRIMARY KEY)
- user_id (TEXT, FK)              -- User who logged the activity
- dept_id (INTEGER, FK)           -- Department
- activity_id (TEXT, FK)          -- Activity type
- units (DECIMAL 12,3)            -- Quantity
- co2_result (DECIMAL 12,3)       -- Calculated CO2e
- notes (TEXT)                    -- Optional notes
- timestamp (TIMESTAMP)           -- Activity timestamp
- created_at (TIMESTAMP)          -- Creation timestamp
```

**Relationships:**
- `user_id` → `user_profiles.id` (CASCADE delete)
- `dept_id` → `dept_master.id`
- `activity_id` → `emission_ref.activity_type`

---

### 5. **audit_logs** - Activity Audit Trail
Complete record of all data modifications.

```sql
Columns:
- id (INTEGER, PRIMARY KEY)
- user_id (TEXT, FK)              -- User performing action
- action (TEXT)                   -- Action type (CREATE, UPDATE, DELETE)
- entity_type (TEXT)              -- Entity being modified
- entity_id (TEXT)                -- ID of modified entity
- old_values (JSONB)              -- Previous values
- new_values (JSONB)              -- New values
- ip_address (TEXT)               -- Client IP
- user_agent (TEXT)               -- Client user agent
- timestamp (TIMESTAMP)           -- Action timestamp
```

**Relationships:**
- `user_id` → `user_profiles.id` (SET NULL on delete)

---

### 6. **analytics_cache** - Cached Analytics
Pre-calculated department analytics for fast queries.

```sql
Columns:
- id (INTEGER, PRIMARY KEY)
- dept_id (INTEGER, UNIQUE, FK)   -- Department
- total_emissions (DECIMAL 16,3)  -- Sum of all CO2e
- baseline_usage (DECIMAL 12,2)   -- Department baseline
- variance (DECIMAL 12,3)         -- Difference from baseline
- percent_overage (DECIMAL 5,2)   -- Percentage over baseline
- log_count (INTEGER)             -- Number of activity logs
- last_updated (TIMESTAMP)        -- Last calculation time
- cached_at (TIMESTAMP)           -- Cache creation time
```

**Relationships:**
- `dept_id` → `dept_master.id` (CASCADE delete)

---

### 7. **notifications** - User Notifications
System-generated notifications for users.

```sql
Columns:
- id (INTEGER, PRIMARY KEY)
- user_id (TEXT, FK)              -- Target user
- title (TEXT)                    -- Notification title
- message (TEXT)                  -- Message content
- type (notification_type)        -- INFO, WARNING, ERROR, SUCCESS
- related_data (JSONB)            -- Contextual data
- is_read (BOOLEAN)               -- Read status
- created_at (TIMESTAMP)          -- Creation timestamp
- read_at (TIMESTAMP)             -- When user read it
```

**Relationships:**
- `user_id` → `user_profiles.id` (CASCADE delete)

---

### 8. **admin_actions** - Admin Activity Log
Tracks all administrative actions.

```sql
Columns:
- id (INTEGER, PRIMARY KEY)
- admin_id (TEXT)                 -- Admin user UUID
- action_type (TEXT)              -- Type of action
- target_type (TEXT)              -- Type of target
- target_id (TEXT)                -- ID of target
- description (TEXT)              -- Action description
- status (TEXT)                   -- Completion status
- created_at (TIMESTAMP)          -- Action timestamp
```

---

## 🔧 Database Functions

### 1. **update_analytics_cache(dept_id_param)**
Updates cached analytics for a department.

```sql
FUNCTION update_analytics_cache(dept_id_param INTEGER)
RETURNS void

Purpose: Calculate and cache analytics metrics
- Sums CO2 emissions
- Calculates variance from baseline
- Computes percentage overage
- Upserts/updates analytics_cache record
```

**Usage:**
```sql
SELECT update_analytics_cache(1);
```

---

### 2. **get_leaderboard_data()**
Returns ranked leaderboard data.

```sql
FUNCTION get_leaderboard_data()
RETURNS TABLE (
  rank BIGINT,
  dept_id INTEGER,
  dept_name TEXT,
  total_emissions DECIMAL,
  baseline DECIMAL,
  variance DECIMAL,
  percent_overage DECIMAL,
  log_count INTEGER
)

Purpose: Rank departments by total emissions (descending)
```

**Usage:**
```sql
SELECT * FROM get_leaderboard_data();
```

---

### 3. **get_department_analytics()**
Returns detailed analytics for all departments.

```sql
FUNCTION get_department_analytics()
RETURNS TABLE (
  dept_id INTEGER,
  dept_name TEXT,
  total_emissions DECIMAL,
  baseline DECIMAL,
  variance DECIMAL,
  percent_overage DECIMAL,
  exceeds_baseline BOOLEAN,
  log_count INTEGER,
  last_updated TIMESTAMP
)

Purpose: Get analytics with baseline comparison
```

**Usage:**
```sql
SELECT * FROM get_department_analytics();
```

---

### 4. **log_audit_action(...)**
Creates an audit log entry.

```sql
FUNCTION log_audit_action(
  p_user_id TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_old_values JSONB,
  p_new_values JSONB
)
RETURNS INTEGER

Purpose: Log user actions for compliance and debugging
Returns: audit log ID
```

**Usage:**
```sql
SELECT log_audit_action(
  'user-123',
  'UPDATE',
  'ACTIVITY_LOG',
  '456',
  '{"co2": 10}'::JSONB,
  '{"co2": 15}'::JSONB
);
```

---

### 5. **notify_baseline_exceeded(...)**
Creates baseline exceeded notification.

```sql
FUNCTION notify_baseline_exceeded(
  p_user_id TEXT,
  p_dept_id INTEGER,
  p_dept_name TEXT,
  p_total_emissions DECIMAL,
  p_baseline DECIMAL
)
RETURNS INTEGER

Purpose: Alert user when department exceeds baseline
Returns: notification ID
```

---

## 🎯 Triggers

### 1. **activity_logs_update_analytics_trigger**
Automatically updates analytics cache when activity logs change.

```sql
TRIGGER activity_logs_update_analytics_trigger
AFTER INSERT OR UPDATE ON activity_logs
FOR EACH ROW
EXECUTE FUNCTION trigger_update_analytics_on_activity()

When: After any activity log insert/update
Action: Calls update_analytics_cache()
```

---

### 2. **activity_logs_audit_trigger**
Logs all activity log modifications to audit trail.

```sql
TRIGGER activity_logs_audit_trigger
AFTER INSERT OR UPDATE ON activity_logs
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_activity_log()

When: After any activity log insert/update
Action: 
- Creates audit log entry
- Checks if baseline exceeded
- Sends notification if exceeded
```

---

### 3. **user_profiles_audit_trigger**
Logs user profile changes to audit trail.

```sql
TRIGGER user_profiles_audit_trigger
AFTER INSERT OR UPDATE ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_audit_user_profile()

When: After any user profile insert/update
Action: Creates audit log entry with old/new values
```

---

### 4. **notifications_update_read_at_trigger**
Automatically timestamps when notification is read.

```sql
TRIGGER notifications_update_read_at_trigger
BEFORE UPDATE ON notifications
FOR EACH ROW
EXECUTE FUNCTION trigger_update_notification_read_at()

When: Before notification update
Action: Sets read_at to CURRENT_TIMESTAMP when is_read=true
```

---

## 🔐 Row Level Security (RLS) Policies

### user_profiles
```sql
SELECT: Users can see own profile or admins can see all
UPDATE: Users can edit own profile or admins can edit all
```

### activity_logs
```sql
SELECT: Users see own logs, managers/admins see department/all logs
INSERT: Users can create logs for themselves
```

### notifications
```sql
SELECT: Users can view own notifications
UPDATE: Users can update own notifications (mark as read)
```

### audit_logs
```sql
SELECT: Only admins can view audit logs
```

---

## 🔄 Enums

### user_role
```sql
ADMIN    - Full system access
MANAGER  - Department-level access
USER     - Personal activity logging only
```

### notification_type
```sql
INFO     - Informational message
WARNING  - Warning/caution message
ERROR    - Error notification
SUCCESS  - Success notification
```

---

## 📊 Indexes for Performance

Key indexes created:
- `user_profiles(dept_id, role)` - User filtering
- `activity_logs(user_id, dept_id, activity_id, timestamp)` - Activity queries
- `audit_logs(user_id, entity_type, timestamp)` - Audit filtering
- `analytics_cache(dept_id)` - UNIQUE for fast lookups
- `notifications(user_id, is_read, created_at)` - Notification queries
- `admin_actions(admin_id, action_type, created_at)` - Admin action tracking

---

## 🚀 Migration Instructions

### Apply Migration
```bash
cd backend
npm run prisma:migrate
# or
npx prisma migrate dev
```

### Generate Prisma Client
```bash
npm run prisma:generate
# or
npx prisma generate
```

### Seed Database
```bash
npm run seed
# or
npx tsx prisma/seed.ts
```

---

## 📝 Usage Examples

### Get Department Leaderboard
```typescript
const leaderboard = await prisma.$queryRaw`
  SELECT * FROM get_leaderboard_data()
`;
```

### Get Analytics with Baseline Comparison
```typescript
const analytics = await prisma.$queryRaw`
  SELECT * FROM get_department_analytics()
`;
```

### Create Activity Log (with triggers)
```typescript
await prisma.activityLogs.create({
  data: {
    userId: "user-123",
    deptId: 1,
    activityId: "Electricity",
    units: 100,
    co2Result: 82,
    notes: "Monthly electricity usage"
  }
});
// Automatically: 
// - Updates analytics_cache
// - Creates audit log
// - Sends notification if baseline exceeded
```

### Get User Notifications
```typescript
const notifications = await prisma.notification.findMany({
  where: {
    userId: "user-123",
    isRead: false
  },
  orderBy: { createdAt: 'desc' }
});
```

### View Audit Trail
```typescript
const auditTrail = await prisma.auditLog.findMany({
  where: {
    entityType: 'ACTIVITY_LOG',
    timestamp: {
      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    }
  },
  include: { user: true },
  orderBy: { timestamp: 'desc' }
});
```

---

## ✅ Verification Checklist

After migration:
- [ ] All 8 tables created successfully
- [ ] 5 database functions active
- [ ] 4 triggers executing
- [ ] RLS policies enforced
- [ ] Indexes created for performance
- [ ] Seed data populated
- [ ] Prisma client generated
- [ ] Backend API updated to use new fields

---

## 🔗 Frontend Integration Points

The frontend will need to handle:
1. **User Role Display** - Show admin/manager/user badge
2. **Notifications** - Display notification panel
3. **Audit Information** - Admin dashboard for audit logs
4. **Analytics Caching** - Faster dashboard loads
5. **Error Handling** - Better error messages from database

---

## 📞 Support

For issues or questions:
1. Check migration logs: `prisma/migrations/`
2. Verify RLS policies: Query `pg_policies`
3. Test functions: Run in SQL editor
4. Check triggers: Query `pg_trigger`

