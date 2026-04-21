import React, { useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Store as StoreIcon,
  Globe,
  DollarSign,
  TrendingUp,
  Target,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import Modal from "../components/Modal";
import useCRM from "../store/useCRM";
import clsx from "clsx";

const REGIONS = [
  "North America",
  "Europe",
  "Asia Pacific",
  "Latin America",
  "Middle East",
  "Africa",
];
const CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "SGD"];

const emptyForm = {
  name: "",
  region: "North America",
  currency: "USD",
  manager: "",
  phone: "",
  email: "",
  status: "active",
  address: "",
  color: "#262626",
};

export default function Stores() {
  const stores = useCRM((s) => s.stores);
  const deals = useCRM((s) => s.deals);
  const contacts = useCRM((s) => s.contacts);
  const addStore = useCRM((s) => s.addStore);
  const updateStore = useCRM((s) => s.updateStore);
  const deleteStore = useCRM((s) => s.deleteStore);
  const setCurrentStore = useCRM((s) => s.setCurrentStore);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedStore, setSelectedStore] = useState(stores[0]?.id || null);

  const getStoreMetrics = (storeId) => {
    const storeDeals = deals.filter((d) => d.storeId === storeId);
    const wonDeals = storeDeals.filter((d) => d.stage === "won");
    const openDeals = storeDeals.filter(
      (d) => !["won", "lost"].includes(d.stage),
    );
    const totalWon = wonDeals.reduce((s, d) => s + d.value, 0);
    const pipeline = openDeals.reduce((s, d) => s + d.value, 0);
    const contactCount = contacts.filter((c) => c.storeId === storeId).length;
    return { totalWon, pipeline, dealCount: storeDeals.length, contactCount };
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setShowModal(true);
  };
  const openEdit = (s) => {
    setEditing(s.id);
    setForm({ ...s });
    setShowModal(true);
  };
  const handleSave = () => {
    if (editing) updateStore(editing, form);
    else addStore(form);
    setShowModal(false);
  };
  const handleDelete = (id) => {
    if (confirm("Delete this store?")) deleteStore(id);
  };

  const tooltipStyle = {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    padding: "8px 12px",
    fontSize: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  };
  const currentStore = stores.find((s) => s.id === selectedStore) || stores[0];
  const metrics = currentStore ? getStoreMetrics(currentStore.id) : null;

  const storeRevenueData = stores.map((s) => ({
    name: s.name.split(" ")[0],
    revenue: s.revenue || 0,
    target: s.target || 0,
    color: s.color,
  }));

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Multi-Store Manager
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {stores.length} stores across{" "}
            {new Set(stores.map((s) => s.region)).size} regions
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={16} /> Add Store
        </button>
      </div>

      {/* Store Selector Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {stores.map((s) => (
          <button
            key={s.id}
            onClick={() => setSelectedStore(s.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
              selectedStore === s.id
                ? "text-white shadow-md"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300",
            )}
            style={
              selectedStore === s.id
                ? { backgroundColor: s.color || "#171717" }
                : {}
            }
          >
            <StoreIcon size={14} />
            {s.name}
            {s.status === "active" && (
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
            )}
          </button>
        ))}
      </div>

      {currentStore && metrics && (
        <div className="space-y-6 fade-in">
          {/* Store Overview Card */}
          <div
            className="card"
            style={{
              borderTop: `4px solid ${currentStore.color || "#171717"}`,
            }}
          >
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${currentStore.color}20` }}
                  >
                    <StoreIcon
                      size={22}
                      style={{ color: currentStore.color }}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {currentStore.name}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                      <Globe size={12} /> {currentStore.region}
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span
                        className={clsx(
                          "badge",
                          currentStore.status === "active"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700",
                        )}
                      >
                        {currentStore.status}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(currentStore)}
                    className="ml-auto p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-lg"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {currentStore.address || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {currentStore.phone || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {currentStore.email || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {currentStore.currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                  <DollarSign size={16} className="text-green-600" />
                </div>
                <span className="text-sm text-gray-500">Revenue</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${(currentStore.revenue || 0).toLocaleString()}
              </p>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, ((currentStore.revenue || 0) / (currentStore.target || 1)) * 100)}%`,
                    backgroundColor: currentStore.color,
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Target: ${(currentStore.target || 0).toLocaleString()}
              </p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                  <TrendingUp size={16} className="text-gray-700" />
                </div>
                <span className="text-sm text-gray-500">Won Deals</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${metrics.totalWon.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {metrics.dealCount} total deals
              </p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                  <Target size={16} className="text-orange-600" />
                </div>
                <span className="text-sm text-gray-500">Pipeline</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                ${metrics.pipeline.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {metrics.dealCount - metrics.dealCount} open deals
              </p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <StoreIcon size={16} className="text-blue-600" />
                </div>
                <span className="text-sm text-gray-500">Contacts</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {metrics.contactCount}
              </p>
              <p className="text-xs text-gray-400 mt-1">Active contacts</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">
                Revenue vs Target by Store
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={storeRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#9ca3af"
                    tickFormatter={(v) => `$${v / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => `$${v.toLocaleString()}`}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#262626"
                    radius={[4, 4, 0, 0]}
                    name="Revenue"
                  />
                  <Bar
                    dataKey="target"
                    fill="#e5e7eb"
                    radius={[4, 4, 0, 0]}
                    name="Target"
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">
                Store Distribution
              </h3>
              <div className="space-y-3">
                {stores.map((s) => {
                  const m = getStoreMetrics(s.id);
                  const totalStoreRevenue =
                    stores.reduce((sum, st) => sum + (st.revenue || 0), 0) || 1;
                  const pct = Math.round(
                    ((s.revenue || 0) / totalStoreRevenue) * 100,
                  );
                  return (
                    <div key={s.id} className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: s.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">
                            {s.name}
                          </span>
                          <span className="text-sm text-gray-500">{pct}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: s.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Store List */}
      <div className="card mt-6">
        <h3 className="font-semibold text-gray-900 mb-4">All Stores</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase tracking-wider">
                <th className="pb-3 pr-4">Store</th>
                <th className="pb-3 pr-4">Region</th>
                <th className="pb-3 pr-4">Manager</th>
                <th className="pb-3 pr-4">Revenue</th>
                <th className="pb-3 pr-4">Target</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((s) => (
                <tr key={s.id} className="table-row">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      <span className="text-sm font-medium text-gray-800">
                        {s.name}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-sm text-gray-600">
                    {s.region}
                  </td>
                  <td className="py-2 pr-4 text-sm text-gray-600">
                    {s.manager || "—"}
                  </td>
                  <td className="py-2 pr-4 text-sm font-medium text-gray-800">
                    ${(s.revenue || 0).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-sm text-gray-600">
                    ${(s.target || 0).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={clsx(
                        "badge",
                        s.status === "active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700",
                      )}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setSelectedStore(s.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openEdit(s)}
                        className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit Store" : "New Store"}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Store Name *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="North America HQ"
              />
            </div>
            <div>
              <label className="label">Region</label>
              <select
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value })}
                className="input"
              >
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Manager</label>
              <input
                value={form.manager}
                onChange={(e) => setForm({ ...form, manager: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                className="input"
              >
                {CURRENCIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
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
              <label className="label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Address</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
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
                {["active", "inactive"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="input flex-1"
                />
              </div>
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
              className="btn-primary disabled:opacity-50"
            >
              Save Store
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
