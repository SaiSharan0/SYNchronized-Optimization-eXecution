import { useEffect, useState } from "react";
import { Bell, CheckCircle, Plus, Trash2, XCircle, Zap } from "lucide-react";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import ConfirmDialog from "../components/ConfirmDialog";
import { Badge } from "../components/Badges";
import { LoadingState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import { alertsAPI } from "../lib/api";
import { colors, extractError, fmt } from "../lib/utils";

const ALERT_TYPES = [
  { value: "performance", label: "Performance", color: colors.cyan },
  { value: "behavior", label: "Behavior", color: colors.amber },
  { value: "price", label: "Price", color: colors.purple },
  { value: "system", label: "System", color: "#6b8cae" },
];

const CONDITIONS = [
  { key: "on_overtrade", label: "Trigger on overtrading" },
  { key: "on_revenge_trade", label: "Trigger on revenge trading" },
  { key: "min_win_rate", label: "Win rate reaches (%)", numeric: true },
  { key: "max_drawdown", label: "Drawdown exceeds ($)", numeric: true },
];

function AlertForm({ onSaved, onCancel }) {
  const [form, setForm] = useState({ type: "performance", title: "", message: "", condition: {} });
  const [saving, setSaving] = useState(false);

  const set = (key) => (event) => setForm((value) => ({ ...value, [key]: event.target.value }));

  function toggleCondition(key, numeric) {
    setForm((value) => {
      const condition = { ...value.condition };
      if (key in condition) delete condition[key];
      else condition[key] = numeric ? 0 : true;
      return { ...value, condition };
    });
  }

  function setConditionValue(key, value) {
    setForm((current) => ({ ...current, condition: { ...current.condition, [key]: parseFloat(value) || 0 } }));
  }

  async function save() {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Fill title and message");
      return;
    }
    setSaving(true);
    try {
      const { data } = await alertsAPI.create(form);
      toast.success("Alert created");
      onSaved(data);
    } catch (error) {
      toast.error(extractError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-4 sm:p-6">
      <h3 className="font-display mb-5 text-lg font-bold">Create Alert</h3>
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Alert Type</label>
            <select value={form.type} onChange={set("type")} className="input">
              {ALERT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input value={form.title} onChange={set("title")} className="input" placeholder="Drawdown limit reached" />
          </div>
        </div>

        <div>
          <label className="label">Message</label>
          <textarea value={form.message} onChange={set("message")} rows={3} className="input resize-y" placeholder="Describe what this alert monitors and what action to take." />
        </div>

        <div>
          <label className="label">Trigger Conditions</label>
          <div className="card2 flex flex-col gap-3 p-4">
            {CONDITIONS.map(({ key, label, numeric }) => (
              <div key={key} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <label htmlFor={key} className="flex flex-1 cursor-pointer items-center gap-3 text-sm text-dark-300">
                  <input
                    type="checkbox"
                    id={key}
                    checked={key in form.condition}
                    onChange={() => toggleCondition(key, numeric)}
                    className="h-4 w-4 flex-shrink-0 accent-brand-200"
                  />
                  {label}
                </label>
                {numeric && key in form.condition && (
                  <input
                    type="number"
                    step="any"
                    value={form.condition[key] || ""}
                    onChange={(event) => setConditionValue(key, event.target.value)}
                    className="input w-full py-1.5 text-sm sm:w-32"
                    placeholder="Value"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button onClick={onCancel} className="btn-danger justify-center">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-success justify-center disabled:opacity-60">
            <Bell size={14} />{saving ? "Saving..." : "Save Alert"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert, onDelete, onToggle }) {
  const typeInfo = ALERT_TYPES.find((type) => type.value === alert.type) || ALERT_TYPES[0];

  return (
    <div className="card p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 rounded-lg border p-2" style={{ background: `${typeInfo.color}18`, borderColor: `${typeInfo.color}33` }}>
            <Bell size={14} style={{ color: typeInfo.color }} />
          </div>
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{alert.title}</span>
              <Badge color={typeInfo.color}>{typeInfo.label}</Badge>
              {alert.is_triggered && <Badge color={colors.amber}>Triggered</Badge>}
              {!alert.is_active && <Badge color="#6b8cae">Paused</Badge>}
            </div>
            <p className="break-words text-xs leading-relaxed text-dark-400">{alert.message}</p>
            {alert.condition && Object.keys(alert.condition).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(alert.condition).map(([key, value]) => (
                  <span key={key} className="rounded border border-dark-500 bg-dark-700 px-2 py-0.5 text-xs text-dark-300">
                    {key}: <strong>{String(value)}</strong>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 text-xs text-dark-500">
              Created {fmt.ago(alert.created_at)}
              {alert.triggered_at ? ` - Triggered ${fmt.ago(alert.triggered_at)}` : ""}
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center justify-end gap-2">
          <button
            onClick={() => onToggle(alert.id)}
            className={`rounded-md border p-1.5 transition-colors ${alert.is_active ? "border-green-400/30 bg-green-400/10 text-green-400 hover:bg-green-400/20" : "border-dark-500 bg-dark-700 text-dark-400 hover:border-dark-400"}`}
            title={alert.is_active ? "Disable" : "Enable"}
          >
            {alert.is_active ? <CheckCircle size={14} /> : <XCircle size={14} />}
          </button>
          <button onClick={() => onDelete(alert)} className="rounded-md border border-red-400/30 bg-red-400/10 p-1.5 text-red-400 hover:bg-red-400/20">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { user, loading: authLoading } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    alertsAPI.list()
      .then((response) => setAlerts(response.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  async function handleDelete(alert) {
    try {
      await alertsAPI.delete(alert.id);
      setAlerts((items) => items.filter((item) => item.id !== alert.id));
      setPendingDelete(null);
      toast.success("Alert deleted");
    } catch (error) {
      toast.error(extractError(error));
    }
  }

  async function handleToggle(id) {
    try {
      const { data } = await alertsAPI.toggle(id);
      setAlerts((items) => items.map((item) => item.id === id ? data : item));
    } catch (error) {
      toast.error(extractError(error));
    }
  }

  async function checkConditions() {
    setChecking(true);
    try {
      const { data } = await alertsAPI.checkConditions();
      if (data.triggered.length > 0) {
        toast.success(`${data.triggered.length} alert(s) triggered`);
        const fresh = await alertsAPI.list();
        setAlerts(fresh.data || []);
      } else {
        toast.success("No conditions met");
      }
    } catch (error) {
      toast.error(extractError(error));
    } finally {
      setChecking(false);
    }
  }

  return (
    <Layout title="Alerts">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="page-title">Alert System</h1>
            <p className="page-sub">Manage rule-based risk and discipline alerts</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <button onClick={checkConditions} disabled={checking} className="btn-primary justify-center px-3 py-2 text-xs disabled:opacity-60">
              <Zap size={12} />{checking ? "Checking..." : "Check Conditions"}
            </button>
            {!adding && (
              <button onClick={() => setAdding(true)} className="btn-success justify-center">
                <Plus size={14} /> New Alert
              </button>
            )}
          </div>
        </div>

        {adding && (
          <AlertForm
            onSaved={(alert) => { setAlerts((items) => [alert, ...items]); setAdding(false); }}
            onCancel={() => setAdding(false)}
          />
        )}

        {loading ? (
          <LoadingState label="Loading alerts..." />
        ) : alerts.length === 0 && !adding ? (
          <div className="card p-10 text-center text-dark-400 sm:p-16">
            <Bell size={40} className="mx-auto mb-4 opacity-30" />
            <p>No alerts configured yet. Create your first alert.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onDelete={setPendingDelete} onToggle={handleToggle} />
            ))}
          </div>
        )}

        <ConfirmDialog
          open={!!pendingDelete}
          title="Delete alert?"
          message={`This will permanently delete "${pendingDelete?.title || "this alert"}".`}
          confirmLabel="Delete alert"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDelete(pendingDelete)}
        />
      </div>
    </Layout>
  );
}
