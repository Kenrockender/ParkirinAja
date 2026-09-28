# 📋 PARKIR BINUS - DEVELOPMENT TASKS
## Solo Developer - 1 Week Sprint

**Timeline:** 7 Hari Kerja  
**Developer:** 1 Orang  
**Approach:** Prioritas berdasarkan impact & complexity

---

## 🎯 TASK OVERVIEW

**Total Tasks:** 10 Fitur diubah menjadi **30 Subtasks**  
**Estimation:** ~56 jam kerja (8 jam/hari × 7 hari)  
**Strategy:** Focus on MVP features, defer complex ones

---

## � PRIORITIZATION MATRIX

| Priority | Feature | Effort | Impact | Days |
|----------|---------|--------|--------|------|
| **P0** | Vehicle Management | Medium | High | 1.5 |
| **P0** | Advanced Filters | Low | High | 1 |
| **P0** | Personalization | Low | Medium | 1 |
| **P1** | Dynamic Pricing 2.0 | Medium | High | 1.5 |
| **P1** | Analytics Dashboard | Medium | High | 1.5 |
| **P2** | Operator Console | Medium | Medium | 1 |
| **P2** | Audit Module | Low | Medium | 0.5 |
| **P3** | Maintenance Mgmt | Low | Low | 0.5 |
| **P3** | Loyalty Program | High | Medium | *Defer* |
| **P3** | ANPR System | Very High | High | *Defer* |

**Total Planned:** 7 days  
**Deferred to Next Sprint:** Loyalty Program, ANPR System

---

## ✅ TASK BREAKDOWN (Day by Day)

---

### **DAY 1: Vehicle Management Foundation** (8 hours)

#### ✅ Task 1.1: Database Schema (1h) - COMPLETE
```bash
# Create Prisma migration
- [x] Add Vehicle model to schema.prisma
- [x] Add relations to User & Reservation
- [x] Run: prisma migrate dev --name add-vehicle-model
- [x] Run: prisma generate
```

#### ✅ Task 1.2: Backend API (2h) - COMPLETE
- [x] `POST /api/vehicles` - Create vehicle
- [x] `GET /api/vehicles` - List user vehicles
- [x] `PATCH /api/vehicles/:id` - Update vehicle
- [x] `DELETE /api/vehicles/:id` - Soft delete vehicle
- [x] `PATCH /api/vehicles/:id/default` - Set default

#### ✅ Task 1.3: Zustand Store (1h) - COMPLETE
- [x] Create `useVehicles.ts` hook (API integration)
- [x] Add actions: addVehicle, updateVehicle, deleteVehicle, setDefault
- [x] Add selectors: getVehicles, getDefaultVehicle

#### ✅ Task 1.4: UI Components (3h) - COMPLETE
- [x] `VehicleListView.tsx` - List with add button
- [x] `VehicleFormModal.tsx` - Add/edit form
- [x] `VehicleCard.tsx` - Display single vehicle
- [x] `VehicleSelector.tsx` - Dropdown for booking

#### ✅ Task 1.5: Integration (1h) - COMPLETE
- [x] BookingView already has vehicle selection
- [x] ProfileView already has vehicle management
- [x] All components created and ready to use
- [x] Backend APIs functional

**End of Day 1:** Vehicle management working ✓

---

### **DAY 2: Filters, Search & Vehicle Polish** (8 hours)

#### ✅ Task 2.1: Vehicle Photo Upload (2h) - COMPLETE
- [x] Add image upload API endpoint (`POST /api/vehicles/:id/photo`)
- [x] Add image delete endpoint (`DELETE /api/vehicles/:id/photo`)
- [x] Integrate photo upload in VehicleFormModal
- [x] Add photo picker to form
- [x] Display photo preview with remove button
- [x] File validation (type, size)

#### ✅ Task 2.2: Advanced Filters - Store (1h) - COMPLETE
- [x] Create filter utilities in parking-data.ts
- [x] Create filter-store.ts with Zustand + persist
- [x] Add filter actions: setSlotType, setRow, setSort, setSearch
- [x] Add selectors: favoriteSlots, recentSlots

#### ✅ Task 2.3: Filter Logic (1.5h) - COMPLETE
- [x] Implement filterSlots function
- [x] Add sort algorithms (by number, type, row)
- [x] Add search functionality (slot number)
- [x] Create quick filter presets

#### ✅ Task 2.4: Filter UI Components (2.5h) - COMPLETE
- [x] `FilterBar.tsx` - Search bar + quick filters
- [x] `SlotFilterSheet.tsx` - Advanced filter bottom sheet
- [x] Quick filter chips (All, Available, EV, Disability, Row A/B)
- [x] Active filters summary with count

#### ✅ Task 2.5: Favorite Slots (1h) - COMPLETE
- [x] Add favorite toggle to filter store
- [x] Store favorites in localStorage
- [x] Create FavoriteSlotsSection component
- [x] Show favorite badge on slots

**End of Day 2:** Filters, search, and vehicle photos complete ✓

---

### **DAY 3: Personalization & Dynamic Pricing** (8 hours)

#### ✅ Task 3.1: User Preferences Store (1h) - COMPLETE
- [x] Created preferences-store.ts with Zustand + persist
- [x] Added UserPreferences interface (UI, notifications, booking)
- [x] Added UsagePatterns interface (frequency, trends, streaks)
- [x] Implemented recordBooking, recordSession, updateStreak
- [x] Added preference actions (update, toggle, set)

#### ✅ Task 3.2: Smart Suggestions (2h) - COMPLETE
- [x] Created smart-suggestions.ts engine
- [x] Implemented 8 suggestion types (quick-book, top-up, comeback, streak, etc)
- [x] Created suggestion generation algorithm with priority
- [x] Built SmartSuggestionCard component with animations
- [x] Added action handlers and dismissible logic

#### ✅ Task 3.3: Quick Actions (1.5h) - COMPLETE
- [x] Created `QuickActionsRow.tsx` component
- [x] Made actions configurable (up to 4 visible)
- [x] Built QuickActionsCustomizeModal for user customization
- [x] Added 8 pre-defined actions with icons and colors
- [x] Integrated with preferences store

#### ✅ Task 3.4: Dynamic Pricing Engine (2.5h) - COMPLETE
- [x] Created dynamic-pricing.ts with advanced algorithms
- [x] Added time-based multiplier logic (peak/off-peak/weekend)
- [x] Added occupancy-based logic with surge pricing
- [x] Added early bird discount (15% for 24h+ advance)
- [x] Added event calendar support with predefined events
- [x] Added weather premium for covered slots
- [x] Added loyalty discounts by tier
- [x] Implemented price prediction and best time to book

#### ✅ Task 3.5: Pricing UI (1h) - COMPLETE
- [x] Created PricingIndicator with trend arrows (↑↓)
- [x] Added discount/savings badges
- [x] Built price breakdown modal with all factors
- [x] Created BestTimeBanner component
- [x] Added PriceHistoryChart mini visualization
- [x] Integrated with booking flow

**End of Day 3:** Personalization + Pricing 2.0 done ✓

---

### **DAY 4: Analytics Dashboard Foundation** (8 hours) - ✅ COMPLETE

#### ✅ Task 4.1: Analytics API Endpoints (2h) - COMPLETE
- [x] Create `/api/analytics/kpis` endpoint (revenue, bookings, occupancy, duration)
- [x] Create `/api/analytics/revenue` endpoint (trends, breakdowns by payment/vehicle)
- [x] Create `/api/analytics/occupancy` endpoint (heatmap, zones, realtime)
- [x] Create `/api/analytics/performance` endpoint (slots, operators, system)
- [x] Implement mock data generators with realistic patterns

#### ✅ Task 4.2: Analytics UI Components (3h) - COMPLETE
- [x] Create `KPICard.tsx` component with trend indicators
- [x] Create `RevenueChart.tsx` with Recharts (line/pie/bar charts)
- [x] Create `OccupancyHeatmap.tsx` with 24×7 weekly grid
- [x] Create `SlotPerformanceTable.tsx` with sorting and filters
- [x] Create `AnalyticsDashboard.tsx` master component
- [x] Add period selectors (day, week, month, year)
- [x] Add color-coded visualizations

#### ✅ Task 4.3: Analytics Store & Integration (3h) - COMPLETE
- [x] Create `analytics-store.ts` with Zustand + persist
- [x] Add filter actions (location, period, date range)
- [x] Create `/analytics` page route
- [x] Add Analytics link in ProfileView for operators
- [x] Implement auto-refresh capabilities
- [x] Add responsive layouts

**End of Day 4:** Analytics dashboard fully functional ✓

---

### **DAY 5: Operator Console & Audit Module** (8 hours) - ✅ COMPLETE

#### ✅ Task 5.1: Operator Console API Endpoints (2h) - COMPLETE
- [x] Create `/api/operator/active-sessions` endpoint (GET + POST for reminders)
- [x] Create `/api/operator/incidents` endpoint (GET/POST/PATCH for CRUD)
- [x] Create `/api/operator/audit` endpoint (GET with pagination, POST for export)
- [x] Implement incident management (priorities, statuses, assignment)
- [x] Implement audit logging (action types, actor roles, metadata tracking)

#### ✅ Task 5.2: Operator Console UI Components (3h) - COMPLETE
- [x] Create `ActiveSessionsPanel.tsx` with auto-refresh
- [x] Add session monitoring (overtime alerts, time remaining)
- [x] Add send reminder functionality
- [x] Create `IncidentManagement.tsx` with create/update modals
- [x] Add priority/status filtering and badges
- [x] Create `AuditLogViewer.tsx` with pagination
- [x] Add multi-filter system (time, type, role, status, search)
- [x] Add export functionality

#### ✅ Task 5.3: Operator Store & Integration (3h) - COMPLETE
- [x] Create `operator-store.ts` with Zustand + persist
- [x] Add preferences (auto-refresh, filters, notifications)
- [x] Add stats tracking (sessions handled, incidents resolved, shift times)
- [x] Create `OperatorDashboard.tsx` with tabbed navigation
- [x] Integrate with existing `OperatorView.tsx` as new "Console" tab
- [x] Add shift management actions
- [x] Connect all panels to APIs

**End of Day 5:** Operator console & audit fully operational ✓
- [ ] Create `ManualCheckinModal.tsx`
- [ ] Create `ManualCheckoutModal.tsx`
- [ ] Add API endpoints for manual operations
- [ ] Add audit logging

