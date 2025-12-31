// Relative time utility - similar to Craigslist but with unique formatting
// Returns strings like "Posted 12m ago", "Posted 3h ago", "Posted 2d ago"
function getRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return "Posted just now";
  } else if (diffMinutes < 60) {
    return `Posted ${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `Posted ${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `Posted ${diffDays}d ago`;
  } else {
    // For older posts, show the date
    const weeks = Math.floor(diffDays / 7);
    if (weeks === 1) {
      return "Posted 1w ago";
    } else if (weeks < 5) {
      return `Posted ${weeks}w ago`;
    } else {
      // Show actual date for very old posts
      return `Posted ${date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`;
    }
  }
}

// Get date grouping header (Today, Yesterday, or date)
function getDateGroupHeader(dateString) {
  const date = new Date(dateString);
  const now = new Date();

  // Reset time to midnight for comparison
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const diffDays = Math.floor((nowOnly - dateOnly) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else {
    // Format as "Mon Dec 29"
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
}

// Group posts by date
function groupPostsByDate(posts) {
  const groups = {};

  posts.forEach((post) => {
    const header = getDateGroupHeader(post.posted_at);
    if (!groups[header]) {
      groups[header] = [];
    }
    groups[header].push(post);
  });

  return groups;
}
