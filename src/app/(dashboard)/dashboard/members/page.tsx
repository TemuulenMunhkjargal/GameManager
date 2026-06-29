import { Mail, Phone, UserPlus } from "lucide-react";
import { container, DEFAULT_ORGANIZATION_ID } from "@/infrastructure/container";
import { formatDateTime } from "@/lib/format";


export const dynamic = "force-dynamic";

export default async function MembersPage() {
  const members = await container.members.listForOrganization(DEFAULT_ORGANIZATION_ID);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Community</p>
          <h1 className="page-title">Members</h1>
          <p className="page-copy">
            Track store regulars, event attendees, and player preferences before this becomes the
            real customer database.
          </p>
        </div>
        <button className="button" type="button">
          <UserPlus aria-hidden="true" size={18} />
          Add member
        </button>
      </div>

      <section className="grid columns-3" aria-label="Member stats">
        <div className="panel stat">
          <p className="stat-label">Total members</p>
          <p className="stat-value">{members.length}</p>
        </div>
        <div className="panel stat">
          <p className="stat-label">Active</p>
          <p className="stat-value">
            {members.filter((member) => member.status === "active").length}
          </p>
        </div>
        <div className="panel stat">
          <p className="stat-label">With phone</p>
          <p className="stat-value">{members.filter((member) => member.phone).length}</p>
        </div>
      </section>

      <div className="toolbar">
        <h2>Member directory</h2>
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
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
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
                <td>{formatDateTime(member.joinedAt)}</td>
                <td>
                  <span className="badge">{member.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
