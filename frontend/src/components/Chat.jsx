import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Image, Send, Smile, X } from "lucide-react";
import socket from '../socket';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { Link, useParams } from 'react-router-dom';
import MessageBox from './MessageBox';
import { useSocket } from '../context/SocketContext';
import { getTimeAgo } from '../utils/timeAgo';

const MAX_IMAGES = 4;
const MESSAGE_PAGE_SIZE = 30;
const LOAD_OLDER_THRESHOLD_PX = 300;

const Chat = () => {

  const { onlineUsers, lastSeenMap } = useSocket()

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState();
  const [isFriendTyping, setIsFriendTyping] = useState(false);

  // pagination state
  const [initialLoading, setInitialLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [scrollMargin, setScrollMargin] = useState(0);

  // selectedImages: [{ id, file, preview }]
  const [selectedImages, setSelectedImages] = useState([]);
  const fileInputRef = useRef(null);

  const [sendingImage, setSendingImage] = useState(false);

  const typingTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const listStartRef = useRef(null);
  const messageInputRef = useRef(null);

  // pagination refs — kept in sync with state for use inside callbacks
  // that shouldn't be re-created every render
  const oldestCursorRef = useRef(null);
  const hasMoreOlderRef = useRef(true);
  const isLoadingOlderRef = useRef(false);
  const isNearBottomRef = useRef(true);

  // tells the scroll-restoration effect below what just happened to
  // `messages`, so it knows whether to jump, smooth-scroll, or anchor
  const pendingActionRef = useRef(null); // "initial" | "append" | { type: "prepend", prevScrollHeight, prevScrollTop } | null

  const { user } = useAuth();
  const { conversationId } = useParams();

  const friend = conversation?.participants.find(
    (participant) => participant?._id !== user?._id
  );

  const isFriendOnline = onlineUsers?.includes(friend?._id);
  const friendLastSeen = lastSeenMap?.[friend?._id] || friend?.lastSeen;

  const activeStatusText = isFriendOnline
    ? "Active now"
    : friendLastSeen
    ? `Active ${getTimeAgo(friendLastSeen)} ago`
    : null;

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGES - selectedImages.length;
    if (remainingSlots <= 0) {
      toast.error(`You can only attach up to ${MAX_IMAGES} images`);
      e.target.value = "";
      return;
    }

    const validFiles = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is over 10MB`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > remainingSlots) {
      toast.error(`Only ${remainingSlots} more image${remainingSlots === 1 ? "" : "s"} allowed`);
    }

    const toAdd = validFiles.slice(0, remainingSlots).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedImages((prev) => [...prev, ...toAdd]);
    e.target.value = ""; // lets you re-pick the same file later if you clear it
  };

  const removeSelectedImage = (id) => {
    setSelectedImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((img) => img.id !== id);
    });
  };

  const clearSelectedImages = () => {
    setSelectedImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.preview));
      return [];
    });
  };

  // avoid leaking blob URLs on unmount
  useEffect(() => {
    return () => {
      selectedImages.forEach((img) => URL.revokeObjectURL(img.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shared helper — called on new incoming visible messages and on tab
  // refocus. Always fire-and-forget: a failure here shouldn't block or
  // delay anything else in the chat (see getInitialMessages below for why
  // that matters beyond just UX polish).
  const markConversationSeen = async () => {
    try {
      const token = localStorage.getItem("authToken");
      await axios.patch(
        `http://localhost:4000/message/${conversationId}/mark-seen`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      // silent: marking seen failing shouldn't interrupt the chat
    }
  };

  // fetch conversation (for friend details)
  useEffect(() => {
    if (!conversationId) return;

    const getConversation = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const url = `http://localhost:4000/conversation/${conversationId}`;

        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 200) {
          setConversation(response.data.conversation);
        } else {
          toast.error("Error fetching conversation");
        }
      } catch (error) {
        toast.error("Some error occurred");
      }
    };

    getConversation();
  }, [conversationId]);

  // initial page — most recent MESSAGE_PAGE_SIZE messages for this conversation
  useEffect(() => {
    if (!conversationId) return;

    oldestCursorRef.current = null;
    hasMoreOlderRef.current = true;
    setHasMoreOlder(true);
    setInitialLoading(true);
    setMessages([]);

    const getInitialMessages = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await axios.get(
          `http://localhost:4000/message/${conversationId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { limit: MESSAGE_PAGE_SIZE },
          }
        );

        if (response.status === 200) {
          const { messages: initialMessages, nextCursor, hasMore } = response.data;

          oldestCursorRef.current = nextCursor;
          hasMoreOlderRef.current = hasMore;
          setHasMoreOlder(hasMore);

          pendingActionRef.current = "initial";
          setMessages(initialMessages);

          // fire-and-forget, deliberately NOT awaited: awaiting this here
          // used to delay `setInitialLoading(false)` below into a separate
          // commit, which meant the "scroll to bottom" effect ran while the
          // real message list was still hidden behind the loading state.
          markConversationSeen();
        }
      } catch (error) {
        toast.error("Something went wrong");
      } finally {
        setInitialLoading(false);
      }
    };

    getInitialMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // fetches the next page of OLDER messages, anchoring scroll position
  // so the message the user was looking at doesn't visually jump
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlderRef.current || !hasMoreOlderRef.current || !conversationId) return;

    isLoadingOlderRef.current = true;
    setIsLoadingOlder(true);

    const el = containerRef.current;
    const prevScrollHeight = el ? el.scrollHeight : 0;
    const prevScrollTop = el ? el.scrollTop : 0;

    try {
      const token = localStorage.getItem("authToken");
      const params = { limit: MESSAGE_PAGE_SIZE };
      if (oldestCursorRef.current) params.cursor = oldestCursorRef.current;

      const response = await axios.get(
        `http://localhost:4000/message/${conversationId}`,
        { headers: { Authorization: `Bearer ${token}` }, params }
      );

      const { messages: olderMessages, nextCursor, hasMore } = response.data;

      oldestCursorRef.current = nextCursor;
      hasMoreOlderRef.current = hasMore;
      setHasMoreOlder(hasMore);

      if (olderMessages.length > 0) {
        pendingActionRef.current = { type: "prepend", prevScrollHeight, prevScrollTop };
        setMessages((prev) => [...olderMessages, ...prev]);
      }
    } catch (error) {
      toast.error("Failed to load earlier messages");
    } finally {
      isLoadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [conversationId]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop < LOAD_OLDER_THRESHOLD_PX && hasMoreOlderRef.current && !isLoadingOlderRef.current) {
      loadOlderMessages();
    }

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 150;
  }, [loadOlderMessages]);

  // measure where the virtualized list starts inside the scroll container
  // (profile header + the fixed-height "loading older" slot sit above it)
  useLayoutEffect(() => {
    if (listStartRef.current) {
      setScrollMargin(listStartRef.current.offsetTop);
    }
  }, [initialLoading, friend?._id]);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 70,
    overscan: 8,
    scrollMargin,
    getItemKey: (index) => messages[index]?._id ?? index,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // resolves the scroll position AFTER messages actually re-render, based
  // on what kind of change just happened. Guarded on `initialLoading` too
  // (not just `messages`) — the real message list only exists in the DOM
  // once initialLoading is false, so acting on the pending action any
  // earlier would compute against the wrong content height.
  useLayoutEffect(() => {
    if (initialLoading) return;

    const el = containerRef.current;
    if (!el || messages.length === 0) return;

    const action = pendingActionRef.current;
    if (!action) return;
    pendingActionRef.current = null;

    if (action === "initial") {
      const lastIndex = messages.length - 1;
      virtualizer.scrollToIndex(lastIndex, { align: "end" });
      // dynamic-height rows (images, shared-post cards) can still be
      // settling their measured size right after this first pass — a
      // second call next frame corrects any small overshoot/undershoot
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(lastIndex, { align: "end" });
      });
    } else if (action?.type === "prepend") {
      // keep the same message visually anchored after older ones are added above it
      el.scrollTop = el.scrollHeight - action.prevScrollHeight + action.prevScrollTop;
    } else if (action === "append") {
      if (isNearBottomRef.current) {
        virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
      }
    }
  }, [messages, initialLoading, virtualizer]);

  // handle the seen feature when new messages arrive
  useEffect(() => {
    const handleNewMessage = (incomingMessage) => {
      if (incomingMessage.conversationId !== conversationId) return;

      pendingActionRef.current = "append";
      setMessages((prev) => [...prev, incomingMessage]);

      const incomingSenderId =
        typeof incomingMessage.senderId === "object"
          ? incomingMessage.senderId._id
          : incomingMessage.senderId;

      if (
        incomingSenderId !== user?._id &&
        document.visibilityState === "visible"
      ) {
        markConversationSeen();
      }
    };

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [conversationId, user?._id]);

  // handle a message being unsent — by us (other tab/device) or by the friend
  useEffect(() => {
    const handleMessageDeleted = ({ messageId, conversationId: convId }) => {
      if (convId !== conversationId) return;
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    socket.on("messageDeleted", handleMessageDeleted);
    return () => socket.off("messageDeleted", handleMessageDeleted);
  }, [conversationId]);

  // handle the seen feature during a tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markConversationSeen();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [conversationId]);

  // listen for messagesSeen from the receiver
  useEffect(() => {
    const handleMessagesSeen = ({ conversationId: convId, seenAt }) => {
      if (convId !== conversationId) return;

      setMessages((prev) =>
        prev.map((msg) => {
          const senderId =
            typeof msg.senderId === "object"
              ? msg.senderId._id
              : msg.senderId;

          return senderId === user?._id
            ? { ...msg, seen: true, updatedAt: seenAt }
            : msg;
        })
      );
    };

    socket.on("messagesSeen", handleMessagesSeen);
    return () => socket.off("messagesSeen", handleMessagesSeen);
  }, [conversationId, user?._id]);

  // derive which message gets the "Seen X ago" label
  const lastSeenMessageId = [...messages]
    .reverse()
    .find((msg) => {
      const senderId =
        typeof msg.senderId === "object"
          ? msg.senderId._id
          : msg.senderId;
      return senderId === user?._id && msg.seen === true;
    })?._id;

  // typing indicator: listen
  useEffect(() => {
    const handleTypingEvent = ({ senderId, conversationId: convId }) => {
      if (convId === conversationId && senderId === friend?._id) {
        setIsFriendTyping(true);
      }
    };

    const handleStopTypingEvent = ({ senderId, conversationId: convId }) => {
      if (convId === conversationId && senderId === friend?._id) {
        setIsFriendTyping(false);
      }
    };

    socket.on("typing", handleTypingEvent);
    socket.on("stopTyping", handleStopTypingEvent);

    return () => {
      socket.off("typing", handleTypingEvent);
      socket.off("stopTyping", handleStopTypingEvent);
    };
  }, [conversationId, friend?._id]);

  useEffect(() => {
    return () => clearTimeout(typingTimeoutRef.current);
  }, []);

  const handleTyping = (e) => {
    setMessage(e.target.value);

    socket.emit("typing", {
      senderId: user._id,
      receiverId: friend?._id,
      conversationId,
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", {
        senderId: user._id,
        receiverId: friend?._id,
        conversationId,
      });
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!message.trim() && selectedImages.length === 0) return;
    if (sendingImage) return; // guard against double-fires while an upload is in flight

    const isImageSend = selectedImages.length > 0;

    try {
      const token = localStorage.getItem("authToken");
      const url = `http://localhost:4000/message/${conversationId}`;

      clearTimeout(typingTimeoutRef.current);
      socket.emit("stopTyping", { senderId: user._id, receiverId: friend?._id, conversationId });

      let response;

      if (isImageSend) {
        setSendingImage(true);
        const formData = new FormData();
        selectedImages.forEach(({ file }) => formData.append("images", file));
        if (message.trim()) formData.append("message", message.trim());

        response = await axios.post(url, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        });
      } else {
        response = await axios.post(url, { message }, { headers: { Authorization: `Bearer ${token}` } });
      }

      if (response.status === 201) {
        pendingActionRef.current = "append";
        setMessages((prev) => [...prev, response.data.data]);
        setMessage("");
        clearSelectedImages();
        messageInputRef.current?.focus();
      } else {
        toast.error("Error sending message");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      if (isImageSend) setSendingImage(false);
    }
  };

  // unsend a message — sender-only, enforced again server-side. Removes it
  // outright from local state; the server recomputes the conversation's
  // preview and notifies the friend over the socket.
  const handleDeleteMessage = async (messageId) => {
    // optimistic — remove immediately, roll back if the request fails
    const previousMessages = messages;
    setMessages((prev) => prev.filter((msg) => msg._id !== messageId));

    try {
      const token = localStorage.getItem("authToken");
      await axios.delete(`http://localhost:4000/message/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      setMessages(previousMessages);
      toast.error("Could not unsend message");
    }
  };

  return (
    <div className="messageDisplay hidden md:block relative md:w-[65%] lg:w-[70%] h-full bg-[var(--bg-app)]">

      <div className="reciverDetails w-full h-[85px] flex border-b border-[var(--border-soft)]">

        <div className="messageCard w-[70%] lg:w-[50%] h-full flex justify-center items-center cursor-pointer">

          <div className="profilePicSection w-[20%] h-full flex justify-center items-center">
            <div className="profilePic w-[50px] h-[50px] lg:w-[70px] lg:h-[70px] rounded-full overflow-hidden">
              <img src={friend?.profilePic ? friend.profilePic : "/images/default-profile-pic.jpg" } alt="" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="messageDetails w-[80%] h-full">
            <div className="fullname w-full h-[50%] flex justify-start items-end text-[var(--text-primary)] text-[15px] lg:text-[18px]">
              <span className="ml-2">{friend?.fullname}</span>
            </div>
            <div className="lastMsg w-full h-[50%] flex justify-start items-start text-[12px] lg:text-[14px]">
              <span className={`ml-2 ${isFriendOnline ? "text-green-500" : "text-[var(--text-muted)]"}`}>
                {activeStatusText}
              </span>
            </div>
          </div>

        </div>

        <div className="profileInfoBtnSection flex-1 h-full flex justify-end items-center">
          <div className="btn w-[35px] h-[35px] mr-4 overflow-hidden">
            <img src="/images/info-icon.png" alt="" className="w-full h-full" />
          </div>
        </div>

      </div>

      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="chatContainer no-scrollbar w-full h-[calc(100vh-165px)] transition-all duration-1000 ease-in-out overflow-y-auto"
      >

        <div className="viewProfileSection w-full h-[250px] flex flex-col justify-center items-center">

          <div className="profilePicSection w-full h-[120px] flex justify-center items-center">
            <div className="profilePic w-[80px] h-[80px] lg:w-[100px] lg:h-[100px] rounded-full overflow-hidden">
              <img src={friend?.profilePic ? friend.profilePic : "/images/default-profile-pic.jpg"} alt="" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="namesSection w-full h-[60px]">
            <div className="fullname w-full h-[50%] flex justify-center items-center text-[var(--text-primary)] text-[20px] lg:text-[24px]">
              <span>{friend?.fullname}</span>
            </div>
            <div className="username w-full h-[50%] flex justify-center items-center text-[var(--text-muted)] text-[14px] lg:text-[18px]">
              <span>{friend?.username}</span>
            </div>
          </div>

          <div className="viewProfileBtn mt-2 w-[150px] h-[40px] flex justify-center items-center">
            <Link to={`/user/get-profile/${friend?._id}`}>
              <button className='w-[100px] sm:w-[150px] h-[40px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-menu-hover)] cursor-pointer text-[var(--text-primary)] text-[14px] sm:text-[16px] font-bold rounded-xl'>
                View Profile
              </button>
            </Link>
          </div>

        </div>

        {/* fixed height regardless of loading state, so it never shifts
            the measured offset of the virtualized list below it */}
        <div className="h-[32px] w-full flex items-center justify-center text-[var(--text-muted)] text-xs">
          {isLoadingOlder && "Loading earlier messages..."}
        </div>

        {initialLoading ? (
          <div className="w-full h-[100px] flex items-center justify-center text-[var(--text-muted)] text-sm">
            Loading conversation...
          </div>
        ) : (
          <div
            ref={listStartRef}
            className="Chat w-full"
            style={{ position: "relative", height: `${virtualizer.getTotalSize()}px` }}
          >
            {virtualItems.map((virtualRow) => {
              const msg = messages[virtualRow.index];
              if (!msg) return null;

              return (
                <div
                  key={msg._id}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                  }}
                >
                  <MessageBox
                    message={msg}
                    showSeen={msg._id === lastSeenMessageId}
                    onDelete={handleDeleteMessage}
                  />
                </div>
              );
            })}
          </div>
        )}

        {isFriendTyping && (
          <div className=" w-full h-[30px] px-4 pb-1 my-4 text-[var(--text-muted)] text-[18px]">
            Typing...
          </div>
        )}

      </div>

      <div className="footer absolute bottom-0 left-0 w-full flex flex-col justify-center px-2 pb-2">

        {selectedImages.length > 0 && (
          <div className="imagePreview w-[98%] mx-auto mb-2 flex items-center gap-4 bg-[var(--bg-elevated)] rounded-2xl p-3">

            {/* tilted fanned stack of selected images */}
            <div className="flex items-center pl-3">
              {selectedImages.map((img, idx) => {
                const rotations = [-8, 5, -4, 7]; // fixed tilt per slot, alternating
                return (
                  <div
                    key={img.id}
                    style={{
                      transform: `rotate(${rotations[idx % rotations.length]}deg)`,
                      marginLeft: idx === 0 ? 0 : "-18px",
                      zIndex: idx,
                    }}
                    className="relative w-[56px] h-[56px] shrink-0 rounded-lg overflow-hidden border-2 border-[var(--bg-elevated)] shadow-md hover:z-10 hover:scale-105 transition-transform"
                  >
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />

                    {sendingImage && (
                      <div className="absolute inset-0 bg-black/50 flex justify-center items-center">
                        <div className="w-[16px] h-[16px] border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      </div>
                    )}

                    {!sendingImage && (
                      <button
                        onClick={() => removeSelectedImage(img.id)}
                        className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-black/80 rounded-full flex justify-center items-center text-white text-[12px] cursor-pointer hover:bg-black"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <span className="text-[var(--text-muted)] text-[13px]">
              {selectedImages.length}/{MAX_IMAGES} selected
            </span>

            <button
              onClick={clearSelectedImages}
              disabled={sendingImage}
              className="ml-auto text-[var(--text-primary)] text-[13px] px-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:text-[var(--text-muted)]"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="messageBar w-[98%] mx-auto h-[55px] rounded-3xl flex border border-[var(--border-input)] overflow-hidden">

          <div className="emojiSection w-[12%] sm:w-[8%] md:w-[6%] flex justify-center items-center">
            <Smile size={28} className="text-[var(--text-primary)] cursor-pointer" />
          </div>

          <div className="messageInput flex-1 h-full">
            <input
              type="text"
              name="message"
              id="message"
              value={message}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  handleSendMessage();
                }
              }}
              ref={messageInputRef}
              className="w-full h-full outline-none text-[var(--text-primary)] text-[16px] lg:text-[18px] px-4 bg-transparent"
              placeholder="Message..."
            />
          </div>

          <div className="gllerySection w-[15%] sm:w-[12%] md:w-[10%] h-full flex justify-center items-center gap-2">
            <div onClick={handleSendMessage} className="send w-[40%] h-[80%] flex justify-center items-center ">
              <Send size={24} fill='' className="cursor-pointer text-[var(--text-primary)]" />
            </div>
            <div
              onClick={() => selectedImages.length < MAX_IMAGES && fileInputRef.current?.click()}
              className={`gallery w-[30%] h-full flex justify-center items-center ${
                selectedImages.length >= MAX_IMAGES ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <Image size={24} fill='' className="cursor-pointer text-[var(--text-primary)]" />
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

        </div>

      </div>

    </div>
  )
}

export default Chat