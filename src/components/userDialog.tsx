import React from 'react';

interface Props {
  title: string;
  busy: boolean;
  onCancel: () => void;
  children: React.ReactNode;
}

export default function UserDialog({ title, busy, onCancel, children }: Props) {
  const dialog = React.useRef<HTMLDialogElement>(null);
  const titleId = React.useId();
  React.useEffect(() => {
    dialog.current?.showModal();
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby={titleId} aria-modal="true" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }} className="w-full max-w-lg rounded-xl p-0 bg-white text-gray-800 backdrop:bg-black/60">
      <div className="flex justify-between items-center p-4 border-b bg-slate-200 rounded-t-xl">
        <h3 id={titleId} className="font-bold">{title}</h3>
        <button type="button" aria-label="Close dialog" disabled={busy} onClick={onCancel} className="px-2 text-xl">×</button>
      </div>
      {children}
    </dialog>
  );
}
