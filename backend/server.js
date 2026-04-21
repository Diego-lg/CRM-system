const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, "crm.db");
const db = new Database(dbPath);

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT,
    company TEXT, role TEXT, status TEXT DEFAULT 'lead',
    tags TEXT, lastContact TEXT, score INTEGER DEFAULT 50,
    storeId TEXT, avatar TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, industry TEXT, size TEXT,
    revenue TEXT, website TEXT, phone TEXT, status TEXT DEFAULT 'lead',
    employees INTEGER DEFAULT 0, country TEXT, storeId TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, value INTEGER DEFAULT 0,
    stage TEXT DEFAULT 'new', contact TEXT, company TEXT, closeDate TEXT,
    probability INTEGER DEFAULT 20, storeId TEXT, owner TEXT,
    priority TEXT DEFAULT 'medium', notes TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, region TEXT, currency TEXT DEFAULT 'USD',
    manager TEXT, phone TEXT, email TEXT, status TEXT DEFAULT 'active',
    revenue INTEGER DEFAULT 0, target INTEGER DEFAULT 0, address TEXT,
    color TEXT DEFAULT '#4f46e5', createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY, type TEXT, title TEXT, contact TEXT,
    date TEXT, time TEXT, duration INTEGER DEFAULT 0, status TEXT DEFAULT 'scheduled',
    notes TEXT, priority TEXT DEFAULT 'medium', storeId TEXT, createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    companyName TEXT DEFAULT 'CRM-system',
    primaryColor TEXT DEFAULT '#4f46e5',
    currency TEXT DEFAULT 'USD',
    timezone TEXT DEFAULT 'America/New_York',
    dateFormat TEXT DEFAULT 'MM/DD/YYYY',
    fiscalYear TEXT DEFAULT 'January',
    dealStages TEXT DEFAULT 'new,qualified,proposal,negotiation,won,lost',
    contactStatuses TEXT DEFAULT 'lead,prospect,customer,churned'
  );
