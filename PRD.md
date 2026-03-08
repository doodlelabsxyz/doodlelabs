# AgencyOS — Product Requirements Document

**Date:** 2026-03-06
**Prepared by:** Khair
**Purpose:** This document describes the full product vision for AgencyOS — a digital marketing agency planner. It is intended to give any new team member, developer, or designer a complete understanding of what we are building and why.

---

## What Are We Building?

AgencyOS is a **mobile-first content planning and workflow management app** built specifically for digital marketing agencies. It handles the full lifecycle of content production — from planning to publishing — across multiple clients and team members.

It is designed for **internal agency use** with a separate, limited-access portal for clients.

---

## The Problem We Are Solving

Existing tools like Jira, Zoho, and Notion are too complex for agency teams. They show 40 options when you need 2. Team members get overwhelmed, tasks get missed, and managers spend too much time chasing updates instead of doing real work.

**AgencyOS fixes this by:**
- Showing each team member only what they need to do today — nothing more
- Automatically assigning tasks through the production pipeline
- Firing smart notifications at exactly the right time
- Giving the admin a real-time view of everything without micromanaging

---

## Who Uses It?

| Role | What they do |
|------|-------------|
| **Admin** | Manages the agency. Approves content plans and final posts. Has full visibility across all clients and team members. |
| **Content Writer** | Plans the full month of content at the end of each month. Writes captions and briefs. |
| **Designer** | Creates graphic assets for posts when assigned. Uploads to the asset library. |
| **Videographer** | Shoots footage in bulk at the start of each month. Can also shoot specific reels on demand. |
| **Video Editor** | Edits raw footage into final exports when footage is ready. |
| **Poster** | Publishes approved, ready content to social media platforms. |
| **Client** | Views upcoming planned content for their brand. Can approve or leave notes. Cannot edit anything. |

---

## Core Design Philosophy

> **The system does the thinking. The user just takes action.**

1. **Progressive Disclosure** — Every role sees only what is relevant to them right now. The full system complexity is hidden.
2. **Mobile-first** — Designed for phones first. Desktop is secondary.
3. **No training needed** — Open the app and immediately know what to do.
4. **Alive, not corporate** — The UI is colorful, warm, illustrated, and joyful. It feels like a creative studio tool, not IT software.
5. **Minimal options** — No overwhelming buttons. One screen, one job.

---

## How the App Works — The Full Content Lifecycle

```
STEP 1 — Monthly Planning
Content Writer opens the app in the last week of the month.
Plans all content for the following month — post dates, types, platforms, topics.
Submits the plan for Admin review.

STEP 2 — Admin Approves the Plan  [Checkpoint 1]
Admin reviews and approves the monthly content plan.
The plan is also shared with the client for visibility.
Once approved, the calendar auto-populates with all planned content.

STEP 3 — Content Briefs Auto-Generate
Every approved content piece becomes a brief automatically.
The brief contains all details: post date, platform, content type, caption, references.

STEP 4 — Tasks Auto-Assign Through the Pipeline

  For a GRAPHIC POST:
  → Designer receives a task 4 days before the post date
  → Designer creates the asset and uploads it to the Asset Library
  → Poster receives a task 1 day before the post date
  → Admin does a final review  [Checkpoint 2]
  → Client receives an approval request (optional, configurable per client)
  → Admin approves → Poster publishes the content

  For a VIDEO POST:
  → Videographer shoots footage in bulk at the start of the month
     (or on demand for specific reels)
  → Raw footage is uploaded to the Asset Library
  → Editor receives a task when the post enters the Editing stage
  → Editor exports the final video
  → Same approval flow as graphic posts from here

STEP 5 — Client Review
Client views their upcoming content.
They can approve with one tap or leave a note.
They cannot edit anything directly.

STEP 6 — Post-Publishing
After a post goes out, analytics update automatically.
Data feeds back into the Admin Dashboard.
```

---

## The Two Admin Checkpoints

Every piece of content must pass through two mandatory admin approvals before it goes live:

| Checkpoint | When | Also Shared With |
|------------|------|-----------------|
| **Checkpoint 1 — Plan Approval** | After Content Writer submits the monthly plan | Client |
| **Checkpoint 2 — Pre-Post Final Review** | After all assets are ready, before posting | Client |

---

## Smart Notifications — Who Gets Notified and When

The system fires notifications automatically. No one needs to chase anyone.

| What Happens | Who Gets Notified | When |
|---|---|---|
| Graphic post added to calendar | Designer | 4 days before post date |
| Designer marks their task done | Poster | 1 day before post date |
| Video post added to calendar | Video Editor | Based on pipeline stage |
| Videographer uploads footage | Video Editor | Immediately |
| Any content is ready to post | Poster | Day before post date |
| 25th of each month | Content Writer | Reminder to plan next month |
| Admin approves content | Client (if enabled) | Immediately |
| Client leaves a note or requests revision | Admin + relevant employee | Immediately |
| Any task goes overdue | Admin + assigned employee | Day of deadline |

