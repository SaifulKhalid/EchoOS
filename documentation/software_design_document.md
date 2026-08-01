# EchoOS — Software Design Document (SDD)

**Project Name**: EchoOS — Personal AI Memory Operating System  
**Author**: Principal Software Architect & Product Engineering Team  
**Version**: 2.0 (Phase 3 Production & Competition Release)  
**Date**: August 2026  

---

## 1. Executive Summary & Product Vision

**EchoOS** is a privacy-first, cloud-decoupled **AI Memory Operating System** designed to archive, analyze, and reason over an individual's life memories—movies, dining, travel, personal thoughts, wishlist items, and daily habit goals. 

Unlike conventional conversational LLMs that rely on generic web knowledge, EchoOS continuously builds a personalized behavioral graph and grounds its responses strictly in verifiable user evidence, complete with transparent reasoning logs, confidence scoring, and multi-category recommendation protocols.

---

## 2. High-Level System Architecture

EchoOS is structured around clean architecture, SOLID principles, and a repository storage abstraction pattern:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             EchoOS Client (React 18 + TS)                    │
│  ┌────────────────────┐   ┌────────────────────┐   ┌─────────────────────┐ │
│  │   UI Components    │   │  TanStack Query    │   │  Router & Pages     │ │
│  └─────────┬──────────┘   └─────────┬──────────┘   └──────────┬──────────┘ │
└────────────┼────────────────────────┼─────────────────────────┼─────────────┘
             │                        │                         │
             ▼                        ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI Memory Pipeline                                │
│  ┌─────────────────┐   ┌───────────────────┐   ┌────────────────────────┐  │
│  │ Intent Detector │──▶│ Memory Retriever  │──▶│   Pattern Analyzer     │  │
│  └─────────────────┘   └───────────────────┘   └──────────┬─────────────┘  │
│                                                           │                │
│  ┌─────────────────┐   ┌───────────────────┐              │                │
│  │  Reasoning Log  │◀──│ Context Builder   │◀─────────────┘                │
│  └─────────────────┘   └─────────┬─────────┘                               │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AI Tool Execution Layer                          │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Handlers: addMovie, logFood, logTravel, updateEntry, createGoal, etc. │  │
│  └──────────────────────────────────┬────────────────────────────────────┘  │
└─────────────────────────────────────┼───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Storage Abstraction Layer                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ MemoryRepository<T> Interface                                         │  │
│  │  ├── FirestoreRepository<T> (Production / Guest)                       │  │
│  │  └── DriveRepository<T> (Phase 2 Privacy Option)                      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Subsystem Specifications

### 3.1 Personal Memory Storage Abstraction (`MemoryRepository<T>`)
Every domain category (`movie`, `food`, `travel`, `note`, `wishlist`, `goal`) is accessed via `getRepository(category)`, returning a concrete `MemoryRepository<T>` implementation. This isolates UI and AI handlers from database specifics.

- **Supported Operations**: `add()`, `update()`, `delete()`, `fetchAll()`, `retrieve()`.
- **Database Schema**:
  - `users/{uid}/movies/{movieId}`
  - `users/{uid}/food/{foodId}`
  - `users/{uid}/travel/{travelId}`
  - `users/{uid}/notes/{noteId}`
  - `users/{uid}/wishlist/{wishlistId}`
  - `users/{uid}/goals/{goalId}`

### 3.2 AI Memory Pipeline & Reasoning Engine
When a user chats with EchoOS, the input passes through a multi-stage memory intelligence pipeline:
1. **Intent Detector**: Maps natural language queries to memory categories and intent types (`log`, `recommendation`, `timeline`, `edit`, `query`).
2. **Memory Retriever**: Scans all 6 user archives and extracts candidate memories using TF-IDF text scoring, recency decay weighting, and mood matching.
3. **Pattern Analyzer**: Computes cross-category intelligence (e.g. dining after cinema, spending vs. rating correlations, companion statistics, planned trip tracking, habit streaks, session deltas).
4. **Context Builder**: Formats structured memory context into system instructions.
5. **Confidence & Reasoning Calculator**: Evaluates evidence quality (high, medium, low) and surfaces a transparent reasoning trace for every response.

### 3.3 Natural Language Editing Primitive (`updateEntry`)
EchoOS features a natural language editing primitive that allows users to edit past memories in conversational English (e.g. *"Change the price of yesterday's dinner to $45"* or *"Mark my Kyoto trip as completed"*).
- Target resolution resolves `"latest"` or candidate IDs automatically.
- Merges partial updates without destroying unmentioned fields.

### 3.4 Goal Operating System & Session Awareness
- **Habit Goals**: Supports `daily`, `weekly`, and `monthly` frequencies with active streak counters (`🔥 X days`) and completion rates.
- **Session Tracking**: `useSessionTracking` records `lastVisit` and `previousVisit` timestamps, allowing EchoOS to open sessions with personalized greeting deltas (*"Since your last visit..."*).

---

## 4. Security, Privacy & Data Protection

1. **Firestore Security Rules**: Strict per-user isolation enforcing `request.auth.uid == userId`.
2. **Input Sanitization & Tool Safety**: AI Tool arguments are validated against strict JSON schemas prior to execution.
3. **Privacy Architecture**: All user data is tied strictly to their authenticated account or guest session; no personal memory data is shared across users or trained on external public models.

---

## 5. Evaluation & Demonstration Readiness

EchoOS includes a **One-Click Competition Demo Mode**:
- Evaluators can trigger sample data seeding from the Login page or Topbar menu.
- Instantly populates realistic memories (Dune Part Two, Tokyo Bowl with Sarah, Kyoto travel, Daily Running habit, wishlist items) for immediate testing of intent detection, cross-memory reasoning, and recommendation generation.
