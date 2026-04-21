import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  CheckSquare,
  Clock,
  Edit2,
  Trash2,
  CheckCircle,
  Download,
  Upload,
} from "lucide-react";
import Modal from "../components/Modal";
import ImportModal from "../components/ImportModal";
import SavedViews from "../components/SavedViews";
import useCRM from "../store/useCRM";
import { exportActivities } from "../lib/csvExport";
import clsx from "clsx";

const TYPE_ICONS = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  task: CheckSquare,
};
const TYPE_COLORS = {
  call: "bg-green-50 text-green-600",
  email: "bg-blue-50 text-blue-600",
  meeting: "bg-purple-50 text-purple-600",
  task: "bg-orange-50 text-orange-600",
};
const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700",
  medium: "bg-orange-100 text-orange-700",
  low: "bg-gray-100 text-gray-600",
};
const STATUS_COLORS = {
  scheduled: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
};

const emptyForm = {
  type: "task",
  title: "",
  contact: "",
  date: "",
  time: "",
  duration: 0,
  status: "scheduled",
  priority: "medium",
  notes: "",
  storeId: "",
};

export default function Activities() {
  const activities = useCRM((s) => s.activities);
  const contacts = useCRM((s) => s.contacts);
  const stores = useCRM((s) => s.stores);
  const currentStoreId = useCRM((s) => s.currentStoreId);
  const addActivity = useCRM((s) => s.addActivity);
  const updateActivity = useCRM((s) => s.updateActivity);
  const deleteActivity = useCRM((s) => s.deleteActivity);
  const completeActivity = useCRM((s) => s.completeActivity);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({});

  const handleExport = () => {
    const dataToExport =
      filtered && filtered.length > 0 ? filtered : activities || [];
    exportActivities(dataToExport, "activities");
  };

  const handleSaveView = (name, filterValues) => {
    console.log("Saved view:", name, filterValues);
  };

  const filtered = useMemo(() => {
    return activities
      .filter((a) => {
        if (currentStoreId && a.storeId !== currentStoreId) return false;
        if (search && !a.title.toLowerCase().includes(search.toLowerCase()))
          return false;
        if (filterType && a.type !== filterType) return false;
        if (filterStatus && a.status !== filterStatus) return false;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.date) - new Date(b.date) || a.time.localeCompare(b.time),
      );
  }, [activities, search, filterType, filterStatus, currentStoreId]);

  const contactMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c])),
    [contacts],
  );
  const storeOptions = currentStoreId
    ? stores.filter((s) => s.id === currentStoreId)
    : stores;
  const contactOptions = currentStoreId
    ? contacts.filter((c) => c.storeId === currentStoreId)
    : contacts;

  const today = new Date().toISOString().split("T")[0];
  const todayActivities = filtered.filter((a) => a.date === today);
  const upcoming = filtered.filter((a) => a.date > today);
  const past = filtered.filter(
    (a) => a.date < today && a.status !== "completed",
  );

  const stats = {
    today: todayActivities.length,
    scheduled: filtered.filter((a) => a.status === "scheduled").length,
    completed: filtered.filter((a) => a.status === "completed").length,
    overdue: past.length,
  };

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, date: today, storeId: currentStoreId || "" });
    setShowModal(true);
  };
  const openEdit = (a) => {
    setEditing(a.id);
    setForm({ ...a });
    setShowModal(true);
  };
  const handleSave = () => {
    const data = { ...form, duration: parseInt(form.duration) || 0 };
    if (editing) updateActivity(editing, data);
    else addActivity(data);
    setShowModal(false);
  };
  const handleDelete = (id) => {
    if (confirm("Delete this activity?")) deleteActivity(id);
  };

  const renderActivity = (a) => {
    const TypeIcon = TYPE_ICONS[a.type] || Calendar;
    return (
      <div
        key={a.id}
        className={clsx(
          "flex items-start gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow group",
          a.status === "completed" && "opacity-70",
        )}
      >
        <div
          className={clsx(
            "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
            TYPE_COLORS[a.type],
          )}
        >
          <TypeIcon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p
                className={clsx(
                  "text-sm font-medium text-gray-900",
                  a.status === "completed" && "line-through",
                )}
              >
                {a.title}
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-gray-400">{a.date}</span>
                {a.time && (
                  <>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-400">{a.time}</span>
                  </>
                )}
                {a.duration > 0 && (
                  <>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock size={10} />
                      {a.duration}m
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={clsx(
                  "badge",
                  PRIORITY_COLORS[a.priority] || "bg-gray-100 text-gray-600",
                )}
              >
                {a.priority}
              </span>
              <span
                className={clsx(
                  "badge",
                  STATUS_COLORS[a.status] || "bg-gray-100 text-gray-600",
                )}
              >
                {a.status}
              </span>
            </div>
          </div>
          {a.notes && <p className="text-xs text-gray-500 mt-1.5">{a.notes}</p>}
          <div className="flex items-center gap-2 mt-2">
            {a.contact && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center text-[9px] font-bold text-gray-700">
                  {contactMap[a.contact]?.avatar || "?"}
                </div>
                {contactMap[a.contact]?.name || a.contact}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {a.status !== "completed" && (
            <button
              onClick={() => completeActivity(a.id)}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
              title="Mark complete"
            >
              <CheckCircle size={14} />
            </button>
          )}
          <button
            onClick={() => openEdit(a)}
            className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={() => handleDelete(a.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Activities</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} activities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SavedViews
            entityType="activities"
            currentFilters={{ search, filterType, filterStatus }}
            onApplyView={(newFilters) => {
              setSearch(newFilters.search || "");
              setFilterType(newFilters.filterType || "");
              setFilterStatus(newFilters.filterStatus || "");
            }}
            onSaveView={handleSaveView}
          />
          <button
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload size={16} />
            Import
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download size={16} />
            Export
          </button>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Activity
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card py-4">
          <p className="text-sm text-gray-500 mb-1">Today</p>
          <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
        </div>
        <div className="card py-4">
          <p className="text-sm text-gray-500 mb-1">Scheduled</p>
          <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
        </div>
        <div className="card py-4">
          <p className="text-sm text-gray-500 mb-1">Completed</p>
          <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="card py-4">
          <p className="text-sm text-gray-500 mb-1">Pending</p>
          <p className="text-2xl font-bold text-orange-600">{stats.overdue}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities..."
            className="input pl-9"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="input w-auto"
        >
          <option value="">All Types</option>
          <option value="call">Call</option>
          <option value="email">Email</option>
          <option value="meeting">Meeting</option>
          <option value="task">Task</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input w-auto"
        >
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Activity List */}
      {todayActivities.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar size={14} className="text-gray-500" /> Today
          </h3>
          <div className="space-y-3">{todayActivities.map(renderActivity)}</div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Clock size={14} className="text-blue-500" /> Upcoming
          </h3>
          <div className="space-y-3">{upcoming.map(renderActivity)}</div>
        </div>
      )}

      {past.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <CheckSquare size={14} className="text-orange-500" /> Overdue /
            Pending
          </h3>
          <div className="space-y-3">{past.map(renderActivity)}</div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 card">
          <Calendar size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No activities found</p>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit Activity" : "New Activity"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="input"
              >
                {["call", "email", "meeting", "task"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Title *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input"
                placeholder="Activity title"
              />
            </div>
            <div>
              <label className="label">Contact</label>
              <select
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="input"
              >
                <option value="">Select contact</option>
                {contactOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input"
              >
                {["scheduled", "pending", "completed"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Time</label>
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Duration (min)</label>
              <input
                type="number"
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="input"
              >
                {["high", "medium", "low"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Store</label>
              <select
                value={form.storeId}
                onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                className="input"
              >
                <option value="">Select store</option>
                {storeOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input"
              rows={3}
            />
          </div>
          <div className="flex justify-between pt-4 border-t">
            {editing && (
              <button
                onClick={() => {
                  handleDelete(editing);
                  setShowModal(false);
                }}
                className="btn-danger"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
            <div className="flex gap-3 ml-auto">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title}
                className="btn-primary disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        entityType="activities"
        onImportComplete={(count) => {
          useCRM.getState().initialize?.() || useCRM.getState().refresh?.();
          setShowImport(false);
        }}
      />
    </div>
  );
}
