import React, { useState, useEffect } from "react";
import { ChevronDown, Save, Bookmark, BookmarkCheck, X } from "lucide-react";
import clsx from "clsx";

const STORAGE_KEY_PREFIX = "crm_saved_views_";

export default function SavedViews({
  entityType,
  currentFilters = {},
  onApplyView,
  onSaveView,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [savedViews, setSavedViews] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  // Load saved views from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${entityType}`);
    if (stored) {
      try {
        setSavedViews(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load saved views:", e);
      }
    }
  }, [entityType]);

  const handleSaveView = () => {
    if (!newViewName.trim()) return;

    const newView = {
      id: `view_${Date.now()}`,
      name: newViewName.trim(),
      filters: { ...currentFilters },
      createdAt: new Date().toISOString(),
    };

    const updatedViews = [...savedViews, newView];
    setSavedViews(updatedViews);
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${entityType}`,
      JSON.stringify(updatedViews),
    );

    setNewViewName("");
    setShowSaveDialog(false);

    if (onSaveView) {
      onSaveView(newViewName.trim(), currentFilters);
    }
  };

  const handleApplyView = (view) => {
    if (onApplyView) {
      onApplyView(view.filters);
    }
    setIsOpen(false);
  };

  const handleDeleteView = (viewId) => {
    const updatedViews = savedViews.filter((v) => v.id !== viewId);
    setSavedViews(updatedViews);
    localStorage.setItem(
      `${STORAGE_KEY_PREFIX}${entityType}`,
      JSON.stringify(updatedViews),
    );
  };

  const getFilterSummary = (filters) => {
    const entries = Object.entries(filters).filter(
      ([, value]) => value !== "" && value !== null && value !== undefined,
    );
    if (entries.length === 0) return "No filters";
    return `${entries.length} filter${entries.length > 1 ? "s" : ""}`;
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
          savedViews.length > 0
            ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100",
        )}
      >
        <Bookmark size={16} />
        Saved Views
        <ChevronDown
          size={14}
          className={clsx("transition-transform", isOpen && "rotate-180")}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Panel */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-20">
            <div className="p-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">
                Saved Views
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {entityType.charAt(0).toUpperCase() + entityType.slice(1)}
              </p>
            </div>

            {/* Save New View */}
            <div className="p-3 border-b border-gray-100">
              {showSaveDialog ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newViewName}
                    onChange={(e) => setNewViewName(e.target.value)}
                    placeholder="View name..."
                    className="input text-sm w-full"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveView();
                      if (e.key === "Escape") setShowSaveDialog(false);
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowSaveDialog(false)}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveView}
                      disabled={!newViewName.trim()}
                      className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveDialog(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Save size={14} />
                  Save Current View
                </button>
              )}
            </div>

            {/* Views List */}
            <div className="max-h-64 overflow-y-auto">
              {savedViews.length === 0 ? (
                <div className="p-4 text-center">
                  <Bookmark size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No saved views yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Save your filters to quickly switch views
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {savedViews.map((view) => (
                    <div
                      key={view.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 group"
                    >
                      <button
                        onClick={() => handleApplyView(view)}
                        className="flex-1 text-left"
                      >
                        <p className="text-sm font-medium text-gray-900">
                          {view.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {getFilterSummary(view.filters)}
                        </p>
                      </button>
                      <button
                        onClick={() => handleDeleteView(view.id)}
                        className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete view"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
