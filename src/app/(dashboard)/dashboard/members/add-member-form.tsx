"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, X } from "lucide-react";

export function AddMemberForm() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [favoriteGameSystem, setFavoriteGameSystem] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const response = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        email: email || null,
        phone: phone || null,
        favoriteGameSystem: favoriteGameSystem || "Unspecified",
      }),
    });

    setIsSubmitting(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to add member.");
      return;
    }

    setDisplayName("");
    setEmail("");
    setPhone("");
    setFavoriteGameSystem("");
    setIsOpen(false);
    router.refresh();
  }

  if (!isOpen) {
    return (
      <button className="button" onClick={() => setIsOpen(true)} type="button">
        <Plus aria-hidden="true" size={18} />
        Add member
      </button>
    );
  }

  return (
    <div className="panel form-panel" style={{ marginBottom: 24 }}>
      <div className="topbar" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>Add a member</h3>
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
          <label htmlFor="member-name">Display name</label>
          <input
            id="member-name"
            onChange={(e) => setDisplayName(e.target.value)}
            required
            value={displayName}
          />
        </div>
        <div className="field">
          <label htmlFor="member-game">Favorite game system</label>
          <input
            id="member-game"
            onChange={(e) => setFavoriteGameSystem(e.target.value)}
            placeholder="Magic, Pokémon, D&D…"
            value={favoriteGameSystem}
          />
        </div>
        <div className="field">
          <label htmlFor="member-email">Email</label>
          <input
            id="member-email"
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            value={email}
          />
        </div>
        <div className="field">
          <label htmlFor="member-phone">Phone</label>
          <input
            id="member-phone"
            onChange={(e) => setPhone(e.target.value)}
            type="tel"
            value={phone}
          />
        </div>
        {error ? <p className="notice error full">{error}</p> : null}
        <div className="form-actions full">
          <button className="button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Adding…" : "Add member"}
          </button>
        </div>
      </form>
    </div>
  );
}