---

## What Each Role Sees When They Open the App

**Admin**
A health summary of the entire agency. What is behind schedule, what needs approval, how the team is performing. Acts on problems, not on everything.

**Content Writer**
Only their writing tasks for today. If it is the last week of the month, a reminder to plan next month's content.

**Designer**
Posts that need design work, ordered by urgency. Color coded: red if overdue, yellow if due soon, green if on track. Tap a card to see the brief and upload the asset.

**Videographer**
This month's shoot schedule. Either a bulk shoot block or a specific reel task. Tap to upload footage when done.

**Video Editor**
A queue of footage waiting to be edited. Tap to access raw files, mark complete, and upload the export.

**Poster**
Today's posts and tomorrow's posts. All pre-approved and ready. Post and confirm.

**Client**
This week's content for their brand. Two actions only: Approve or Leave a Note.

---

## Navigation Structure

Each role has a simplified navigation so nothing feels overwhelming.

| Role | Navigation Tabs |
|------|----------------|
| Admin | Home · Calendar · Pipeline · Team |
| All Employees | Today · Upcoming · Done |
| Client | This Week · Notes |

Notifications are accessible via a bell icon in the top bar — not a separate navigation tab.

---

## The 15 Screens

| # | Screen | Who Can Access |
|---|--------|---------------|
| 1 | Login / Auth | Everyone |
| 2 | Admin Dashboard | Admin |
| 3 | All-Clients Master Overview | Admin |
| 4 | Content Calendar | Admin + All Employees |
| 5 | Monthly Planning Mode | Content Writer + Admin |
| 6 | Content Day View | Content Writer + Admin |
| 7 | Content Brief / Create | Admin + Content Writer |
| 8 | Content Pipeline Kanban | Admin + All Employees |
| 9 | Employee Task Board | Each Employee (their own tasks only) |
| 10 | Asset Library | Admin + Designer + Video Editor + Poster |
| 11 | Team Management + Workload | Admin |
| 12 | Client Portal View | Client |
| 13 | Client Approval Screen | Client |
| 14 | Analytics | Admin |
| 15 | Notifications Center | Everyone |

---

## The Content Calendar

The calendar is the heart of the app. It is the primary screen that most roles will interact with daily.

**Key features:**
- Week view and month view
- Drag and drop to reschedule content
- Tap any day or card to open a detailed view with role-specific forms
- Content cards display an illustration thumbnail, platform icon, client name, and status
- Color-coded by content type so the calendar is instantly readable at a glance
- Client filter in the top bar (Admin sees all or per-client; Client sees their own only)

**Content type color coding:**
| Type | Card Color |
|------|-----------|
| Graphic Post | Soft Coral |
| Video Post | Lemon Yellow |
| Reel | Mint Green |
| Story | Lavender |

---

## The Client Switcher

Admins and employees can switch between viewing all clients or a specific client. This is accessed via a dropdown in the top bar which opens as a full-page modal. Clients cannot switch — they only see their own workspace.

---

## Asset Library

All production assets live here, organized per client.

- Contains: graphic assets, raw footage, edited video exports, brand materials
- Accessible by: Admin, Designer, Video Editor, Poster
- Uploading an asset automatically triggers the next step in the pipeline
- Assets are tagged by content piece, post date, type, and status

---

## UI Design Direction

The visual design should feel like a **creative studio tool** — colorful, warm, and alive. Not a corporate dashboard. The reference is Olly (onelyworkspace.com) but adapted for mobile.

**Color Palette**
| Element | Color |
|---------|-------|
| App background | Warm Cream `#FDFAF5` |
| Primary accent | Sky Blue `#5BC4F5` |
| Graphic post | Soft Coral `#FF8080` |
| Video post | Lemon Yellow `#FFD166` |
| Reel | Mint Green `#72EFCA` |
| Story | Lavender `#C3A7F5` |
| Success | Fresh Green `#4CAF88` |

**Visual Style**
- Cards have soft pastel tinted backgrounds, rounded corners, and illustration thumbnails
- Floating pill navbar with visible drop shadow — feels elevated off the screen
- Warm illustrated characters on key moments: greetings, success states, empty states
- Bold numbers for metrics, small labels
- Pill-shaped status tags throughout
- Generous whitespace — nothing feels cramped

**Typography:** Plus Jakarta Sans or Nunito — rounded and friendly, not corporate.

---

## What Is Out of Scope Right Now

- Backend and API development — UI design only at this stage
- Social media platform API integrations
- AI content generation features
- Billing and subscription management
- Desktop web version — mobile-first only for now

---

## Open Questions

- What are the exact platform options for posting? (Instagram and TikTok confirmed — Facebook, LinkedIn, others?)
- Is client approval mandatory or optional per client?
- For on-demand reel shoots, does Admin manually assign the Videographer or does it auto-assign?
- What is the product and agency name?