`);

// Seed initial settings if not exists
const existingSettings = db
  .prepare("SELECT * FROM settings WHERE id = 1")
  .get();
if (!existingSettings) {
  db.prepare("INSERT INTO settings (id) VALUES (1)").run();
}

// Seed function to populate with initial data
function seedData() {
  const contactCount = db
    .prepare("SELECT COUNT(*) as count FROM contacts")
    .get().count;
  if (contactCount > 0) return;

  const now = new Date().toISOString();
  const seed = {
    contacts: [
      {
        id: "c1",
        name: "Sarah Johnson",
        email: "sarah.j@techcorp.com",
        phone: "+1-555-0101",
        company: "comp1",
        role: "CEO",
        status: "customer",
        tags: "VIP,Enterprise",
        lastContact: "2026-04-10",
        score: 95,
        storeId: "store1",
        avatar: "SJ",
      },
      {
        id: "c2",
        name: "Marcus Chen",
        email: "m.chen@innovate.io",
        phone: "+1-555-0102",
        company: "comp2",
        role: "CTO",
        status: "lead",
        tags: "Tech,SMB",
        lastContact: "2026-04-15",
        score: 72,
        storeId: "store1",
        avatar: "MC",
      },
      {
        id: "c3",
        name: "Emily Rodriguez",
        email: "emily@globalfirm.com",
        phone: "+1-555-0103",
        company: "comp3",
        role: "VP Sales",
        status: "prospect",
        tags: "Finance",
        lastContact: "2026-04-18",
        score: 60,
        storeId: "store2",
        avatar: "ER",
      },
      {
        id: "c4",
        name: "David Kim",
        email: "d.kim@startupxyz.com",
        phone: "+1-555-0104",
        company: "comp4",
        role: "Founder",
        status: "lead",
        tags: "Startup,Tech",
        lastContact: "2026-04-12",
        score: 80,
        storeId: "store2",
        avatar: "DK",
      },
      {
        id: "c5",
        name: "Lisa Patel",
        email: "lisa.p@retailco.com",
        phone: "+1-555-0105",
        company: "comp5",
        role: "Director",
        status: "customer",
        tags: "Retail,Enterprise",
        lastContact: "2026-04-05",
        score: 88,
        storeId: "store3",
        avatar: "LP",
      },
    ],
    companies: [
      {
        id: "comp1",
        name: "TechCorp Inc.",
        industry: "Technology",
        size: "Enterprise",
        revenue: "$50M",
        website: "techcorp.com",
        phone: "+1-555-1000",
        status: "customer",
        storeId: "store1",
        employees: 500,
        country: "USA",
      },
      {
        id: "comp2",
        name: "Innovate.io",
        industry: "SaaS",
        size: "Mid-Market",
        revenue: "$10M",
        website: "innovate.io",
        phone: "+1-555-1001",
        status: "prospect",
        storeId: "store1",
        employees: 120,
        country: "USA",
      },
      {
        id: "comp3",
        name: "Global Firm Ltd",
        industry: "Finance",
        size: "Enterprise",
        revenue: "$200M",
        website: "globalfirm.com",
        phone: "+1-555-1002",
        status: "lead",
        storeId: "store2",
        employees: 2000,
        country: "UK",
      },
    ],
    stores: [
      {
        id: "store1",
        name: "North America HQ",
        region: "North America",
        currency: "USD",
        manager: "Alex Rivera",
        phone: "+1-555-9000",
        email: "na@nexuscrm.com",
        status: "active",
        revenue: 420000,
        target: 500000,
        address: "123 Business Ave, New York, NY",
        color: "#4f46e5",
      },
      {
        id: "store2",
        name: "EMEA Division",
        region: "Europe",
        currency: "EUR",
        manager: "Marie Dupont",
        phone: "+44-20-0001",
        email: "emea@nexuscrm.com",
        status: "active",
        revenue: 285000,
        target: 350000,
        address: "45 Commerce St, London, UK",
        color: "#0891b2",
      },
      {
        id: "store3",
        name: "Asia Pacific",
        region: "Asia Pacific",
        currency: "USD",
        manager: "Kenji Tanaka",
        phone: "+81-3-0001",
        email: "apac@nexuscrm.com",
        status: "active",
        revenue: 195000,
        target: 250000,
        address: "7 Tech Park, Singapore",
        color: "#059669",
      },
    ],
    deals: [
      {
        id: "d1",
        title: "TechCorp Enterprise License",
        value: 85000,
        stage: "proposal",
        contact: "c1",
        company: "comp1",
        closeDate: "2026-05-30",
        probability: 70,
        storeId: "store1",
        owner: "Alex Rivera",
        priority: "high",
        notes: "Annual renewal",
      },
      {
        id: "d2",
        title: "Innovate.io SaaS Bundle",
        value: 24000,
        stage: "negotiation",
        contact: "c2",
        company: "comp2",
        closeDate: "2026-05-15",
        probability: 85,
        storeId: "store1",
        owner: "Maria Lopez",
        priority: "medium",
        notes: "Quarterly billing",
      },
      {
        id: "d3",
        title: "Global Firm Consulting",
        value: 150000,
        stage: "qualified",
        contact: "c3",
        company: "comp3",
        closeDate: "2026-06-30",
        probability: 40,
        storeId: "store2",
        owner: "Tom Baker",
        priority: "high",
        notes: "Long-term contract",
      },
    ],
    activities: [
      {
        id: "a1",
        type: "call",
        title: "Discovery call with Sarah",
        contact: "c1",
        date: "2026-04-21",
        time: "10:00",
        duration: 30,
        status: "scheduled",
        notes: "Discuss enterprise needs",
        priority: "high",
        storeId: "store1",
      },
      {
        id: "a2",
        type: "email",
        title: "Proposal follow-up to Marcus",
        contact: "c2",
        date: "2026-04-21",
        time: "14:00",
        duration: 0,
        status: "completed",
        notes: "Sent revised proposal",
        priority: "medium",
        storeId: "store1",
      },
    ],
  };

  const insertContact = db.prepare(
    "INSERT INTO contacts (id, name, email, phone, company, role, status, tags, lastContact, score, storeId, avatar) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
  );
  const insertCompany = db.prepare(
    "INSERT INTO companies (id, name, industry, size, revenue, website, phone, status, storeId, employees, country) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
  );
  const insertStore = db.prepare(
    "INSERT INTO stores (id, name, region, currency, manager, phone, email, status, revenue, target, address, color) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
  );
  const insertDeal = db.prepare(
    "INSERT INTO deals (id, title, value, stage, contact, company, closeDate, probability, storeId, owner, priority, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
  );
  const insertActivity = db.prepare(
    "INSERT INTO activities (id, type, title, contact, date, time, duration, status, notes, priority, storeId) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
  );

  Object.values(seed.contacts).forEach((c) =>
    insertContact.run(
      c.id,
      c.name,
      c.email,
      c.phone,
      c.company,
      c.role,
      c.status,
      c.tags,
      c.lastContact,
      c.score,
      c.storeId,
      c.avatar,
    ),
  );
  Object.values(seed.companies).forEach((c) =>
    insertCompany.run(
      c.id,
      c.name,
      c.industry,
      c.size,
      c.revenue,
      c.website,
      c.phone,
      c.status,
      c.storeId,
      c.employees,
      c.country,
    ),
  );
  Object.values(seed.stores).forEach((s) =>
    insertStore.run(
      s.id,
      s.name,
      s.region,
      s.currency,
      s.manager,
      s.phone,
      s.email,
      s.status,
      s.revenue,
      s.target,
      s.address,
      s.color,
    ),
  );
  Object.values(seed.deals).forEach((d) =>
    insertDeal.run(
      d.id,
      d.title,
      d.value,
      d.stage,
      d.contact,
      d.company,
      d.closeDate,
      d.probability,
      d.storeId,
      d.owner,
      d.priority,
      d.notes,
    ),
  );
  Object.values(seed.activities).forEach((a) =>
    insertActivity.run(
      a.id,
      a.type,
      a.title,
      a.contact,
      a.date,
      a.time,
      a.duration,
      a.status,
      a.notes,
      a.priority,
      a.storeId,
    ),
  );
}

seedData();

// Helper to parse tags
function parseTags(str) {
  return str ? str.split(",").map((t) => t.trim()) : [];
}

// ============ ROUTES ============

// Contacts
app.get("/api/contacts", (req, res) => {
  const { storeId, search, status } = req.query;
  let rows = db.prepare("SELECT * FROM contacts").all();
  if (storeId) rows = rows.filter((c) => c.storeId === storeId);
  if (search)
    rows = rows.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.email.toLowerCase().includes(search.toLowerCase()),
    );
  if (status) rows = rows.filter((c) => c.status === status);
  rows.forEach((r) => (r.tags = parseTags(r.tags)));
  res.json(rows);
});

app.post("/api/contacts", (req, res) => {
  const {
    name,
    email,
    phone,
    company,
    role,
    status,
    tags,
    lastContact,
    score,
    storeId,
    avatar,
  } = req.body;
  const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const av =
    avatar ||
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  db.prepare(
    "INSERT INTO contacts (id, name, email, phone, company, role, status, tags, lastContact, score, storeId, avatar) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
  ).run(
    id,
    name,
    email,
    phone,
    company,
    role,
    status || "lead",
    Array.isArray(tags) ? tags.join(",") : tags,
    lastContact,
    score || 50,
    storeId,
    av,
  );
  res.json({
    id,
    name,
    email,
    phone,
    company,
    role,
    status: status || "lead",
    tags: Array.isArray(tags) ? tags : parseTags(tags),
    lastContact,
    score: score || 50,
    storeId,
    avatar: av,
  });
});

app.put("/api/contacts/:id", (req, res) => {
  const {
    name,
    email,
    phone,
    company,
    role,
    status,
    tags,
    lastContact,
    score,
    storeId,
    avatar,
  } = req.body;
  const existing = db
    .prepare("SELECT * FROM contacts WHERE id = ?")
    .get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Not found" });
  db.prepare(
    "UPDATE contacts SET name=?,email=?,phone=?,company=?,role=?,status=?,tags=?,lastContact=?,score=?,storeId=?,avatar=? WHERE id=?",
  ).run(
    name,
    email,
    phone,
    company,
    role,
    status,
    Array.isArray(tags) ? tags.join(",") : tags,
    lastContact,
    score,
    storeId,
    avatar,
    req.params.id,
  );
  res.json({ ...req.body, id: req.params.id });
});

app.delete("/api/contacts/:id", (req, res) => {
  db.prepare("DELETE FROM contacts WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Companies
app.get("/api/companies", (req, res) => {
  const { storeId } = req.query;
  let rows = db.prepare("SELECT * FROM companies").all();
  if (storeId) rows = rows.filter((c) => c.storeId === storeId);
  res.json(rows);
});

app.post("/api/companies", (req, res) => {
  const {
    name,
    industry,
    size,
    revenue,
    website,
    phone,
    status,
    storeId,
    employees,
    country,
  } = req.body;
  const id = `comp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  db.prepare(
    "INSERT INTO companies (id, name, industry, size, revenue, website, phone, status, storeId, employees, country) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
  ).run(
    id,
    name,
    industry,
    size,
    revenue,
    website,
    phone,
    status || "lead",
    storeId,
    employees || 0,
    country,
  );
  res.json(req.body);
});