**End of Day 5:** Analytics done + Operator console basics ✓

---

### **DAY 6: Operator Console Complete & Audit** (8 hours)

#### ☐ Task 6.1: Active Sessions Panel (1.5h)
- [ ] Create `ActiveSessionsPanel.tsx`
- [ ] Show list of checked-in vehicles
- [ ] Display time remaining
- [ ] Add quick actions (extend, force checkout)

#### ☐ Task 6.2: Incident Management (2h)
- [ ] Create Incident model in schema
- [ ] Create `IncidentReportModal.tsx`
- [ ] Add incident list view
- [ ] Add status tracking (Open/Resolved)

#### ☐ Task 6.3: Operator Broadcasts (1.5h)
- [ ] Create broadcast API endpoint
- [ ] Create `BroadcastModal.tsx`
- [ ] Add notification delivery
- [ ] Test with active users

#### ☐ Task 6.4: Audit Module (2h)
- [ ] Create AuditLog model
- [ ] Create `auditLogger` utility
- [ ] Instrument existing APIs with logging
- [ ] Create `AuditLogViewer.tsx`

#### ☐ Task 6.5: Audit Filters (1h)
- [ ] Add filter by date, event, user
- [ ] Add search functionality
- [ ] Add export audit logs

**End of Day 6:** Operator console complete + Audit working ✓

---

### **DAY 7: Maintenance, Polish & Testing** (8 hours)

#### ☐ Task 7.1: Maintenance Management (2h)
- [ ] Create MaintenanceRecord model
- [ ] Create `/api/maintenance` endpoints
- [ ] Create `MaintenanceForm.tsx`
- [ ] Add maintenance calendar view

#### ☐ Task 7.2: UI Polish (2h)
- [ ] Review all new screens for consistency
- [ ] Fix any layout issues
- [ ] Ensure dark mode works everywhere
- [ ] Ensure mobile responsive

#### ☐ Task 7.3: Testing (2h)
- [ ] Test all CRUD operations
- [ ] Test booking flow with new features
- [ ] Test operator console actions
- [ ] Test analytics data accuracy

#### ☐ Task 7.4: Documentation (1h)
- [ ] Update README with new features
- [ ] Document API endpoints (Postman/OpenAPI)
- [ ] Create user guide screenshots
- [ ] Add code comments

#### ☐ Task 7.5: Bug Fixes (1h)
- [ ] Fix any bugs found during testing
- [ ] Performance optimization if needed
- [ ] Final cleanup & commit

**End of Day 7:** All features complete & tested ✓

---

## 📝 DETAILED FEATURE SPECS

---

## 1️⃣ VEHICLE MANAGEMENT ENHANCEMENT

### **Objective**
Allow users to register and manage multiple vehicles with quick selection during booking.

### **Current State**
- Users enter vehicle details manually each booking
- No vehicle history or saved profiles

### **New Features**
- ✅ Register multiple vehicles (unlimited)
- ✅ Quick vehicle selector during booking
- ✅ Vehicle profile: plate, brand, model, color, body type
- ✅ Optional photo upload
- ✅ Set default vehicle
- ✅ Edit/delete vehicles
- ✅ Per-vehicle parking history
- ✅ Favorite vehicle marking

### **Database Schema Changes**
```prisma
model Vehicle {
  id           String   @id @default(cuid())
  userId       String
  nickname     String   // e.g., "Mobil Putih", "Motor Matic"
  licensePlate String
  brand        String?
  model        String?
  color        String?
  bodyType     String?  // MPV, SUV, Sedan, etc.
  photoUrl     String?
  isDefault    Boolean  @default(false)
  isFavorite   Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  reservations Reservation[]
  
  @@index([userId])
}
```

### **UI Components**
- `VehicleListView.tsx` - List all vehicles with quick actions
- `VehicleFormModal.tsx` - Add/edit vehicle form
- `VehicleSelector.tsx` - Quick pick dropdown in booking flow
- `VehicleCard.tsx` - Individual vehicle display card
- `VehicleHistoryView.tsx` - Per-vehicle reservation history

### **API Endpoints**
```
GET    /api/vehicles              - List user vehicles
POST   /api/vehicles              - Create new vehicle
PATCH  /api/vehicles/:id          - Update vehicle
DELETE /api/vehicles/:id          - Delete vehicle
POST   /api/vehicles/:id/photo    - Upload vehicle photo
PATCH  /api/vehicles/:id/default  - Set as default
```

### **User Flow**
1. User goes to Profile > My Vehicles
2. Click "Add Vehicle" button
3. Fill form (plate is required, rest optional)
4. Save → Vehicle appears in list
5. During booking, select from dropdown instead of typing
6. System auto-fills vehicle details

### **Validation Rules**
- License plate format validation (Indonesian format)
- Duplicate plate detection within same user
- Image size limit: 5MB, formats: JPG, PNG
- Nickname max 50 characters

### **Edge Cases**
- What if user deletes vehicle with active reservations? → Soft delete, mark as archived
- Plate format variations? → Normalize on save (remove spaces, uppercase)
- Multiple users same plate? → Allow (different people can have same plate)

---

## 2️⃣ ADVANCED FILTERS & SEARCH

### **Objective**
Help users find the perfect parking slot quickly with powerful filtering and search.

### **Current State**
- Users see all available slots
- No filtering or sorting options

### **New Features**
- ✅ Filter by slot type (Standard, EV, Disability)
- ✅ Filter by location (Row A, Row B)
- ✅ Filter by availability status
- ✅ Search by slot number
- ✅ Sort by: Distance, Price, Slot Number
- ✅ Quick filters: "Available Now", "Cheapest", "EV Only"
- ✅ Save favorite slots
- ✅ Recent slots history
- ✅ Filter state persistence (remember last used filters)

### **UI Components**
- `FilterBar.tsx` - Top filter controls
- `SlotFilterSheet.tsx` - Advanced filter bottom sheet
- `SortDropdown.tsx` - Sort options dropdown
- `QuickFilterChips.tsx` - One-tap filter chips
- `FavoriteSlotsList.tsx` - Saved favorite slots

### **Zustand Store Extension**
```typescript
interface FilterState {
  slotTypes: SlotType[];
  rows: string[];
  availability: 'all' | 'available' | 'reserved';
  sortBy: 'number' | 'price' | 'distance';
  searchQuery: string;
  favoriteSlots: string[]; // slot IDs
  recentSlots: string[];
}
```

### **Filter Logic**
```typescript
function filterSlots(slots: Slot[], filters: FilterState): Slot[] {
  return slots
    .filter(slot => {
      // Type filter
      if (filters.slotTypes.length > 0 && !filters.slotTypes.includes(slot.slotType)) {
        return false;
      }
      
      // Row filter
      if (filters.rows.length > 0 && !filters.rows.includes(slot.rowLabel)) {
        return false;
      }
      
      // Search query
      if (filters.searchQuery && !slot.slotNumber.includes(filters.searchQuery)) {
        return false;
      }
      
      // Availability filter
      if (filters.availability === 'available' && slot.status !== 'AVAILABLE') {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (filters.sortBy) {
        case 'number':
          return a.slotNumber.localeCompare(b.slotNumber);
        case 'price':
          return getCurrentPrice(a) - getCurrentPrice(b);
        case 'distance':
          return getDistance(a) - getDistance(b);
        default:
          return 0;
      }
    });
}
```

### **Quick Filter Presets**
- **Available Now**: Status = Available, sorted by nearest
- **Cheapest**: Sort by price ascending
- **EV Only**: Type = EV, available only
- **Disability**: Type = Disability, available only
- **My Favorites**: Show only favorited slots

### **Local Storage**
```typescript
// Persist filter state
localStorage.setItem('parking-filters', JSON.stringify(filters));

// Persist favorites
localStorage.setItem('favorite-slots', JSON.stringify(favoriteSlots));
```

### **User Flow**
1. User opens Home view
2. Clicks filter icon → Filter sheet opens
3. Selects criteria (e.g., EV only, Row A)
4. Applies filter → Slot list updates
5. User can save frequently used slots as favorites
6. Next time: filters are remembered

---

## 3️⃣ DYNAMIC PRICING 2.0

### **Objective**
Optimize revenue through intelligent, real-time pricing based on demand, events, and time.

### **Current State**
- Basic demand tier pricing (LOW/MEDIUM/HIGH)
- Static pricing logic

### **Enhanced Features**
- ✅ Real-time demand calculation
- ✅ Event-based pricing (exam week, graduation, holidays)
- ✅ Time-based pricing (peak hours, weekends)
- ✅ Early bird discount (book >24h in advance)
- ✅ Last-minute surge pricing (book <2h before)
- ✅ Occupancy-based pricing (% full → price increase)
- ✅ Weather-based pricing (heavy rain → covered slots premium)
- ✅ Price prediction display ("Price may increase by 6 PM")
- ✅ Price history chart

### **Pricing Factors**
```typescript
interface PricingFactors {
  baseFee: number;           // 15000
  demandMultiplier: number;  // 1.0 - 2.0
  eventMultiplier: number;   // 1.0 - 1.5
  timeMultiplier: number;    // 0.8 - 1.3
  advanceDiscount: number;   // 0.85 (15% off)
  surgeMultiplier: number;   // 1.0 - 1.8
  occupancyRate: number;     // 0-100%
  weatherPremium: number;    // 1.0 - 1.2
}

function calculatePrice(factors: PricingFactors): number {
  let price = factors.baseFee;
  
  // Apply multipliers
  price *= factors.demandMultiplier;
  price *= factors.eventMultiplier;
  price *= factors.timeMultiplier;
  price *= factors.weatherPremium;
  
  // Occupancy surge
  if (factors.occupancyRate > 90) {
    price *= 1.5;
  } else if (factors.occupancyRate > 75) {
    price *= 1.25;
  }
  
  // Early bird discount
  if (factors.advanceDiscount < 1.0) {
    price *= factors.advanceDiscount;
  }
  
  // Last-minute surge
  price *= factors.surgeMultiplier;
  
  // Round to nearest 1000
  return Math.round(price / 1000) * 1000;
}
```

