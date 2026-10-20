import { useEffect, useRef } from "react";

export default function ConfirmDeletionDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Keep it",
  deleting,
  error,
  onClose,
  onConfirm,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const opener = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="confirm-delete-dialog"
      aria-labelledby="confirm-delete-title"
      aria-describedby="confirm-delete-description"
      aria-busy={deleting}
      onCancel={(event) => {
        event.preventDefault();
        if (!deleting) onClose();
      }}
    >
      <h2 id="confirm-delete-title">{title}</h2>
      <p id="confirm-delete-description">{description}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="confirm-delete-actions">
        <button type="button" className="subject-cancel-btn" disabled={deleting} onClick={onClose}>
          {cancelLabel}
        </button>
        <button type="button" className="btn-primary" disabled={deleting} onClick={onConfirm}>
          {deleting ? "Deleting..." : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
