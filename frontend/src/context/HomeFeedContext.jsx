import React, { createContext, useContext, useRef } from 'react';

const HomeFeedContext = createContext(null);

// Lives above the router's <Outlet>, so this survives HomePage being
// unmounted/remounted as the user navigates to Notifications, Messages,
// etc. and back. A plain ref (not state) — HomePage copies these values
// into its own local state on mount, so this object doesn't need to
// trigger re-renders itself.
export const HomeFeedProvider = ({ children }) => {
  const store = useRef({
    posts: [],
    nextCursor: null,
    hasMore: true,
    hasFetchedOnce: false,
    // index of the post that was at (or nearest) the top of the viewport
    // when the user last left this page — NOT a raw pixel offset, since
    // pixel offsets only make sense once every row above has been
    // measured at its real height, which isn't true right after a remount
    topPostIndex: 0,
  });

  return (
    <HomeFeedContext.Provider value={store}>
      {children}
    </HomeFeedContext.Provider>
  );
};

export const useHomeFeedStore = () => {
  const ctx = useContext(HomeFeedContext);
  if (!ctx) {
    throw new Error("useHomeFeedStore must be used within a HomeFeedProvider");
  }
  return ctx;
};