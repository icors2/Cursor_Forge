/**
 * Role-aware club navigation shared by the top bar and the home hub.
 */

import type { Role } from "@volleyball-manager/shared-types";

/** One destination in the club chrome. */
export interface ClubNavLink {
  /** App Router path. */
  href: string;
  /** Button / card label. */
  label: string;
  /** Hub card description (optional). */
  body?: string;
}

/** Builds the header + hub links for the signed-in role. */
export function navLinksFor(role: Role): ClubNavLink[] {
  const links: ClubNavLink[] = [
    { href: "/home", label: "Home", body: "Club hub for this account." },
    { href: "/live", label: "Live", body: "Watch timestamped stats as they happen." },
    { href: "/calendar", label: "Calendar", body: "Upcoming games and ICS import or subscribe." },
    { href: "/announcements", label: "News", body: "Club news and comments." },
  ];
  if (role === "PARENT" || role === "ADMIN") {
    links.push({ href: "/volunteer", label: "Volunteer", body: "Sign up for a shift or create slots." });
  }
  if (role === "COACH" || role === "ADMIN") {
    links.push(
      { href: "/coach", label: "Stat Tracking", body: "Record live stats for a selected game." },
      { href: "/notes", label: "Notes", body: "Private observations about players." },
      { href: "/registrations", label: "Registration", body: "Open team apply windows and promote the player pool." },
    );
  }
  if (role === "PARENT" || role === "PLAYER") {
    links.push({
      href: "/registrations",
      label: "Apply",
      body: "Apply to a team the coach opened for registration.",
    });
  }
  if (role === "ADMIN") {
    links.push({ href: "/admin", label: "Admin", body: "Provision users, roles, dues, seasons, and volunteer slots." });
  }
  links.push(
    { href: "/teams", label: "Teams", body: "Active-season roster and schedule." },
    { href: "/seasons", label: "Seasons", body: "Active season and printable history." },
    { href: "/dues", label: "Dues", body: "See (or, as admin, set) the dues flag." },
    { href: "/theme", label: "Theme", body: "Pick your account accent color." },
  );
  return links;
}

/** True when the current path is this nav item (including nested routes). */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/home") {
    return pathname === "/home";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
