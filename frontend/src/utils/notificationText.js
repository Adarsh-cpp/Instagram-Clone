const truncate = (text = "", len = 40) =>
  text.length > len ? `${text.slice(0, len)}…` : text;

// Core action phrase — no sender name, post/reel aware.
// Used by both the toast (name prepended) and the notifications page
// (name rendered separately as a <Link>).
const actionText = (n) => {
  const target = n.reel ? "reel" : "post";

  switch (n.type) {
    case "follow":
      return "started following you";
    case "like":
      return `liked your ${target}`;
    case "comment":
      return `commented: "${truncate(n.commentText)}"`;
    case "comment_like":
      return `liked your comment: "${truncate(n.commentText)}"`;
    case "reply":
      return `replied "${truncate(n.commentText)}" to your comment "${truncate(n.parentCommentText)}"`;
    case "tag":
      return n.reel ? "tagged you in a reel" : "tagged you in a post";
    default:
      return "sent you a notification";
  }
};

// For NotificationsPage — includes "and X others" grouping (like-only, matches backend aggregation)
export const notificationText = (n) => {
  if (n.type === "like" && n.othersCount > 0) {
    const suffix = n.othersCount > 1 ? "others" : "other";
    return `and ${n.othersCount} ${suffix} ${actionText(n)}`;
  }
  return actionText(n);
};

// For realtime toasts — includes sender name, no grouping (single event)
export const getNotificationToastText = (n) => {
  const name = n.sender?.username || "Someone";
  return `${name} ${actionText(n)}`;
};