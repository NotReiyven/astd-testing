import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type PresenceState = {
  id: string;
  name: string;
  color: string;
  unitId: string;
};

// A hardcoded list of recognizable units to act as anonymous avatars
const AVATARS = [
  { unitId: "demise", name: "Demise" },
  { unitId: "galaxy-girl", name: "Galaxy Girl" },
  { unitId: "beardcutter", name: "Beardcutter" },
  { unitId: "death", name: "Death" },
  { unitId: "two-hands", name: "Two Hands" },
  { unitId: "ultra-legendary-borul-alternative", name: "Borul" },
  { unitId: "kageni", name: "Kageni" },
  { unitId: "water-goddess", name: "Aqua" },
  { unitId: "tuca-donka", name: "Hakari" },
  { unitId: "garnet-spear", name: "Violet" },
];

const COLORS = [
  "#ed4245",
  "#5865F2",
  "#23a559",
  "#FAA61A",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
];

const getIdentity = (): PresenceState => {
  if (typeof window === "undefined")
    return { id: "0", name: "Ghost", color: "#fff", unitId: "demise" };

  let stored = sessionStorage.getItem("astd_identity");
  let parsed = stored ? JSON.parse(stored) : null;

  // If there's no session, OR if it's an old session missing the new unitId, regenerate it.
  if (!parsed || !parsed.unitId) {
    const id = parsed?.id || Math.random().toString(36).substring(2, 9); // Keep old ID if it exists so we don't duplicate
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    parsed = { id, name: avatar.name, color, unitId: avatar.unitId };
    sessionStorage.setItem("astd_identity", JSON.stringify(parsed));
  }

  return parsed;
};

export function usePresence() {
  const [users, setUsers] = useState<PresenceState[]>([]);
  const identity = getIdentity();

  useEffect(() => {
    const room = supabase.channel("astd-global", {
      config: { presence: { key: identity.id } },
    });

    room
      .on("presence", { event: "sync" }, () => {
        const state = room.presenceState();
        const activeUsers = Object.values(state).map(
          (presences) => presences[0] as unknown as PresenceState
        );
        setUsers(activeUsers);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await room.track({
            id: identity.id,
            name: identity.name,
            color: identity.color,
            unitId: identity.unitId,
          });
        }
      });

    return () => {
      supabase.removeChannel(room);
    };
  }, [identity.id, identity.name, identity.color, identity.unitId]);

  return users;
}
