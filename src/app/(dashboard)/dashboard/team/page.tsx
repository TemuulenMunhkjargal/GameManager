export const dynamic = "force-dynamic";

import { container, DEFAULT_ORGANIZATION_ID, resolveActor } from "@/infrastructure/container";
import { InviteTeammateForm } from "./invite-form";
import { RoleSelect } from "./role-select";
import { RemoveTeammateButton } from "./remove-button";
import { ReinstateButton } from "./reinstate-button";

export default async function TeamPage() {
  const actor = await resolveActor(DEFAULT_ORGANIZATION_ID);
  const canManageTeam = actor?.membership?.canManageTeam() ?? false;
  const team = await container.team.listForOrganization(DEFAULT_ORGANIZATION_ID);

  return (
    <>
      <div className="topbar">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1 className="page-title">Team</h1>
          <p className="page-copy">
            Invite staff, assign roles, and manage who can create events, check people in, and
            collect payments.
          </p>
        </div>
      </div>

      {!canManageTeam ? (
        <p className="notice">
          You can see the team roster, but only an owner or admin can invite people or change
          roles.
        </p>
      ) : null}

      <div className="detail-layout">
        <section className="panel detail-panel">
          <h2>Roster</h2>
          {team.length === 0 ? (
            <p className="notice">No teammates yet.</p>
          ) : (
            <ul className="attendee-list">
              {team.map((member) => (
                <li className="attendee" key={member.id}>
                  <div>
                    <strong>{member.displayName}</strong>
                    <div>{member.email}</div>
                  </div>
                  <div className="form-actions">
                    <span
                      className={
                        member.status === "invited"
                          ? "badge warning"
                          : member.status === "suspended"
                            ? "badge danger"
                            : "badge"
                      }
                    >
                      {member.status === "invited" ? "pending invite" : member.status}
                    </span>
                    {canManageTeam && member.status !== "suspended" ? (
                      <RoleSelect currentRole={member.role} membershipId={member.id} />
                    ) : (
                      <span className="muted">{member.role.replace("_", " ")}</span>
                    )}
                    {canManageTeam && member.status !== "suspended" ? (
                      <RemoveTeammateButton
                        label={member.status === "invited" ? "Revoke" : "Remove"}
                        membershipId={member.id}
                      />
                    ) : null}
                    {canManageTeam && member.status === "suspended" && member.hasAccount ? (
                      <ReinstateButton membershipId={member.id} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {canManageTeam ? (
          <aside className="panel form-panel">
            <h3>Invite someone</h3>
            <p className="muted">
              They'll need to sign up at <code>/sign-up</code> with this email to claim the
              invitation.
            </p>
            <InviteTeammateForm />
          </aside>
        ) : null}
      </div>
    </>
  );
}
