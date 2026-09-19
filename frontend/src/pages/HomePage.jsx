import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import IconSidebar from '../components/IconSidebar'
import StoryContainer from '../components/StoryContainer'
import HomepagePostCard from '../components/HomepagePostCard'
import axios from "axios";
import MobileFooter from '../components/MobileFooter';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useUpload } from '../context/UploadContext';
import { useHomeFeedStore } from '../context/HomeFeedContext';
import PostCardSkeleton from '../components/PostCardSkeleton'

const BASE_URL = import.meta.env.VITE_SERVER_URL

const authConfig = () => ({
  withCredentials: true,
  headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
});

const HomePage = () => {

  const store = useHomeFeedStore();

  const [posts, setPosts] = useState(() => store.current.posts);
  const [nextCursor, setNextCursor] = useState(() => store.current.nextCursor);
  const [hasMore, setHasMore] = useState(() => store.current.hasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(() => !store.current.hasFetchedOnce);

  const { user } = useAuth();
  const { uploads, markConsumed } = useUpload();

  const location = useLocation();
  const navigate = useNavigate();

  const scrollParentRef = useRef(null);
  const listStartRef = useRef(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  const isFetchingRef = useRef(false);
  const hasRestoredScrollRef = useRef(false);

  const PAGE_SIZE = 10;

  const fetchPage = useCallback(async (cursor) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (cursor) setIsLoadingMore(true);

    try {
      const token = localStorage.getItem("authToken");
      const params = { limit: PAGE_SIZE };
      if (cursor) params.cursor = cursor;

      const response = await axios.get(`${BASE_URL}/post/get-posts`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const { posts: newPosts, nextCursor: newCursor, hasMore: more } = response.data;

      setPosts((prev) => {
        if (!cursor) return newPosts;
        const seen = new Set(prev.map((p) => p._id));
        const filtered = newPosts.filter((p) => !seen.has(p._id));
        return [...prev, ...filtered];
      });

      setNextCursor(newCursor);
      setHasMore(Boolean(more));
    } catch (error) {
      toast.error(error.message || "Failed to load posts");
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!store.current.hasFetchedOnce) {
      store.current.hasFetchedOnce = true;
      fetchPage(null);
    }
  }, [fetchPage, store]);

  useEffect(() => {
    store.current.posts = posts;
    store.current.nextCursor = nextCursor;
    store.current.hasMore = hasMore;
  }, [posts, nextCursor, hasMore, store]);

  useEffect(() => {
    if (location.state?.message) {
      toast.success(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    const unconsumed = uploads.filter((u) => u.status === "success" && !u.consumed);
    if (unconsumed.length === 0) return;

    unconsumed.forEach((u) => {
      if (u.type === "image" && u.resultData?.post) {
        setPosts((prev) => [u.resultData.post, ...prev]);
      }
      markConsumed(u.id);
    });
  }, [uploads, markConsumed]);

  useLayoutEffect(() => {
    if (listStartRef.current) {
      setScrollMargin(listStartRef.current.offsetTop);
    }
  }, [initialLoading]);

  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 640,
    overscan: 4,
    scrollMargin,
    useFlushSync: false,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useLayoutEffect(() => {
    if (hasRestoredScrollRef.current) return;
    if (initialLoading) return;
    if (posts.length === 0) return;

    const targetIndex = Math.min(store.current.topPostIndex, posts.length - 1);
    hasRestoredScrollRef.current = true;

    if (targetIndex > 0) {
      virtualizer.scrollToIndex(targetIndex, { align: "start" });
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(targetIndex, { align: "start" });
      });
    }
  }, [initialLoading, posts.length, virtualizer, store]);

  // continuously remember which post is at the top of the *visible*
  // viewport (not the top of virtualItems — that array includes
  // `overscan` extra rows rendered ABOVE what's on screen for smooth
  // scroll-ahead, so its [0] is usually several posts higher than what
  // the user can actually see). We instead find the first row whose
  // bottom edge is still below the current scrollTop — i.e. the first
  // row that's actually, at least partially, on screen.
  const handleScroll = () => {
    const el = scrollParentRef.current;
    if (!el) return;

    const items = virtualizer.getVirtualItems();
    const visible = items.find(
      (item) => item.start - scrollMargin + item.size > el.scrollTop
    );

    if (visible) {
      store.current.topPostIndex = visible.index;
    }
  };

  useEffect(() => {
    if (!virtualItems.length || !hasMore || isFetchingRef.current) return;

    const lastItem = virtualItems[virtualItems.length - 1];
    if (lastItem.index >= posts.length - 3) {
      fetchPage(nextCursor);
    }
  }, [virtualItems, hasMore, posts.length, nextCursor, fetchPage]);

  const handlePostDeleted = useCallback((postId) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  }, []);

  return (
    <div className='homePage w-[100vw] h-[100vh] bg-[var(--bg-app)] flex text-[var(--text-primary)] overflow-x-hidden'>

      <IconSidebar />

      <div
        ref={scrollParentRef}
        onScroll={handleScroll}
        className="homeSection no-scrollbar w-full md:w-[80%] min-h-full flex justify-center overflow-y-auto"
      >

        <div className="homeContainer w-full sm:w-[70%] lg:w-[60%] min-h-full flex flex-col items-start">

          <StoryContainer />

          <div
            ref={listStartRef}
            className="postContainer w-full xl:w-[75%] min-h-[calc(100vh-130px)] mx-auto py-4"
          >

            {initialLoading ? (
               <div className="flex flex-col">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <PostCardSkeleton key={i} />
                    ))}
                  </div>
            ) : posts.length === 0 ? (
              <div className="w-full h-[300px] flex justify-center items-center text-[var(--text-primary)]">
                No posts available
              </div>
            ) : (
              <div
                style={{
                  position: 'relative',
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                }}
              >
                {virtualItems.map((virtualRow) => {
                  const post = posts[virtualRow.index];
                  if (!post) return null;

                  return (
                    <div
                      key={post._id}
                      data-index={virtualRow.index}
                      ref={virtualizer.measureElement}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                      }}
                    >
                      <HomepagePostCard
                        postId={post._id}
                        onDeleted={handlePostDeleted}
                        media={post.media}
                        profileImgSrc={post.author.profilePic}
                        authorId={post.author._id}
                        author={post.author.username}
                        authorRole={post.author.role}
                        caption={post.caption}
                        aspectRatio={post.aspectRatio}
                        isLiked={post.likes.some(
                          (id) => id.toString() === user?._id
                        )}
                        likesCount={post.likes.length}
                        commentsCount={post.commentsCount}
                        isSaved={post.isSaved}
                        location={post.location}
                        createdAt={post.createdAt}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {isLoadingMore && (
              <div className="w-full py-4 flex justify-center text-[var(--text-muted)] text-sm">
                Loading more...
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="w-full py-4 flex justify-center text-[var(--text-muted)] text-sm">
                You're all caught up
              </div>
            )}

          </div>

        </div>

        <MobileFooter />

      </div>

    </div>
  )
}

export default HomePage