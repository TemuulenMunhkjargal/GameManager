"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { messageFromRequestError, requestJson } from "@/lib/api-client";

const TYPES = ["tcg", "ttrpg", "miniatures", "board_game"] as const;

export function AddGameSystemForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number] | "custom">("tcg");
  const [customType, setCustomType] = useState("");
  const [defaultCapacity, setDefaultCapacity] = useState(8);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await requestJson("/api/game-systems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: type === "custom" ? "other" : type,
          defaultCapacity, notes: type === "custom" ? `Category: ${customType.trim()}\n${notes}`.trim() : notes }),
      });
      setName("");
      setNotes("");
      setDefaultCapacity(8);
      setIsOpen(false);
      router.refresh();
    } catch (requestError) {
      setError(messageFromRequestError(requestError, "Unable to add game system."));
    } finally {
      setIsSubmitting(false);
    }
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
            <option value="custom">Type a different category...</option>
          </select>
          {type === "custom" ? <input aria-label="Custom game category" placeholder="Enter a category" required value={customType} onChange={(e) => setCustomType(e.target.value)} /> : null}
        </div>
        <div className="field">
          <label htmlFor="game-capacity">Default capacity</label>
          <input
            id="game-capacity"
            min={1}
            max={20}
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