### **Event Calendar**
```typescript
interface EventConfig {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  priceMultiplier: number;
  affectedCampuses: string[];
}

const events: EventConfig[] = [
  {
    id: 'exam-week-mid',
    name: 'Mid-term Exam Week',
    startDate: '2026-10-05',
    endDate: '2026-10-12',
    priceMultiplier: 1.3,
    affectedCampuses: ['anggrek', 'alamsutera', 'bekasi']
  },
  {
    id: 'graduation-2026',
    name: 'Graduation Ceremony',
    startDate: '2026-11-15',
    endDate: '2026-11-16',
    priceMultiplier: 1.5,
    affectedCampuses: ['anggrek']
  }
];
```

### **Time-based Rules**
```typescript
function getTimeMultiplier(hour: number, dayOfWeek: number): number {
  // Weekend discount
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 0.85;
  }
  
  // Peak hours (7-9 AM, 5-7 PM)
  if ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19)) {
    return 1.3;
  }
  
  // Off-peak (9 PM - 6 AM)
  if (hour >= 21 || hour < 6) {
    return 0.8;
  }
  
  // Normal hours
  return 1.0;
}
```

### **UI Enhancements**
- Show price badge with trend indicator (↑↓)
- "Best time to book" suggestion
- Price history mini-chart (last 7 days)
- Discount badge for early bookings
- Surge pricing warning for last-minute

### **Price Prediction**
```typescript
function predictPriceChange(slotId: string, targetTime: string): {
  currentPrice: number;
  predictedPrice: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
} {
  // Use historical data + current occupancy to predict
  // ML model optional, simple heuristic for v1
}
```

### **Analytics Integration**
- Track price changes vs. booking conversion
- A/B test different pricing strategies
- Revenue optimization reports

---

## 4️⃣ MAINTENANCE MANAGEMENT SYSTEM

### **Objective**
Systematic tracking and scheduling of parking slot maintenance.

### **Database Schema**
```prisma
model MaintenanceRecord {
  id          String   @id @default(cuid())
  slotId      String
  slotNumber  String
  type        String   // CLEANING, REPAIR, INSPECTION, MARKING
  status      String   // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
  priority    String   // LOW, MEDIUM, HIGH, URGENT
  scheduledAt DateTime
  startedAt   DateTime?
  completedAt DateTime?
  description String
  notes       String?
  reportedBy  String   // userId or "SYSTEM"
  assignedTo  String?  // operator userId
  cost        Float?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([slotId])
  @@index([status])
  @@index([scheduledAt])
}

model Slot {
  // ... existing fields
  maintenanceStatus String @default("OPERATIONAL") // OPERATIONAL, MAINTENANCE, DAMAGED
  lastMaintenance   DateTime?
  nextMaintenance   DateTime?
}
```

### **Features**
- ✅ Schedule maintenance for specific slots
- ✅ Maintenance calendar view
- ✅ Auto-block slots during maintenance period
- ✅ Maintenance types: Cleaning, Repair, Inspection, Line Marking
- ✅ Priority levels: Low, Medium, High, Urgent
- ✅ Assign to operators
- ✅ Cost tracking
- ✅ Maintenance history per slot
- ✅ Recurring maintenance schedules
- ✅ Auto-notify affected bookings
- ✅ Issue reporting from operators/users

### **UI Components**
- `MaintenanceCalendar.tsx` - Calendar view of scheduled maintenance
- `MaintenanceForm.tsx` - Create/edit maintenance record
- `MaintenanceListView.tsx` - List all maintenance tasks
- `SlotMaintenanceHistory.tsx` - Per-slot maintenance log
- `IssueReportModal.tsx` - Quick issue reporting

### **API Endpoints**
```
GET    /api/maintenance               - List all maintenance records
POST   /api/maintenance               - Schedule new maintenance
PATCH  /api/maintenance/:id           - Update maintenance record
DELETE /api/maintenance/:id           - Cancel maintenance
GET    /api/maintenance/slot/:slotId  - Slot maintenance history
POST   /api/maintenance/report-issue  - Report slot issue
```

### **Auto-Notification Logic**
```typescript
async function scheduleMaintenanceAndNotify(record: MaintenanceRecord) {
  // 1. Mark slot as MAINTENANCE
  await updateSlot(record.slotId, { maintenanceStatus: 'MAINTENANCE' });
  
  // 2. Find affected reservations
  const affected = await findReservationsDuringPeriod(
    record.slotId,
    record.scheduledAt,
    record.estimatedDuration
  );
  
  // 3. Notify users
  for (const reservation of affected) {
    await sendNotification(reservation.userId, {
      type: 'maintenance-conflict',
      message: `Your booking at ${record.slotNumber} on ${formatDate(record.scheduledAt)} needs to be rescheduled due to maintenance.`,
      actions: ['RESCHEDULE', 'CANCEL_WITH_REFUND']
    });
  }
  
  // 4. Log maintenance
  await createMaintenanceRecord(record);
}
```

### **Recurring Maintenance**
```typescript
interface RecurringConfig {
  interval: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number; // for weekly
  dayOfMonth?: number; // for monthly
  time: string; // HH:mm
  duration: number; // minutes
}

// Example: Weekly cleaning every Sunday 6 AM
{
  type: 'CLEANING',
  interval: 'weekly',
  dayOfWeek: 0,
  time: '06:00',
  duration: 120
}
```

### **Operator Workflow**
1. Operator notices damaged slot
2. Opens operator console → Report Issue
3. Fill form: Slot, Issue type, Priority, Description, Photo
4. System creates maintenance record
5. Admin reviews and schedules maintenance
6. Assign to operator
7. Operator completes → Mark as done
8. Slot auto-reopens for booking

---

## 5️⃣ PERSONALIZATION ENGINE

### **Objective**
Tailor the app experience to each user's preferences and behavior patterns.

### **Personalization Features**
- ✅ Remember preferences (language, campus, theme)
- ✅ Default vehicle selection
- ✅ Personalized home screen layout
- ✅ Quick actions based on usage patterns
- ✅ Smart suggestions
- ✅ Recently used slots quick access
- ✅ Frequently booked time slots
- ✅ Predictive booking (book for tomorrow same time)

### **User Profile Extension**
```typescript
interface UserPreferences {
  defaultCampusId: string;
  defaultVehicleId?: string;
  preferredLanguage: 'id' | 'en';
  theme: 'light' | 'dark' | 'system';
  notificationSettings: {
    bookingConfirm: boolean;
    sessionEnding: boolean;
    overtime: boolean;
    promotions: boolean;
  };
  quickActions: string[]; // ['BOOK_NOW', 'VIEW_TICKET', 'TOP_UP']
  homeLayout: 'grid' | 'list' | 'map';
  favoriteSlots: string[];
  recentSlots: string[];
}

interface UsagePatterns {
  mostFrequentCampus: string;
  mostFrequentSlots: { slotId: string; count: number }[];
  avgBookingTime: string; // "08:30"
  avgDuration: number; // minutes
  preferredDays: number[]; // [1, 2, 3] = Mon, Tue, Wed
  totalBookings: number;
  totalSpent: number;
}
```

### **Smart Suggestions Algorithm**
```typescript
function generateSmartSuggestions(
  user: User,
  patterns: UsagePatterns
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // Pattern: User always books Mon-Wed 8 AM
  if (isPatternDetected(patterns, 'regular-schedule')) {
    suggestions.push({
      type: 'quick-book',
      title: 'Book Your Usual Spot?',
      description: `${patterns.mostFrequentSlots[0].slotNumber} at ${patterns.avgBookingTime}`,
      action: () => quickBook(patterns)
    });
  }
  
  // Pattern: Low wallet balance
  if (user.walletBalance < patterns.avgBookingCost * 2) {
    suggestions.push({
      type: 'top-up',
      title: 'Wallet Running Low',
      description: 'Top up now to avoid booking delays',
      action: () => openTopUp()
    });
  }
  
  // Pattern: Hasn't booked this week
  if (daysSinceLastBooking() > 7 && patterns.totalBookings > 5) {
    suggestions.push({
      type: 'comeback',
      title: 'Welcome Back!',
      description: 'Your favorite slot A-15 is available today',
      action: () => showSlotDetails('A-15')
    });
  }
  
  return suggestions;
}
```

### **Personalized Home Screen**
```typescript
function renderPersonalizedHome(user: User, patterns: UsagePatterns) {
  return (
    <div>
      {/* Smart Banner */}
      <SmartSuggestionCard suggestions={generateSmartSuggestions()} />
      
      {/* Quick Actions (user-configurable) */}
      <QuickActionsRow actions={user.preferences.quickActions} />
      
      {/* Favorite Slots */}
      {user.preferences.favoriteSlots.length > 0 && (
        <FavoriteSlotsSection slots={user.preferences.favoriteSlots} />
      )}
      
      {/* Recent Bookings */}
      <RecentBookingsSection limit={3} />
      
      {/* Recommended Slots (based on patterns) */}
      <RecommendedSlotsSection patterns={patterns} />
      
      {/* All Slots (filtered by preferences) */}
      <AllSlotsSection layout={user.preferences.homeLayout} />
    </div>
  );
}
```

### **Quick Actions Configuration**
Users can customize their quick actions bar from these options:
- Book Now (favorite slot)
- View Active Ticket
- Scan QR Code
- Top Up Wallet
- View History
- Open Map
- Contact Support
- Extend Session

### **Smart Defaults**
```typescript
function getSmartDefaults(user: User, patterns: UsagePatterns) {
  return {
    suggestedSlot: patterns.mostFrequentSlots[0]?.slotId,
    suggestedTime: patterns.avgBookingTime,
    suggestedDuration: patterns.avgDuration,
    suggestedVehicle: user.preferences.defaultVehicleId,
    suggestedCampus: patterns.mostFrequentCampus,
  };
}
```

### **Implementation**
- Track user actions in background (event logging)
- Analyze patterns weekly (cron job)
- Cache suggestions (refresh every 6 hours)
- Allow users to dismiss/customize suggestions
- Privacy: All data local, no external tracking

---

## 6️⃣ ANPR (AUTOMATIC NUMBER PLATE RECOGNITION)

### **Objective**
Enable automatic vehicle identification and validation using camera-based license plate recognition.

### **System Architecture**
```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Camera    │─────▶│ Edge Device  │─────▶│   Server    │
│ (Entry/Exit)│      │ (Processing) │      │   (API)     │
└─────────────┘      └──────────────┘      └─────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  ANPR Engine │
                     │  (OpenALPR/  │
                     │   Tesseract) │
                     └──────────────┘
```

