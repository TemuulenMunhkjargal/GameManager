"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";

const TYPES = ["tcg", "ttrpg", "miniatures", "board_game", "other"] as const;

export function AddGameSystemForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("tcg");
  const [defaultCapacity, setDefaultCapacity] = useState(8);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/game-systems", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, defaultCapacity, notes }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Unable to add game system.");
      return;
    }

    setName("");
    setNotes("");
    setDefaultCapacity(8);
    setIsOpen(false);
    router.refresh();
  }

  if (!isOpen) {
    return (
      <button className="button" onClick={() => setIsOpen(true)} type="button">
        <Plus aria-hidden="true" size={18} />
        Add system
      </button>
    );
  }

  return (
    <div className="panel form-panel" style={{ marginBottom: 24 }}>
      <div className="topbar" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Add a game system</h3>
        <button
          aria-label="Close"
          className="button secondary"
          onClick={() => setIsOpen(false)}
          type="button"
        >
          <X aria-hidden="true" size={16} />
        </button>
      </div>
      <form className="form-grid" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="game-name">Name</label>
          <input
            id="game-name"
            onChange={(e) => setName(e.target.value)}
            required
            value={name}
          />
        </div>
        <div className="field">
          <label htmlFor="game-type">Type</label>
          <select id="game-type" onChange={(e) => setType(e.target.value as typeof type)} value={type}>
            {TYPES.map((option) => (
              <option key={option} value={option}>
                {option.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="game-capacity">Default capacity</label>
          <input
            id="game-capacity"
            min={1}
            onChange={(e) => setDefaultCapacity(Number(e.target.value))}
            required
            type="number"
            value={defaultCapacity}
          />
        </div>
        <div className="field full">
          <label htmlFor="game-notes">Notes</label>
          <input id="game-notes" onChange={(e) => setNotes(e.target.value)} value={notes} />
        </div>
        {error ? <p className="notice error full">{error}</p> : null}
        <div className="form-actions full">
          <button className="button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Adding..." : "Add system"}
          </button>
        </div>
      </form>
    </div>
  );
}
