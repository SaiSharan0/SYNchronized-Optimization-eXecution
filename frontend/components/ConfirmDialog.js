import { AlertTriangle, X } from "lucide-react";

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <div className="card w-full max-w-sm p-5 shadow-2xl animate-slide-up">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-2 text-red-400">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-dark-50">{title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-dark-300">{message}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-dark-400 transition-colors hover:text-dark-50">
            <X size={18} />
          </button>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={onCancel} className="btn-primary px-3 py-2">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="btn-danger px-3 py-2">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
