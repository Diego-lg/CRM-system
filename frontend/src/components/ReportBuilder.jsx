import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Download, Play, Save, Calendar, Filter, BarChart2, 
  Trash2, Clock, TrendingUp, ChevronDown 
} from 'lucide-react';
import { supabase, isSupabaseConfigured, DEMO_MODE } from '../lib/supabase';
import { exportToCSV } from '../lib/csvExport';
import useCRM from '../store/useCRM';

const REPORT_TYPES = {
  contacts: {
    label: 'Contacts',
    columns: ['name', 'email', 'phone', 'company', 'role', 'status', 'score', 'lastContact', 'tags'],
    filters: ['status', 'score', 'company', 'storeId'],
  },
  companies: {
    label: 'Companies',
    columns: ['name', 'industry', 'size', 'revenue', 'status', 'employees', 'country', 'website'],
    filters: ['status', 'industry', 'size', 'country'],
  },
  deals: {
    label: 'Deals',
    columns: ['title', 'value', 'stage', 'probability', 'priority', 'closeDate', 'owner', 'company'],
    filters: ['stage', 'priority', 'owner', 'storeId', 'dateRange'],
  },
  activities: {
    label: 'Activities',
    columns: ['type', 'title', 'contact', 'date', 'time', 'duration', 'status', 'priority'],
    filters: ['type', 'status', 'priority', 'dateRange'],
  },
  revenue: {
    label: 'Revenue',
    columns: ['month', 'store', 'revenue', 'target', 'variance', 'growth'],
    filters: ['storeId', 'dateRange'],
  },
};

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

