import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "../auth/firebase.js";

/**
 * Requests other people have sent ME, awaiting my accept/decline.
 * callback receives an array of { requester, requesterName, requesterAvatar, createdAt }.
 */
export function subscribeIncomingRequests(callback) {
  const myUid = auth.currentUser?.uid;
  if (!myUid) return () => {};

  const q = query(collection(db, "followRequests"), where("target", "==", myUid));

  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => d.data()));
  });
}

/** Requests I've sent that are still pending — lets the UI show "Requested" instead of "Follow". */
export function subscribeOutgoingRequests(callback) {
  const myUid = auth.currentUser?.uid;
  if (!myUid) return () => {};

  const q = query(collection(db, "followRequests"), where("requester", "==", myUid));

  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => d.data().target));
  });
}

/** Uids of people I follow (accepted). Also what gates "who can I message" together with subscribeFollowers. */
export function subscribeFollowing(callback) {
  const myUid = auth.currentUser?.uid;
  if (!myUid) return () => {};

  const q = query(collection(db, "follows"), where("follower", "==", myUid));

  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => d.data().followee));
  });
}

/** Uids of people who follow me (accepted). */
export function subscribeFollowers(callback) {
  const myUid = auth.currentUser?.uid;
  if (!myUid) return () => {};

  const q = query(collection(db, "follows"), where("followee", "==", myUid));

  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => d.data().follower));
  });
}
