import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs
} from "firebase/firestore";
import { db, auth } from "../auth/firebase.js";

const PAGE_SIZE = 30;

/**
 * One page of the user directory, newest accounts first. Ordered by
 * createdAt rather than name — every account has createdAt from the
 * moment it's created, so nobody is silently excluded the way
 * ordering by a display-name field would exclude anyone who hasn't
 * set one yet.
 *
 * @param {import("firebase/firestore").QueryDocumentSnapshot|null} cursor
 *   Pass the `cursor` returned by the previous call to fetch the next
 *   page; omit it for the first page.
 */
export async function fetchDirectoryPage(cursor = null) {
  const usersRef = collection(db, "users");
  const myUid = auth.currentUser?.uid;

  const constraints = [orderBy("createdAt", "desc"), limit(PAGE_SIZE)];
  if (cursor) constraints.splice(1, 0, startAfter(cursor));

  const snap = await getDocs(query(usersRef, ...constraints));

  const users = snap.docs
    .filter(d => d.id !== myUid)
    .map(d => ({ uid: d.id, ...d.data() }));

  const cursorDoc = snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null;

  return { users, cursor: cursorDoc, hasMore: cursorDoc !== null };
}
