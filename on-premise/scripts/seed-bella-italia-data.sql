-- Seed data for Bella Italia restaurant project
-- Run: sqlite3 data/catalog.db < scripts/seed-bella-italia-data.sql

-- Update project with rich description
UPDATE projects SET
    description = 'Full-stack web application for Bella Italia restaurant in Monterrey, Mexico. Features online menu browsing, table reservations, online ordering with cart/checkout, and an admin panel for restaurant staff. Tech stack: React + Vite + Tailwind CSS frontend, Node.js + Express API, PostgreSQL database, Stripe payments integration. Target launch: March 2026.',
    updated_at = datetime('now')
WHERE id = 'bella-italia';

-- ============================================================
-- Sprint 1: Foundation (completed)
-- ============================================================

INSERT OR REPLACE INTO sprints (id, name, goal, start_date, end_date, status, velocity, team_capacity, summary, project_id, created_by)
VALUES (
    'bi-sprint-1',
    'Sprint 1 — Foundation',
    'Set up project infrastructure, design system, database schema, and core menu functionality. Deploy to staging.',
    '2026-01-13',
    '2026-01-27',
    'completed',
    34,
    40,
    'Completed all foundation work: project scaffolding, design system with restaurant branding, PostgreSQL schema, menu CRUD API, menu browsing page, landing page, and staging deployment. Velocity: 34/40 story points.',
    'bella-italia',
    'jorge'
);

-- Sprint 1 Work Items (all done)

INSERT OR REPLACE INTO work_items (id, sprint_id, project_id, title, description, type, status, priority, story_points, assignee, reporter, completed_at)
VALUES
('BI-001', 'bi-sprint-1', 'bella-italia',
 'Project scaffolding and CI/CD setup',
 'Initialize React + Vite frontend, Node.js + Express backend, PostgreSQL database. Set up ESLint, Prettier, Husky hooks, GitHub Actions CI with lint + test + build. Docker Compose for local dev with hot reload.',
 'task', 'done', 'critical', 5, 'jorge', 'jorge', '2026-01-15'),

('BI-002', 'bi-sprint-1', 'bella-italia',
 'Design system and component library',
 'Create Tailwind config with Bella Italia brand colors (terracotta #C04000, olive green #556B2F, cream #FFFDD0). Build base components: Button, Card, Input, Badge, Modal, Toast. Add Google Fonts (Playfair Display for headings, Inter for body). Responsive breakpoints for mobile-first design.',
 'story', 'done', 'high', 8, 'emilio', 'jorge', '2026-01-17'),

('BI-003', 'bi-sprint-1', 'bella-italia',
 'Database schema design and migrations',
 'Design PostgreSQL schema: menu_categories, menu_items (with dietary flags: vegetarian, vegan, gluten_free, spicy_level), reservations, orders, order_items, users (staff roles). Implement Prisma ORM with seed data for 6 categories and 24 menu items with Italian descriptions and pricing in MXN.',
 'story', 'done', 'critical', 5, 'enrique', 'jorge', '2026-01-18'),

('BI-004', 'bi-sprint-1', 'bella-italia',
 'Menu CRUD API endpoints',
 'REST API: GET /api/menu/categories, GET /api/menu/items?category=, GET /api/menu/items/:id, POST/PUT/DELETE for admin. Include image upload to S3-compatible storage. Add filtering by dietary preferences and search by name/description. Pagination with cursor-based approach for large menus.',
 'story', 'done', 'high', 5, 'enrique', 'jorge', '2026-01-21'),

('BI-005', 'bi-sprint-1', 'bella-italia',
 'Menu browsing page',
 'Frontend page: category tabs, item cards with image/name/price/description, dietary badges (leaf icon for vegetarian, V for vegan, wheat-crossed for GF), spicy level indicator (1-3 chili peppers). Add to cart button. Mobile-optimized grid layout. Skeleton loading states.',
 'story', 'done', 'high', 5, 'emilio', 'enrique', '2026-01-23'),

('BI-006', 'bi-sprint-1', 'bella-italia',
 'Landing page with hero section',
 'Restaurant landing page: hero image with parallax scroll, "Reserve a Table" CTA, featured dishes carousel, opening hours, location map (Google Maps embed), customer reviews section. SEO meta tags. Lighthouse score > 90.',
 'story', 'done', 'medium', 3, 'emilio', 'jorge', '2026-01-24'),

('BI-007', 'bi-sprint-1', 'bella-italia',
 'Staging deployment on Railway',
 'Deploy frontend (Vercel) and backend (Railway) with PostgreSQL addon. Configure environment variables, CORS, custom domain (staging.bellaitalia.mx). SSL certificate. Health check endpoint. Uptime monitoring with Better Stack.',
 'task', 'done', 'medium', 3, 'jorge', 'jorge', '2026-01-26');

-- ============================================================
-- Sprint 2: Reservations & Ordering (active)
-- ============================================================

