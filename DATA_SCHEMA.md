# GeeksterFY26 Valentine's Edition - Data Schema & Relationship Guide

## Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     VALENTINE'S CHALLENGE - DATA MODEL                       │
└─────────────────────────────────────────────────────────────────────────────┘

                            ┌──────────────────┐
                            │  MATCHMAKING     │
                            │  (100 users)     │
                            │  user_id (PK)    │
                            └────────┬─────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
         ┌──────────────────┐  ┌──────────────┐  ┌────────────────┐
         │ BEHAVIOR_EDGES   │  │   SECURITY   │  │   TELEMETRY    │
         │ (100 edges)      │  │ (100 audits) │  │ (100 messages) │
         │ edge_id (PK)     │  │security_audit│  │ message_id(PK) │
         │ source_user_id   │  │ _id (PK)     │  │ timestamp      │
         │ target_user_id   │  │ user_id (FK) │  │ region_origin  │
         │ timestamp        │  │ timestamp    │  │ region_dest    │
         └──────────────────┘  │ ip_address   │  └────────────────┘
                               │ geo (FK)     │
                               │ mfa_result   │
                               └──────┬───────┘
                                      │
                                      │ (user_id, geo)
                                      │
                    ┌─────────────────┼─────────────┐
                    │                 │             │
                    ▼                 ▼             ▼
         ┌──────────────────┐  ┌──────────────┐  ┌────────────────┐
         │  TRUST_SAFETY    │  │   ROUTING    │  │ WORK_DYNAMICS  │
         │ (100 messages)   │  │(100 routes)  │  │ (100 meetings) │
         │ message_id (PK)  │  │routing_id(PK)│  │ event_id (PK)  │
         │ message_text     │  │ region (FK)  │  │ meeting_id     │
         │ toxicity_score   │  │ request_count│  │ participants   │
         │ category         │  │ p95_latency  │  │ response_pttn  │
         │ moderation_act   │  │ failure_rate │  │ timestamp      │
         └──────────────────┘  └──────────────┘  └────────────────┘
                                      ▲
                                      │
                    ┌─────────────────┼────────────────┐
                    │                 │                │
                    ▼                 ▼                ▼
         ┌──────────────────┐  ┌──────────────┐  ┌────────────────┐
         │      GIFTS       │  │ SUPPLY_CHAIN │  │   CHOCOLATE    │
         │ (10,000 events)  │  │ (100 orders) │  │     GLOBAL     │
         │ event_id (PK)    │  │ order_id(PK) │  │ (Star Schema)  │
         │ event_type       │  │ product_id   │  │ DimCustomer    │
         │ customer_id      │  │ (FK)         │  │ DimProduct     │
         │ product_sku      │  │ stock_level  │  │ DimDate        │
         │ payment_type     │  │ region       │  │ FactSales      │
         │ rating           │  │ cost_per_unit│  │ (Separate Star)│
         │ returned_flag    │  └──────────────┘  └────────────────┘
         │ timestamp        │
         └──────────────────┘
```

---

## 📋 Detailed Schema Definition

### 1. MATCHMAKING (Core User Dimension)
**Purpose**: User profiles and relationship potential  
**Primary Key**: `user_id` (U0001-U0100)  
**Rows**: 100  
**Key Columns**:
- `user_id` - Unique user identifier
- `age` - User age
- `location_region` - Geographic location (North Europe, West Europe, etc.)
- `interests` - User interests (comma-separated)
- `openness`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism` - Personality traits
- `matches_attempted` - Number of potential matches
- `matches_success` - Successful matches
- `sentiment_score` - Overall sentiment

**Joins With**:
- SECURITY (via `user_id`)
- BEHAVIOR_EDGES (via `source_user_id`, `target_user_id`)

---

### 2. BROKEN_HEARTS_SECURITY (Authentication & Compliance)
**Purpose**: User authentication, security audits, MFA tracking  
**Primary Key**: `security_audit_id` (SA000001-SA000100)  
**Foreign Key**: `user_id` → MATCHMAKING  
**Rows**: 100  
**Key Columns**:
- `security_audit_id` - Unique audit record
- `user_id` - FK to MATCHMAKING
- `login_attempt_id` - Login session identifier
- `ip_address` - Client IP address
- `geo` - Geographic location code
- `failed_attempts` - Number of failed login attempts
- `risk_score` - Security risk assessment (0-10)
- `timestamp` - Audit timestamp (2026-01-12)
- `device_compliance_status` - Device compliance level
- `mfa_result` - MFA authentication result