### **Features**
- ✅ Real-time plate detection at entry/exit gates
- ✅ Auto check-in when plate matches reservation
- ✅ Auto check-out and fare calculation
- ✅ Mismatch alert (wrong vehicle)
- ✅ Blacklist detection
- ✅ Unknown vehicle logging
- ✅ Manual override for operators
- ✅ Confidence score display
- ✅ Image capture and archival
- ✅ Entry/exit event logging

### **Database Schema**
```prisma
model AnprLog {
  id           String   @id @default(cuid())
  cameraId     String
  location     String   // "ENTRY_GATE_A", "EXIT_GATE_B"
  plateNumber  String
  confidence   Float    // 0.0 - 1.0
  imageUrl     String
  timestamp    DateTime @default(now())
  matchStatus  String   // MATCHED, MISMATCH, UNKNOWN, BLACKLIST
  reservationId String?
  action       String   // CHECK_IN, CHECK_OUT, DENIED, LOGGED
  
  @@index([plateNumber])
  @@index([timestamp])
  @@index([cameraId])
}

model Blacklist {
  id          String   @id @default(cuid())
  plateNumber String   @unique
  reason      String
  addedBy     String   // operator userId
  addedAt     DateTime @default(now())
  expiresAt   DateTime?
  isActive    Boolean  @default(true)
}
```

### **ANPR Engine Integration**
```typescript
// Option 1: Cloud API (e.g., Plate Recognizer, OpenALPR Cloud)
async function recognizePlate(imageBuffer: Buffer): Promise<AnprResult> {
  const response = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${process.env.ANPR_API_KEY}`,
    },
    body: imageBuffer
  });
  
  const data = await response.json();
  
  return {
    plate: data.results[0]?.plate,
    confidence: data.results[0]?.score,
    coordinates: data.results[0]?.box
  };
}

// Option 2: Self-hosted (Tesseract.js for MVP)
import Tesseract from 'tesseract.js';

async function recognizePlateLocal(imageBuffer: Buffer): Promise<AnprResult> {
  const { data } = await Tesseract.recognize(imageBuffer, 'eng', {
    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  });
  
  // Extract plate pattern (e.g., B1234XYZ)
  const plate = extractPlatePattern(data.text);
  
  return {
    plate,
    confidence: data.confidence / 100
  };
}
```

### **Entry Gate Flow**
```typescript
async function handleEntryGateDetection(plateNumber: string, imageUrl: string) {
  // 1. Log detection
  const log = await createAnprLog({
    location: 'ENTRY_GATE_A',
    plateNumber,
    imageUrl,
    action: 'CHECK_IN'
  });
  
  // 2. Check blacklist
  const blacklisted = await checkBlacklist(plateNumber);
  if (blacklisted) {
    await updateAnprLog(log.id, { matchStatus: 'BLACKLIST', action: 'DENIED' });
    await alertOperator('Blacklisted vehicle detected', plateNumber);
    return { allowed: false, reason: 'BLACKLIST' };
  }
  
  // 3. Find active reservation
  const reservation = await findActiveReservation(plateNumber);
  
  if (!reservation) {
    await updateAnprLog(log.id, { matchStatus: 'UNKNOWN' });
    // Option: Allow walk-in or alert operator
    return { allowed: false, reason: 'NO_RESERVATION' };
  }
  
  // 4. Validate reservation time window
  if (!isWithinTimeWindow(reservation)) {
    return { allowed: false, reason: 'OUTSIDE_TIME_WINDOW' };
  }
  
  // 5. Auto check-in
  await checkInReservation(reservation.id);
  await updateAnprLog(log.id, { 
    matchStatus: 'MATCHED',
    reservationId: reservation.id 
  });
  
  // 6. Open gate
  await sendGateCommand('ENTRY_A', 'OPEN');
  
  // 7. Notify user
  await sendNotification(reservation.userId, {
    type: 'auto-checkin',
    message: `Welcome! Auto check-in at ${formatTime(new Date())}`
  });
  
  return { allowed: true, reservation };
}
```

### **Exit Gate Flow**
```typescript
async function handleExitGateDetection(plateNumber: string, imageUrl: string) {
  // 1. Log detection
  const log = await createAnprLog({
    location: 'EXIT_GATE_A',
    plateNumber,
    imageUrl,
    action: 'CHECK_OUT'
  });
  
  // 2. Find checked-in reservation
  const reservation = await findCheckedInReservation(plateNumber);
  
  if (!reservation) {
    await updateAnprLog(log.id, { matchStatus: 'UNKNOWN' });
    await alertOperator('Unknown vehicle at exit', plateNumber);
    return { allowed: false, reason: 'NO_ACTIVE_SESSION' };
  }
  
  // 3. Calculate overtime
  const now = Date.now();
  const overtime = calculateOvertime(reservation, now);
  
  // 4. Check wallet balance
  if (overtime > 0) {
    const balance = await getWalletBalance(reservation.userId);
    if (balance < overtime) {
      await alertOperator('Insufficient balance for exit', plateNumber);
      return { allowed: false, reason: 'INSUFFICIENT_BALANCE' };
    }
  }
  
  // 5. Auto check-out
  await checkOutReservation(reservation.id, overtime);
  await updateAnprLog(log.id, { 
    matchStatus: 'MATCHED',
    reservationId: reservation.id 
  });
  
  // 6. Deduct overtime fee
  if (overtime > 0) {
    await deductFromWallet(reservation.userId, overtime, 'OVERTIME');
  }
  
  // 7. Open gate
  await sendGateCommand('EXIT_A', 'OPEN');
  
  // 8. Send receipt
  await sendNotification(reservation.userId, {
    type: 'auto-checkout',
    message: `Thank you! Total: ${rupiah(reservation.serviceFee + overtime)}`
  });
  
  return { allowed: true, reservation, overtime };
}
```

### **Mismatch Detection**
```typescript
async function detectMismatch(detectedPlate: string, reservation: Reservation) {
  if (normalizeplate(detectedPlate) !== normalizePlate(reservation.vehiclePlate)) {
    // Alert operator
    await createAlert({
      type: 'PLATE_MISMATCH',
      severity: 'HIGH',
      message: `Detected: ${detectedPlate}, Expected: ${reservation.vehiclePlate}`,
      reservationId: reservation.id
    });
    
    // Log for audit
    await createAuditLog({
      event: 'PLATE_MISMATCH',
      details: { detectedPlate, expectedPlate: reservation.vehiclePlate }
    });
    
    return true;
  }
  return false;
}
```

### **Operator Console Integration**
- Live feed from ANPR cameras
- Manual override controls
- Confidence threshold adjustment
- Blacklist management
- Mismatch review queue
- Gate control panel

### **API Endpoints**
```
POST   /api/anpr/detect        - Process plate detection
GET    /api/anpr/logs          - Get ANPR logs
POST   /api/anpr/blacklist     - Add to blacklist
DELETE /api/anpr/blacklist/:id - Remove from blacklist
POST   /api/anpr/gate/open     - Manual gate control
```

### **Hardware Requirements**
- IP cameras (1080p minimum) at entry/exit
- Edge computing device (Raspberry Pi 4 or Intel NUC)
- Gate controller (relay/motor driver)
- Network switch and cabling
- Optional: LED display for feedback

### **MVP Approach**
1. **Phase 1 (Week 1):** Backend API + Manual testing with uploaded images
2. **Phase 2:** Integrate with single test camera
3. **Phase 3:** Deploy to all gates

---

## 7️⃣ ADVANCED OPERATOR CONSOLE

### **Objective**
Comprehensive command center for parking operators with real-time monitoring and control.

### **Dashboard Sections**

#### **1. Live Occupancy Monitor**
```typescript
interface LiveOccupancy {
  total: number;
  occupied: number;
  reserved: number;
  available: number;
  maintenance: number;
  occupancyRate: number;
  trend: 'up' | 'down' | 'stable';
}
```

**UI Features:**
- Real-time slot status grid (color-coded)
- Occupancy percentage gauge
- Capacity trend chart (last 24h)
- Floor/zone breakdown
- Auto-refresh every 30 seconds

#### **2. Active Sessions Panel**
- List of all checked-in vehicles
- Time remaining per session
- Overtime warnings (red badge)
- Quick actions: Extend, Force check-out
- Search by plate or slot number

#### **3. Quick Actions**
```typescript
const operatorActions = [
  {
    id: 'manual-checkin',
    label: 'Manual Check-In',
    icon: LogIn,
    handler: () => openManualCheckinModal()
  },
  {
    id: 'manual-checkout',
    label: 'Manual Check-Out',
    icon: LogOut,
    handler: () => openManualCheckoutModal()
  },
  {
    id: 'release-slot',
    label: 'Release Slot',
    icon: Unlock,
    handler: () => openReleaseSlotModal()
  },
  {
    id: 'override-booking',
    label: 'Override Booking',
    icon: AlertTriangle,
    handler: () => openOverrideModal()
  },
  {
    id: 'report-incident',
    label: 'Report Incident',
    icon: AlertCircle,
    handler: () => openIncidentReport()
  }
];
```

#### **4. Incident Management**
```prisma
model Incident {
  id          String   @id @default(cuid())
  type        String   // VEHICLE_DAMAGE, DISPUTE, LOST_TICKET, SYSTEM_ERROR
  severity    String   // LOW, MEDIUM, HIGH, CRITICAL
  slotId      String?
  slotNumber  String?
  description String
  reportedBy  String   // operator userId
  status      String   // OPEN, IN_PROGRESS, RESOLVED, ESCALATED
  resolution  String?
  attachments String[] // image URLs
  createdAt   DateTime @default(now())
  resolvedAt  DateTime?
  
  @@index([status])
  @@index([createdAt])
}
```

**Incident Types:**
- Vehicle damage
- Customer dispute
- Lost ticket
- System error
- Gate malfunction
- Payment issue
- Suspicious activity

#### **5. Communication Center**
```typescript
// Send message to specific user
async function sendOperatorMessage(userId: string, message: string) {
  await createNotification({
    userId,
    type: 'operator-message',
    message,
    priority: 'HIGH',
    from: 'OPERATOR'
  });
}

