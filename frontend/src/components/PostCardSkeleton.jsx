import React from "react";

/**
 * Skeleton placeholder that mirrors HomepagePostCard's structure
 * (header / image / footer) so the feed doesn't jump when real
 * posts arrive. Pure Tailwind + CSS vars, no extra dependency.
 *
 * Render a handful of these (e.g. 3) in place of "Loading posts..."
 * while `initialLoading` is true on HomePage.
 */
const PostCardSkeleton = () => {
  return (
    <div className="postCard w-full mt-4 animate-pulse">
      {/* Header */}
      <div className="header w-full h-[50px] flex items-center px-2 bg-[var(--bg-app)]">
        <div className="w-[45px] h-[45px] rounded-full bg-[var(--bg-surface)] shrink-0" />
        <div className="flex-1 h-full px-2 flex flex-col justify-center gap-2">
          <div className="h-3 w-24 rounded bg-[var(--bg-surface)]" />
          <div className="h-2.5 w-14 rounded bg-[var(--bg-surface)]" />
        </div>
      </div>

      {/* Media */}
      <div className="w-full aspect-[4/5] bg-[var(--bg-surface)]" />

      {/* Footer */}
      <div className="footer w-full min-h-[140px] mt-2 px-2">
        <div className="flex items-center gap-5 h-[35px]">
          <div className="w-6 h-6 rounded-full bg-[var(--bg-surface)]" />
          <div className="w-6 h-6 rounded-full bg-[var(--bg-surface)]" />
          <div className="w-6 h-6 rounded-full bg-[var(--bg-surface)]" />
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <div className="h-3 w-3/4 rounded bg-[var(--bg-surface)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--bg-surface)]" />
        </div>

        <div className="mt-4 h-2.5 w-1/3 rounded bg-[var(--bg-surface)]" />
      </div>
    </div>
  );
};

export default PostCardSkeleton;