**Joins With**:
- MATCHMAKING (via `user_id`)
- ROUTING (via `geo`)
- GIFTS (via timestamp ranges for purchase context)

---

### 3. CUPID_BEHAVIOR_GRAPH_EDGES (Social Network)
**Purpose**: User relationship graph and interaction patterns  
**Primary Key**: `edge_id` (E00001-E00100)  
**Foreign Keys**: `source_user_id`, `target_user_id` → MATCHMAKING  
**Rows**: 100  
**Key Columns**:
- `edge_id` - Unique edge identifier
- `source_user_id` - Source user in relationship
- `target_user_id` - Target user in relationship
- `edge_type` - Type of relationship (liked, same_interest, etc.)
- `weight` - Strength of connection (0-1)
- `probability` - Match probability
- `timestamp` - When connection was established

**Joins With**:
- MATCHMAKING (via `source_user_id`, `target_user_id`)

---

### 4. CUPID_TRUST_SAFETY (Content Moderation)
**Purpose**: Message content moderation and safety classification  
**Primary Key**: `message_id` (MSG00001-MSG00100)  
**Rows**: 100  
**Key Columns**:
- `message_id` - Unique message identifier
- `message_text` - Actual message content
- `toxicity_score` - Toxicity level (0-1, where 1 is most toxic)
- `category` - Content category (safe, scam, harassment, adult, spam)
- `language_code` - Message language (en, es, fr, de, nl, pt, ja, etc.)
- `moderation_action` - Moderation decision (allow, block, review)

**Joins With**:
- LOVE_NOTES_TELEMETRY (via message characteristics)

---

### 5. CUPID_GLOBAL_ROUTING (Infrastructure)
**Purpose**: Global routing capacity and network performance  
**Primary Key**: `routing_id` (RT00001-RT00100)  
**Foreign Key**: `region` relates to SECURITY.`geo`, MATCHMAKING.`location_region`  
**Rows**: 100  
**Key Columns**:
- `routing_id` - Unique route identifier
- `region` - Geographic region (EU West, North Europe, Australia East, etc.)
- `request_count_per_min` - Request capacity per minute
- `p95_latency_ms` - 95th percentile latency
- `failure_rate` - Route failure rate
- `weather_factor` - Weather impact (snow, rain, wind, clear)
- `regulatory_constraint_flag` - Regulatory constraints (PCI, HIPAA, GDPR)

**Joins With**:
- SECURITY (via `geo`)
- MATCHMAKING (via `location_region`)
- TELEMETRY (via latency metrics)

---

### 6. LOVE_NOTES_TELEMETRY (Message Delivery)
**Purpose**: Message delivery tracking and performance metrics  
**Primary Key**: `message_id` (M00001-M00100)  
**Rows**: 100  
**Key Columns**:
- `message_id` - Unique message identifier
- `region_origin` - Source region
- `region_destination` - Destination region
- `latency_ms` - Message delivery latency
- `retry_count` - Number of delivery retries
- `delivery_status` - Status (delivered, failed, pending)
- `device_type` - Device type (web, desktop, mobile)
- `network_speed_mbps` - Network speed
- `timestamp` - Delivery timestamp
- `batch_id` - Batch processing identifier

**Joins With**:
- ROUTING (via `region_origin`, `region_destination`)
- TRUST_SAFETY (via message content characteristics)

---

### 7. MODERN_WORK_DYNAMICS (Meeting Analytics)
**Purpose**: Team collaboration and meeting effectiveness  
**Primary Key**: `event_id` (EVT00001-EVT00100)  
**Rows**: 100  
**Key Columns**:
- `event_id` - Unique event identifier
- `meeting_id` - Meeting identifier
- `participants_count` - Number of participants
- `response_pattern` - Participant response (accepted, declined, tentative)
- `cross_timezone_issues` - Whether timezone issues occurred (True/False)
- `sentiment_of_notes` - Sentiment score of meeting notes
- `action_items_completed` - Number of completed action items

