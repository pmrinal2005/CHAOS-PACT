import { currentSigningSecret, randomSecret as secret } from "./integrity";
import { useState } from "react";
import {
  AlertTriangle,
  Archive,
  Bell,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { IconButton, Modal, PageHead, Tag, Toggle } from "./ui";
import { useStored, useWorkspace } from "./workspace";

const tabs = [
  { name: "Profile", icon: User },
  { name: "API keys", icon: KeyRound },
  { name: "HMAC rotation", icon: ShieldCheck },
  { name: "Notifications", icon: Bell },
  { name: "Danger zone", icon: AlertTriangle },
];
export function Settings() {
  const {
    project,
    projects,
    setProjects,
    setProjectId,
    setRuns,
    setBattles,
    query,
    go,
    toast,
    copy,
    operator,
    setOperator,
    preferences: prefs,
    setPreferences: setPrefs,
  } = useWorkspace();
  const tab = query.tab || "Profile";
  const [name, setName] = useState(operator.name);
  const [email, setEmail] = useState(operator.email);
  const [keys, setKeys] = useStored("sandbox-api-keys", () => [
    {
      id: "first",
      name: "Development worker",
      value: `cp_sandbox_${secret()}`,
      created: new Date().toLocaleDateString("en-GB"),
    },
  ]);
  const [show, setShow] = useState("");
  const [label, setLabel] = useState("");
  const [hmac, setHmac] = useStored("sandbox-hmac", currentSigningSecret);
  const [confirm, setConfirm] = useState("");
  const [typed, setTyped] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const confirmAction = () => {
    if (confirm === "Rotate secret") {
      setHmac({ value: secret(), at: Date.now(), version: hmac.version + 1 });
      toast("Local HMAC secret rotated");
    } else if (confirm === "Revoke key") {
      setKeys((old) => old.filter((k) => k.id !== selectedKey));
      toast("Sandbox key revoked");
    } else if (confirm === "Archive project" || confirm === "Delete project") {
      if (typed !== project.name) return;
      setProjects((old) =>
        confirm === "Delete project"
          ? old.filter((p) => p.id !== project.id)
          : old.map((p) =>
              p.id === project.id ? { ...p, archived: true } : p,
            ),
      );
      if (confirm === "Delete project") {
        setRuns((old) => old.filter((r) => r.project !== project.id));
        setBattles((old) => old.filter((b) => b.project !== project.id));
      }
      const next = projects.find((p) => p.id !== project.id && !p.archived);
      setProjectId(next?.id || "");
      go("dashboard");
      toast(
        confirm === "Delete project"
          ? "Project and its execution records deleted"
          : "Project archived",
      );
    }
    setTyped("");
    setConfirm("");
  };
  return (
    <>
      <PageHead
        eyebrow="WORKSPACE CONFIGURATION"
        title="Settings"
        description="Your operator profile, local credentials, and workspace controls."
      />
      <div className="page-content">
        <div className="settings-layout">
          <nav className="settings-tabs" aria-label="Settings sections">
            {tabs.map((t) => (
              <button
                className={`${tab === t.name ? "selected" : ""} ${t.name === "Danger zone" ? "red" : ""}`}
                key={t.name}
                onClick={() => go("settings", { tab: t.name })}
              >
                <t.icon size={15} />
                {t.name}
              </button>
            ))}
          </nav>
          <div className="settings-body">
            {tab === "Profile" && (
              <form
                className="form-stack"
                onSubmit={(e) => {
                  e.preventDefault();
                  setOperator({ name: name.trim(), email: email.trim() });
                  toast("Operator profile saved");
                }}
              >
                <h3>Operator profile</h3>
                <p className="description">
                  Your identity across this workspace.
                </p>
                <div className="profile-block">
                  <span className="member-avatar big tone-0">
                    {operator.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <div>
                    <strong>{operator.name}</strong>
                    <small>Workspace owner</small>
                  </div>
                </div>
                <label className="field">
                  Display name
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="field">
                  Email address
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <button
                  className="btn primary self-start"
                  disabled={!name.trim()}
                >
                  <Check size={13} />
                  Save profile
                </button>
              </form>
            )}
            {tab === "API keys" && (
              <div className="form-stack">
                <h3>API keys</h3>
                <p className="description">
                  Local demonstration keys are stored on this device and do not
                  authenticate external services.
                </p>
                {keys.map((k) => (
                  <div className="key-row" key={k.id}>
                    <div>
                      <strong>{k.name}</strong>
                      <small>Created {k.created}</small>
                      <code>
                        {show === k.id
                          ? k.value
                          : `cp_sandbox_****************${k.value.slice(-4)}`}
                      </code>
                    </div>
                    <div className="key-actions">
                      <IconButton
                        icon={show === k.id ? EyeOff : Eye}
                        label={`Reveal or mask ${k.name}`}
                        onClick={() => setShow(show === k.id ? "" : k.id)}
                      />
                      <IconButton
                        icon={Copy}
                        label={`Copy ${k.name}`}
                        onClick={() => copy(k.value, "Sandbox key")}
                      />
                      <IconButton
                        icon={Trash2}
                        label={`Revoke ${k.name}`}
                        onClick={() => {
                          setSelectedKey(k.id);
                          setConfirm("Revoke key");
                        }}
                      />
                    </div>
                  </div>
                ))}
                <form
                  className="form-stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setKeys((old) => [
                      ...old,
                      {
                        id: crypto.randomUUID(),
                        name: label.trim(),
                        value: `cp_sandbox_${secret()}`,
                        created: new Date().toLocaleDateString("en-GB"),
                      },
                    ]);
                    setLabel("");
                    toast("Local API key created");
                  }}
                >
                  <label className="field">
                    New key label
                    <input
                      placeholder="e.g. CI worker"
                      required
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                    />
                  </label>
                  <button
                    className="btn secondary self-start"
                    disabled={!label.trim()}
                  >
                    <Plus size={13} />
                    Create sandbox key
                  </button>
                </form>
              </div>
            )}
            {tab === "HMAC rotation" && (
              <div className="form-stack">
                <h3>HMAC secret rotation</h3>
                <p className="description">
                  Manage the sample signing secret for this local workspace.
                  Never use a sandbox secret in production.
                </p>
                <div className="kv-row">
                  <span>Secret version</span>
                  <Tag color="gold">v{hmac.version}</Tag>
                </div>
                <div className="kv-row">
                  <span>Last rotated</span>
                  <code>{new Date(hmac.at).toLocaleString()}</code>
                </div>
                <div className="kv-row">
                  <span>Fingerprint</span>
                  <code>{hmac.value.slice(-12)}</code>
                </div>
                <button
                  className="btn secondary self-start"
                  onClick={() => setConfirm("Rotate secret")}
                >
                  <RotateCcw size={13} />
                  Rotate secret
                </button>
              </div>
            )}
            {tab === "Notifications" && (
              <div>
                <h3>Notification preferences</h3>
                <p className="description">
                  Choose the kinds of activity included in your local inbox.
                </p>
                {[
                  [
                    "Run failures",
                    "A verification run returns a failed verdict.",
                  ],
                  [
                    "Healing complete",
                    "A replay battle resolves successfully.",
                  ],
                  [
                    "Evidence sealed",
                    "A new evidence pack is ready to inspect.",
                  ],
                  [
                    "Credit balance",
                    "A low-balance reminder for execution credits.",
                  ],
                ].map(([n, d], i) => (
                  <div className="preference-row" key={n}>
                    <div>
                      <strong>{n}</strong>
                      <p>{d}</p>
                    </div>
                    <Toggle
                      label={n}
                      value={prefs[i]}
                      onChange={(v) => {
                        setPrefs((old) => old.map((a, j) => (j === i ? v : a)));
                        toast("Notification preference saved");
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
            {tab === "Danger zone" && (
              <div className="danger-panel">
                <div className="eyebrow red">
                  <AlertTriangle size={13} />
                  DESTRUCTIVE ACTIONS
                </div>
                <h3>Project danger zone</h3>
                <p className="description">
                  These actions apply only to {project.name} in this local
                  workspace.
                </p>
                <div className="preference-row">
                  <div>
                    <strong>Archive project</strong>
                    <p>
                      Remove the project from the active switcher. Its data is
                      retained.
                    </p>
                  </div>
                  <button
                    className="btn secondary compact"
                    onClick={() => {
                      setTyped("");
                      setConfirm("Archive project");
                    }}
                  >
                    <Archive size={12} />
                    Archive
                  </button>
                </div>
                <div className="preference-row">
                  <div>
                    <strong>Delete project</strong>
                    <p>
                      Permanently remove this project's configuration and run
                      history.
                    </p>
                  </div>
                  <button
                    className="btn danger compact"
                    onClick={() => {
                      setTyped("");
                      setConfirm("Delete project");
                    }}
                  >
                    <Trash2 size={12} />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {confirm && (
        <Modal
          title={confirm}
          eyebrow="CONFIRM ACTION"
          onClose={() => setConfirm("")}
        >
          <div className="modal-body form-stack">
            <p className="description">
              {confirm === "Rotate secret"
                ? "Replace the current local signing secret? The previous secret will no longer be available."
                : confirm === "Revoke key"
                  ? "This sample credential will be removed from your workspace."
                  : `Type the project name exactly to confirm: ${project.name}`}
            </p>
            {confirm.toLowerCase().includes("project") && (
              <label className="field">
                Project name
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={project.name}
                />
              </label>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn secondary" onClick={() => setConfirm("")}>
              Cancel
            </button>
            <button
              className="btn danger"
              disabled={
                confirm.toLowerCase().includes("project") &&
                typed !== project.name
              }
              onClick={confirmAction}
            >
              {confirm}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
