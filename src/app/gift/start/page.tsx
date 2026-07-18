"use client";

import { Suspense, useEffect, useState } from "react";
import { loadGiftWorkspace } from "@/lib/gifts/gift.loaders";
import type { GiftWorkspaceViewModel } from "@/lib/gifts/gift.types";
import StartPageContent from "./StartPageContent";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GiftWorkspacePage />
    </Suspense>
  );
}

function GiftWorkspacePage() {
  const [workspace, setWorkspace] = useState<GiftWorkspaceViewModel | null>(null);
  const [workspaceError, setWorkspaceError] = useState(false);

  useEffect(() => {
    let active = true;
    loadGiftWorkspace()
      .then((viewModel) => {
        if (active) setWorkspace(viewModel);
      })
      .catch(() => {
        if (active) setWorkspaceError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <StartPageContent workspace={workspace} workspaceError={workspaceError} />
  );
}
