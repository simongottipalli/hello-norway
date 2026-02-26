# Hello Norway – MVP Scope (v1)

## 1. Vision

Hello Norway helps immigrants manage essential Norwegian life administration through clear explanations, structured task tracking, and simple reminders.

**The goal of v1** is to validate that newcomers find value in a structured "life admin tracker" tailored to Norway.

---

## 2. Problem

New immigrants often struggle with:

- Understanding what tasks they must complete
- Knowing when deadlines occur
- Navigating official systems
- Finding simple, trustworthy explanations in English

**There is no single, simple dashboard that helps newcomers track essential life admin tasks in one place.**

---

## 3. MVP Solution

A web application that:

- Provides a curated list of essential newcomer tasks
- Allows users to track their progress
- Sends simple deadline reminders
- Offers plain-English explanations and official links

---

## 4. Target User (Initial)

New immigrants in Norway who:

- Recently moved (0–5 years)
- Are employed, students, unemployed, or self-employed
- Need help understanding and tracking administrative obligations

---

## 5. Core Features (Must-Have)

### 5.1 User Authentication

- Email + OTP (One-Time Password) login via email
- No password storage required
- Basic profile fields:
  - Name
  - Arrival year
  - Employment status (`employed` | `student` | `unemployed` | `self-employed`)
  - Has children (boolean)

> **Note:** No OAuth or BankID in MVP. Using email-based OTP for simplicity and security.

### 5.2 Predefined Task Library (Admin-Defined)

A curated list of essential tasks, such as:

- Register address (Folkeregisteret)
- Apply for tax deduction card
- Submit tax return
- Get BankID
- Register with a GP (fastlege)
- Apply for child benefit
- Notify NAV if unemployed
- Renew residence permit

**Each task includes:**

- Title
- Plain-English description
- Why it matters
- Official external link
- Category (Tax, Health, Immigration, Family, Work, etc.)
- Recurrence type:
  - `once`
  - `yearly`
  - `custom`

> **Note:** Users cannot create public tasks in MVP.

### 5.3 User Task Tracking

Each user can:

- View their task list
- Mark tasks as:
  - `not_started`
  - `in_progress`
  - `completed`
- Set an optional personal due date
- Add private notes
- View completion status

This enables a personalized progress dashboard.

### 5.4 Dashboard

After login, users see:

- Progress summary (e.g., 5 of 12 tasks completed)
- Upcoming tasks (based on due date)
- Overdue tasks
- Task list grouped or filterable by category

**UI should be clean and minimal.**

### 5.5 Email Reminders (Basic)

- Daily scheduled job
- Send reminder if:
  - Task has a due date
  - Due within 7 days
  - Not completed

> **Note:** No complex scheduling logic in MVP.

---

## 6. Data Model (Initial)

### User

| Field              | Type     |
| ------------------ | -------- |
| `id`               | UUID     |
| `email`            | String   |
| `name`             | String   |
| `arrivalYear`      | Integer  |
| `employmentStatus` | Enum     |
| `hasChildren`      | Boolean  |
| `createdAt`        | DateTime |
| `updatedAt`        | DateTime |

### OTPCode (for authentication)

| Field       | Type     |
| ----------- | -------- |
| `id`        | UUID     |
| `email`     | String   |
| `code`      | String   |
| `expiresAt` | DateTime |
| `createdAt` | DateTime |

### Task (Predefined)

| Field            | Type     |
| ---------------- | -------- |
| `id`             | UUID     |
| `title`          | String   |
| `description`    | Text     |
| `category`       | String   |
| `officialLink`   | String   |
| `recurrenceType` | Enum     |
| `createdAt`      | DateTime |
| `updatedAt`      | DateTime |

### UserTask

| Field           | Type      |
| --------------- | --------- |
| `id`            | UUID      |
| `userId`        | UUID      |
| `taskId`        | UUID      |
| `status`        | Enum      |
| `dueDate`       | Date?     |
| `personalNotes` | Text?     |
| `completedAt`   | DateTime? |
| `createdAt`     | DateTime  |
| `updatedAt`     | DateTime  |

---

## 7. Out of Scope (Explicitly Excluded)

The following are **NOT** included in MVP:

- BankID authentication
- Altinn integrations
- Automatic form filling
- AI chat assistant
- Community or forum features
- User-generated public content
- Payment/monetization
- Legal advice automation
- Multi-language support (English only for v1)

---

## 8. Technical Boundaries

### Backend

- Express API
- Prisma ORM
- PostgreSQL
- Basic auth system
- Daily cron job for reminders

### Frontend

- Next.js 16
- Tailwind CSS v4
- **Pages:**
  - `/` (landing)
  - `/login`
  - `/signup`
  - `/dashboard`
  - `/tasks/[id]`
  - `/profile`

**Minimal, clean UI with simple navigation.**

---

## 9. Definition of MVP Done

MVP is considered complete when:

1. **A new user can:**
   - Sign up
   - View predefined tasks
   - Mark tasks as completed
   - Set a due date
   - Receive a reminder email

2. **The product can be demoed end-to-end to at least 5 immigrants.**

3. **Feedback can be collected on:**
   - Clarity of explanations
   - Missing tasks
   - Usability issues

---

## 10. Success Criteria

The MVP is successful if:

- Users understand the concept immediately
- At least some users complete multiple tasks inside the app
- Users express interest in continued usage or request additional features

---

**Version:** v1 MVP Scope
**Project:** Hello Norway