// Broadcast to all active users
async function broadcast(message: string, targetCampus?: string) {
  const users = await getActiveUsers(targetCampus);
  for (const user of users) {
    await sendOperatorMessage(user.id, message);
  }
}
```

#### **6. Override & Manual Controls**

**Manual Check-In:**
```typescript
async function manualCheckin(data: {
  slotId: string;
  vehiclePlate: string;
  driverName: string;
  startTime: Date;
  endTime: Date;
  reason: string;
  operatorId: string;
}) {
  // 1. Create reservation (bypass payment)
  const reservation = await createReservation({
    ...data,
    type: 'WALK_IN',
    status: 'CHECKED_IN',
    serviceFee: 0, // Operator override
    notes: `Manual check-in by operator: ${data.reason}`
  });
  
  // 2. Audit log
  await createAuditLog({
    event: 'MANUAL_CHECKIN',
    operatorId: data.operatorId,
    details: data
  });
  
  return reservation;
}
```

**Release Slot:**
```typescript
async function releaseSlot(slotId: string, reason: string, operatorId: string) {
  // 1. Cancel active reservation
  const reservation = await findActiveReservation({ slotId });
  if (reservation) {
    await cancelReservation(reservation.id, reason);
    
    // Full refund
    await refundToWallet(reservation.userId, reservation.serviceFee);
  }
  
  // 2. Mark slot as available
  await updateSlotStatus(slotId, 'AVAILABLE');
  
  // 3. Audit
  await createAuditLog({
    event: 'SLOT_RELEASED',
    operatorId,
    slotId,
    reason
  });
}
```

#### **7. Export & Reports**

**Available Exports:**
- Daily revenue report (CSV/PDF)
- Occupancy report (Excel)
- Incident log (PDF)
- Active sessions snapshot (CSV)
- Audit trail (JSON/CSV)

```typescript
async function exportDailyReport(date: string, format: 'csv' | 'pdf') {
  const data = await generateDailyReport(date);
  
  if (format === 'csv') {
    return convertToCSV(data);
  } else {
    return generatePDF(data, 'daily-report-template');
  }
}
```

#### **8. Alerts & Notifications Queue**

**Operator Alerts:**
- ⚠️ High occupancy (>90%)
- 🚨 Multiple overtime sessions
- 🔴 ANPR mismatch detected
- ⚡ System error/downtime
- 💰 Low wallet balance (user at exit)
- 🚗 Blacklisted vehicle detected

**Alert Priority System:**
```typescript
interface OperatorAlert {
  id: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: string;
  message: string;
  actionRequired: boolean;
  quickActions?: Action[];
  createdAt: number;
  acknowledged: boolean;
}
```

### **UI Layout**
```
┌───────────────────────────────────────────────────┐
│  [Logo] Operator Console  [Campus] [Theme] [Lang] │
├───────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │ Occupancy   │  │ Active      │  │ Alerts   │ │
│  │ 78%  ↑     │  │ Sessions    │  │ 3 new    │ │
│  │ 31/40      │  │ 28          │  │          │ │
│  └─────────────┘  └─────────────┘  └──────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │ Live Slot Grid (Color-coded)                │ │
│  │ [A-01] [A-02] [A-03] [A-04] ...             │ │
│  │  🟢     🔴     🟢     🟡                      │ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │ Active Sessions Table                       │ │
│  │ Slot  | Plate    | Time Left | Actions      │ │
│  │ A-05  | B1234XY  | 45 min    | [Extend] ...│ │
│  └─────────────────────────────────────────────┘ │
│                                                   │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐           │
│  │Manual│ │Release│ │Report│ │Broad-│          │
│  │Checkin│ │Slot  │ │Issue │ │cast  │          │
│  └──────┘ └──────┘ └──────┘ └──────┘           │
│                                                   │
└───────────────────────────────────────────────────┘
```

### **Real-time Updates**
```typescript
// WebSocket connection for live updates
const ws = new WebSocket('wss://api.parkir.binus.ac.id/operator');

ws.on('occupancy-update', (data) => {
  updateOccupancyDisplay(data);
});

ws.on('session-change', (data) => {
  updateSessionsTable(data);
});

ws.on('alert', (alert) => {
  showOperatorAlert(alert);
  playNotificationSound();
});
```

### **Permissions**
```typescript
enum OperatorPermission {
  VIEW_DASHBOARD = 'view_dashboard',
  MANUAL_CHECKIN = 'manual_checkin',
  MANUAL_CHECKOUT = 'manual_checkout',
  RELEASE_SLOT = 'release_slot',
  OVERRIDE_BOOKING = 'override_booking',
  MANAGE_BLACKLIST = 'manage_blacklist',
  VIEW_REPORTS = 'view_reports',
  EXPORT_DATA = 'export_data',
  BROADCAST_MESSAGE = 'broadcast_message',
  MANAGE_INCIDENTS = 'manage_incidents'
}
```

---

## 8️⃣ AUDIT & COMPLIANCE MODULE

### **Objective**
Complete transparency and accountability through comprehensive logging and audit trails.

### **Audit Scope**
- 📝 All user actions
- 🔧 All operator actions
- 💰 All financial transactions
- 🚗 All vehicle movements
- ⚙️ All system events
- 🔐 All authentication events

### **Database Schema**
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  timestamp DateTime @default(now())
  
  // Who
  userId    String?
  operatorId String?
  actor     String   // "USER", "OPERATOR", "SYSTEM", "ANPR"
  
  // What
  event     String   // e.g., "BOOKING_CREATED", "MANUAL_CHECKOUT", "PAYMENT_PROCESSED"
  category  String   // "USER_ACTION", "OPERATOR_ACTION", "FINANCIAL", "SYSTEM", "SECURITY"
  
  // Context
  entityType String? // "RESERVATION", "TRANSACTION", "SLOT", "USER"
  entityId   String?
  
  // Details
  details    Json    // Full event data
  changes    Json?   // Before/after for modifications
  
  // Metadata
  ipAddress  String?
  userAgent  String?
  location   String? // Campus ID
  
  // Compliance
  severity   String  // "INFO", "WARNING", "CRITICAL"
  tags       String[] // ["GDPR", "FINANCIAL", "SECURITY"]
  
  @@index([userId])
  @@index([event])
  @@index([category])
  @@index([timestamp])
  @@index([tags])
}
```

### **Event Categories**

#### **1. User Actions**
```typescript
const userEvents = [
  'USER_REGISTERED',
  'USER_LOGIN',
  'USER_LOGOUT',
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'CHECK_IN',
  'CHECK_OUT',
  'WALLET_TOP_UP',
  'VEHICLE_ADDED',
  'VEHICLE_UPDATED',
  'PROFILE_UPDATED',
  'PASSWORD_CHANGED'
];
```

#### **2. Operator Actions**
```typescript
const operatorEvents = [
  'MANUAL_CHECKIN',
  'MANUAL_CHECKOUT',
  'SLOT_RELEASED',
  'BOOKING_OVERRIDDEN',
  'BLACKLIST_ADDED',
  'MAINTENANCE_SCHEDULED',
  'INCIDENT_REPORTED',
  'BROADCAST_SENT',
  'REPORT_EXPORTED'
];
```

#### **3. Financial Events**
```typescript
const financialEvents = [
  'PAYMENT_PROCESSED',
  'PAYMENT_FAILED',
  'REFUND_ISSUED',
  'OVERTIME_CHARGED',
  'WALLET_CREDITED',
  'WALLET_DEBITED',
  'INVOICE_GENERATED'
];
```

#### **4. System Events**
```typescript
const systemEvents = [
  'SLOT_STATUS_CHANGED',
  'PRICE_UPDATED',
  'CAMPAIGN_ACTIVATED',
  'NOTIFICATION_SENT',
  'ANPR_DETECTION',
  'GATE_OPENED',
  'SYSTEM_ERROR',
  'DATA_EXPORTED'
];
```

### **Audit Logging Utility**
```typescript
class AuditLogger {
  async log(event: {
    actor: 'USER' | 'OPERATOR' | 'SYSTEM' | 'ANPR';
    userId?: string;
    operatorId?: string;
    event: string;
    category: string;
    entityType?: string;
    entityId?: string;
    details: any;
    changes?: { before: any; after: any };
    severity?: 'INFO' | 'WARNING' | 'CRITICAL';
    tags?: string[];
    request?: Request;
  }) {
    return await prisma.auditLog.create({
      data: {
        ...event,
        timestamp: new Date(),
        ipAddress: event.request?.ip,
        userAgent: event.request?.headers['user-agent'],
        severity: event.severity || 'INFO'
      }
    });
  }
  
  // Usage examples:
  
  async logBooking(reservation: Reservation, userId: string, request: Request) {
    await this.log({
      actor: 'USER',
      userId,
      event: 'BOOKING_CREATED',
      category: 'USER_ACTION',
      entityType: 'RESERVATION',
      entityId: reservation.id,
      details: {
        slotNumber: reservation.slotNumber,
        date: reservation.date,
        serviceFee: reservation.serviceFee
      },
      tags: ['FINANCIAL'],
      request
    });
  }
  
  async logOperatorOverride(
    action: string,
    operatorId: string,
    details: any,
    request: Request
  ) {
    await this.log({
      actor: 'OPERATOR',
      operatorId,
      event: action,
      category: 'OPERATOR_ACTION',
      details,
      severity: 'WARNING',
      tags: ['OVERRIDE', 'REQUIRES_REVIEW'],
      request
    });
  }
  
  async logPayment(
    transaction: Transaction,
    userId: string,
    success: boolean,
    request: Request
  ) {
    await this.log({
      actor: 'USER',
      userId,
      event: success ? 'PAYMENT_PROCESSED' : 'PAYMENT_FAILED',
      category: 'FINANCIAL',
      entityType: 'TRANSACTION',
      entityId: transaction.id,
      details: {
        amount: transaction.amount,
        method: transaction.method,
        ...(!success && { error: transaction.errorMessage })
      },
      severity: success ? 'INFO' : 'WARNING',
      tags: ['FINANCIAL', 'PCI_DSS'],
      request
    });
  }
}

export const auditLogger = new AuditLogger();
```

### **Change Tracking**
```typescript
// Track before/after changes
async function updateWithAudit<T>(
  model: string,
  id: string,
  updates: Partial<T>,
  userId: string
) {
  // 1. Get current state
  const before = await prisma[model].findUnique({ where: { id } });
  
  // 2. Apply updates
  const after = await prisma[model].update({
    where: { id },
    data: updates
  });
  
  // 3. Log changes
  await auditLogger.log({
    actor: 'USER',
    userId,
    event: `${model.toUpperCase()}_UPDATED`,
    category: 'USER_ACTION',
    entityType: model,
    entityId: id,
    details: updates,
    changes: { before, after }
  });
  
  return after;
}
```

