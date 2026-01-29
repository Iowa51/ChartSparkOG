# ChartSpark Billing Design Specifications (Week 3)

## 🎨 Global UI Consistency (The "ChartSpark Aesthetic")
To ensure seamless integration, all billing screens must use the following Tailwind classes found in `settings/page.tsx` and `patients/page.tsx`:

### Containers & Sections
- **Main Wrapper**: `flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700`
- **Feature Card**: `bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5`
- **Section Header (Inside Card)**: `px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50`
- **Section Title**: `text-xs font-black text-foreground flex items-center gap-2 uppercase tracking-widest`

### Typography & Forms
- **Field Labels**: `text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1`
- **Input Fields**: `w-full px-4 py-2.5 bg-muted/20 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium text-sm`
- **Action Buttons (Primary)**: `bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 transition-all active:scale-95`
- **Action Buttons (Ghost/Outline)**: `px-4 py-2 bg-primary/5 rounded-lg border border-primary/10 text-primary hover:underline text-xs font-black uppercase tracking-widest`

### Status Indicators
- **Standard Pill**: `px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5`
- **Status Dot**: `h-1.5 w-1.5 rounded-full` (e.g., `bg-emerald-500` for Active)

---

## Screen 1: Settings → Billing Setup
**Path**: `/settings?tab=billing`

### Layout
- Integrated as a new tab in the horizontal/vertical settings navigation.
- Three primary cards stacked vertically.

### 1. Billing Provider Card
| Field | Icon (Lucide) | Placeholder / Default |
|-------|---------------|-----------------------|
| Org Name | `Building2` | "ChartSpark Medical" |
| Billing NPI | `ShieldCheck` | "1234567890" |
| Tax ID (TIN)| `Hash` | "XX-XXXXXXX" |
| Address | `MapPin` | "123 Main St, Suite 100" |

### 2. Office Ally Connection Card
- **Dashboard Status**: A horizontal banner at the top of the card using `bg-emerald-50 dark:bg-emerald-900/20`.
- **Primary CTA**: "Test Connection" button with a `lucide-react` `Zap` icon.

---

## Screen 5: Patient Insurance Tab
**Path**: `/patients/[id]?tab=insurance`

### Layout
- **Active Coverage List**: A grid of `bg-card` containers with standard padding.
- **Visual Priority**: Primary insurance has a `ring-2 ring-primary/20` decoration.

### Insurance Card Display
- **Logo Area**: `h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center`.
- **Eligibility Pulse**: A real-time status indicator. 
  - `bg-emerald-500/10 text-emerald-600` for current verification.
- **Button Group**: `[Verify Now]` (Primary), `[View History]` (Ghost).

---

## Screen 6: Superbill Panel
**Path**: `/encounters/[id]` (Appears as an `Aside` panel or Bottom Sheet)

### Service Line Table
- **Header Row**: `bg-muted/50 border-b border-border`
- **Columns**: `Code`, `Modifier`, `Units`, `Charge`, `Status`
- **Scrubber Indicators**: Each row has an `AlertCircle` (Lucide) if missing data.

### Final Check
- **Compliance Banner**: Red/Green banner at bottom of superbill showing `Ready to Submit` status before the claim is generated.

---

## Screen 8: Claims Manager (Worklist)
**Path**: `/billing/worklist`

### Table Pattern (matches `/patients`)
- **Table Container**: `bg-card rounded-xl shadow-sm border border-border overflow-hidden`
- **Rows**: `group hover:bg-accent/50 transition-colors cursor-pointer`
- **Badges**: Use `statusStyles` found in `dashboard/page.tsx` for consistency.
