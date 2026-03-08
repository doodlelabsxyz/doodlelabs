# AgencyOS — Claude Instructions

## Project Overview
AgencyOS is a mobile-first content planning and workflow management app for digital marketing agencies. UI design phase only — no backend, no APIs.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Language:** TypeScript

## Design System

### Color Palette
- Background: Warm Cream `#FDFAF5`
- Primary accent: Sky Blue `#5BC4F5`
- Graphic post: Soft Coral `#FF8080`
- Video post: Lemon Yellow `#FFD166`
- Reel: Mint Green `#72EFCA`
- Story: Lavender `#C3A7F5`
- Success: Fresh Green `#4CAF88`

### Typography
- Font: Plus Jakarta Sans or Nunito (rounded, friendly — not corporate)

### Visual Style
- Mobile-first (375px base width)
- Soft pastel cards with rounded corners
- Floating pill navbar with drop shadow
- Pill-shaped status tags
- Warm illustrated characters for greetings, empty states, success states
- Generous whitespace

## Roles
Admin, Content Writer, Designer, Videographer, Video Editor, Poster, Client

## The 15 Screens
1. Login / Auth
2. Admin Dashboard
3. All-Clients Master Overview
4. Content Calendar
5. Monthly Planning Mode
6. Content Day View
7. Content Brief / Create
8. Content Pipeline Kanban
9. Employee Task Board
10. Asset Library
11. Team Management + Workload
12. Admin Analytics
13. Client Portal View
14. Client Approval Screen
15. Notifications Center

## Key Principles
- Mobile-first always and Good Desktop UI as well
- Progressive disclosure per role — each user sees only what they need
- No overwhelming UI — one screen, one job
- Creative studio feel, not corporate dashboard
- Reference: https://www.farmminerals.com/promo adapted for mobile

## Conventions
- All components go in `src/components/`
- All screens/pages go in `src/app/`
- Keep components small and focused
- Use Tailwind utility classes directly — no CSS modules unless necessary