### **Compliance Reports**

#### **Revenue Audit Report**
```typescript
async function generateRevenueAuditReport(
  startDate: Date,
  endDate: Date
): Promise<RevenueAuditReport> {
  const logs = await prisma.auditLog.findMany({
    where: {
      timestamp: { gte: startDate, lte: endDate },
      category: 'FINANCIAL'
    },
    orderBy: { timestamp: 'asc' }
  });
  
  return {
    period: { start: startDate, end: endDate },
    totalRevenue: calculateTotal(logs, 'PAYMENT_PROCESSED'),
    totalRefunds: calculateTotal(logs, 'REFUND_ISSUED'),
    netRevenue: 0, // calculated
    transactionCount: logs.length,
    paymentMethods: groupBy(logs, 'details.method'),
    dailyBreakdown: groupByDay(logs),
    discrepancies: findDiscrepancies(logs)
  };
}
```

#### **Operator Activity Report**
```typescript
async function generateOperatorActivityReport(
  operatorId: string,
  startDate: Date,
  endDate: Date
) {
  const logs = await prisma.auditLog.findMany({
    where: {
      operatorId,
      timestamp: { gte: startDate, lte: endDate },
      category: 'OPERATOR_ACTION'
    }
  });
  
  return {
    operator: await getOperatorInfo(operatorId),
    period: { start: startDate, end: endDate },
    totalActions: logs.length,
    actionBreakdown: countByEvent(logs),
    overrides: logs.filter(l => l.tags?.includes('OVERRIDE')),
    criticalActions: logs.filter(l => l.severity === 'CRITICAL'),
    timeline: logs.map(l => ({
      timestamp: l.timestamp,
      event: l.event,
      details: l.details
    }))
  };
}
```

#### **User Activity Timeline**
```typescript
async function getUserActivityTimeline(userId: string, limit: number = 50) {
  return await prisma.auditLog.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: limit,
    select: {
      timestamp: true,
      event: true,
      category: true,
      entityType: true,
      details: true
    }
  });
}
```

### **Data Retention Policy**
```typescript
// Retention rules (configurable)
const retentionPolicy = {
  USER_ACTION: 90,      // days
  OPERATOR_ACTION: 365, // 1 year
  FINANCIAL: 2555,      // 7 years (tax requirement)
  SECURITY: 365,        // 1 year
  SYSTEM: 30            // 30 days
};

// Automated cleanup (cron job)
async function cleanupOldAuditLogs() {
  for (const [category, days] of Object.entries(retentionPolicy)) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    await prisma.auditLog.deleteMany({
      where: {
        category,
        timestamp: { lt: cutoffDate }
      }
    });
  }
}
```

### **Compliance Dashboard**

**UI Components:**
- `AuditLogViewer.tsx` - Searchable log viewer
- `ComplianceReport.tsx` - Pre-built compliance reports
- `UserActivityTimeline.tsx` - User action history
- `OperatorActivityReport.tsx` - Operator accountability
- `FinancialAuditReport.tsx` - Revenue reconciliation
- `ExportAuditData.tsx` - Export for external auditors

**Filter Options:**
- Date range
- Event type
- Category
- Actor (user/operator/system)
- Severity
- Tags
- Entity type

**Search:**
- Full-text search in details
- Filter by user ID
- Filter by reservation ID
- Filter by transaction ID

### **API Endpoints**
```
GET  /api/audit/logs             - Query audit logs
GET  /api/audit/user/:userId     - User activity timeline
GET  /api/audit/operator/:id     - Operator activity report
GET  /api/audit/revenue          - Revenue audit report
POST /api/audit/export           - Export audit data
GET  /api/audit/stats            - Compliance statistics
```

### **Export Formats**
- **JSON:** Complete data export
- **CSV:** Tabular format for Excel
- **PDF:** Human-readable report
- **XML:** For external systems integration

### **Security**
- Audit logs are **immutable** (no updates/deletes except retention policy)
- Access restricted to authorized personnel
- Sensitive data (passwords, tokens) never logged
- Encryption at rest
- Secure export with authentication

---

## 9️⃣ LOYALTY & REWARDS PROGRAM

### **Objective**
Increase user retention and engagement through gamified loyalty system.

### **Program Structure**

#### **Point System**
```typescript
interface PointsEarning {
  action: string;
  points: number;
  multiplier?: number;
}

const pointsRules: PointsEarning[] = [
  { action: 'BOOKING_COMPLETED', points: 100 },
  { action: 'FIRST_BOOKING', points: 500 },
  { action: 'REFERRAL_SIGNUP', points: 1000 },
  { action: 'REFERRAL_FIRST_BOOKING', points: 500 },
  { action: 'WALLET_TOP_UP', points: 10 }, // 1 point per Rp1000
  { action: 'STREAK_3_DAYS', points: 200 },
  { action: 'STREAK_7_DAYS', points: 500 },
  { action: 'MONTHLY_10_BOOKINGS', points: 1000 },
  { action: 'PROFILE_COMPLETE', points: 100 },
  { action: 'REVIEW_SUBMITTED', points: 50 }
];
```

#### **Membership Tiers**
```typescript
interface Tier {
  name: string;
  minPoints: number;
  benefits: string[];
  discountRate: number;
  color: string;
  icon: string;
}

const tiers: Tier[] = [
  {
    name: 'Bronze',
    minPoints: 0,
    benefits: ['Earn points', 'Basic support'],
    discountRate: 0,
    color: '#CD7F32',
    icon: '🥉'
  },
  {
    name: 'Silver',
    minPoints: 5000,
    benefits: ['5% discount', 'Priority support', 'Early bird access'],
    discountRate: 0.05,
    color: '#C0C0C0',
    icon: '🥈'
  },
  {
    name: 'Gold',
    minPoints: 15000,
    benefits: ['10% discount', '24/7 support', 'Free cancellation', 'Slot reservation'],
    discountRate: 0.10,
    color: '#FFD700',
    icon: '🥇'
  },
  {
    name: 'Platinum',
    minPoints: 50000,
    benefits: ['15% discount', 'VIP support', 'Guaranteed slots', 'Monthly free hours'],
    discountRate: 0.15,
    color: '#E5E4E2',
    icon: '💎'
  }
];
```

### **Database Schema**
```prisma
model LoyaltyAccount {
  id              String   @id @default(cuid())
  userId          String   @unique
  points          Int      @default(0)
  lifetimePoints  Int      @default(0)
  tier            String   @default("Bronze")
  tierProgress    Float    @default(0) // % to next tier
  joinedAt        DateTime @default(now())
  lastEarnedAt    DateTime?
  
  streakDays      Int      @default(0)
  lastBookingDate String?  // YYYY-MM-DD
  
  referralCode    String   @unique
  referredBy      String?
  
  pointsHistory   PointTransaction[]
  rewards         RewardRedemption[]
  
  @@index([tier])
  @@index([points])
}

model PointTransaction {
  id          String   @id @default(cuid())
  accountId   String
  account     LoyaltyAccount @relation(fields: [accountId], references: [id])
  
  points      Int      // Positive for earned, negative for spent
  action      String
  description String
  metadata    Json?
  
  createdAt   DateTime @default(now())
  expiresAt   DateTime? // Points can expire after 1 year
  
  @@index([accountId])
  @@index([createdAt])
}

model Reward {
  id           String   @id @default(cuid())
  name         String
  description  String
  pointsCost   Int
  type         String   // DISCOUNT, FREE_HOURS, VOUCHER, MERCH
  value        Float?   // Discount amount or hours
  stock        Int?     // Null = unlimited
  imageUrl     String?
  isActive     Boolean  @default(true)
  minTier      String   @default("Bronze")
  
  redemptions  RewardRedemption[]
}

model RewardRedemption {
  id          String   @id @default(cuid())
  accountId   String
  account     LoyaltyAccount @relation(fields: [accountId], references: [id])
  rewardId    String
  reward      Reward   @relation(fields: [rewardId], references: [id])
  
  pointsSpent Int
  status      String   // REDEEMED, USED, EXPIRED
  code        String   @unique // Voucher code
  
  redeemedAt  DateTime @default(now())
  usedAt      DateTime?
  expiresAt   DateTime
  
  @@index([accountId])
  @@index([code])
}
```

### **Core Features**

#### **1. Earn Points**
```typescript
async function awardPoints(
  userId: string,
  action: string,
  metadata?: any
): Promise<PointTransaction> {
  const rule = pointsRules.find(r => r.action === action);
  if (!rule) throw new Error('Invalid action');
  
  let points = rule.points;
  
  // Apply multiplier (e.g., double points weekend)
  if (rule.multiplier) {
    points *= rule.multiplier;
  }
  
  // Get or create loyalty account
  const account = await getOrCreateLoyaltyAccount(userId);
  
  // Add points
  const transaction = await prisma.pointTransaction.create({
    data: {
      accountId: account.id,
      points,
      action,
      description: getActionDescription(action),
      metadata,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    }
  });
  
  // Update account balance
  await prisma.loyaltyAccount.update({
    where: { id: account.id },
    data: {
      points: { increment: points },
      lifetimePoints: { increment: points },
      lastEarnedAt: new Date()
    }
  });
  
  // Check tier upgrade
  await checkTierUpgrade(account.id);
  
  // Notify user
  await sendNotification(userId, {
    type: 'points_earned',
    message: `You earned ${points} points! 🎉`,
    data: { points, action }
  });
  
  return transaction;
}
```

