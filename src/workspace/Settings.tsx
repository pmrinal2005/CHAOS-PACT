import { AlertTriangle, Archive, Check, Fingerprint, Trash2 } from "lucide-react";
import { useState } from "react";
import { Empty, Modal, PageHead, Toggle } from "./ui";
import { api, useWorkspace } from "./workspace";

const tabs = ["Profile", "Notifications", "Signing", "Danger zone"];
const notificationLabels = [
  ["Failing verdicts", "A Kane CLI run exits 1 or confirms a product bug."],
  ["Healed builds", "A Blue-Team repair is re-verified to exit 0."],
  ["Sealed evidence", "A run's evidence pack is unpacked into the vault."],
  ["Low credit balance", "Less than 20% of the credit budget remains."],
];

export function Settings() {
  const { query, go, operator, preferences, saveSetting, system, project, projectRuns, projectBattles, patchProject, act } =
    useWorkspace();
  const active = tabs.includes(query.tab) ? query.tab : "Profile";
  const [name, setName] = useState(operator.name);
  const [email, setEmail] = useState(operator.email);
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState("");
  return (
    <>
      <PageHead eyebrow="WORKSPACE PREFERENCES" title="Settings" description="Operator profile, notifications and signing." />
      <div className="page-content">
        <div className="settings-layout">
          <nav className="settings-tabs" aria-label="Settings sections">
            {tabs.map((t) => (
              <button key={t} className={t === active ? "selected" : ""} onClick={() => go("settings", { tab: t })}>
                {t}
              </button>
            ))}
          </nav>
          <div className="settings-body">
            {active === "Profile" && (
              <form
                className="form-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveSetting("operator", { name: name.trim(), email: email.trim() }, "Profile saved");
                }}
              >
                <h3>Operator profile</h3>
                <p className="description">
                  Shown in the header. The workspace has no sign-in yet, so this identifies the operator, it does not authenticate them.
                </p>
                <label className="field">
                  Display name
                  <input required value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="field">
                  Email
                  <input required type="email" value={email} maxLength={160} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <button className="btn primary self-start" disabled={!name.trim() || !email.trim()}>
                  <Check size={14} />
                  Save profile
                </button>
              </form>
            )}
            {active === "Notifications" && (
              <div className="form-stack">
                <h3>Inbox notifications</h3>
                <p className="description">Which recorded events appear in the activity inbox.</p>
                {notificationLabels.map(([label, text], i) => (
                  <div className="preference-row" key={label}>
                    <span>
                      <strong>{label}</strong>
                      <small>{text}</small>
                    </span>
                    <Toggle
                      label={label}
                      value={!!preferences[i]}
                      onChange={(v) =>
                        saveSetting(
                          "notification_prefs",
                          notificationLabels.map((_, j) => (j === i ? v : !!preferences[j])),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            )}
            {active === "Signing" && (
              <div className="form-stack">
                <h3>Verification receipts</h3>
                <p className="description">
                  Healed battles are sealed with an HMAC-SHA256 receipt over the before and after run IDs, the commit SHA, the
                  evidence pack digest and a timestamp. Anyone can recompute it at the public receipt endpoint.
                </p>
                <div className="kv-row">
                  <span>
                    <Fingerprint size={13} /> Signing secret
                  </span>
                  <b className={system?.hmac ? "green" : "gold"}>{system?.hmac ? "Configured (HMAC_SECRET)" : "Not configured"}</b>
                </div>
                <div className="kv-row">
                  <span>Worker shared secret</span>
                  <b className={system?.worker ? "green" : "gold"}>{system?.worker ? "Configured" : "Not configured"}</b>
                </div>
                <div className="kv-row">
                  <span>Signed battles in this project</span>
                  <b className="mono">{projectBattles.filter((b) => b.receiptHash).length}</b>
                </div>
                <p className="description">
                  Secrets are read from environment variables on the server and are never sent to the browser. Rotating
                  HMAC_SECRET invalidates previously issued receipts.
                </p>
              </div>
            )}
            {active === "Danger zone" &&
              (project ? (
                <div className="danger-panel">
                  <div className="eyebrow red">
                    <AlertTriangle size={12} />
                    DANGER ZONE
                  </div>
                  <h3>{project.name}</h3>
                  <p className="description">
                    {projectRuns.length} run{projectRuns.length === 1 ? "" : "s"} and {projectBattles.length} battle
                    {projectBattles.length === 1 ? "" : "s"} are recorded for this project.
                  </p>
                  <div className="key-actions">
                    <button className="btn secondary" onClick={() => patchProject({ archived: true }, `${project.name} archived`)}>
                      <Archive size={13} />
                      Archive project
                    </button>
                    <button className="btn danger" onClick={() => (setTyped(""), setConfirm(true))}>
                      <Trash2 size={13} />
                      Delete project and its ledger
                    </button>
                  </div>
                </div>
              ) : (
                <Empty title="No active project" description="Connect or restore a project first." />
              ))}
          </div>
        </div>
      </div>
      {confirm && project && (
        <Modal title="Delete this project?" eyebrow="PERMANENT" onClose={() => setConfirm(false)}>
          <div className="modal-body form-stack">
            <p className="description">
              This permanently deletes {project.name} with all of its runs, NDJSON events, evidence records, battles and
              post-mortems. Chaos branches in the repository are not removed.
            </p>
            <label className="field">
              Type {project.name} to confirm
              <input value={typed} onChange={(e) => setTyped(e.target.value)} />
            </label>
          </div>
          <div className="modal-footer">
            <button className="btn secondary" onClick={() => setConfirm(false)}>
              Cancel
            </button>
            <button
              className="btn danger"
              disabled={typed !== project.name}
              onClick={async () => {
                await act(() => api(`/api/projects/${project.id}`, { method: "DELETE" }), `${project.name} deleted`);
                setConfirm(false);
                go("dashboard");
              }}
            >
              <Trash2 size={13} />
              Delete permanently
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
