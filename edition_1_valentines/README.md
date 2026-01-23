# Valentine's Day Edition 💝

<p align="center">
  <img src="../img/heart2.png" alt="Cupid Chocolate" width="25%">
</p>

Welcome to the Valentine's Day Special Edition of Geekster! This edition celebrates love, data, and chocolate in the most delightful way possible. 

Join us on a sweet journey through the world of Cupid Chocolate Company as we explore customer behavior, sales patterns, and the magic that happens when data meets romance. Whether you're here to learn, compete, or simply indulge in some data-driven storytelling, we hope this edition fills your heart with joy and your mind with insights.

<p align="left">
  <img src="../img/heart1.png" alt="Love Data" width="25%">
</p>

## 📋 Agenda

_Coming soon..._

---

# Datasets Overview

This edition features **10 diverse datasets** designed to work independently or together. Mix and match them based on your creative ideas!

---

## 🏆 Core Dataset: Cupid Chocolate Global

A comprehensive e-commerce data warehouse with **~13K sales transactions** across multiple countries.
*Where love meets commerce, one chocolate bar at a time.*

**Structure:** Star Schema with 7 tables
- **DimCustomer**: 2,000 customers with demographics, loyalty tier & preferences
- **DimProduct**: 66 products with pricing, categories & attributes
- **DimStore**: Global store locations (Online & Retail channels)
- **DimPromotion**: Marketing campaigns with budgets & performance metrics
- **DimSupplier**: Vendor information with lead times & quality scores
- **DimDate**: Complete date dimension for temporal analysis
- **FactSales**: Transaction records with costs, discounts & profit margins

**Use Cases:** Sales analysis, customer segmentation, supply chain optimization, regional performance

---

## 🎁 Complementary Datasets (Pick & Choose)

### 1. **Gift Recommender** (10,000 events)
Event-driven customer behavior with rich attributes for personalization.
*Because sometimes the algorithm knows what you want better than you do.*

- **Columns**: Customer profiles, product details, delivery preferences, ratings & returns
- **Join on**: `customer_id` with DimCustomer for enhanced profiles
- **Use Cases**: Recommendation engines, customer lifetime value, gift personalization
- **Records**: 10,000

### 2. **Cupid Behavior Graph Edges** (100 interactions)
Network data showing connections and relationships between users.
*The map of who actually responded to your messages.*

- **Columns**: `source_user_id`, `target_user_id`, `edge_type`, `weight`, `probability`
- **Use Cases**: Social network analysis, relationship mapping, community detection
- **Records**: 100

### 3. **Cupid Matchmaking** (100 profiles)
User profiles with personality traits and matching success metrics.
*The algorithm that swears it knows what you want.*

- **Columns**: Big Five OCEAN traits, age, interests, matching attempts & success rates
- **Use Cases**: Behavioral analysis, preference modeling, compatibility studies
- **Records**: 100

### 4. **Broken Hearts Security** (100 events)
Authentication and fraud detection logs with risk scoring.
*Because even Cupid needs a firewall.*

- **Columns**: `login_attempt_id`, `user_id`, `ip_address`, `geo`, `risk_score`, `MFA_result`
- **Use Cases**: Security analysis, fraud detection, device compliance patterns
- **Records**: 100

### 5. **Cupid Trust & Safety** (100 messages)
Content moderation and toxicity detection across multiple languages.
*Protecting your matches from the weird stuff.*

- **Columns**: `message_text`, `toxicity_score`, `category`, `language_code`, `moderation_action`
- **Use Cases**: Content moderation, toxicity detection, safety enforcement
- **Records**: 100

### 6. **Cupid Supply Chain** (100 products)
Inventory and supply chain data with lead times and sustainability metrics.
*Chocolates and flowers won't deliver themselves.*

- **Columns**: `product_id`, `vendor_lead_time_days`, `stock_level`, `delay_reason`, `sustainability_score`
- **Join on**: `product_id` with DimProduct ✅ *Verified working*
- **Use Cases**: Supply chain optimization, inventory management, sustainability analysis
- **Records**: 100

### 7. **Love Notes Telemetry** (100 deliveries)
Message delivery performance metrics across regions.
*Every "Good morning" tracked across continents.*

- **Columns**: `message_id`, `region_origin`, `region_destination`, `latency_ms`, `retry_count`, `delivery_status`
- **Use Cases**: Performance optimization, reliability analysis, cross-region insights
- **Records**: 100

### 8. **Cupid Global Routing** (100 regions)
Regional traffic metrics and performance analytics.
*Why your message took 230ms to arrive.*

- **Columns**: `region`, `request_count_per_min`, `p95_latency_ms`, `failure_rate`, `weather_factor`
- **Use Cases**: Capacity planning, performance monitoring, infrastructure analysis
- **Records**: 100

### 9. **Modern Work Dynamics** (100 meetings)
Meeting and collaboration data with sentiment analysis.
*Because love is complicated... and scheduled in Outlook.*

- **Columns**: `meeting_id`, `participants_count`, `response_pattern`, `cross_timezone_issues`, `sentiment_of_notes`
- **Use Cases**: Team collaboration analysis, productivity metrics, timezone impact assessment
- **Records**: 100

---

## 🔗 Joining Guide

**For Sales & Customer Deep-Dive:**
- Start with: Cupid Chocolate Global (all 7 tables)
- Add: Gift Recommender (customer_id join for 10K events)
- Add: Cupid Supply Chain (product_id join for logistics insights)

**For Network & Behavioral Analysis:**
- Start with: Cupid Behavior Graph Edges
- Add: Cupid Matchmaking (personality & compatibility)
- Add: Cupid Chocolate Global (if customer_id aligns)

**For Platform Performance & Reliability:**
- Combine: Love Notes Telemetry + Cupid Global Routing + Broken Hearts Security
- Optional: Modern Work Dynamics for collaboration performance

**For End-to-End Experience:**
- Mix any datasets that tell your story!
- All datasets are designed for flexibility and can complement each other thematically or analytically

---

## 🚀 Quick Start

All datasets are in CSV format. Pick your starting point:

```python
import pandas as pd

# Load your dataset of choice
df = pd.read_csv('path/to/dataset.csv')

# Now go tell a story with data!
# May the odds be ever in your favor. Or at least in your regression models!
```

**How to use:**
1. **Explore the data** — All datasets are in `/data` folder
2. **Pick your angle** — What question do you want to answer?
3. **Mix & match** — Combine datasets using the joining guide
4. **Tell your story** — Use data to uncover insights

**Remember**: There are no prescribed solutions. Use your imagination! ✨

---

## 🎯 Evaluation Criteria

_The evaluation criteria and scoring methodology for this challenge will be outlined here._

<p align="right">
  <img src="../img/heart3.png" alt="Spread the Love" width="25%">
</p>

---

Love,  
**The Geekster Crew** ❤️

<p align="left">
  <img src="../img/geekster_logo.png" alt="Geekster logo" width="25%">
</p>