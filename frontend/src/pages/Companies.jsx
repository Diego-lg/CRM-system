import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Building2,
  Edit2,
  Trash2,
  Globe,
  Users as UsersIcon,
  DollarSign,
  Download,
  Upload,
} from "lucide-react";
import Modal from "../components/Modal";
import ImportModal from "../components/ImportModal";
import SavedViews from "../components/SavedViews";
import useCRM from "../store/useCRM";
import { exportCompanies } from "../lib/csvExport";
import clsx from "clsx";

const emptyForm = {
  name: "",
  industry: "",
  size: "Startup",
  revenue: "",
  website: "",
  phone: "",
  status: "lead",
  employees: 0,
  country: "",
  storeId: "",
};

export default function Companies() {
  const companies = useCRM((s) => s.companies);
  const stores = useCRM((s) => s.stores);
  const contacts = useCRM((s) => s.contacts);
  const currentStoreId = useCRM((s) => s.currentStoreId);
  const addCompany = useCRM((s) => s.addCompany);
  const updateCompany = useCRM((s) => s.updateCompany);
  const deleteCompany = useCRM((s) => s.deleteCompany);

  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({});

  const handleExport = () => {
    const dataToExport =
      filtered && filtered.length > 0 ? filtered : companies || [];
    exportCompanies(dataToExport, "companies");
  };

  const handleSaveView = (name, filterValues) => {
    console.log("Saved view:", name, filterValues);
  };

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (currentStoreId && c.storeId !== currentStoreId) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (filterIndustry && c.industry !== filterIndustry) return false;
      return true;
    });
  }, [companies, search, filterIndustry, currentStoreId]);

  const industries = [
    ...new Set(companies.map((c) => c.industry).filter(Boolean)),
  ];
  const storeOptions = currentStoreId
    ? stores.filter((s) => s.id === currentStoreId)
    : stores;

  const getContactCount = (companyId) =>
    contacts.filter((c) => c.company === companyId).length;

  const openAdd = () => {
    setEditing(null);
    setForm({ ...emptyForm, storeId: currentStoreId || "" });
    setShowModal(true);
  };
  const openEdit = (c) => {
    setEditing(c.id);
    setForm({ ...c });
    setShowModal(true);
  };
  const handleSave = () => {
    const data = { ...form, employees: parseInt(form.employees) || 0 };
    if (editing) updateCompany(editing, data);
    else addCompany(data);
    setShowModal(false);
  };
  const handleDelete = (id) => {
    if (confirm("Delete this company?")) deleteCompany(id);
  };

  const statusColor = {
    lead: "bg-blue-100 text-blue-700",
    prospect: "bg-yellow-100 text-yellow-700",
    customer: "bg-green-100 text-green-700",
  };
  const sizeColor = {
    Startup: "bg-purple-100 text-purple-700",
    "Mid-Market": "bg-gray-100 text-gray-700",
    Enterprise: "bg-red-100 text-red-700",
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Companies</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {filtered.length} companies
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SavedViews
            entityType="companies"
            currentFilters={{ search, filterIndustry }}
            onApplyView={(newFilters) => {
              setSearch(newFilters.search || "");
              setFilterIndustry(newFilters.filterIndustry || "");
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
            <Plus size={16} /> Add Company
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies..."
            className="input pl-9"
          />
        </div>
        <select
          value={filterIndustry}
          onChange={(e) => setFilterIndustry(e.target.value)}
          className="input w-auto"
        >
          <option value="">All Industries</option>
          {industries.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Industry
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Contacts
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Country
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
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
                      <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Building2 size={16} className="text-gray-700" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {c.name}
                        </p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Globe size={10} /> {c.website}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.industry || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "badge",
                        sizeColor[c.size] || "bg-gray-100 text-gray-600",
                      )}
                    >
                      {c.size}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.revenue || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {getContactCount(c.id)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {c.country || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        "badge",
                        statusColor[c.status] || "bg-gray-100 text-gray-600",
                      )}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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
              <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No companies found</p>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit Company" : "New Company"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Company Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="label">Industry</label>
              <input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="input"
                placeholder="Technology, Finance..."
              />
            </div>
            <div>
              <label className="label">Size</label>
              <select
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                className="input"
              >
                {["Startup", "Mid-Market", "Enterprise"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Revenue</label>
              <input
                value={form.revenue}
                onChange={(e) => setForm({ ...form, revenue: e.target.value })}
                className="input"
                placeholder="$10M"
              />
            </div>
            <div>
              <label className="label">Website</label>
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="input"
                placeholder="company.com"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Employees</label>
              <input
                type="number"
                value={form.employees}
                onChange={(e) =>
                  setForm({ ...form, employees: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="label">Country</label>
              <input
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="input"
              >
                {["lead", "prospect", "customer"].map((s) => (
                  <option key={s}>{s}</option>
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
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => setShowModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!form.name}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Company
            </button>
          </div>
        </div>
      </Modal>

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        entityType="companies"
        onImportComplete={(count) => {
          useCRM.getState().initialize?.() || useCRM.getState().refresh?.();
          setShowImport(false);
        }}
      />
    </div>
  );
}
