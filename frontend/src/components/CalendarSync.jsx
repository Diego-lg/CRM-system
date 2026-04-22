import React, { useState, useEffect } from "react";
import { Calendar, RefreshCw, Check, X, Link, Unlink } from "lucide-react";
import { calendarSyncService } from "../lib/calendarService";
import useCRM from "../store/useCRM";

const PROVIDERS = [
  { id: "google", name: "Google Calendar", icon: "G" },
  { id: "outlook", name: "Microsoft Outlook", icon: "O" },
  { id: "apple", name: "Apple Calendar", icon: "A" },
];

export default function CalendarSync() {
  const user = useCRM((s) => s.user);
  const [syncStatus, setSyncStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await calendarSyncService.getStatus();
      setSyncStatus(data);
      setError(error?.message || null);
    } catch (err) {
      setError("Failed to load sync status");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (providerId) => {
    setConnecting(true);
    setError(null);
    try {
      // In production, this would trigger OAuth flow
      // For demo, we simulate connection
      const { data, error } = await calendarSyncService.connect({
        provider: providerId,
        accessToken: `demo_token_${Date.now()}`,
        refreshToken: `demo_refresh_${Date.now()}`,
        tokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      });

      if (error) throw error;
      setSyncStatus(data);
    } catch (err) {
      setError("Failed to connect calendar");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Disconnect calendar sync?")) return;

    setConnecting(true);
    try {
      const { error } = await calendarSyncService.disconnect();
      if (error) throw error;
      setSyncStatus(null);
    } catch (err) {
      setError("Failed to disconnect");
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    setConnecting(true);
    try {
      const { data, error } = await calendarSyncService.sync();
      if (error) throw error;
      setSyncStatus(data);
    } catch (err) {
      setError("Failed to sync calendar");
    } finally {
      setConnecting(false);
    }
  };

  const formatLastSync = (dateString) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar size={20} className="text-gray-600" />
        <h3 className="font-semibold text-gray-900">Calendar Sync</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw size={20} className="animate-spin text-gray-400" />
        </div>
      ) : syncStatus ? (
        <div className="space-y-4">
          {/* Connected Status */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-bold">
                  {PROVIDERS.find((p) => p.id === syncStatus.provider)?.icon ||
                    "?"}
                </div>
                <div>
                  <p className="font-medium text-green-900">
                    {PROVIDERS.find((p) => p.id === syncStatus.provider)
                      ?.name || "Connected"}
                  </p>
                  <p className="text-sm text-green-700">
                    Last synced: {formatLastSync(syncStatus.last_sync)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSync}
                  disabled={connecting}
                  className="p-2 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                  title="Sync now"
                >
                  <RefreshCw
                    size={16}
                    className={connecting ? "animate-spin" : ""}
                  />
                </button>
                <button
                  onClick={handleDisconnect}
                  disabled={connecting}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Disconnect"
                >
                  <Unlink size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Token Info */}
          {syncStatus.token_expires_at && (
            <p className="text-xs text-gray-500">
              Token expires:{" "}
              {new Date(syncStatus.token_expires_at).toLocaleString()}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Connect your calendar to sync events with the CRM.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => handleConnect(provider.id)}
                disabled={connecting}
                className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-gray-700">
                  {provider.icon}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {provider.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