#### **2. Redeem Rewards**
```typescript
async function redeemReward(
  userId: string,
  rewardId: string
): Promise<RewardRedemption> {
  const account = await getLoyaltyAccount(userId);
  const reward = await prisma.reward.findUnique({ where: { id: rewardId } });
  
  // Validations
  if (account.points < reward.pointsCost) {
    throw new Error('Insufficient points');
  }
  
  if (getTierLevel(account.tier) < getTierLevel(reward.minTier)) {
    throw new Error(`Requires ${reward.minTier} tier`);
  }
  
  if (reward.stock !== null && reward.stock <= 0) {
    throw new Error('Out of stock');
  }
  
  // Deduct points
  await prisma.pointTransaction.create({
    data: {
      accountId: account.id,
      points: -reward.pointsCost,
      action: 'REWARD_REDEEMED',
      description: `Redeemed: ${reward.name}`
    }
  });
  
  await prisma.loyaltyAccount.update({
    where: { id: account.id },
    data: { points: { decrement: reward.pointsCost } }
  });
  
  // Create redemption
  const code = generateVoucherCode();
  const redemption = await prisma.rewardRedemption.create({
    data: {
      accountId: account.id,
      rewardId: reward.id,
      pointsSpent: reward.pointsCost,
      status: 'REDEEMED',
      code,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
  });
  
  // Update stock
  if (reward.stock !== null) {
    await prisma.reward.update({
      where: { id: rewardId },
      data: { stock: { decrement: 1 } }
    });
  }
  
  // Notify
  await sendNotification(userId, {
    type: 'reward_redeemed',
    message: `${reward.name} redeemed! Use code: ${code}`,
    data: { reward, code }
  });
  
  return redemption;
}
```

#### **3. Streak Tracking**
```typescript
async function updateStreak(userId: string, bookingDate: string) {
  const account = await getLoyaltyAccount(userId);
  const lastDate = account.lastBookingDate;
  
  if (!lastDate) {
    // First booking
    await prisma.loyaltyAccount.update({
      where: { userId },
      data: {
        streakDays: 1,
        lastBookingDate: bookingDate
      }
    });
    return;
  }
  
  const dayDiff = daysBetween(lastDate, bookingDate);
  
  if (dayDiff === 1) {
    // Consecutive day
    const newStreak = account.streakDays + 1;
    
    await prisma.loyaltyAccount.update({
      where: { userId },
      data: {
        streakDays: newStreak,
        lastBookingDate: bookingDate
      }
    });
    
    // Award streak bonus
    if (newStreak === 3) {
      await awardPoints(userId, 'STREAK_3_DAYS');
    } else if (newStreak === 7) {
      await awardPoints(userId, 'STREAK_7_DAYS');
    } else if (newStreak % 30 === 0) {
      await awardPoints(userId, 'STREAK_30_DAYS', { streak: newStreak });
    }
    
  } else if (dayDiff > 1) {
    // Streak broken
    await prisma.loyaltyAccount.update({
      where: { userId },
      data: {
        streakDays: 1,
        lastBookingDate: bookingDate
      }
    });
    
    await sendNotification(userId, {
      type: 'streak_broken',
      message: `Your ${account.streakDays}-day streak ended. Start a new one!`
    });
  }
}
```

#### **4. Referral System**
```typescript
async function processReferral(newUserId: string, referralCode: string) {
  const referrer = await prisma.loyaltyAccount.findUnique({
    where: { referralCode }
  });
  
  if (!referrer) throw new Error('Invalid referral code');
  
  // Link referee to referrer
  await prisma.loyaltyAccount.update({
    where: { userId: newUserId },
    data: { referredBy: referrer.userId }
  });
  
  // Award points to referrer
  await awardPoints(referrer.userId, 'REFERRAL_SIGNUP', {
    referredUser: newUserId
  });
  
  // Bonus for new user
  await awardPoints(newUserId, 'FIRST_BOOKING', {
    referredBy: referrer.userId
  });
}

// When referee makes first booking
async function onFirstBookingByReferee(userId: string) {
  const account = await getLoyaltyAccount(userId);
  
  if (account.referredBy) {
    await awardPoints(account.referredBy, 'REFERRAL_FIRST_BOOKING', {
      referredUser: userId
    });
  }
}
```

### **Rewards Catalog**
```typescript
const rewardsCatalog = [
  {
    name: '10% Off Next Booking',
    description: 'Get 10% discount on your next parking session',
    pointsCost: 500,
    type: 'DISCOUNT',
    value: 0.10,
    minTier: 'Bronze'
  },
  {
    name: '1 Free Hour',
    description: 'Add 1 hour free to any booking',
    pointsCost: 1000,
    type: 'FREE_HOURS',
    value: 1,
    minTier: 'Silver'
  },
  {
    name: 'Rp20.000 Voucher',
    description: 'Redeem for Rp20.000 wallet credit',
    pointsCost: 2000,
    type: 'VOUCHER',
    value: 20000,
    minTier: 'Silver'
  },
  {
    name: 'VIP Reserved Slot (1 Day)',
    description: 'Reserve your favorite slot for 1 day',
    pointsCost: 3000,
    type: 'RESERVED_SLOT',
    minTier: 'Gold'
  },
  {
    name: 'Parkir Binus T-Shirt',
    description: 'Exclusive branded merchandise',
    pointsCost: 5000,
    type: 'MERCH',
    stock: 50,
    minTier: 'Gold'
  }
];
```

### **UI Components**
- `LoyaltyDashboard.tsx` - Overview of points, tier, rewards
- `PointsHistory.tsx` - Transaction history
- `RewardsShop.tsx` - Browse and redeem rewards
- `TierProgress.tsx` - Progress bar to next tier
- `ReferralCard.tsx` - Share referral code
- `StreakBadge.tsx` - Show current streak
- `LoyaltyBadges.tsx` - Achievement badges

### **Gamification Elements**
- 🏆 Achievements/Badges
- 🔥 Streak counter
- 📊 Leaderboard (optional)
- 🎯 Daily/weekly challenges
- 🎁 Surprise bonus points

---

## 🔟 ANALYTICS & REPORTING DASHBOARD

### **Objective**
Data-driven insights for business decisions and operational optimization.

### **Dashboard Sections**

#### **1. Overview KPIs**
```typescript
interface DashboardKPIs {
  // Revenue
  todayRevenue: number;
  todayRevenueVsYesterday: number; // % change
  monthRevenue: number;
  monthRevenueVsLastMonth: number;
  
  // Utilization
  currentOccupancy: number; // %
  avgOccupancy24h: number;
  peakOccupancyToday: number;
  
  // Bookings
  todayBookings: number;
  activeBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  
  // Users
  totalUsers: number;
  activeUsers24h: number;
  newUsersToday: number;
  
  // Performance
  avgSessionDuration: number; // minutes
  overtimeRate: number; // %
  noShowRate: number; // %
}
```

**UI: Big Number Cards**
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Today Revenue   │  │ Occupancy       │  │ Active Bookings │
│ Rp 1.250.000   │  │ 78% ↑          │  │ 31 / 40        │
│ ↑ 12.5%        │  │ Peak: 92%      │  │ ↑ 8 from 6 AM  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

#### **2. Revenue Analytics**

**Chart Types:**
- Line chart: Revenue trend (daily/weekly/monthly)
- Bar chart: Revenue by campus
- Pie chart: Revenue split (service fees, overtime, etc.)
- Stacked area: Revenue breakdown over time

```typescript
async function getRevenueAnalytics(
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month'
) {
  const transactions = await prisma.auditLog.findMany({
    where: {
      category: 'FINANCIAL',
      event: 'PAYMENT_PROCESSED',
      timestamp: { gte: startDate, lte: endDate }
    }
  });
  
  return {
    total: sum(transactions, 'details.amount'),
    byPeriod: groupByPeriod(transactions, groupBy),
    byCampus: groupBy(transactions, 'location'),
    byType: {
      serviceFees: sum(transactions.filter(t => t.details.type === 'SERVICE_FEE')),
      overtime: sum(transactions.filter(t => t.details.type === 'OVERTIME')),
      topUps: sum(transactions.filter(t => t.details.type === 'TOP_UP'))
    },
    topUsers: getTopSpenders(transactions, 10)
  };
}
```

#### **3. Occupancy Analytics**

**Heatmap: Peak Hours**
```
         Mon  Tue  Wed  Thu  Fri  Sat  Sun
06:00    🟢   🟢   🟢   🟢   🟢   ⚪   ⚪
07:00    🟡   🟡   🟡   🟡   🟡   ⚪   ⚪
08:00    🔴   🔴   🔴   🔴   🔴   🟢   🟢
09:00    🔴   🔴   🔴   🔴   🔴   🟡   🟢
...
17:00    🟡   🟡   🟡   🟡   🟡   🟢   ⚪
18:00    🔴   🔴   🔴   🔴   🔴   🟡   ⚪

Legend: 🟢 <50% | 🟡 50-75% | 🔴 >75% | ⚪ No data
```

```typescript
async function getOccupancyHeatmap(campus: string, weeks: number = 4) {
  const data = await getHistoricalOccupancy(campus, weeks);
  
  return {
    heatmap: generateHeatmap(data), // 7x24 grid
    peakHours: identifyPeakHours(data),
    trends: {
      weekday: avgOccupancy(data, 'weekday'),
      weekend: avgOccupancy(data, 'weekend')
    }
  };
}
```

#### **4. Slot Performance**

**Metrics per Slot:**
- Total bookings
- Revenue generated
- Utilization rate
- Avg session duration
- Overtime incidents
- Cancellation rate

```typescript
interface SlotPerformance {
  slotId: string;
  slotNumber: string;
  totalBookings: number;
  revenue: number;
  utilizationRate: number; // % of time occupied
  avgDuration: number;
  overtimeCount: number;
  maintenanceHours: number;
  ranking: number; // 1 = most popular
}

async function getTopPerformingSlots(campus: string, limit: number = 10) {
  // Complex SQL aggregation
  return await prisma.$queryRaw`
    SELECT 
      slot_id,
      slot_number,
      COUNT(*) as total_bookings,
      SUM(service_fee + overtime_fee) as revenue,
      AVG(TIMESTAMPDIFF(MINUTE, checked_in_at, checked_out_at)) as avg_duration
    FROM reservations
    WHERE status IN ('COMPLETED', 'CHECKED_OUT')
      AND campus_id = ${campus}
    GROUP BY slot_id
    ORDER BY revenue DESC
    LIMIT ${limit}
  `;
}
```

#### **5. User Behavior**

**Cohort Analysis:**
```typescript
async function getUserCohortAnalysis(registrationMonth: string) {
  const cohort = await getUsersCohort(registrationMonth);
  
  return {
    cohortSize: cohort.length,
    retention: {
      month1: getActiveUsers(cohort, 1) / cohort.length,
      month2: getActiveUsers(cohort, 2) / cohort.length,
      month3: getActiveUsers(cohort, 3) / cohort.length
    },
    ltv: getLifetimeValue(cohort),
    avgBookingsPerUser: getAvgBookings(cohort)
  };
}
```

