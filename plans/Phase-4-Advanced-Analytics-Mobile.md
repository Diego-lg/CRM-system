# Phase 4: Advanced Analytics & Mobile

## Overview
This phase adds a custom report builder, dashboard customization, mobile-responsive improvements, and Progressive Web App (PWA) support.

---

## 1. Custom Report Builder

### 1.1 Database Schema

#### Add to `supabase/schema.sql`
```sql
-- ============================================
-- CUSTOM REPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    report_type TEXT NOT NULL, -- 'contacts', 'companies', 'deals', 'activities', 'revenue'
    config JSONB NOT NULL, -- {
        -- columns to show
        -- filters to apply
        -- grouping options
        -- date ranges
        -- aggregations (sum, avg, count)
    }
    schedule JSONB, -- {frequency: 'daily', 'weekly', 'monthly', recipients: [...]}
    is_public BOOLEAN DEFAULT FALSE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    format TEXT NOT NULL, -- 'csv', 'xlsx', 'pdf'
    file_path TEXT,
    generated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reports" ON reports FOR ALL USING (auth.uid() = created_by);
CREATE POLICY "Anyone can view public reports" ON reports FOR SELECT USING (is_public = true);
CREATE POLICY "Users can manage own report exports" ON report_exports FOR ALL USING (auth.uid() = generated_by);
```

### 1.2 Report Builder Component

#### Create `frontend/src/components/ReportBuilder.jsx`
```jsx
import React, { useState, useMemo } from 'react';
import { FileText, Download, Play, Save, Calendar, Filter, BarChart2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { exportToCSV } from '../lib/csvExport';
import useCRM from '../store/useCRM';

const REPORT_TYPES = {
  contacts: {
    label: 'Contacts Report',
    columns: ['name', 'email', 'phone', 'company', 'role', 'status', 'score', 'lastContact', 'tags'],
    filters: ['status', 'score', 'company', 'storeId'],
  },
  companies: {
    label: 'Companies Report',
    columns: ['name', 'industry', 'size', 'revenue', 'status', 'employees', 'country', 'website'],
    filters: ['status', 'industry', 'size', 'country'],
  },
  deals: {
    label: 'Deals Report',
    columns: ['title', 'value', 'stage', 'probability', 'priority', 'closeDate', 'owner', 'company'],
    filters: ['stage', 'priority', 'owner', 'storeId', 'dateRange'],
  },
  activities: {
    label: 'Activities Report',
    columns: ['type', 'title', 'contact', 'date', 'time', 'duration', 'status', 'priority'],
    filters: ['type', 'status', 'priority', 'dateRange'],
  },
  revenue: {
    label: 'Revenue Report',
    columns: ['month', 'store', 'revenue', 'target', 'variance', 'growth'],
    filters: ['storeId', 'dateRange'],
  },
};

export default function ReportBuilder() {
  const [reportType, setReportType] = useState('contacts');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [filters, setFilters] = useState({});
  const [reportName, setReportName] = useState('');
  const [savedReports, setSavedReports] = useState([]);
  const [loading, setLoading] = useState(false);

  const contacts = useCRM((s) => s.contacts);
  const companies = useCRM((s) => s.companies);
  const deals = useCRM((s) => s.deals);
  const activities = useCRM((s) => s.activities);
  const stores = useCRM((s) => s.stores);

  useState(() => {
    loadSavedReports();
  }, []);

  const config = REPORT_TYPES[reportType];

  const loadSavedReports = async () => {
    const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
    if (data) setSavedReports(data);
  };

  const handleColumnToggle = (column) => {
    setSelectedColumns((prev) =>
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]
    );
  };

  const handleRunReport = async () => {
    setLoading(true);
    try {
      let data;
      const columns = selectedColumns.length > 0 ? selectedColumns : config.columns;

      switch (reportType) {
        case 'contacts':
          data = filterData(contacts, filters).map((c) => ({
            ...c,
            company: companies.find((comp) => comp.id === c.company)?.name || c.company,
          }));
          break;
        case 'companies':
          data = filterData(companies, filters);
          break;
        case 'deals':
          data = filterData(deals, filters).map((d) => ({
            ...d,
            company: companies.find((comp) => comp.id === d.company)?.name || d.company,
          }));
          break;
        case 'activities':
          data = filterData(activities, filters).map((a) => ({
            ...a,
            contact: contacts.find((c) => c.id === a.contact)?.name || a.contact,
          }));
          break;
        case 'revenue':
          data = generateRevenueReport();
          break;
      }

      // Export to CSV
      const exportColumns = columns.map((col) => ({ key: col, label: col.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()) }));
      exportToCSV(data, exportColumns, `${reportType}_report_${new Date().toISOString().split('T')[0]}`);
    } catch (error) {
      console.error('Failed to run report:', error);
    }
    setLoading(false);
  };

  const handleSaveReport = async () => {
    if (!reportName) {
      alert('Please enter a report name');
      return;
    }

    const config = {
      type: reportType,
      columns: selectedColumns,
      filters,
    };

    await supabase.from('reports').insert({
      name: reportName,
      report_type: reportType,
      config,
      created_by: useCRM.getState().user?.id,
    });

    await loadSavedReports();
    setReportName('');
    alert('Report saved!');
  };

  const loadReport = (report) => {
    setReportType(report.report_type);
    setSelectedColumns(report.config.columns || []);
    setFilters(report.config.filters || {});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Report Builder</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Type */}
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <FileText size={18} /> Report Type
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.entries(REPORT_TYPES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => {
                    setReportType(key);
                    setSelectedColumns([]);
                  }}
                  className={`p-3 text-sm rounded-lg border transition-colors ${
                    reportType === key
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Column Selection */}
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart2 size={18} /> Columns to Include
            </h3>
            <div className="flex flex-wrap gap-2">
              {config.columns.map((column) => (
                <label
                  key={column}
                  className={`px-3 py-2 text-sm rounded-lg border cursor-pointer transition-colors ${
                    selectedColumns.includes(column) || selectedColumns.length === 0
                      ? 'border-gray-900 bg-gray-100'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column) || selectedColumns.length === 0}
                    onChange={() => handleColumnToggle(column)}
                    className="mr-2"
                  />
                  {column.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                </label>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="card">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Filter size={18} /> Filters
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {config.filters.map((filter) => (
                <div key={filter}>
                  <label className="label capitalize">{filter.replace(/([A-Z])/g, ' $1')}</label>
                  {filter === 'status' && (
                    <select
                      value={filters[filter] || ''}
                      onChange={(e) => setFilters({ ...filters, [filter]: e.target.value })}
                      className="input"
                    >
                      <option value="">All</option>
                      {reportType === 'contacts' && ['lead', 'prospect', 'customer', 'churned'].map((s) => <option key={s} value={s}>{s}</option>)}
                      {reportType === 'companies' && ['lead', 'prospect', 'customer'].map((s) => <option key={s} value={s}>{s}</option>)}
                      {reportType === 'deals' && ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                  {filter === 'storeId' && (
                    <select
                      value={filters[filter] || ''}
                      onChange={(e) => setFilters({ ...filters, [filter]: e.target.value })}
                      className="input"
                    >
                      <option value="">All Stores</option>
                      {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                  {filter === 'dateRange' && (
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={filters.startDate || ''}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="input"
                        placeholder="Start date"
                      />
                      <input
                        type="date"
                        value={filters.endDate || ''}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="input"
                        placeholder="End date"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleRunReport}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <Play size={16} />
              {loading ? 'Generating...' : 'Run Report'}
            </button>
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Save report as..."
                className="input flex-1"
              />
              <button onClick={handleSaveReport} className="btn-secondary flex items-center gap-2">
                <Save size={16} /> Save
              </button>
            </div>
          </div>
        </div>

        {/* Saved Reports Sidebar */}
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold mb-4">Saved Reports</h3>
            {savedReports.length === 0 ? (
              <p className="text-sm text-gray-500">No saved reports</p>
            ) : (
              <div className="space-y-2">
                {savedReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => loadReport(report)}
                    className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <p className="font-medium text-sm">{report.name}</p>
                    <p className="text-xs text-gray-500">{report.report_type} report</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function filterData(data, filters) {
  return data.filter((item) => {
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      if (item[key] !== value) return false;
    }
    return true;
  });
}

function generateRevenueReport() {
  // Simplified revenue report generation
  const { revenueHistory } = useCRM.getState();
  return revenueHistory.map((r) => ({
    month: r.month,
    store: 'All Stores',
    revenue: (r.store1 || 0) + (r.store2 || 0) + (r.store3 || 0),
    target: 0,
    variance: 0,
    growth: 0,
  }));
}
```

---

## 2. Dashboard Customization

### 2.1 Database Schema

#### Add to `supabase/schema.sql`
```sql
-- ============================================
-- DASHBOARD CUSTOMIZATION
-- ============================================

CREATE TABLE IF NOT EXISTS dashboard_layouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    layout_config JSONB NOT NULL, -- {
        -- widget positions
        -- widget sizes
        -- visibility settings
    }
    is_default BOOLEAN DEFAULT FALSE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE dashboard_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own dashboard layouts" ON dashboard_layouts FOR ALL USING (auth.uid() = user_id);
```

### 2.2 Draggable Dashboard Component

#### Create `frontend/src/components/DashboardGrid.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, X, Plus } from 'lucide-react';

const WIDGET_TYPES = [
  { id: 'stats', name: 'Stats Cards', description: 'KPI metrics display' },
  { id: 'revenue-chart', name: 'Revenue Chart', description: 'Revenue trend visualization' },
  { id: 'pipeline-chart', name: 'Pipeline Chart', description: 'Deal stage distribution' },
  { id: 'recent-activity', name: 'Recent Activity', description: 'Latest activities feed' },
  { id: 'top-deals', name: 'Top Deals', description: 'Highest value open deals' },
  { id: 'top-contacts', name: 'Top Contacts', description: 'Highest scoring contacts' },
  { id: 'calendar', name: 'Calendar', description: 'Upcoming activities' },
  { id: 'goal-progress', name: 'Goal Progress', description: 'Store target progress' },
];

const defaultLayout = [
  { id: 'stats-1', type: 'stats', x: 0, y: 0, w: 12, h: 2 },
  { id: 'revenue-1', type: 'revenue-chart', x: 0, y: 2, w: 8, h: 4 },
  { id: 'pipeline-1', type: 'pipeline-chart', x: 8, y: 2, w: 4, h: 4 },
];

export default function DashboardGrid() {
  const [layout, setLayout] = useState(defaultLayout);
  const [editMode, setEditMode] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);

  useEffect(() => {
    loadLayout();
  }, []);

  const loadLayout = async () => {
    // Load user's saved layout
    const saved = localStorage.getItem('dashboardLayout');
    if (saved) {
      setLayout(JSON.parse(saved));
    }
  };

  const saveLayout = async () => {
    localStorage.setItem('dashboardLayout', JSON.stringify(layout));
    // Also save to Supabase if user is authenticated
  };

  const handleDragEnd = (result) => {
    if (!editMode) return;

    const { destination, source, draggableId } = result;
    if (!destination) return;

    const newLayout = [...layout];
    const draggedWidget = newLayout.find((w) => w.id === draggableId);
    if (draggedWidget) {
      // Update position
      draggedWidget.x = destination.index % 12;
      draggedWidget.y = Math.floor(destination.index / 12);
      setLayout(newLayout);
    }
  };

  const addWidget = (type) => {
    const newWidget = {
      id: `${type}-${Date.now()}`,
      type,
      x: 0,
      y: layout.length,
      w: 6,
      h: 3,
    };
    setLayout([...layout, newWidget]);
    setShowWidgetPicker(false);
  };

  const removeWidget = (id) => {
    setLayout(layout.filter((w) => w.id !== id));
  };

  const renderWidget = (widget) => {
    switch (widget.type) {
      case 'stats':
        return <StatsWidget />;
      case 'revenue-chart':
        return <RevenueChartWidget />;
      case 'pipeline-chart':
        return <PipelineWidget />;
      case 'recent-activity':
        return <RecentActivityWidget />;
      case 'top-deals':
        return <TopDealsWidget />;
      case 'top-contacts':
        return <TopContactsWidget />;
      default:
        return <div className="p-4 text-gray-500">Unknown widget type</div>;
    }
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Dashboard</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowWidgetPicker(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus size={16} /> Add Widget
          </button>
          <button
            onClick={() => {
              setEditMode(!editMode);
              if (!editMode) saveLayout();
            }}
            className={`btn-secondary ${editMode ? 'bg-gray-900 text-white' : ''}`}
          >
            {editMode ? 'Done Editing' : 'Edit Dashboard'}
          </button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-12 gap-4"
            >
              {layout.map((widget, index) => (
                <Draggable
                  key={widget.id}
                  draggableId={widget.id}
                  index={index}
                  isDragDisabled={!editMode}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-white rounded-xl border ${
                        snapshot.isDragging ? 'shadow-lg' : ''
                      }`}
                      style={{
                        ...provided.draggableProps.style,
                        gridColumn: `span ${widget.w}`,
                        gridRow: `span ${widget.h}`,
                      }}
                    >
                      {editMode && (
                        <div className="flex items-center justify-between p-2 border-b bg-gray-50">
                          <div {...provided.dragHandleProps} className="cursor-grab">
                            <GripVertical size={16} />
                          </div>
                          <button
                            onClick={() => removeWidget(widget.id)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                      {renderWidget(widget)}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Widget Picker Modal */}
      {showWidgetPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="font-semibold mb-4">Add Widget</h3>
            <div className="grid grid-cols-2 gap-3">
              {WIDGET_TYPES.map((widget) => (
                <button
                  key={widget.id}
                  onClick={() => addWidget(widget.id)}
                  className="p-4 border rounded-lg text-left hover:bg-gray-50"
                >
                  <p className="font-medium text-sm">{widget.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{widget.description}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowWidgetPicker(false)}
              className="w-full btn-secondary mt-4"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Placeholder widgets - would be replaced with actual components
function StatsWidget() {
  const stats = useCRM((s) => s.getDashboardStats());
  return (
    <div className="p-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Revenue</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.openDeals}</p>
          <p className="text-xs text-gray-500">Open Deals</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.contacts}</p>
          <p className="text-xs text-gray-500">Contacts</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold">{stats.winRate}%</p>
          <p className="text-xs text-gray-500">Win Rate</p>
        </div>
      </div>
    </div>
  );
}
```

---

## 3. Mobile PWA Support

### 3.1 Vite PWA Plugin Setup

#### Update `frontend/package.json`
Add to dependencies:
```json
{
  "vite-plugin-pwa": "^0.17.0",
  "workbox-window": "^7.0.0"
}
```

#### Update `frontend/vite.config.js`
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'crm-icon.svg'],
      manifest: {
        name: 'CRM-system',
        short_name: 'CRM',
        description: 'Full-Featured CRM Platform',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'crm-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: 'crm-icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*supabase\.co\/rest\/v1\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
        ],
      },
    }),
  ],
});
```

### 3.2 Mobile Responsiveness Improvements

#### Update `frontend/src/index.css`
Add mobile-first styles and touch-friendly interactions:

```css
@layer utilities {
  /* Touch-friendly targets */
  .touch-target {
    min-height: 44px;
    min-width: 44px;
  }

  /* Mobile safe areas */
  .safe-top {
    padding-top: env(safe-area-inset-top);
  }
  .safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* Hide scrollbar on mobile but allow scrolling */
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }

  /* Mobile card styles */
  @media (max-width: 640px) {
    .card {
      border-radius: 0;
      border-left: none;
      border-right: none;
    }
  }
}

/* Mobile navigation */
.mobile-nav {
  @apply fixed bottom-0 left-0 right-0 bg-white border-t z-40;
  padding-bottom: env(safe-area-inset-bottom);
}

/* Swipe gestures */
.swipe-container {
  @apply overflow-x-auto;
  -webkit-overflow-scrolling: touch;
}

.swipe-item {
  @apply flex-shrink-0;
}
```

### 3.3 Mobile Navigation Component

#### Create `frontend/src/components/MobileNav.jsx`
```jsx
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Users, Building2, Briefcase, Calendar, BarChart2, Settings } from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: Home, label: 'Home' },
  { path: '/contacts', icon: Users, label: 'Contacts' },
  { path: '/companies', icon: Building2, label: 'Companies' },
  { path: '/deals', icon: Briefcase, label: 'Deals' },
  { path: '/activities', icon: Calendar, label: 'Activities' },
  { path: '/analytics', icon: BarChart2, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function MobileNav() {
  const location = useLocation();

  // Only show on mobile
  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
    return null;
  }

  return (
    <nav className="mobile-nav safe-bottom">
      <div className="flex justify-around items-center h-16">
        {navItems.map(({ path, icon: Icon, label }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full touch-target ${
                isActive ? 'text-gray-900' : 'text-gray-500'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-[10px] mt-1">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
```

---

## 4. Mobile Improvements for Existing Pages

### 4.1 Responsive Grid Updates

Update component grids to be mobile-first:

```jsx
// Before
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

// After - more responsive breakpoints
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
```

### 4.2 Touch-Friendly Tables

Add horizontal scroll for tables on mobile:
```jsx
<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
  <table className="min-w-full">
    {/* table content */}
  </table>
</div>
```

### 4.3 Mobile Modal Adjustments

```jsx
// Full screen modals on mobile
<div className={`fixed inset-0 z-50 ${open ? '' : 'hidden'}`}>
  <div className="absolute inset-0 bg-black/50" onClick={onClose} />
  <div className={`
    absolute bg-white shadow-xl
    top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
    w-full max-w-lg max-h-[90vh] overflow-auto
    sm:rounded-xl
    sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
    inset-0 sm:inset-auto sm:w-auto
  `}>
    {/* modal content */}
  </div>
</div>
```

---

## 5. Offline Support

### 5.1 Service Worker for Offline

The Vite PWA plugin already sets up Workbox for caching. Add offline indicator:

#### Create `frontend/src/components/OfflineIndicator.jsx`
```jsx
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white text-center text-sm py-2 z-50 flex items-center justify-center gap-2">
      <WifiOff size={16} />
      You're offline. Changes will sync when you reconnect.
    </div>
  );
}
```

---

## 6. Implementation Checklist

- [ ] Update `frontend/package.json` with PWA dependencies
- [ ] Update `frontend/vite.config.js` with PWA configuration
- [ ] Create `frontend/src/components/ReportBuilder.jsx`
- [ ] Create `frontend/src/components/DashboardGrid.jsx` with drag-and-drop
- [ ] Add mobile styles to `frontend/src/index.css`
- [ ] Create `frontend/src/components/MobileNav.jsx`
- [ ] Create `frontend/src/components/OfflineIndicator.jsx`
- [ ] Add offline support with service worker
- [ ] Make tables horizontally scrollable on mobile
- [ ] Add full-screen modals on mobile
- [ ] Update existing page grids to be mobile-first
- [ ] Add "Add Widget" button to dashboard

---

## Next Phase
See [Phase 5: AI/ML Features](./Phase-5-AI-ML-Features.md)