INSERT OR REPLACE INTO sprints (id, name, goal, start_date, end_date, status, team_capacity, project_id, created_by)
VALUES (
    'bi-sprint-2',
    'Sprint 2 — Reservations & Ordering',
    'Implement table reservation system with calendar, online ordering flow with cart and Stripe checkout, and admin panel for staff to manage reservations and orders.',
    '2026-01-27',
    '2026-02-10',
    'active',
    45,
    'bella-italia',
    'jorge'
);

-- Sprint 2 Work Items (mixed statuses)

INSERT OR REPLACE INTO work_items (id, sprint_id, project_id, title, description, type, status, priority, story_points, assignee, reporter, completed_at)
VALUES
('BI-008', 'bi-sprint-2', 'bella-italia',
 'Reservation form component',
 'Multi-step form: 1) Select date and time (DatePicker with restaurant hours: Tue-Sun 1pm-11pm), 2) Party size (1-12, larger groups show "call us" message), 3) Contact info (name, phone, email, special requests textarea). Form validation with react-hook-form + zod. Confirmation screen with reservation summary.',
 'story', 'done', 'high', 5, 'emilio', 'jorge', '2026-02-01'),

('BI-009', 'bi-sprint-2', 'bella-italia',
 'Reservation API and availability engine',
 'Backend: POST /api/reservations, GET /api/reservations/availability?date=&party_size=. Availability calculation: 15 tables (4x 2-seat, 6x 4-seat, 3x 6-seat, 2x 8-seat), 2-hour slot duration, 30-min buffer between seatings. Email confirmation with Resend. SMS reminder 2 hours before via Twilio.',
 'story', 'done', 'critical', 8, 'enrique', 'jorge', '2026-02-03'),

('BI-010', 'bi-sprint-2', 'bella-italia',
 'Shopping cart with local storage persistence',
 'Cart context with add/remove/update quantity/clear actions. Persist to localStorage for cross-session continuity. Cart drawer (slide-in from right) with item list, quantity controls, subtotal, and "Proceed to Checkout" button. Cart badge in header showing item count. Handle out-of-stock gracefully.',
 'story', 'in_progress', 'high', 5, 'emilio', 'jorge', NULL),

('BI-011', 'bi-sprint-2', 'bella-italia',
 'Checkout and Stripe payment integration',
 'Checkout page: order summary, delivery/pickup toggle, address form (for delivery), Stripe Elements embedded form for card payment. Backend: create Stripe PaymentIntent, webhook handler for payment confirmation, order status updates. Support for tips (10/15/20% or custom). Receipt generation.',
 'story', 'todo', 'critical', 8, 'enrique', 'jorge', NULL),

('BI-012', 'bi-sprint-2', 'bella-italia',
 'Admin panel — reservation calendar',
 'Staff-facing page: weekly calendar view (FullCalendar.io) showing all reservations color-coded by status (confirmed=green, pending=yellow, cancelled=red). Click to view/edit details. Filter by date range. Manual reservation creation for phone/walk-in bookings. Export to CSV.',
 'story', 'in_progress', 'high', 5, 'jorge', 'jorge', NULL),

('BI-013', 'bi-sprint-2', 'bella-italia',
 'Admin panel — order management',
 'Staff-facing page: real-time order list with status pipeline (new → preparing → ready → delivered/picked-up). WebSocket for live updates. Click to view order details, mark as preparing/ready, print kitchen ticket. Sound notification for new orders. Daily order summary stats.',
 'story', 'todo', 'high', 5, 'jorge', 'enrique', NULL),

('BI-014', 'bi-sprint-2', 'bella-italia',
 'Mobile responsiveness audit and fixes',
 'Systematic audit of all pages on iPhone SE, iPhone 14, iPad, and Android (Chrome DevTools). Fix touch targets < 44px, horizontal overflow, font sizes below 14px, form inputs without proper mobile keyboard types. Test cart drawer behavior on small screens. Fix reservation form layout on narrow viewports.',
 'task', 'review', 'medium', 3, 'emilio', 'jorge', NULL),

('BI-015', 'bi-sprint-2', 'bella-italia',
 'Fix: Menu images not loading on Safari',
 'Bug report: WebP images in menu cards show broken image icon on Safari 16.x on iOS. Root cause: next-gen image format not fully supported. Fix: implement fallback with <picture> element serving WebP with JPEG fallback. Add lazy loading with IntersectionObserver for below-fold images.',
 'bug', 'done', 'high', 2, 'emilio', 'enrique', '2026-02-04'),

('BI-016', 'bi-sprint-2', 'bella-italia',
 'API rate limiting and security hardening',
 'Add express-rate-limit: 100 req/min for public endpoints, 30 req/min for reservation creation (prevent spam), 10 req/min for login attempts. Implement helmet for security headers. Add CSRF protection for state-changing endpoints. Input sanitization with express-validator. SQL injection prevention audit.',
 'task', 'backlog', 'medium', 3, 'enrique', 'jorge', NULL);