**User Segmentation:**
- Power users (>10 bookings/month)
- Regular users (3-10 bookings/month)
- Occasional users (1-2 bookings/month)
- Inactive users (0 bookings last 30 days)
- Churned users (no booking last 90 days)

#### **6. Operational Metrics**

```typescript
interface OperationalMetrics {
  // Efficiency
  avgCheckInTime: number; // seconds
  avgCheckOutTime: number;
  manualOverrideRate: number; // %
  
  // Issues
  incidentCount: number;
  maintenanceHours: number;
  systemDowntime: number; // minutes
  
  // Customer Service
  avgResponseTime: number; // minutes
  ticketResolutionRate: number; // %
  customerSatisfaction: number; // 1-5 rating
}
```

#### **7. Predictive Analytics**

**Demand Forecasting:**
```typescript
async function forecastDemand(campus: string, daysAhead: number = 7) {
  const historicalData = await getHistoricalBookings(campus, 90); // Last 90 days
  
  // Simple moving average (can upgrade to ML model)
  const forecast = [];
  for (let i = 0; i < daysAhead; i++) {
    const dayOfWeek = (new Date().getDay() + i) % 7;
    const avgForDayOfWeek = getAvgBookingsForDay(historicalData, dayOfWeek);
    
    forecast.push({
      date: addDays(new Date(), i),
      predictedBookings: avgForDayOfWeek,
      confidence: 0.75 // Placeholder
    });
  }
  
  return forecast;
}
```

**Revenue Prediction:**
```typescript
async function predictMonthlyRevenue(campus: string) {
  const currentMonth = await getMonthToDateRevenue(campus);
  const daysElapsed = new Date().getDate();
  const daysInMonth = getDaysInMonth(new Date());
  
  const dailyAvg = currentMonth / daysElapsed;
  const projected = dailyAvg * daysInMonth;
  
  return {
    current: currentMonth,
    projected,
    onTrack: projected >= getMonthlyTarget(campus)
  };
}
```

### **Export & Sharing**
```typescript
async function exportReport(
  reportType: string,
  format: 'pdf' | 'excel' | 'csv',
  params: any
) {
  const data = await generateReport(reportType, params);
  
  switch (format) {
    case 'pdf':
      return await generatePDF(data, `report-template-${reportType}`);
    case 'excel':
      return await generateExcel(data);
    case 'csv':
      return convertToCSV(data);
  }
}
```

### **UI Components**
- `AnalyticsDashboard.tsx` - Main dashboard with KPIs
- `RevenueChart.tsx` - Revenue visualizations
- `OccupancyHeatmap.tsx` - Peak hours heatmap
- `SlotPerformanceTable.tsx` - Slot rankings
- `UserCohortChart.tsx` - Retention analysis
- `ForecastChart.tsx` - Demand predictions
- `ReportExporter.tsx` - Export options

### **Filters**
- Date range (today, week, month, custom)
- Campus selection
- Comparison mode (vs. last period)
- Granularity (hourly, daily, weekly, monthly)


---

## 🎯 DEFERRED FEATURES (Next Sprint)

### ❌ **Not Included in This Sprint**

#### **Loyalty & Rewards Program** (Estimated: 4-5 days)
**Reason:** Too complex for 1 person in 1 week  
**Defer to:** Sprint 2 when we have baseline features stable

#### **ANPR System** (Estimated: 5-6 days + hardware)
**Reason:** Requires hardware setup & integration complexity  
**Defer to:** Sprint 3 when infrastructure is ready

---

## 📊 SPRINT METRICS

### **Planned Scope**
- ✅ 8 Features implemented
- ✅ 30 Subtasks completed
- ✅ ~56 hours of development

### **Success Criteria**
- [ ] All Day 1-7 tasks checked off
- [ ] All features functional in dev environment
- [ ] No critical bugs blocking usage
- [ ] Basic testing completed
- [ ] Code committed & pushed to Git

### **Quality Gates**
- [ ] TypeScript compiles without errors
- [ ] No console errors in browser
- [ ] Mobile responsive works
- [ ] Dark/light mode both work
- [ ] ID/EN translations present

---

## 🛠️ DAILY WORKFLOW

### **Morning Routine (30 min)**
1. Review yesterday's work
2. Pull latest code
3. Check today's task list
4. Plan approach for first task

### **Work Blocks**
- **Block 1:** 9:00-11:00 (2h focus time)
- **Break:** 11:00-11:15 (15 min)
- **Block 2:** 11:15-13:00 (1.75h)
- **Lunch:** 13:00-14:00 (1h)
- **Block 3:** 14:00-16:00 (2h)
- **Break:** 16:00-16:15 (15 min)
- **Block 4:** 16:15-18:00 (1.75h)

**Total:** ~7.5h productive work/day

### **End of Day (15 min)**
1. Commit & push code
2. Update task checklist
3. Note any blockers
4. Plan tomorrow's priority

---

## � RISK MANAGEMENT

### **Potential Blockers**

| Risk | Mitigation |
|------|------------|
| **Task takes longer than estimated** | Cut scope to MVP, defer polish |
| **Bug blocks progress** | Document & move on, fix in Day 7 |
| **New requirement appears** | Add to backlog, don't change scope |
| **Stuck on complex logic** | Simplify approach, use mock data first |
| **Burnout risk** | Take breaks, don't work overtime |

### **Scope Adjustment Rules**

If falling behind:
1. **Day 3:** Skip vehicle photo upload
2. **Day 4:** Reduce analytics to core KPIs only
3. **Day 5:** Skip operator incident management
4. **Day 6:** Simplify audit to basic logging

---

## 📚 RESOURCES & REFERENCES

### **Tech Stack**
- **Framework:** Next.js 16, React 19
- **Database:** Prisma + SQLite
- **State:** Zustand
- **UI:** Radix UI + Tailwind CSS
- **Charts:** Recharts
- **Types:** TypeScript

### **Key Files to Modify**
```
src/
├── app/api/
│   ├── vehicles/
│   ├── analytics/
│   ├── maintenance/
│   └── audit/
├── components/parking/
│   ├── VehicleListView.tsx
│   ├── AnalyticsView.tsx (enhance)
│   ├── OperatorView.tsx (enhance)
│   └── [new components]
├── lib/
│   ├── store.ts (extend)
│   ├── parking-data.ts (enhance)
│   └── audit-logger.ts (new)
└── prisma/
    └── schema.prisma (extend)
```

### **Documentation Links**
- [Prisma Docs](https://www.prisma.io/docs)
- [Zustand Guide](https://github.com/pmndrs/zustand)
- [Radix UI](https://www.radix-ui.com/)
- [Recharts Examples](https://recharts.org/en-US/examples)

---

## ✅ PRE-SPRINT CHECKLIST

Before starting Day 1:

- [ ] Git branch created: `feature/week1-enhancements`
- [ ] Development environment running
- [ ] Database backed up
- [ ] Dependencies installed & up to date
- [ ] Code editor configured
- [ ] Postman/Thunder Client ready for API testing
- [ ] Browser DevTools configured

---

## � POST-SPRINT CHECKLIST

After completing Day 7:

- [ ] All tasks marked as done
- [ ] Code merged to main/develop branch
- [ ] Database migrated in staging
- [ ] Feature demo video recorded
- [ ] User documentation updated
- [ ] Handoff notes written
- [ ] Celebrate! 🎊

---

## 💡 TIPS FOR SUCCESS

### **Productivity Hacks**
1. **Start with schema** - Database first, UI later
2. **Use TypeScript** - Catch errors early
3. **Component library** - Reuse existing Radix components
4. **Mock data first** - Don't wait for real data
5. **Commit often** - Small commits, clear messages
6. **Test as you go** - Don't wait until Day 7

### **When Stuck**
1. Check existing code for patterns
2. Search project for similar implementations
3. Read component documentation
4. Simplify the approach
5. Move on and return later

### **Code Quality**
- Keep functions small (<50 lines)
- Name things clearly
- Add comments for complex logic
- Handle errors gracefully
- Loading states for all async operations

---

## 📞 ESCALATION

If critical blocker appears:

1. **Document the issue** (what, when, impact)
2. **Try workaround** (can we simplify?)
3. **Seek help** (team chat, Stack Overflow)
4. **Adjust scope** (defer feature if needed)

---

## � FOCUS AREAS BY DAY

| Day | Focus | Key Deliverable |
|-----|-------|-----------------|
| 1 | Vehicle Management | Multi-vehicle working |
| 2 | Filters & Search | Slot filtering complete |
| 3 | Personalization + Pricing | Smart pricing active |
| 4 | Analytics Foundation | Charts showing data |
| 5 | Analytics + Operator | Operator console live |
| 6 | Operator + Audit | Full console + logging |
| 7 | Maintenance + Polish | Everything refined |

---

## � PROGRESS TRACKING

### **End of Each Day - Self Check**

**Day 1:**
- [ ] Can create/edit/delete vehicles
- [ ] Vehicle selector works in booking
- [ ] All CRUD APIs functional

**Day 2:**
- [ ] Photo upload works
- [ ] Filters narrow down slot list
- [ ] Sort and search functional

**Day 3:**
- [ ] Home screen shows personalized content
- [ ] Pricing adjusts based on time/demand
- [ ] Smart suggestions appear

**Day 4:**
- [ ] Analytics dashboard loads
- [ ] KPI cards show real data
- [ ] Charts render correctly

**Day 5:**
- [ ] Revenue/occupancy charts complete
- [ ] Operator console accessible
- [ ] Live slot grid updates

**Day 6:**
- [ ] Manual checkin/out works
- [ ] Incidents can be reported
- [ ] Audit logs capture events

**Day 7:**
- [ ] Maintenance records work
- [ ] All screens polished
- [ ] Everything tested & documented

---

**Last Updated:** {{ TODAY }}  
**Version:** 2.0 - Solo Developer Edition  
**Status:** Ready to Execute 🚀

---

## 🎬 GET STARTED

Run these commands to begin:

```bash
# Create feature branch
git checkout -b feature/week1-enhancements

# Ensure dependencies are installed
bun install

# Start dev server
bun run dev

# Open Prisma Studio (for DB inspection)
bunx prisma studio

# Start Day 1, Task 1.1!
```

Good luck! �
