import React, { useState, useEffect, useCallback } from 'react';
import { 
  GripVertical, X, Plus, Edit3, Save, RotateCcw, 
  BarChart3, TrendingUp, Activity, DollarSign,
  Users, Calendar, Target, Briefcase, LayoutGrid
} from 'lucide-react';
import { supabase, isSupabaseConfigured, DEMO_MODE } from '../lib/supabase';
import useCRM from '../store/useCRM';

const WIDGET_TYPES = [
  { id: 'stats', name: 'Stats Cards', description: 'KPI metrics display', icon: BarChart3 },
  { id: 'revenue-chart', name: 'Revenue Chart', description: 'Revenue trend visualization', icon: TrendingUp },
  { id: 'pipeline-chart', name: 'Pipeline Chart', description: 'Deal stage distribution', icon: LayoutGrid },
  { id: 'recent-activity', name: 'Recent Activity', description: 'Latest activities feed', icon: Activity },
  { id: 'top-deals', name: 'Top Deals', description: 'Highest value open deals', icon: Briefcase },
  { id: 'top-contacts', name: 'Top Contacts', description: 'Highest scoring contacts', icon: Users },
  { id: 'calendar', name: 'Calendar', description: 'Upcoming activities', icon: Calendar },
  { id: 'goal-progress', name: 'Goal Progress', description: 'Store target progress', icon: Target },
];

const DEFAULT_LAYOUT = [
  { id: 'stats-1', type: 'stats', x: 0, y: 0, w: 12, h: 2, config: {} },
  { id: 'revenue-1', type: 'revenue-chart', x: 0, y: 2, w: 8, h: 4, config: {} },
  { id: 'pipeline-1', type: 'pipeline-chart', x: 8, y: 2, w: 4, h: 4, config: {} },
  { id: 'activity-1', type: 'recent-activity', x: 0, y: 6, w: 6, h: 4, config: {} },
  { id: 'deals-1', type: 'top-deals', x: 6, y: 6, w: 6, h: 4, config: {} },
];

export default function DashboardGrid() {
  const [layout, setLayout] = useState(DEFAULT_LAYOUT);
  const [editMode, setEditMode] = useState(false);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState(null);
  const [resizing, setResizing] = useState(null);

  const user = useCRM((s) => s.user);
  const stats = useCRM((s) => s.getDashboardStats());
  const contacts = useCRM((s) => s.contacts);
  const deals = useCRM((s) => s.deals);
  const activities = useCRM((s) => s.activities);
  const stores = useCRM((s) => s.stores);
  const revenueHistory = useCRM((s) => s.revenueHistory);

  // Load saved layout on mount
  useEffect(() => {
    loadLayout();
  }, []);

  const loadLayout = async () => {
    // Try to load from localStorage first
    try {
      const saved = localStorage.getItem('dashboard_layout');
      if (saved) {
        setLayout(JSON.parse(saved));
        return;
      }
    } catch (e) {
      console.error('Failed to load layout from localStorage:', e);
    }

    // If Supabase is configured, try to load from database
    if (!DEMO_MODE && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('dashboard_layouts')
          .select('layout_config')
          .eq('user_id', user?.id)
          .single();

        if (!error && data) {
          setLayout(data.layout_config.widgets || DEFAULT_LAYOUT);
        }
      } catch (e) {
        console.error('Failed to load layout from Supabase:', e);
      }
    }
  };

  const saveLayout = async () => {
    const layoutData = { widgets: layout };

    // Save to localStorage
    try {
      localStorage.setItem('dashboard_layout', JSON.stringify(layout));
    } catch (e) {
      console.error('Failed to save layout to localStorage:', e);
    }

    // If Supabase is configured, save to database
    if (!DEMO_MODE && isSupabaseConfigured()) {
      try {
        // Check if layout exists
        const { data: existing } = await supabase
          .from('dashboard_layouts')
          .select('id')
          .eq('user_id', user?.id)
          .single();

        if (existing) {
          await supabase
            .from('dashboard_layouts')
            .update({ 
              layout_config: layoutData,
              updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('dashboard_layouts')
            .insert({
              name: 'My Dashboard',
              layout_config: layoutData,
              user_id: user?.id,
            });
        }
      } catch (e) {
        console.error('Failed to save layout to Supabase:', e);
      }
    }
  };

  const handleDragStart = (e, widgetId) => {
    if (!editMode) return;
    setDraggedWidget(widgetId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetWidgetId) => {
    e.preventDefault();
    if (!editMode || !draggedWidget || draggedWidget === targetWidgetId) return;

    const newLayout = [...layout];
    const draggedIndex = newLayout.findIndex((w) => w.id === draggedWidget);
    const targetIndex = newLayout.findIndex((w) => w.id === targetWidgetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      const [removed] = newLayout.splice(draggedIndex, 1);
      newLayout.splice(targetIndex, 0, removed);
      setLayout(newLayout);
    }

    setDraggedWidget(null);
  };

  const handleDragEnd = () => {
    setDraggedWidget(null);
  };

  const addWidget = (type) => {
    const widgetConfig = WIDGET_TYPES.find((w) => w.id === type);
    const newWidget = {
      id: `${type}-${Date.now()}`,
      type,
      x: 0,
      y: Math.max(...layout.map((w) => w.y + w.h), 0),
      w: 6,
      h: 4,
      config: {},
    };
    setLayout([...layout, newWidget]);
    setShowWidgetPicker(false);
  };

  const removeWidget = (id) => {
    setLayout(layout.filter((w) => w.id !== id));
  };

  const resetLayout = () => {
    if (confirm('Are you sure you want to reset to default layout?')) {
      setLayout(DEFAULT_LAYOUT);
      localStorage.removeItem('dashboard_layout');
    }
  };

  const toggleEditMode = () => {
    if (!editMode) {
      saveLayout();
    }
    setEditMode(!editMode);
  };

  // Widget renderers
  const renderWidgetContent = (widget) => {
    switch (widget.type) {
      case 'stats':
        return <StatsWidget stats={stats} />;
      case 'revenue-chart':
        return <RevenueChartWidget revenueHistory={revenueHistory} />;
      case 'pipeline-chart':
        return <PipelineChartWidget deals={deals} />;
      case 'recent-activity':
        return <RecentActivityWidget activities={activities} />;
      case 'top-deals':
        return <TopDealsWidget deals={deals} />;
      case 'top-contacts':
        return <TopContactsWidget contacts={contacts} />;
      case 'calendar':
        return <CalendarWidget activities={activities} />;
      case 'goal-progress':
        return <GoalProgressWidget stores={stores} revenueHistory={revenueHistory} />;
      default:
        return <div className="p-4 text-gray-500">Unknown widget type</div>;
    }
  };

  const getWidgetTitle = (type) => {
    const widget = WIDGET_TYPES.find((w) => w.id === type);
    return widget?.name || 'Widget';
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowWidgetPicker(true)}
            className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus size={16} />
            Add Widget
          </button>
          <button
            onClick={saveLayout}
            className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Save size={16} />
            Save Layout
          </button>
          <button
            onClick={resetLayout}
            className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            onClick={toggleEditMode}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              editMode
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {editMode ? (
              <>
                <Save size={16} />
                Done Editing
              </>
            ) : (
              <>
                <Edit3 size={16} />
                Edit Dashboard
              </>
            )}
          </button>
        </div>
      </div>

      {editMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
          Edit mode is active. Drag widgets to reorder. Click the X on a widget to remove it.
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-12 gap-4">
        {layout.map((widget) => (
          <div
            key={widget.id}
            className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all ${
              editMode ? 'ring-2 ring-blue-500 ring-offset-2' : ''
            }`}
            style={{
              gridColumn: `span ${widget.w}`,
              gridRow: `span ${widget.h}`,
              minHeight: `${widget.h * 80}px`,
            }}
            draggable={editMode}
            onDragStart={(e) => handleDragStart(e, widget.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, widget.id)}
            onDragEnd={handleDragEnd}
          >
            {/* Widget Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 ${
              editMode ? 'bg-gray-50 cursor-move' : ''
            }`}>
              <div className="flex items-center gap-2">
                {editMode && (
                  <GripVertical size={16} className="text-gray-400" />
                )}
                <h3 className="font-semibold text-sm text-gray-900">{getWidgetTitle(widget.type)}</h3>
              </div>
              {editMode && (
                <button
                  onClick={() => removeWidget(widget.id)}
                  className="p-1 hover:bg-red-100 rounded transition-colors text-red-500 hover:text-red-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Widget Content */}
            <div className="p-4 h-full overflow-auto">
              {renderWidgetContent(widget)}
            </div>
          </div>
        ))}
      </div>

      {/* Widget Picker Modal */}
      {showWidgetPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Add Widget</h3>
              <button
                onClick={() => setShowWidgetPicker(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {WIDGET_TYPES.map((widget) => {
                  const Icon = widget.icon;
                  return (
                    <button
                      key={widget.id}
                      onClick={() => addWidget(widget.id)}
                      className="p-4 border border-gray-200 rounded-xl text-left hover:border-blue-500 hover:bg-blue-50 transition-all group"
                    >
                      <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                        <Icon size={20} className="text-gray-600 group-hover:text-blue-600" />
                      </div>
                      <p className="font-medium text-sm text-gray-900">{widget.name}</p>
                      <p className="text-xs text-gray-500 mt-1">{widget.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowWidgetPicker(false)}
                className="w-full btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========== WIDGET COMPONENTS ==========

function StatsWidget({ stats }) {
  const statItems = [
    { label: 'Total Revenue', value: `$${(stats.totalRevenue || 0).toLocaleString()}`, color: 'text-green-600' },
    { label: 'Pipeline Value', value: `$${(stats.pipelineValue || 0).toLocaleString()}`, color: 'text-blue-600' },
    { label: 'Open Deals', value: stats.openDeals || 0, color: 'text-purple-600' },
    { label: 'Win Rate', value: `${stats.winRate || 0}%`, color: 'text-orange-600' },
    { label: 'Contacts', value: stats.contacts || 0, color: 'text-gray-600' },
    { label: 'Activities', value: stats.pendingActivities || 0, color: 'text-red-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 h-full">
      {statItems.map((stat, idx) => (
        <div key={idx} className="flex flex-col items-center justify-center text-center">
          <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}

function RevenueChartWidget({ revenueHistory }) {
  const months = revenueHistory?.slice(-6).map((r) => r.month) || [];
  const values = revenueHistory?.slice(-6).map((r) => (r.store1 || 0) + (r.store2 || 0) + (r.store3 || 0)) || [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 flex items-end justify-around gap-2">
        {values.map((value, idx) => {
          const maxValue = Math.max(...values, 1);
          const height = (value / maxValue) * 100;
          return (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: '150px' }}>
                <div
                  className="absolute bottom-0 w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:bg-blue-600"
                  style={{ height: `${height}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">{months[idx]}</p>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 text-center mt-4">Revenue Trend (Last 6 Months)</p>
    </div>
  );
}

function PipelineChartWidget({ deals }) {
  const stages = ['new', 'qualified', 'proposal', 'negotiation'];
  const stageData = stages.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage);
    return {
      stage,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + (d.value || 0), 0),
    };
  });

  return (
    <div className="space-y-3">
      {stageData.map((data) => {
        const maxValue = Math.max(...stageData.map((s) => s.value), 1);
        const width = (data.value / maxValue) * 100;
        return (
          <div key={data.stage} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="capitalize text-gray-600">{data.stage}</span>
              <span className="text-gray-500">{data.count} deals</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                style={{ width: `${width}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-right">${data.value.toLocaleString()}</p>
          </div>
        );
      })}
    </div>
  );
}

function RecentActivityWidget({ activities }) {
  const recentActivities = activities
    ?.filter((a) => a.status !== 'completed')
    .slice(0, 8)
    .map((a) => ({
      ...a,
      typeIcon: a.type === 'call' ? '📞' : a.type === 'email' ? '✉️' : a.type === 'meeting' ? '📅' : '📋',
    })) || [];

  if (recentActivities.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">No recent activities</p>;
  }

  return (
    <div className="space-y-2">
      {recentActivities.map((activity) => (
        <div key={activity.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors">
          <span className="text-lg">{activity.typeIcon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
            <p className="text-xs text-gray-500">
              {activity.due_date ? new Date(activity.due_date).toLocaleDateString() : 'No due date'}
            </p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full ${
            activity.priority === 'urgent' ? 'bg-red-100 text-red-700' :
            activity.priority === 'high' ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {activity.priority || 'medium'}
          </span>
        </div>
      ))}
    </div>
  );
}

function TopDealsWidget({ deals }) {
  const topDeals = deals
    ?.filter((d) => !['won', 'lost'].includes(d.stage))
    .sort((a, b) => (b.value || 0) - (a.value || 0))
    .slice(0, 5) || [];

  if (topDeals.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">No open deals</p>;
  }

  return (
    <div className="space-y-3">
      {topDeals.map((deal, idx) => (
        <div key={deal.id} className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
            {idx + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{deal.title}</p>
            <p className="text-xs text-gray-500 capitalize">{deal.stage}</p>
          </div>
          <p className="text-sm font-semibold text-green-600">${(deal.value || 0).toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
}

function TopContactsWidget({ contacts }) {
  const topContacts = contacts
    ?.sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5) || [];

  if (topContacts.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">No contacts</p>;
  }

  return (
    <div className="space-y-3">
      {topContacts.map((contact, idx) => (
        <div key={contact.id} className="flex items-center gap-3">
          <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
            {idx + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{contact.name}</p>
            <p className="text-xs text-gray-500">{contact.email}</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-semibold text-blue-600">{contact.score || 0}</span>
            <span className="text-xs text-gray-400">pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function CalendarWidget({ activities }) {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Get activity dates
  const activityDates = activities
    ?.filter((a) => a.due_date)
    .map((a) => new Date(a.due_date).getDate())
    .filter((d) => d) || [];

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div>
      <p className="text-sm font-medium text-gray-900 text-center mb-3">{monthName}</p>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
          <div key={idx} className="text-xs font-medium text-gray-500 py-1">{day}</div>
        ))}
        {days.map((day, idx) => {
          const isToday = day === today.getDate();
          const hasActivity = day && activityDates.includes(day);
          return (
            <div
              key={idx}
              className={`aspect-square flex items-center justify-center text-xs rounded-full ${
                isToday ? 'bg-blue-500 text-white font-bold' :
                hasActivity ? 'bg-blue-100 text-blue-700' :
                day ? 'text-gray-700' : ''
              }`}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GoalProgressWidget({ stores, revenueHistory }) {
  if (!stores || stores.length === 0) {
    return <p className="text-sm text-gray-500 text-center py-8">No stores configured</p>;
  }

  return (
    <div className="space-y-4">
      {stores.slice(0, 3).map((store) => {
        const latestRevenue = revenueHistory?.[revenueHistory.length - 1];
        const revenue = latestRevenue?.[`store${store.id?.slice(-1)}`] || 0;
        const target = store.target || 10000;
        const progress = Math.min((revenue / target) * 100, 100);

        return (
          <div key={store.id} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-gray-700">{store.name}</span>
              <span className="text-gray-500">${revenue.toLocaleString()} / ${target.toLocaleString()}</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  progress >= 100 ? 'bg-green-500' :
                  progress >= 75 ? 'bg-blue-500' :
                  progress >= 50 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
