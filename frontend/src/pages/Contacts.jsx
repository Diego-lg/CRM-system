import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  Building2,
  Star,
  Edit2,
  Trash2,
  X,
  Users,
  Download,
  Upload,
} from "lucide-react";
import Modal from "../components/Modal";
import ImportModal from "../components/ImportModal";
import SavedViews from "../components/SavedViews";
import ContactScoreBadge from "../components/ContactScoreBadge";
import useCRM from "../store/useCRM";
import { exportContacts } from "../lib/csvExport";
import clsx from "clsx";

const STATUS_COLORS = {
  lead: "bg-blue-100 text-blue-700",
  prospect: "bg-yellow-100 text-yellow-700",
  customer: "bg-green-100 text-green-700",
  churned: "bg-red-100 text-red-700",
};
const TAG_COLORS = [
  "bg-gray-100 text-gray-700",
  "bg-gray-200 text-gray-800",
  "bg-gray-300 text-gray-900",
  "bg-gray-400 text-gray-950",
];

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  company: "",
  role: "",
  status: "lead",
  tags: "",
  score: 50,
  storeId: "",
};

export default function Contacts() {
  const contacts = useCRM((s) => s.getFilteredContacts());
  const allContacts = useCRM((s) => s.contacts);
  const companies = useCRM((s) => s.companies);
  const activities = useCRM((s) => s.activities);
  const stores = useCRM((s) => s.stores);
  const currentStoreId = useCRM((s) => s.currentStoreId);
  const addContact = useCRM((s) => s.addContact);
  const updateContact = useCRM((s) => s.updateContact);
  const deleteContact = useCRM((s) => s.deleteContact);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [view, setView] = useState("table");
  const [filters, setFilters] = useState({});

  const handleExport = () => {
    const dataToExport =
      filtered && filtered.length > 0 ? filtered : allContacts || [];
    exportContacts(dataToExport, "contacts");
  };

  const handleSaveView = (name, filterValues) => {
    // Additional save logic if needed
    console.log("Saved view:", name, filterValues);
  };

  const companyMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies],
  );
  const storeMap = useMemo(
    () => Object.fromEntries(stores.map((s) => [s.id, s])),
    [stores],
  );
  const storeOptions = currentStoreId
    ? stores.filter((s) => s.id === currentStoreId)
    : stores;
  const companyOptions = currentStoreId
    ? companies.filter((c) => c.storeId === currentStoreId)
    : companies;

  const filtered = useMemo(() => {
    let list = allContacts.filter((c) => {
      if (currentStoreId && c.storeId !== currentStoreId) return false;
      if (
        search &&
        !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !c.email.toLowerCase().includes(search.toLowerCase())
      )
        return false;
      if (filterStatus && c.status !== filterStatus) return false;
      return true;
    });
    list.sort((a, b) => {
      let va = a[sortBy],
        vb = b[sortBy];
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [allContacts, search, filterStatus, sortBy, sortDir, currentStoreId]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, storeId: currentStoreId || "" });
    setShowModal(true);
  };
  const openEdit = (c) => {
    setEditing(c.id);
    setForm({ ...c, tags: (c.tags || []).join(", ") });
    setShowModal(true);
  };
  const handleSave = () => {
    const data = {
      ...form,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (editing) updateContact(editing, data);
    else addContact(data);
    setShowModal(false);
  };
  const handleDelete = (id) => {
    if (confirm("Delete this contact?")) deleteContact(id);
  };
  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contacts</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} contacts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SavedViews
            entityType="contacts"
            currentFilters={{ search, filterStatus }}
            onApplyView={(newFilters) => {
              setSearch(newFilters.search || "");
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
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setView("table")}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                view === "table"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              Table
            </button>
            <button
              onClick={() => setView("grid")}
              className={clsx(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                view === "grid"
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              Grid
            </button>
          </div>
          <button onClick={openAdd} className="btn-primary">
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="input pl-9"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input w-auto"
        >
          <option value="">All Statuses</option>
          <option value="lead">Lead</option>
          <option value="prospect">Prospect</option>
          <option value="customer">Customer</option>
          <option value="churned">Churned</option>
        </select>
      </div>

      {/* Table View */}
      {view === "table" && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {[
                    ["name", "Name"],
                    ["email", "Email"],
                    ["company", "Company"],
                    ["role", "Role"],
                    ["status", "Status"],
                    ["score", "Score"],
                    ["lastContact", "Last Contact"],
                  ].map(([col, label]) => (
                    <th
                      key={col}
                      onClick={() => handleSort(col)}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                    >
                      {label}{" "}
                      {sortBy === col && (sortDir === "asc" ? "↑" : "↓")}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-700">
                          {c.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {c.name}
                          </p>
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {(c.tags || []).slice(0, 2).map((tag, i) => (
                              <span
                                key={i}
                                className={clsx(
                                  "badge",
                                  TAG_COLORS[i % TAG_COLORS.length],
                                )}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {companyMap[c.company]?.name || c.company || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.role || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={clsx(
                          "badge",
                          STATUS_COLORS[c.status] ||
                            "bg-gray-100 text-gray-600",
                        )}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ContactScoreBadge
                        contact={c}
                        company={companyMap[c.company]}
                        activities={activities.filter(a => a.contact === c.id || a.contact === c.name)}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {c.lastContact}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <Users size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No contacts found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grid View */}
      {view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-700">
                    {c.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.role}</p>
                  </div>
                </div>
                <span
                  className={clsx(
                    "badge",
                    STATUS_COLORS[c.status] || "bg-gray-100 text-gray-600",
                  )}
                >
                  {c.status}
                </span>
              </div>
              <div className="space-y-1.5 text-sm text-gray-600 mb-3">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-gray-400 flex-shrink-0" />{" "}
                  <span className="truncate">{c.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-gray-400 flex-shrink-0" />{" "}
                  {c.phone || "—"}
                </div>
                <div className="flex items-center gap-2">
                  <Building2
                    size={14}
                    className="text-gray-400 flex-shrink-0"
                  />{" "}
                  {companyMap[c.company]?.name || "—"}
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400 fill-yellow-400" />{" "}
                  <span className="text-sm font-medium">{c.score}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit Contact" : "New Contact"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
                placeholder="+1-555-0000"
              />
            </div>
            <div>
              <label className="label">Role</label>
              <input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="input"
                placeholder="CEO, Manager..."
              />
            </div>
            <div>
              <label className="label">Company</label>
              <select
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="input"
              >
                <option value="">Select company</option>
                {companyOptions.map((c) => (
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
                {["lead", "prospect", "customer", "churned"].map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Score (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.score}
                onChange={(e) =>
                  setForm({ ...form, score: parseInt(e.target.value) || 0 })
                }
                className="input"
              />
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
            <label className="label">Tags (comma separated)</label>
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="input"
              placeholder="VIP, Enterprise, Tech"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setShowModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name || !form.email}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Contact
            </button>
          </div>
        </div>
      </Modal>

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        entityType="contacts"
        onImportComplete={(count) => {
          useCRM.getState().initialize?.() || useCRM.getState().refresh?.();
          setShowImport(false);
        }}
      />
    </div>
  );
}