const AGGREGATIONS = [
  { value: 'count', label: 'Count' },
  { value: 'sum', label: 'Sum' },
  { value: 'average', label: 'Average' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
];

export default function ReportBuilder() {
  const [reportType, setReportType] = useState('contacts');
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [filters, setFilters] = useState({});
  const [groupBy, setGroupBy] = useState('');
  const [datePreset, setDatePreset] = useState('this_month');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [aggregation, setAggregation] = useState('count');
  const [reportName, setReportName] = useState('');
  const [savedReports, setSavedReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [reportData, setReportData] = useState(null);

  const contacts = useCRM((s) => s.contacts);
  const companies = useCRM((s) => s.companies);
  const deals = useCRM((s) => s.deals);
  const activities = useCRM((s) => s.activities);
  const stores = useCRM((s) => s.stores);
  const revenueHistory = useCRM((s) => s.revenueHistory);
  const user = useCRM((s) => s.user);

  const config = REPORT_TYPES[reportType];

  // Load saved reports on mount
  useEffect(() => {
    loadSavedReports();
  }, []);

  const loadSavedReports = async () => {
    if (DEMO_MODE || !isSupabaseConfigured()) {
      // Load from localStorage in demo mode
      try {
        const saved = localStorage.getItem('crm_saved_reports');
        if (saved) setSavedReports(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved reports:', e);
      }
      return;
    }

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSavedReports(data);
      }
    } catch (e) {
      console.error('Failed to load saved reports:', e);
    }
  };

  const handleColumnToggle = (column) => {
    setSelectedColumns((prev) =>
      prev.includes(column) ? prev.filter((c) => c !== column) : [...prev, column]
    );
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns([...config.columns]);
  };

  const handleDeselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const getDateRange = () => {
    const now = new Date();
    let startDate, endDate;

    switch (datePreset) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'this_week':
        const dayOfWeek = now.getDay();
        startDate = new Date(now.setDate(now.getDate() - dayOfWeek));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'this_quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59, 999);
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'custom':
        startDate = customDateRange.start ? new Date(customDateRange.start) : null;
        endDate = customDateRange.end ? new Date(customDateRange.end) : null;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    return { startDate, endDate };
  };

  const filterByDateRange = (items, dateField = 'created_at') => {
    if (datePreset === 'all') return items;
    
    const { startDate, endDate } = getDateRange();
    
    return items.filter((item) => {
      const itemDate = new Date(item[dateField]);
      if (startDate && itemDate < startDate) return false;
      if (endDate && itemDate > endDate) return false;
      return true;
    });
  };

  const handleRunReport = async () => {
    setLoading(true);
    setReportData(null);

    try {
      let data = [];
      const columns = selectedColumns.length > 0 ? selectedColumns : config.columns;

      switch (reportType) {
        case 'contacts': {
          let filteredContacts = filterByDateRange(contacts);
          
          // Apply filters
          if (filters.status) {
            filteredContacts = filteredContacts.filter((c) => c.status === filters.status);
          }
          if (filters.score) {
            filteredContacts = filteredContacts.filter((c) => c.score >= parseInt(filters.score));
          }
          if (filters.company) {
            filteredContacts = filteredContacts.filter((c) => c.company === filters.company);
          }
          if (filters.storeId) {
            filteredContacts = filteredContacts.filter((c) => c.storeId === filters.storeId);
          }

          data = filteredContacts.map((c) => ({
            ...c,
            companyName: companies.find((comp) => comp.id === c.company)?.name || c.company || '',
          }));
          break;
        }

        case 'companies': {
          let filteredCompanies = filterByDateRange(companies);
          
          if (filters.status) {
            filteredCompanies = filteredCompanies.filter((c) => c.status === filters.status);
          }
          if (filters.industry) {
            filteredCompanies = filteredCompanies.filter((c) => c.industry === filters.industry);
          }
          if (filters.size) {
            filteredCompanies = filteredCompanies.filter((c) => c.size === filters.size);
          }
          if (filters.country) {
            filteredCompanies = filteredCompanies.filter((c) => c.country === filters.country);
          }

          data = filteredCompanies;
          break;
        }

        case 'deals': {
          let filteredDeals = filterByDateRange(deals, 'expected_close');
          
          if (filters.stage) {
            filteredDeals = filteredDeals.filter((d) => d.stage === filters.stage);
          }
          if (filters.priority) {
            filteredDeals = filteredDeals.filter((d) => d.priority === filters.priority);
          }
          if (filters.owner) {
            filteredDeals = filteredDeals.filter((d) => d.owner === filters.owner);
          }
          if (filters.storeId) {
            filteredDeals = filteredDeals.filter((d) => d.storeId === filters.storeId);
          }

          data = filteredDeals.map((d) => ({
            ...d,
            companyName: companies.find((comp) => comp.id === d.company)?.name || d.company || '',
          }));
          break;
        }

        case 'activities': {
          let filteredActivities = filterByDateRange(activities, 'due_date');
          
          if (filters.type) {
            filteredActivities = filteredActivities.filter((a) => a.type === filters.type);
          }
          if (filters.status) {
            filteredActivities = filteredActivities.filter((a) => a.status === filters.status);
          }
          if (filters.priority) {
            filteredActivities = filteredActivities.filter((a) => a.priority === filters.priority);
          }

          data = filteredActivities.map((a) => ({
            ...a,
            contactName: contacts.find((c) => c.id === a.contact_id)?.name || a.contact_id || '',
          }));
          break;
        }

        case 'revenue': {
          let filteredRevenue = revenueHistory;
          
          if (filters.storeId) {
            filteredRevenue = filteredRevenue.filter((r) => r.storeId === filters.storeId);
          }

          data = filteredRevenue;
          break;
        }
      }

      // Apply grouping if selected
      if (groupBy && data.length > 0) {
        const grouped = {};
        data.forEach((item) => {
          const key = item[groupBy] || 'unknown';
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(item);
        });

        // Apply aggregation to grouped data
        data = Object.entries(grouped).map(([key, items]) => {
          const aggregated = { [groupBy]: key, _count: items.length };
          
          // Numeric aggregations
          const numericFields = ['value', 'revenue', 'score'];
          numericFields.forEach((field) => {
            const values = items.map((i) => parseFloat(i[field]) || 0);
            if (values.length > 0) {
              switch (aggregation) {
                case 'sum':
                  aggregated[field] = values.reduce((a, b) => a + b, 0);
                  break;
                case 'average':
                  aggregated[field] = values.reduce((a, b) => a + b, 0) / values.length;
                  break;
                case 'min':
                  aggregated[field] = Math.min(...values);
                  break;
                case 'max':
                  aggregated[field] = Math.max(...values);
                  break;
                default:
                  aggregated[field] = values.reduce((a, b) => a + b, 0);
              }
            }
          });

          return aggregated;
        });
      }

      setReportData(data);

      // Show preview summary
      console.log(`Report generated: ${data.length} records`);

    } catch (error) {
      console.error('Failed to run report:', error);
      alert('Failed to generate report. Please try again.');
    }

    setLoading(false);
  };

  const handleSaveReport = async () => {
    if (!reportName.trim()) {
      alert('Please enter a report name');
      return;
    }

    const reportConfig = {
      type: reportType,
      columns: selectedColumns,
      filters,
      groupBy,
      datePreset,
      aggregation,
    };

    if (DEMO_MODE || !isSupabaseConfigured()) {
      // Save to localStorage in demo mode
      try {
        const newReport = {
          id: `report_${Date.now()}`,
          name: reportName,
          report_type: reportType,
          config: reportConfig,
          created_at: new Date().toISOString(),
          created_by: user?.id || 'demo',
        };

        const updatedReports = [...savedReports, newReport];
        localStorage.setItem('crm_saved_reports', JSON.stringify(updatedReports));
        setSavedReports(updatedReports);
        setShowSaveModal(false);
        setReportName('');
        alert('Report saved successfully!');
      } catch (e) {
        console.error('Failed to save report:', e);
        alert('Failed to save report');
      }
      return;
    }

    try {
      const { error } = await supabase.from('reports').insert({
        name: reportName,
        report_type: reportType,
        config: reportConfig,
        created_by: user?.id,
      });

      if (error) throw error;

      await loadSavedReports();
      setShowSaveModal(false);
      setReportName('');
      alert('Report saved successfully!');
    } catch (e) {
      console.error('Failed to save report:', e);
      alert('Failed to save report');
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    if (DEMO_MODE || !isSupabaseConfigured()) {
      try {
        const updatedReports = savedReports.filter((r) => r.id !== reportId);
        localStorage.setItem('crm_saved_reports', JSON.stringify(updatedReports));
        setSavedReports(updatedReports);
      } catch (e) {
        console.error('Failed to delete report:', e);
      }
      return;
    }

    try {
      const { error } = await supabase.from('reports').delete().eq('id', reportId);
      if (error) throw error;
      await loadSavedReports();
    } catch (e) {
      console.error('Failed to delete report:', e);
    }
  };

  const loadReport = (report) => {
    setReportType(report.report_type);
    setSelectedColumns(report.config.columns || []);
    setFilters(report.config.filters || {});
    setGroupBy(report.config.groupBy || '');
    setDatePreset(report.config.datePreset || 'this_month');
    setAggregation(report.config.aggregation || 'count');
  };

  const exportReport = (format) => {
    if (!reportData || reportData.length === 0) {
      alert('Please run the report first');
      return;
    }

    const columns = (selectedColumns.length > 0 ? selectedColumns : config.columns).map((col) => ({
      key: col === 'companyName' ? 'companyName' : col,
      header: col.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()),
    }));

    const filename = `${reportType}_report_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
      exportToCSV(reportData, columns, filename);
    } else if (format === 'xlsx') {
      // For XLSX, we'll export as CSV since we don't have xlsx library
      // In a real implementation, you'd use a library like xlsx
      exportToCSV(reportData, columns, filename);
      alert('XLSX export not available - exported as CSV instead');
    } else if (format === 'pdf') {
      // PDF export would require a library like jsPDF
      exportToCSV(reportData, columns, filename);
      alert('PDF export not available - exported as CSV instead');
    }
  };

  const formatColumnLabel = (col) => {
    return col.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Report Builder</h2>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Clock size={16} />
          <span>Auto-save enabled</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Type Selector */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <FileText size={18} /> Report Type
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {Object.entries(REPORT_TYPES).map(([key, { label }]) => (
                <button
                  key={key}
                  onClick={() => {
                    setReportType(key);
                    setSelectedColumns([]);
                    setFilters({});
                  }}
                  className={`p-3 text-sm rounded-lg border transition-all ${
                    reportType === key
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-400 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Column Selection */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2 text-gray-900">
                <BarChart2 size={18} /> Columns to Include
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAllColumns}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={handleDeselectAllColumns}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {config.columns.map((column) => (
                <label
                  key={column}
                  className={`px-3 py-2 text-sm rounded-lg border cursor-pointer transition-all ${
                    selectedColumns.includes(column) || selectedColumns.length === 0
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column) || selectedColumns.length === 0}
                    onChange={() => handleColumnToggle(column)}
                    className="sr-only"
                  />
                  {formatColumnLabel(column)}
                </label>
              ))}
            </div>
            {selectedColumns.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">No columns selected - all columns will be included</p>
            )}
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Filter size={18} /> Filters
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {config.filters.map((filter) => (
                <div key={filter}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                    {filter.replace(/([A-Z])/g, ' $1')}
                  </label>

                  {filter === 'status' && (
                    <select
                      value={filters.status || ''}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All Statuses</option>
                      {reportType === 'contacts' && ['lead', 'prospect', 'customer', 'churned'].map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                      {reportType === 'companies' && ['lead', 'prospect', 'customer'].map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                      {reportType === 'deals' && ['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                      {reportType === 'activities' && ['pending', 'completed', 'cancelled'].map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  )}

                  {filter === 'score' && (
                    <select
                      value={filters.score || ''}
                      onChange={(e) => setFilters({ ...filters, score: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All Scores</option>
                      <option value="80">80+ (Hot)</option>
                      <option value="60">60+ (Warm)</option>
                      <option value="40">40+ (Cool)</option>
                      <option value="20">20+ (Cold)</option>
                    </select>
                  )}

                  {filter === 'company' && (
                    <select
                      value={filters.company || ''}
                      onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All Companies</option>
                      {companies.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}

                  {filter === 'storeId' && (
                    <select
                      value={filters.storeId || ''}
                      onChange={(e) => setFilters({ ...filters, storeId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All Stores</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  )}

                  {filter === 'industry' && (
                    <select
                      value={filters.industry || ''}
                      onChange={(e) => setFilters({ ...filters, industry: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All Industries</option>
                      {['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Education'].map((i) => (
                        <option key={i} value={i}>{i}</option>
                      ))}
                    </select>
                  )}

                  {filter === 'size' && (
                    <select
                      value={filters.size || ''}
                      onChange={(e) => setFilters({ ...filters, size: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All Sizes</option>
                      {['startup', 'small', 'medium', 'large', 'enterprise'].map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  )}

                  {filter === 'country' && (
                    <select
                      value={filters.country || ''}
                      onChange={(e) => setFilters({ ...filters, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All Countries</option>
                      {['USA', 'UK', 'Germany', 'France', 'Spain', 'Mexico', 'Brazil'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  )}

                  {filter === 'stage' && (
                    <select
                      value={filters.stage || ''}
                      onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All Stages</option>
                      {['new', 'qualified', 'proposal', 'negotiation', 'won', 'lost'].map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  )}

                  {filter === 'priority' && (
                    <select
                      value={filters.priority || ''}
                      onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All Priorities</option>
                      {['low', 'medium', 'high', 'urgent'].map((p) => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  )}

                  {filter === 'owner' && (
                    <select
                      value={filters.owner || ''}
                      onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All Owners</option>
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} Owner</option>
                      ))}
                    </select>
                  )}

                  {filter === 'type' && (
                    <select
                      value={filters.type || ''}
                      onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">All Types</option>
                      {['call', 'email', 'meeting', 'task', 'deadline'].map((t) => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  )}

                  {filter === 'dateRange' && (
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={filters.startDate || ''}
                        onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Start date"
                      />
                      <input
                        type="date"
                        value={filters.endDate || ''}
                        onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="End date"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Date Range & Grouping */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <Calendar size={18} /> Date Range & Grouping
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Date Preset */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <div className="relative">
                  <select
                    value={datePreset}
                    onChange={(e) => setDatePreset(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
                  >
                    {DATE_PRESETS.map((preset) => (
                      <option key={preset.value} value={preset.value}>{preset.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Custom Date Range */}
              {datePreset === 'custom' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </>
              )}

              {/* Group By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group By</label>
                <div className="relative">
                  <select
                    value={groupBy}
                    onChange={(e) => setGroupBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
                  >
                    <option value="">No Grouping</option>
                    {config.columns.map((col) => (
                      <option key={col} value={col}>{formatColumnLabel(col)}</option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>

              {/* Aggregation */}
              {groupBy && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aggregation</label>
                  <div className="relative">
                    <select
                      value={aggregation}
                      onChange={(e) => setAggregation(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none"
                    >
                      {AGGREGATIONS.map((agg) => (
                        <option key={agg.value} value={agg.value}>{agg.label}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleRunReport}
              disabled={loading}
              className="btn-primary flex items-center justify-center gap-2 px-6 py-3"
            >
              <Play size={18} />
              {loading ? 'Generating...' : 'Run Report'}
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className="btn-secondary flex items-center justify-center gap-2 px-6 py-3"
            >
              <Save size={18} />
              Save Report
            </button>
            {reportData && reportData.length > 0 && (
              <>
                <div className="flex-1" />
                <div className="flex gap-2">
                  <button
                    onClick={() => exportReport('csv')}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Download size={16} />
                    CSV
                  </button>
                  <button
                    onClick={() => exportReport('xlsx')}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Download size={16} />
                    XLSX
                  </button>
                  <button
                    onClick={() => exportReport('pdf')}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Download size={16} />
                    PDF
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Report Preview */}
          {reportData && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Report Preview</h3>
                <span className="text-sm text-gray-500">{reportData.length} records</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {(selectedColumns.length > 0 ? selectedColumns : config.columns).map((col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left font-medium text-gray-700 capitalize"
                        >
                          {formatColumnLabel(col)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.slice(0, 10).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {(selectedColumns.length > 0 ? selectedColumns : config.columns).map((col) => (
                          <td key={col} className="px-4 py-3 text-gray-600">
                            {col === 'companyName' ? row.companyName : row[col] !== undefined ? String(row[col]) : '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {reportData.length > 10 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Showing 10 of {reportData.length} records
                </p>
              )}
            </div>
          )}
        </div>

        {/* Saved Reports Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-gray-900">
              <TrendingUp size={18} /> Saved Reports
            </h3>
            {savedReports.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No saved reports yet</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedReports.map((report) => (
                  <div
                    key={report.id}
                    className="group p-3 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 cursor-pointer transition-all"
                  >
                    <div 
                      onClick={() => loadReport(report)}
                      className="flex flex-col"
                    >
                      <p className="font-medium text-sm text-gray-900">{report.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{report.report_type} Report</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteReport(report.id);
                      }}
                      className="mt-2 text-xs text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Report Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Save Report</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Name</label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Enter report name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setReportName('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReport}
                className="btn-primary px-6 py-2"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
