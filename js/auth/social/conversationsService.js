import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db, auth } from "../auth/firebase.js";

/** Deterministic id for the thread between two uids — same on client and backend, so no lookup query is ever needed to find a conversation, only to read it. */
export function conversationIdFor(otherUid) {
  const myUid = auth.currentUser?.uid;
  if (!myUid) return null;
  return [myUid, otherUid].sort().join("_");
}

/**
 * All of my conversations, most recently active first. callback
 * receives an array of { id, otherUid, otherName, otherAvatar,
 * lastMessage, updatedAt }, already shaped for a conversation-list row
 * — the caller doesn't need to know about `participants`/`participantInfo`.
 */
export function subscribeConversations(callback) {
  const myUid = auth.currentUser?.uid;
  if (!myUid) return () => {};

  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", myUid),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(q, snap => {
    const rows = snap.docs.map(d => {
      const data = d.data();
      const otherUid = data.participants.find(uid => uid !== myUid);
      const otherInfo = data.participantInfo?.[otherUid] || {};

      return {
        id: d.id,
        otherUid,
        otherName: otherInfo.displayName || "Joule User",
        otherAvatar: otherInfo.avatar || null,
        lastMessage: data.lastMessage || null,
        updatedAt: data.updatedAt?.toMillis?.() ?? 0
      };
    });

    callback(rows);
  });
}