**Joins With**:
- TELEMETRY (via event timing)
- SECURITY (via participant user context)

---

### 8. CUPID_SUPPLY_CHAIN (Fulfillment)
**Purpose**: Product supply chain and order fulfillment  
**Primary Key**: `order_id` (ORD000001-ORD000100)  
**Foreign Key**: `product_id` (6 unique products) → GIFTS  
**Rows**: 100  
**Key Columns**:
- `order_id` - Unique order identifier
- `product_id` - FK to GIFTS product
- `vendor_lead_time_days` - Supplier lead time
- `stock_level` - Current stock quantity
- `order_quantity` - Ordered quantity
- `delay_reason` - Delay cause (supplier_backlog, transport, customs, weather, none)
- `region` - Fulfillment region
- `cost_per_unit` - Unit cost
- `sustainability_score` - Sustainability rating

**Joins With**:
- GIFTS (via `product_id`)
- ROUTING (via `region`)

---

### 9. GIFTS - GiftRecommender (E-Commerce)
**Purpose**: Gift purchase transactions and recommendations  
**Primary Key**: `event_id` (EVT-00001 to EVT-10000)  
**Rows**: 10,000 (100x larger than others)  
**Key Columns**:
- `event_id` - Unique event identifier
- `event_ts` - Event timestamp
- `event_type` - Type (view, add_to_cart, purchase, wishlist)
- `customer_id` - Customer identifier
- `product_sku` - Product SKU
- `product_name` - Product name
- `product_category` - Category (Chocolate, Flowers, Jewelry, etc.)
- `brand` - Brand name
- `list_price` - Original price
- `discount_pct` - Discount percentage
- `unit_price` - Final price paid
- `payment_type_masked` - Payment method (card, wallet, invoice) - **Only for purchases**
- `rating` - Product rating (1-5) - **Only for non-returned purchases**
- `returned_flag` - Whether product was returned
- `delivery_speed` - Delivery option (express, same_day, two_hour, standard)
- `currency` - Transaction currency
- `season` - Season (regular, valentines_peak)

**Joins With**:
- SUPPLY_CHAIN (via `product_sku`)
- SECURITY (via timestamp/customer context)

---

### 10. CUPID_CHOCOLATE_GLOBAL (Star Schema - Optional)
**Purpose**: Separate analytical database for chocolate sales  
**Structure**: Dimensional Data Warehouse (Star Schema)  
**Tables**:
- `DimCustomer` - Customer dimension (country, loyalty tier, etc.)
- `DimProduct` - Product dimension (product details, brand)
- `DimDate` - Date dimension (full_date, month, year, season)
- `DimPromotion` - Promotion dimension
- `DimStore` - Store/region dimension
- `DimSupplier` - Supplier dimension
- `FactSales` - Sales facts (quantities, amounts)

**Note**: This is a **separate analytical system** not directly joined with other datasets, but provides chocolate sales context.

---

## 🔗 Join Relationships Summary

| From Dataset | To Dataset | Join Key(s) | Type | Use Case |
|---|---|---|---|---|
| MATCHMAKING | SECURITY | `user_id` | 1:1 | User security audits |
| MATCHMAKING | BEHAVIOR_EDGES | `user_id` | 1:many | User relationship graph |
| BEHAVIOR_EDGES | TRUST_SAFETY | content type | N:M | Message safety in conversations |
| SECURITY | ROUTING | `geo` region | N:1 | Regional security audit distribution |
| SECURITY | GIFTS | timestamp ranges | N:M | Purchase authentication context |
| ROUTING | TELEMETRY | `region_*` | 1:many | Network latency vs capacity |
| TELEMETRY | WORK_DYNAMICS | timestamp | 1:many | Message delivery in meetings |
| GIFTS | SUPPLY_CHAIN | `product_id` | 1:many | Purchase to fulfillment |
| SUPPLY_CHAIN | ROUTING | `region` | N:1 | Order fulfillment by region |

