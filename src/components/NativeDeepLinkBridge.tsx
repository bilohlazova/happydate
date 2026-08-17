"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { internalPathFromNativeUrl } from "@/lib/navigation/safeDeepLink";

export default function NativeDeepLinkBridge() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;

    const navigate = (url: string | undefined) => {
      if (disposed || !url) return;
      const path = internalPathFromNativeUrl(url);
      if (!path) return;
      window.location.assign(path);
    };

    const listener = App.addListener("appUrlOpen", ({ url }) => navigate(url));
    void App.getLaunchUrl().then((launch) => navigate(launch?.url)).catch(() => undefined);

    return () => {
      disposed = true;
      void listener.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
