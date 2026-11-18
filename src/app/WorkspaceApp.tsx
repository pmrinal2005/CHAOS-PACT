"use client";

import dynamic from "next/dynamic";

// The workspace is a hash-routed client application; it never renders on the server.
const App = dynamic(() => import("@/workspace/App"), { ssr: false });

export default function WorkspaceApp() {
  return <App />;
}
