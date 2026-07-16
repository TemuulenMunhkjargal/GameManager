import { Download, Mail, Phone, Users } from "lucide-react";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { formatDateTime } from "@/lib/format";
import { AddMemberForm } from "./add-member-form";
import { DeleteMemberButton } from "./delete-member-button";

export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const [members, settings] = await Promise.all([
    container.members.listForOrganization(DEFAULT_ORGANIZATION_ID),
    container.settings.get(DEFAULT_ORGANIZATION_ID),
  ]);

  const activeMembers = members.filter((member) => member.status === "active");

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Your group</p>
          <h1 className="page-title">Players</h1>
          <p className="page-copy">
            Keep the people you play with handy, including their favorite games and contact details.
          </p>
        </div>
        <div className="form-actions">
          <a className="button secondary" href="/api/members.csv">
            <Download aria-hidden="true" size={16} />
            Export CSV
          </a>
          <AddMemberForm />
        </div>
      </div>

      <section className="grid columns-3" aria-label="Member stats">
        <div className="panel stat">
          <p className="stat-label">Total players</p>
          <p className="stat-value">{activeMembers.length}</p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Active</p>
          <p className="stat-value">
            {activeMembers.length}
          </p>
        </div>
        <div className="panel stat">
          <p className="stat-label">With phone</p>
          <p className="stat-value">{activeMembers.filter((member) => member.phone).length}</p>
        </div>
      </section>

      <div className="toolbar">
        <h2>Player directory</h2>
      </div>

      <div className="panel table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Favorite system</th>
              <th>Contact</th>
              <th>Joined</th>
              <th>Status</th>
              <th><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {activeMembers.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state compact">
                    <Users aria-hidden="true" size={26} />
                    <h3>Your player list is empty</h3>
                    <p>Add someone you play with, or add guests while managing a game night.</p>
                    <AddMemberForm />
                  </div>
                </td>
              </tr>
            ) : activeMembers.map((member) => (
              <tr key={member.id}>
                <td>
                  <strong>{member.displayName}</strong>
                </td>
                <td>{member.favoriteGameSystem}</td>
                <td>
                  <div className="inline-line">
                    <Mail aria-hidden="true" size={15} />
                    {member.email}
                  </div>
                  {member.phone ? (
                    <div className="inline-line">
                      <Phone aria-hidden="true" size={15} />
                      {member.phone}
                    </div>
                  ) : null}
                </td>
                <td>{formatDateTime(member.joinedAt, settings?.timezone)}</td>
                <td>
                  <span className="badge">{member.status}</span>
                </td>
                <td><DeleteMemberButton memberId={member.id} name={member.displayName} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
