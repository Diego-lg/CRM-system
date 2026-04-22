import React, { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  DollarSign,
  Calendar,
  User,
  GripVertical,
  Download,
  Upload,
} from "lucide-react";
import Modal from "../components/Modal";
import ImportModal from "../components/ImportModal";
import SavedViews from "../components/SavedViews";
import DealPredictionBadge from "../components/DealPredictionBadge";
import useCRM from "../store/useCRM";
import { exportDeals } from "../lib/csvExport";
import clsx from "clsx";

const STAGES = [
  { id: "new", label: "New", color: "#404040" },
  { id: "qualified", label: "Qualified", color: "#525252" },
  { id: "proposal", label: "Proposal", color: "#737373" },
  { id: "negotiation", label: "Negotiation", color: "#a3a3a3" },
  { id: "won", label: "Won", color: "#16a34a" },
  { id: "lost", label: "Lost", color: "#dc2626" },
];

const PRIORITY_COLOR = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};

const emptyForm = {
  title: "",
  value: 0,
  stage: "new",
  contact: "",
  company: "",
  closeDate: "",
  probability: 20,
  owner: "",
  priority: "medium",
  notes: "",
  storeId: "",
};

export default function Deals() {
  const deals = useCRM((s) => s.getFilteredDeals());
  const allDeals = useCRM((s) => s.deals);
  const contacts = useCRM((s) => s.contacts);
  const companies = useCRM((s) => s.companies);
  const stores = useCRM((s) => s.stores);
  const currentStoreId = useCRM((s) => s.currentStoreId);
  const addDeal = useCRM((s) => s.addDeal);
  const updateDeal = useCRM((s) => s.updateDeal);
  const moveDeal = useCRM((s) => s.moveDeal);
  const deleteDeal = useCRM((s) => s.deleteDeal);

  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [draggedDeal, setDraggedDeal] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});

  const handleExport = () => {
    const dataToExport =
      filtered && filtered.length > 0 ? filtered : allDeals || [];
    exportDeals(dataToExport, "deals");
  };

  const handleSaveView = (name, filterValues) => {
    console.log("Saved view:", name, filterValues);
  };

  const contactMap = useMemo(
    () => Object.fromEntries(contacts.map((c) => [c.id, c])),
    [contacts],
  );
  const companyMap = useMemo(
    () => Object.fromEntries(companies.map((c) => [c.id, c])),
    [companies],
  );
  const storeOptions = currentStoreId
    ? stores.filter((s) => s.id === currentStoreId)
    : stores;

  const filtered = useMemo(() => {
    if (!search) return allDeals;
    return allDeals.filter((d) =>
      d.title.toLowerCase().includes(search.toLowerCase()),
    );
  }, [allDeals, search]);

  const getDealsByStage = (stageId) => {
    return filtered
      .filter(
        (d) =>
          d.stage === stageId &&
          (currentStoreId ? d.storeId === currentStoreId : true),
      )
      .sort((a, b) => b.value - a.value);
  };

  const getStageTotal = (stageId) => {
    return getDealsByStage(stageId).reduce((sum, d) => sum + d.value, 0);
  };

  const getStageCount = (stageId) => getDealsByStage(stageId).length;

  const openAdd = (stage = "new") => {
    setEditing(null);
    setForm({ ...emptyForm, stage, storeId: currentStoreId || "" });
    setShowModal(true);
  };
  const openEdit = (d) => {
    setEditing(d.id);
    setForm({ ...d });
    setShowModal(true);
  };
  const handleSave = () => {
    const data = {
      ...form,
      value: parseInt(form.value) || 0,
      probability: parseInt(form.probability) || 20,
    };
    if (editing) updateDeal(editing, data);
    else addDeal(data);
    setShowModal(false);
  };
  const handleDelete = (id) => {
    if (confirm("Delete this deal?")) deleteDeal(id);
  };

  const handleDragStart = (e, deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (e, stageId) => {
    e.preventDefault();
    if (draggedDeal && draggedDeal.stage !== stageId) {
      moveDeal(draggedDeal.id, stageId);
    }
    setDraggedDeal(null);
  };

  const totalPipeline = STAGES.filter(
    (s) => !["won", "lost"].includes(s.id),
  ).reduce((sum, s) => sum + getStageTotal(s.id), 0);
  const totalWon = getStageTotal("won");
  const totalLost = getStageTotal("lost");

  const contactOptions = currentStoreId
    ? contacts.filter((c) => c.storeId === currentStoreId)
    : contacts;
  const companyOptions = currentStoreId
    ? companies.filter((c) => c.storeId === currentStoreId)
    : companies;

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pipeline</h2>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-sm text-gray-500">
              Pipeline:{" "}
              <span className="font-semibold text-gray-900">
                ${totalPipeline.toLocaleString()}
              </span>
            </span>
            <span className="text-sm text-gray-500">
              Won:{" "}
              <span className="font-semibold text-green-600">
                ${totalWon.toLocaleString()}
              </span>
            </span>
            <span className="text-sm text-gray-500">
              Lost:{" "}
              <span className="font-semibold text-red-600">
                ${totalLost.toLocaleString()}
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <SavedViews
            entityType="deals"
            currentFilters={{ search }}
            onApplyView={(newFilters) => {
              setSearch(newFilters.search || "");
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
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deals..."
              className="input pl-9 w-48"
            />
          </div>
          <button onClick={() => openAdd()} className="btn-primary">
            <Plus size={16} /> Add Deal
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div
        className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0"
        style={{ minHeight: "calc(100vh - 240px)" }}
      >
        {STAGES.map((stage) => {
          const stageDeals = getDealsByStage(stage.id);
          return (
            <div
              key={stage.id}
              className="flex flex-col flex-shrink-0 w-72"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-sm font-semibold text-gray-700">
                    {stage.label}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {getStageCount(stage.id)}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-500">
                  ${(getStageTotal(stage.id) / 1000).toFixed(0)}k
                </span>
              </div>

              {/* Column Body */}
              <div className="flex-1 bg-gray-100/80 rounded-xl p-2 space-y-2 min-h-32">
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, deal)}
                    onDragEnd={() => setDraggedDeal(null)}
                    className={clsx(
                      "kanban-card bg-white rounded-lg p-3 border border-gray-200 cursor-grab active:cursor-grabbing",
                      draggedDeal?.id === deal.id && "opacity-50",
                    )}
                    onClick={() => openEdit(deal)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 leading-snug">
                        {deal.title}
                      </h4>
                      <GripVertical
                        size={14}
                        className="text-gray-300 flex-shrink-0 mt-0.5"
                      />
                    </div>
                    <p className="text-lg font-bold text-gray-900 mb-2">
                      ${deal.value.toLocaleString()}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span
                        className={clsx(
                          "badge",
                          PRIORITY_COLOR[deal.priority] ||
                            "bg-gray-100 text-gray-600",
                        )}
                      >
                        {deal.priority}
                      </span>
                      {deal.probability < 100 && (
                        <span className="badge bg-gray-100 text-gray-600">
                          {deal.probability}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {deal.company && (
                        <span className="truncate max-w-[80px]">
                          {companyMap[deal.company]?.name || deal.company}
                        </span>
                      )}
                      {deal.closeDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} /> {deal.closeDate}
                        </span>
                      )}
                    </div>
                    {/* AI Prediction Badge - only for active deals */}
                    {!["won", "lost"].includes(deal.stage) && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <DealPredictionBadge
                          deal={deal}
                          contact={contactMap[deal.contact]}
                          company={companyMap[deal.company]}
                          historicalDeals={allDeals}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {stageDeals.length === 0 && (
                  <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg">
                    <span className="text-xs text-gray-400">
                      Drop deals here
                    </span>
                  </div>
                )}

                {/* Add deal button */}
                <button
                  onClick={() => openAdd(stage.id)}
                  className="w-full py-2 text-sm text-gray-400 hover:text-gray-900 hover:bg-white rounded-lg border border-dashed border-gray-200 hover:border-gray-400 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus size={14} /> Add deal
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? "Edit Deal" : "New Deal"}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Deal Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
              placeholder="Deal name"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Value ($)</label>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Probability (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.probability}
                onChange={(e) =>
                  setForm({ ...form, probability: e.target.value })
                }
                className="input"
              />
            </div>
            <div>
              <label className="label">Stage</label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value })}
                className="input"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Close Date</label>
              <input
                type="date"
                value={form.closeDate}
                onChange={(e) =>
                  setForm({ ...form, closeDate: e.target.value })
                }
                className="input"
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
              placeholder="Additional notes..."
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
                Save Deal
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        entityType="deals"
        onImportComplete={(count) => {
          useCRM.getState().initialize?.() || useCRM.getState().refresh?.();
          setShowImport(false);
        }}
      />
    </div>
  );
}
