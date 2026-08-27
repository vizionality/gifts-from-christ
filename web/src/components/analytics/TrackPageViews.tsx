"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { trackPageView } from "@/lib/analytics";

/**
 * Reports client-side route changes.
 *
 * GTM's Page View trigger fires on document load only. In an App Router app
 * almost all navigation is client-side, so without this every route after the
 * first one is invisible — sessions look one page deep and landing-page
 * reports carry the whole visit.
 *
 * The first render is skipped: the GA4 configuration tag already sends a
 * page_view for the initial load, and firing again here would double it.
 */
export function TrackPageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialLoad = useRef(true);

  useEffect(() => {
    if (initialLoad.current) {
      initialLoad.current = false;
      return;
    }

    const query = searchParams.toString();
    trackPageView(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return null;
}
