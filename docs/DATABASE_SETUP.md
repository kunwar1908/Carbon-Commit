# 🗂️ Database Enhancement - Setup Guide

## ⚠️ IMPORTANT: Fix Database URL (@ Symbol Issue)

Your current `DATABASE_URL` has an **@** symbol in the password that needs URL encoding.

### Current (❌ May cause issues)
```
postgresql://postgres.ssnbnsockfjgsheigkbv:Singhpreet@190804@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
```

### Fixed (✅ Correct)
```
postgresql://postgres.ssnbnsockfjgsheigkbv:Singhpreet%40190804@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?sslmode=require
```

**Action:** Update both `DATABASE_URL` and `DIRECT_URL` in `backend/.env` by replacing `@` in the password with `%40`.

---

## 📦 What's New

### New Tables (8 total)
| Table | Purpose | Records |
|-------|---------|---------|
| `user_profiles` | User management linked to Supabase Auth | Sample: 3 |
| `dept_master` | Enhanced with descriptions | Existing: 4 |
| `emission_ref` | Enhanced with categories | Existing: 4 |
| `activity_logs` | Enhanced with user tracking | Existing: 0+ |
| `audit_logs` | Complete audit trail | Auto-populated |
| `analytics_cache` | Pre-calculated metrics | Auto-populated |
| `notifications` | System notifications | Auto-populated |
| `admin_actions` | Admin activity tracking | Auto-populated |

### New Database Functions (5)
- ✅ `update_analytics_cache()` - Refresh cached metrics
- ✅ `get_leaderboard_data()` - Ranked department data
- ✅ `get_department_analytics()` - Analytics with baselines
- ✅ `log_audit_action()` - Create audit entries
- ✅ `notify_baseline_exceeded()` - Alert notifications

### New Triggers (4)
- ✅ `activity_logs_update_analytics_trigger` - Auto-update cache
- ✅ `activity_logs_audit_trigger` - Track log changes + notify
- ✅ `user_profiles_audit_trigger` - Track user changes
- ✅ `notifications_update_read_at_trigger` - Timestamp reads

### New Security Policies
- ✅ Row Level Security (RLS) on all sensitive tables
- ✅ User role-based access control
- ✅ Department-level filtering

---

## 🚀 Step-by-Step Setup

### Step 1: Fix Database URL
Edit `backend/.env`:
```bash
# BEFORE:
DATABASE_URL="postgresql://postgres.ssnbnsockfjgsheigkbv:Singhpreet@190804@..."

# AFTER:
DATABASE_URL="postgresql://postgres.ssnbnsockfjgsheigkbv:Singhpreet%40190804@..."
```

### Step 2: Navigate to Backend
```bash
cd backend
```

### Step 3: Apply Prisma Migration
```bash
npm run prisma:migrate
```
Or manually:
```bash
npx prisma migrate dev --name initial_schema
```

**What this does:**
- Creates all 8 new tables
- Creates all 5 functions
- Creates all 4 triggers
- Sets up RLS policies
- Creates necessary indexes

### Step 4: Generate Prisma Client
```bash
npm run prisma:generate
```
Or:
```bash
npx prisma generate
```

### Step 5: Seed Database
```bash
npm run seed
```

**What this does:**
- Seeds 4 departments
- Seeds 4 emission factors
- Creates sample user profiles
- Initializes analytics cache
- Sets up initial data

### Step 6: Verify Installation
```bash
# Check Prisma client generated
ls -la generated/prisma/

# Verify database tables exist
npx prisma db execute --stdin <<'EOF'
SELECT table_name FROM information_schema.tables 
WHERE table_schema='public' ORDER BY table_name;
EOF

# Verify functions exist
npx prisma db execute --stdin <<'EOF'
SELECT routinename FROM information_schema.routines 
WHERE routine_schema='public' AND routine_type='FUNCTION';
EOF
```

---

## 🔄 Migration Strategy

### For Existing Databases

If you already have data:

1. **Backup first:**
   ```bash
   # Supabase provides automatic backups
   # In Supabase Dashboard → Database → Backups
   ```

2. **Run migration:**
   ```bash
   npm run prisma:migrate
   ```

3. **Seed new reference data:**
   ```bash
   npm run seed
   ```

4. **Update existing activity_logs:**
   ```bash
   # The migration adds new nullable columns
   # You may want to populate user_id for existing logs
   # This depends on your data structure
   ```

---

## 📋 Verification Checklist

After setup, verify everything works:

```bash
# 1. Check tables exist
✓ user_profiles
✓ dept_master (enhanced)
✓ emission_ref (enhanced)
✓ activity_logs (enhanced)
✓ audit_logs (new)
✓ analytics_cache (new)
✓ notifications (new)
✓ admin_actions (new)

# 2. Check functions exist
✓ update_analytics_cache()
✓ get_leaderboard_data()
✓ get_department_analytics()
✓ log_audit_action()
✓ notify_baseline_exceeded()

# 3. Check triggers exist
✓ activity_logs_update_analytics_trigger
✓ activity_logs_audit_trigger
✓ user_profiles_audit_trigger
✓ notifications_update_read_at_trigger

# 4. Check RLS policies
✓ user_profiles: SELECT, UPDATE
✓ activity_logs: SELECT, INSERT
✓ notifications: SELECT, UPDATE
✓ audit_logs: SELECT (admins only)

# 5. Test data
✓ Departments seeded (4 records)
✓ Emission factors seeded (4 records)
✓ Analytics cache initialized
```

---

## 🧪 Test the Database

### Test 1: Create Activity Log
```typescript
// src/test-db.ts
import { prisma } from './lib/prisma';

const log = await prisma.activityLogs.create({
  data: {
    userId: "sample-user-1",
    deptId: 1,
    activityId: "Electricity",
    units: 100,
    co2Result: 82,
  }
});
console.log("✓ Activity log created:", log.id);
```

### Test 2: Check Analytics Cache Updated
```typescript
const cache = await prisma.analyticsCache.findUnique({
  where: { deptId: 1 }
});
console.log("✓ Analytics cache updated:", cache);
```

### Test 3: Check Audit Log Created
```typescript
const audit = await prisma.auditLog.findFirst({
  where: { entityType: "ACTIVITY_LOG" }
});
console.log("✓ Audit log created:", audit);
```

### Test 4: Get Leaderboard
```typescript
const leaderboard = await prisma.$queryRaw`
  SELECT * FROM get_leaderboard_data()
`;
console.log("✓ Leaderboard:", leaderboard);
```

---

## 🔗 Backend Integration

Update your backend services to use new features:

### Activity Service
```typescript
// Instead of just storing logs, the system now:
// 1. Tracks who logged it (user_id)
// 2. Auto-updates analytics cache (via trigger)
// 3. Auto-creates audit entry (via trigger)
// 4. Auto-sends notifications (via trigger)
```

### Analytics Route
```typescript
// Enhanced endpoints
GET /analytics           → Returns detailed analytics
GET /analytics/cache     → Returns cached data (instant)
GET /leaderboard         → Uses ranking function
```

### New Endpoints to Build
```typescript
// User management
GET /users
POST /users
GET /users/:id
PUT /users/:id

// Notifications
GET /users/notifications
PUT /users/notifications/:id/read

// Audit (admin only)
GET /audit-logs
GET /audit-logs?entityType=ACTIVITY_LOG

// Admin actions
GET /admin/actions
```

---

## 📚 Documentation Files

Created in `docs/`:
- **DATABASE_SCHEMA.md** - Complete reference for all tables, functions, triggers
- **DATABASE_SETUP.md** - This file

---

## ❌ Troubleshooting

### Issue: Migration fails with "Column already exists"
**Solution:** The schema.prisma might be out of sync. Reset and remigrate:
```bash
npm run prisma:migrate reset
npm run seed
```

### Issue: Functions not found
**Solution:** Verify migration ran completely:
```bash
npx prisma migrate status
```

### Issue: RLS policies blocking queries
**Solution:** Make sure authenticated user is set:
```typescript
// Verify auth context in Supabase
const { data: { session } } = await supabase.auth.getSession();
```

### Issue: @ symbol in password still causing errors
**Solution:** Double-check URL encoding in `.env`:
```bash
# Bad:
Singhpreet@190804

# Good:
Singhpreet%40190804
```

---

## ✅ Next Steps

After setup:

1. **Update Backend Types** - Regenerate types if needed
2. **Update Frontend** - Add user profile UI, notifications panel
3. **Implement New Endpoints** - Build admin/user management
4. **Add Error Handling** - Handle RLS policy violations gracefully
5. **Testing** - Write tests for new triggers and functions

---

## 📞 Key Files Modified

```
backend/
├── prisma/
│   ├── schema.prisma (✅ UPDATED - 8 models, complete schema)
│   ├── seed.ts (✅ UPDATED - seed all new tables)
│   └── migrations/
│       └── initial_schema/
│           └── migration.sql (✅ NEW - all functions & triggers)
└── src/
    └── (backend code updated next)

docs/
├── DATABASE_SCHEMA.md (✅ NEW - complete reference)
└── DATABASE_SETUP.md (✅ NEW - this file)
```

---

**Created:** 2026-05-04  
**Status:** Ready for migration  
**Next Action:** Run `npm run prisma:migrate` in backend directory
