# 🎨 Wireframing Guide - Low to High Fidelity

**Tools:** Figma (free), Balsamiq (low-fi), or even pen & paper  
**Timeline:** Aligned with validation roadmap

---

## 📅 PHASED APPROACH - Don't Over-Design Before Validating!

### ⚠️ IMPORTANT: Wireframe Progression

**Week 1-2 (Validation Phase):**
- ✅ Low-fidelity sketches only
- ✅ Paper/whiteboard is fine
- ❌ DON'T spend time on high-fidelity yet

**Week 3-4 (After Customer Interviews):**
- ✅ Medium-fidelity wireframes
- ✅ Use Figma for landing page
- ✅ Show to potential customers for feedback

**Week 5+ (If Validated & Building MVP):**
- ✅ High-fidelity designs
- ✅ Interactive prototypes
- ✅ Design system setup

---

## 🎯 PHASE 1: Low-Fidelity Wireframes (Week 1-2)

**Purpose:** Quick sketches to think through user flow  
**Time:** 2-4 hours  
**Tool:** Paper, whiteboard, or Excalidraw (free)

### What to Wireframe (MVP Screens Only):

#### 1. Landing Page (Public)
```
┌─────────────────────────────────────┐
│  [Logo]              [Sign Up] [Login] │
├─────────────────────────────────────┤
│                                     │
│   QR Codes + Bio Links             │
│   Built for Local Businesses        │
│                                     │
│   [Get Started Free]               │
│                                     │
│   ✓ Setup in 30 seconds            │
│   ✓ Restaurant | Salon | Gym templates │
│   ✓ $9/month                       │
│                                     │
├─────────────────────────────────────┤
│  How It Works:                      │
│  1. Choose template  2. Add info   │
│  3. Get QR + link                   │
├─────────────────────────────────────┤
│  [Screenshot: Dashboard]            │
│  [Screenshot: QR Designer]          │
│  [Screenshot: Analytics]            │
├─────────────────────────────────────┤
│  Pricing: Free | Pro $9 | Business $19 │
├─────────────────────────────────────┤
│  [Email signup for waitlist]        │
└─────────────────────────────────────┘
```

**Low-fi = Boxes and text, no colors/images**

---

#### 2. Sign Up Flow
```
Page 1: Sign Up
┌─────────────────────────────────────┐
│  Create Your Account                │
│                                     │
│  [Continue with Google]             │
│  [Continue with Email]              │
│                                     │
│  Already have account? [Login]      │
└─────────────────────────────────────┘

Page 2: Quick Setup (if email)
┌─────────────────────────────────────┐
│  Tell us about your business        │
│                                     │
│  Business Name: [___________]       │
│  Industry: [Dropdown ▼]             │
│    - Restaurant                     │
│    - Salon/Spa                      │
│    - Gym/Fitness                    │
│    - Retail                         │
│    - Other                          │
│                                     │
│  [Continue]                         │
└─────────────────────────────────────┘

Page 3: Dashboard (First Time)
┌─────────────────────────────────────┐
│  Welcome! Let's create your first QR │
│                                     │
│  [Create QR Code]                   │
└─────────────────────────────────────┘
```

---

#### 3. QR Creator (Main Feature)
```
┌─────────────────────────────────────┐
│  Create QR Code                     │
├─────────────────────────────────────┤
│  Step 1: Choose Template            │
│                                     │
│  [🍽️ Restaurant]  [💇 Salon]        │
│  [🏋️ Gym]        [🏪 Retail]       │
│  [📅 Event]      [⭐ Custom]        │
│                                     │
└─────────────────────────────────────┘

After choosing "Restaurant":
┌─────────────────────────────────────┐
│  Restaurant QR Code                 │
├─────────────────────────────────────┤
│  What should your QR link to?       │
│                                     │
│  ○ Menu PDF                         │
│  ○ Instagram                        │
│  ○ Website                          │
│  ● Custom Page (bio link style)     │
│                                     │
├─────────────────────────────────────┤
│  QR Name: [My Restaurant Menu]      │
│  Destination: [your-restaurant.scanly.io] │
│                                     │
│  [Preview QR] [Customize Design]    │
│  [Create & Download]                │
└─────────────────────────────────────┘
```

---

#### 4. Bio Link Page Builder
```
┌─────────────────────────────────────┐
│  Edit Your Page                     │
├─────────────────────────────────────┤
│  Left Panel: Blocks                 │
│  ┌─────────────┐                    │
│  │ + Add Block │                    │
│  │             │                    │
│  │ 🔗 Link     │                    │
│  │ 📷 Image    │                    │
│  │ 📝 Text     │                    │
│  │ 📞 Contact  │                    │
│  │ 📍 Location │                    │
│  │ ⭐ Review   │                    │
│  └─────────────┘                    │
├─────────────────────────────────────┤
│  Right Panel: Preview               │
│  ┌─────────────┐                    │
│  │ 📱 Phone    │                    │
│  │ Preview     │                    │
│  │             │                    │
│  │ [Logo]      │                    │
│  │ Rest. Name  │                    │
│  │             │                    │
│  │ [Menu]      │                    │
│  │ [Book Now]  │                    │
│  │ [Instagram] │                    │
│  │ [Reviews]   │                    │
│  └─────────────┘                    │
└─────────────────────────────────────┘
```

---

#### 5. Dashboard
```
┌─────────────────────────────────────┐
│ [Logo]  Dashboard  [Profile ▼]      │
├─────────────────────────────────────┤
│                                     │
│  Your QR Codes                      │
│                                     │
│  [+ Create New QR]                  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Restaurant Menu QR            │  │
│  │ 📊 42 scans today            │  │
│  │ scanly.io/r/menu             │  │
│  │ [Edit] [Analytics] [Download] │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Instagram Link QR             │  │
│  │ 📊 18 scans today            │  │
│  │ scanly.io/r/insta            │  │
│  │ [Edit] [Analytics] [Download] │  │
│  └───────────────────────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

---

#### 6. Analytics Page (Simple)
```
┌─────────────────────────────────────┐
│  Restaurant Menu QR - Analytics     │
├─────────────────────────────────────┤
│                                     │
│  📊 Today: 42 scans  ↑ 12%         │
│  📊 This Week: 187 scans            │
│  📊 Total: 1,243 scans              │
│                                     │
├─────────────────────────────────────┤
│  Scans Over Time                    │
│  [Simple line chart]                │
│   ^                                 │
│  50│    /\      /\                 │
│  40│   /  \    /  \                │
│  30│  /    \  /    \_              │
│  20│ /      \/                      │
│   └─────────────────────>           │
│    Mon Tue Wed Thu Fri Sat Sun      │
│                                     │
├─────────────────────────────────────┤
│  Top Devices                        │
│  📱 Mobile: 82%                    │
│  💻 Desktop: 15%                   │
│  📲 Tablet: 3%                     │
│                                     │
├─────────────────────────────────────┤
│  Top Locations                      │
│  📍 San Francisco: 45%             │
│  📍 Oakland: 28%                   │
│  📍 San Jose: 15%                  │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎯 PHASE 2: Medium-Fidelity Wireframes (Week 3-4)

**Purpose:** Show to customers for validation, use in landing page  
**Time:** 8-12 hours  
**Tool:** Figma (free)

### What Changes from Low-Fi:

#### Add:
- ✅ Actual layout/spacing
- ✅ Real text content
- ✅ Placeholder images (gray boxes)
- ✅ Basic color scheme (2-3 colors max)
- ✅ Buttons that look clickable
- ❌ Still NO final images/photos
- ❌ Still NO polished design

### Medium-Fi Example (Landing Page):

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  [Scanly Logo]                    [Login] [Sign Up Free] │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│          QR Codes + Landing Pages                │
│          Built for Local Businesses              │
│                                                  │
│          Setup in 30 seconds. No tech needed.    │
│                                                  │
│          [Get Started - It's Free →]            │
│          Free forever. No credit card required.  │
│                                                  │
│          [gray box for hero image]               │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Industry Templates Built For You:               │
│                                                  │
│  [🍽️ Icon]        [💇 Icon]        [🏋️ Icon]      │
│  Restaurant       Salon & Spa       Gym           │
│  • Menu QR        • Services        • Classes     │
│  • Reviews        • Booking         • Sign-up     │
│  • Instagram      • Gallery         • Promos      │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  How It Works:                                   │
│                                                  │
│  1️⃣ Choose Your Industry  →  2️⃣ Add Your Info  →  3️⃣ Get Your QR │
│  [screenshot]               [screenshot]          [screenshot]     │
│                                                  │
├──────────────────────────────────────────────────┤
│                                                  │
│  Simple, Transparent Pricing                     │
│                                                  │
│  Free         Pro          Business              │
│  $0/mo        $9/mo        $19/mo               │
│  ─────        ─────        ────────             │
│  3 QR codes   Unlimited    Everything in Pro +   │
│  1 page       Custom QR     Team features        │
│  Analytics    Analytics+    Priority support     │
│                                                  │
│  [Start Free] [Start Free]  [Contact Sales]      │
│                                                  │
└──────────────────────────────────────────────────┘
```

**Medium-fi = Structure + basic styling, but still simple**

---

## 🎯 PHASE 3: High-Fidelity Designs (Week 5+ - After Validation)

**Purpose:** Final designs for development  
**Time:** 20-40 hours  
**Tool:** Figma with design system

### What Changes from Medium-Fi:

#### Add:
- ✅ Final color palette
- ✅ Typography system (fonts, sizes, weights)
- ✅ Real images/photos
- ✅ Icons (consistent set)
- ✅ Shadows, gradients, visual polish
- ✅ Hover states, interactions
- ✅ Mobile + desktop versions
- ✅ Design system / component library

---

## 📐 Figma Structure - How to Organize

### Create 3 Pages in Figma:

#### Page 1: Design System
```
Components:
├── Colors
│   ├── Primary: #FF6B35
│   ├── Secondary: #004E89
│   └── Neutral: #F7F7F7
├── Typography
│   ├── H1: 48px Bold
│   ├── H2: 36px Bold
│   ├── Body: 16px Regular
│   └── Small: 14px Regular
├── Buttons
│   ├── Primary CTA
│   ├── Secondary
│   └── Ghost
├── Input Fields
│   ├── Default
│   ├── Focus
│   └── Error
└── Cards
    ├── QR Code Card
    ├── Pricing Card
    └── Feature Card
```

#### Page 2: Wireframes (Low-Fi)
```
Screens:
├── Landing Page (Desktop)
├── Landing Page (Mobile)
├── Sign Up Flow
├── Dashboard
├── QR Creator
├── Bio Link Builder
└── Analytics
```

#### Page 3: High-Fidelity Mockups
```
Final Designs:
├── Landing Page
│   ├── Desktop (1440px)
│   └── Mobile (375px)
├── Dashboard
│   ├── Empty State
│   ├── With QR Codes
│   └── Mobile View
├── QR Creator
│   ├── Template Selection
│   ├── Customization
│   └── Preview/Download
├── Bio Link Builder
│   ├── Editor View
│   └── Live Preview
└── Analytics
    ├── Overview
    └── Detailed Stats
```

---

## 🎨 Design Inspiration - What to Study

### Look at These for Inspiration:

#### Landing Pages:
- **Linear.app** - Clean, modern SaaS
- **Vercel.com** - Minimalist, technical
- **Stripe.com** - Professional, trustworthy
- **Webflow.com** - Design-forward

#### Dashboards:
- **Notion** - Simple, intuitive
- **Airtable** - Data-focused, clean
- **Figma** - Minimalist controls
- **Mixpanel** - Analytics clarity

#### QR/Link Tools:
- **Linktree** - See what to improve
- **Bento.me** - Beautiful design
- **Bitly** - Dashboard layout
- **QR Code Generator** - Customization options

### Where to Find:
- **Dribbble.com** - "SaaS dashboard", "QR code app"
- **Behance.net** - "Bio link design"
- **Mobbin.com** - Mobile app patterns
- **Lapa.ninja** - Landing page gallery

---

## 🛠️ Figma Resources (Free)

### Templates to Start From:
1. **SaaS Website Template** (search Figma Community)
2. **Dashboard UI Kit** (search Figma Community)
3. **Mobile App Wireframe Kit**

### Icon Libraries (Free):
- **Iconify** (Figma plugin) - 100k+ icons
- **Feather Icons** - Clean, simple
- **Heroicons** - Tailwind-style

### Illustration Libraries:
- **unDraw** - Free customizable illustrations
- **Storyset** - Animated illustrations
- **Blush** - Mix and match illustrations

---

## 📱 Screens to Design Priority Order

### Week 3-4 (Medium-Fidelity - For Landing Page):
1. ✅ **Landing Page** (desktop) - 4 hours
2. ✅ **Landing Page** (mobile) - 2 hours
3. ✅ **Sign Up Flow** - 2 hours

**Total: 8 hours**  
**Purpose:** Use in landing page, show to customers

---

### Week 5-6 (High-Fidelity - If Building MVP):
4. ✅ **Dashboard** - 4 hours
5. ✅ **QR Creator** - 6 hours
6. ✅ **Bio Link Builder** - 6 hours
7. ✅ **Analytics Page** - 4 hours

**Total: 20 hours**  
**Purpose:** Development guide

---

### Week 7+ (Polish - After MVP Works):
8. ✅ **Settings Page** - 2 hours
9. ✅ **Pricing Page** - 3 hours
10. ✅ **404/Error States** - 2 hours
11. ✅ **Onboarding Flow** - 4 hours
12. ✅ **Mobile Responsive** - 8 hours

**Total: 19 hours**

---

## 🎯 Design Principles for Your Product

### 1. Simplicity First
- ❌ Avoid: Complex navigation, too many options
- ✅ Do: Clear CTAs, one main action per screen

### 2. Local Business Friendly
- ❌ Avoid: Tech jargon, "integrate API", "webhook"
- ✅ Do: "Add your menu", "Get your QR code"

### 3. Mobile-First
- Design for phone FIRST (most users)
- Then adapt to desktop

### 4. Fast Perceived Performance
- Show loading states
- Instant feedback on actions
- Optimistic UI updates

### 5. Trust & Professionalism
- Clean, uncluttered design
- Professional color scheme
- Clear pricing, no hidden fees

---

## ✅ Checklist for Each Screen

Before calling a design "done":

### Low-Fidelity:
- [ ] User flow is clear
- [ ] Main elements placed
- [ ] Text hierarchy makes sense
- [ ] CTAs are obvious
- [ ] Mobile version sketched

### Medium-Fidelity:
- [ ] Proper spacing/alignment
- [ ] Real text content
- [ ] Basic colors applied
- [ ] Tested with 2-3 users
- [ ] Mobile + desktop versions

### High-Fidelity:
- [ ] Design system applied
- [ ] All states designed (hover, focus, error)
- [ ] Real images/icons
- [ ] Responsive breakpoints
- [ ] Developer handoff ready (specs, assets)

---

## 🚀 Quick Start Guide (Do This Week)

### Day 1: Low-Fi Sketches (2 hours)
1. Open Figma (free account)
2. Create new file: "QR Platform Wireframes"
3. Sketch these 3 screens (boxes and text only):
   - Landing page
   - Dashboard
   - QR Creator
4. Get feedback from 1 friend: "Is this clear?"

### Day 2-3: Medium-Fi Landing Page (6 hours)
1. Copy structure from low-fi
2. Add real headlines/text
3. Add basic colors (pick 2: primary + neutral)
4. Add placeholder images (gray boxes)
5. Create mobile version
6. Export PNG → Use on your landing page site

### Day 4: User Testing (2 hours)
1. Show medium-fi designs to 3 potential customers
2. Ask: "What would you click first?"
3. Ask: "Is this clear what we do?"
4. Note confusion points → iterate

### Day 5: Iterate (2 hours)
1. Fix confusing parts
2. Simplify based on feedback
3. Finalize medium-fi landing page
4. Ready to build actual landing page!

**Total Week 3: 12 hours of design work**

---

## 🎓 Learning Resources (Free)

### Figma Basics:
- **Figma Tutorial** (official) - 30 mins
- **UI Design for Beginners** (YouTube) - 2 hours

### Design Principles:
- **Refactoring UI** (book excerpts/Twitter)
- **Laws of UX** (lawsofux.com)

### SaaS Design:
- Study Linear.app, Vercel, Stripe
- Screenshot flows you like
- Recreate in Figma for practice

---

## 📊 Design Validation Checklist

Before showing designs to developers:

### Usability:
- [ ] Can complete main task in <3 clicks
- [ ] CTAs stand out clearly
- [ ] Forms are short (ask minimum info)
- [ ] Error states are helpful
- [ ] Success states are celebratory

### Accessibility:
- [ ] Color contrast ratio 4.5:1+ (use WebAIM checker)
- [ ] Touch targets 44px+ (mobile)
- [ ] Text readable at 16px minimum
- [ ] Not relying on color alone for info

### Business:
- [ ] Pricing is clear and visible
- [ ] Value proposition obvious in 5 seconds
- [ ] Trust signals present (testimonials, security)
- [ ] Call-to-action on every screen

---

## 💡 Pro Tips

### Don't Over-Design Before Validating:
- Week 1-2: Paper sketches are FINE
- Week 3-4: Medium-fi in Figma (basic)
- Week 5+: High-fi ONLY if validated

### Get Feedback Early:
- Show low-fi to 5 people
- Ask: "What does this do?"
- If they're confused → simplify

### Copy from the Best:
- It's OK to copy patterns from Stripe, Notion, etc.
- They spent millions on UX research
- Add your unique positioning/content

### Design for Your User (Local Business Owner):
- Not a designer → keep it simple
- Not technical → avoid jargon
- Busy → make it fast
- On phone → mobile-first

---

## 🎯 Final Deliverables

By end of validation (Week 4):
- [ ] Low-fi wireframes (6 screens)
- [ ] Medium-fi landing page (desktop + mobile)
- [ ] Medium-fi sign-up flow (3 screens)
- [ ] User flow diagrams
- [ ] Tested with 5+ potential customers

By end of MVP build (Week 8):
- [ ] High-fi dashboard
- [ ] High-fi QR creator
- [ ] High-fi bio link builder
- [ ] High-fi analytics page
- [ ] Mobile responsive designs
- [ ] Design system / component library
- [ ] Assets exported for development

---

## 🚀 Action Items - Start TODAY

1. **Create Figma account** (5 min)
2. **Sketch landing page on paper** (30 min)
   - Hero section: headline, CTA
   - How it works (3 steps)
   - Industry templates (3 options)
   - Pricing (3 tiers)
   - Email signup
3. **Take photo, save to repo** (5 min)
4. **Tomorrow: Transfer to Figma** (2 hours)

**Don't aim for perfect - aim for testable!** 🎨

Start with rough sketches, validate, THEN make it pretty! 🚀