app.put("/api/companies/:id", (req, res) => {
  const {
    name,
    industry,
    size,
    revenue,
    website,
    phone,
    status,
    storeId,
    employees,
    country,
  } = req.body;
  db.prepare(
    "UPDATE companies SET name=?,industry=?,size=?,revenue=?,website=?,phone=?,status=?,storeId=?,employees=?,country=? WHERE id=?",
  ).run(
    name,
    industry,
    size,
    revenue,
    website,
    phone,
    status,
    storeId,
    employees,
    country,
    req.params.id,
  );
  res.json({ ...req.body, id: req.params.id });
});

app.delete("/api/companies/:id", (req, res) => {
  db.prepare("DELETE FROM companies WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Deals
app.get("/api/deals", (req, res) => {
  const { storeId } = req.query;
  let rows = db.prepare("SELECT * FROM deals").all();
  if (storeId) rows = rows.filter((d) => d.storeId === storeId);
  res.json(rows);
});

app.post("/api/deals", (req, res) => {
  const {
    title,
    value,
    stage,
    contact,
    company,
    closeDate,
    probability,
    storeId,
    owner,
    priority,
    notes,
  } = req.body;
  const id = `d_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  db.prepare(
    "INSERT INTO deals (id, title, value, stage, contact, company, closeDate, probability, storeId, owner, priority, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
  ).run(
    id,
    title,
    value || 0,
    stage || "new",
    contact,
    company,
    closeDate,
    probability || 20,
    storeId,
    owner,
    priority || "medium",
    notes,
  );
  res.json({ ...req.body, id });
});

app.put("/api/deals/:id", (req, res) => {
  const {
    title,
    value,
    stage,
    contact,
    company,
    closeDate,
    probability,
    storeId,
    owner,
    priority,
    notes,
  } = req.body;
  db.prepare(
    "UPDATE deals SET title=?,value=?,stage=?,contact=?,company=?,closeDate=?,probability=?,storeId=?,owner=?,priority=?,notes=? WHERE id=?",
  ).run(
    title,
    value,
    stage,
    contact,
    company,
    closeDate,
    probability,
    storeId,
    owner,
    priority,
    notes,
    req.params.id,
  );
  res.json({ ...req.body, id: req.params.id });
});

app.patch("/api/deals/:id/stage", (req, res) => {
  const { stage } = req.body;
  db.prepare("UPDATE deals SET stage=? WHERE id=?").run(stage, req.params.id);
  res.json({ success: true, stage });
});

app.delete("/api/deals/:id", (req, res) => {
  db.prepare("DELETE FROM deals WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Stores
app.get("/api/stores", (req, res) => {
  res.json(db.prepare("SELECT * FROM stores").all());
});

app.post("/api/stores", (req, res) => {
  const {
    name,
    region,
    currency,
    manager,
    phone,
    email,
    status,
    revenue,
    target,
    address,
    color,
  } = req.body;
  const id = `store_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  db.prepare(
    "INSERT INTO stores (id, name, region, currency, manager, phone, email, status, revenue, target, address, color) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
  ).run(
    id,
    name,
    region,
    currency || "USD",
    manager,
    phone,
    email,
    status || "active",
    revenue || 0,
    target || 0,
    address,
    color || "#4f46e5",
  );
  res.json({ ...req.body, id });
});

app.put("/api/stores/:id", (req, res) => {
  const {
    name,
    region,
    currency,
    manager,
    phone,
    email,
    status,
    revenue,
    target,
    address,
    color,
  } = req.body;
  db.prepare(
    "UPDATE stores SET name=?,region=?,currency=?,manager=?,phone=?,email=?,status=?,revenue=?,target=?,address=?,color=? WHERE id=?",
  ).run(
    name,
    region,
    currency,
    manager,
    phone,
    email,
    status,
    revenue,
    target,
    address,
    color,
    req.params.id,
  );
  res.json({ ...req.body, id: req.params.id });
});

app.delete("/api/stores/:id", (req, res) => {
  db.prepare("DELETE FROM stores WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Activities
app.get("/api/activities", (req, res) => {
  const { storeId } = req.query;
  let rows = db.prepare("SELECT * FROM activities").all();
  if (storeId) rows = rows.filter((a) => a.storeId === storeId);
  res.json(rows);
});

app.post("/api/activities", (req, res) => {
  const {
    type,
    title,
    contact,
    date,
    time,
    duration,
    status,
    notes,
    priority,
    storeId,
  } = req.body;
  const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  db.prepare(
    "INSERT INTO activities (id, type, title, contact, date, time, duration, status, notes, priority, storeId) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
  ).run(
    id,
    type,
    title,
    contact,
    date,
    time,
    duration || 0,
    status || "scheduled",
    notes,
    priority || "medium",
    storeId,
  );
  res.json({ ...req.body, id });
});

app.put("/api/activities/:id", (req, res) => {
  const {
    type,
    title,
    contact,
    date,
    time,
    duration,
    status,
    notes,
    priority,
    storeId,
  } = req.body;
  db.prepare(
    "UPDATE activities SET type=?,title=?,contact=?,date=?,time=?,duration=?,status=?,notes=?,priority=?,storeId=? WHERE id=?",
  ).run(
    type,
    title,
    contact,
    date,
    time,
    duration,
    status,
    notes,
    priority,
    storeId,
    req.params.id,
  );
  res.json({ ...req.body, id: req.params.id });
});

app.patch("/api/activities/:id/complete", (req, res) => {
  db.prepare("UPDATE activities SET status=? WHERE id=?").run(
    "completed",
    req.params.id,
  );
  res.json({ success: true });
});

app.delete("/api/activities/:id", (req, res) => {
  db.prepare("DELETE FROM activities WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

// Settings
app.get("/api/settings", (req, res) => {
  const row = db.prepare("SELECT * FROM settings WHERE id = 1").get();
  if (row.dealStages) row.dealStages = row.dealStages.split(",");
  if (row.contactStatuses) row.contactStatuses = row.contactStatuses.split(",");
  if (!row.users)
    row.users = [
      {
        id: "u1",
        name: "Alex Rivera",
        email: "alex@nexuscrm.com",
        role: "Admin",
        avatar: "AR",
        status: "active",
      },
      {
        id: "u2",
        name: "Maria Lopez",
        email: "maria@nexuscrm.com",
        role: "Sales Rep",
        avatar: "ML",
        status: "active",
      },
      {
        id: "u3",
        name: "Tom Baker",
        email: "tom@nexuscrm.com",
        role: "Sales Rep",
        avatar: "TB",
        status: "active",
      },
    ];
  res.json(row);
});

app.put("/api/settings", (req, res) => {
  const {
    companyName,
    primaryColor,
    currency,
    timezone,
    dateFormat,
    fiscalYear,
  } = req.body;
  db.prepare(
    "UPDATE settings SET companyName=?,primaryColor=?,currency=?,timezone=?,dateFormat=?,fiscalYear=? WHERE id=1",
  ).run(companyName, primaryColor, currency, timezone, dateFormat, fiscalYear);
  res.json(req.body);
});

// Analytics data
app.get("/api/analytics", (req, res) => {
  const deals = db.prepare("SELECT * FROM deals").all();
  const contacts = db.prepare("SELECT * FROM contacts").all();
  const companies = db.prepare("SELECT * FROM companies").all();
  const stores = db.prepare("SELECT * FROM stores").all();

  const wonDeals = deals.filter((d) => d.stage === "won");
  const lostDeals = deals.filter((d) => d.stage === "lost");
  const openDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));

  res.json({
    totalRevenue: wonDeals.reduce((s, d) => s + d.value, 0),
    pipelineValue: openDeals.reduce((s, d) => s + d.value, 0),
    openDeals: openDeals.length,
    winRate:
      wonDeals.length + lostDeals.length > 0
        ? Math.round(
            (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100,
          )
        : 0,
    wonCount: wonDeals.length,
    contacts: contacts.length,
    companies: companies.length,
    stores,
    revenueHistory: [
      { month: "Oct", store1: 38000, store2: 22000, store3: 14000 },
      { month: "Nov", store1: 41000, store2: 25000, store3: 16000 },
      { month: "Dec", store1: 55000, store2: 30000, store3: 22000 },
      { month: "Jan", store1: 44000, store2: 28000, store3: 17000 },
      { month: "Feb", store1: 48000, store2: 31000, store3: 19000 },
      { month: "Mar", store1: 62000, store2: 38000, store3: 24000 },
      { month: "Apr", store1: 72000, store2: 48000, store3: 31000 },
    ],
    pipelineHistory: [
      {
        month: "Jan",
        new: 5,
        qualified: 8,
        proposal: 6,
        negotiation: 4,
        won: 3,
      },
      {
        month: "Feb",
        new: 7,
        qualified: 9,
        proposal: 7,
        negotiation: 5,
        won: 4,
      },
      {
        month: "Mar",
        new: 10,
        qualified: 11,
        proposal: 8,
        negotiation: 6,
        won: 6,
      },
      {
        month: "Apr",
        new: 8,
        qualified: 12,
        proposal: 9,
        negotiation: 5,
        won: 5,
      },
    ],
  });
});

// Health check
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() }),
);

app.listen(PORT, () => {
  console.log(`CRM-system Backend running on http://localhost:${PORT}`);
  console.log(
    `API endpoints: /api/contacts, /api/companies, /api/deals, /api/stores, /api/activities, /api/settings, /api/analytics`,
  );
});
