import { collection, query, orderBy, limitToLast, onSnapshot } from "firebase/firestore";
import { db } from "../auth/firebase.js";

const HISTORY_LIMIT = 100;

/**
 * Live messages for one conversation, oldest first, capped to the
 * most recent 100 — enough for an open thread without an unbounded
 * read as history grows. callback receives an array of
 * { id, senderUid, text, sentAt }.
 */
export function subscribeMessages(conversationId, callback) {
  const q = query(
    collection(db, "conversations", conversationId, "messages"),
    orderBy("sentAt", "asc"),
    limitToLast(HISTORY_LIMIT)
  );

  return onSnapshot(q, snap => {
    callback(
      snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          senderUid: data.senderUid,
          text: data.text,
          sentAt: data.sentAt?.toMillis?.() ?? Date.now()
        };
      })
    );
  });
}
