// InstaAIChat.jsx
//
// The ✨ InstaAI assistant panel. Deliberately self-contained: it is NOT a
// real conversation, so it never touches conversationModel, socket.io, the
// message list, seen receipts or typing events. It sits in the same slot
// Chat.jsx normally occupies so the messages page layout is unchanged.
//
// Multi-turn context is preserved by sending the recent history along with
// every request — see sendAiChatMessage in api/aiApi.js.

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, ArrowLeft, Sparkles, RotateCw, Trash2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import ChatThemeFx from "./devs/ChatThemeFx";
import { sendAiChatMessage, getAiErrorMessage } from "../api/aiApi";

const STORAGE_PREFIX = "instaAiChat:";
const MAX_STORED_MESSAGES = 60;

const SUGGESTIONS = [
  "Give me ideas for my next Instagram post",
  "Write 5 hashtags for a travel photo",
  "How do I make my profile look more professional?",
];

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const DEVS_AI_RING = {
  background: "conic-gradient(from var(--devs-angle), #22f0ff, #8b5cf6, #ff2bd6, #22f0ff)",
  boxShadow: "0 0 24px rgba(139,92,246,0.5)",
};

const InstaAIChat = () => {
  const { user } = useAuth();
  const { isDevs, lite } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState("");

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const storageKey = user?._id ? `${STORAGE_PREFIX}${user._id}` : null;

  // restore the previous session so navigating away and back doesn't wipe
  // the conversation (and therefore the AI's context)
  useEffect(() => {
    if (!storageKey) return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      // corrupt entry — start fresh rather than crashing the page
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(messages.slice(-MAX_STORED_MESSAGES))
      );
    } catch {
      // quota full / private mode — history just won't persist
    }
  }, [messages, storageKey]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  // scroll-to-latest on every new message and when the typing dots appear
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  const handleBack = () => {
    if (location.key && location.key !== "default") {
      navigate(-1);
    } else {
      navigate("/user/messages", { replace: true });
    }
  };

  const requestReply = useCallback(async (history) => {
    setIsThinking(true);
    setError("");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const reply = await sendAiChatMessage({
        messages: history,
        signal: controller.signal,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          content: reply,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      const message = getAiErrorMessage(
        err,
        "Unable to get a reply. Please try again."
      );
      if (message) setError(message);
    } finally {
      setIsThinking(false);
    }
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isThinking) return;

    const userMessage = {
      id: makeId(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    // the user's message shows immediately, before the network call
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    inputRef.current?.focus();

    requestReply(nextMessages);
  };

  // Retry re-sends the exact same history, so context is unaffected by the
  // previous failure.
  const handleRetry = () => {
    if (isThinking || messages.length === 0) return;
    requestReply(messages);
  };

  const handleClear = () => {
    abortRef.current?.abort();
    setMessages([]);
    setError("");
    setIsThinking(false);
    if (storageKey) localStorage.removeItem(storageKey);
  };

  const handleSuggestion = (text) => {
    if (isThinking) return;

    const userMessage = {
      id: makeId(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    requestReply(nextMessages);
  };

  // gradient ring around the AI avatar: spins in Devs Mode (static on lite devices)
  const aiAvatarStyle = isDevs
    ? { ...DEVS_AI_RING, animation: lite ? "none" : "devs-spin 5s linear infinite" }
    : undefined;

  return (
    <div className="messageDisplay relative isolate flex md:flex flex-col w-full md:w-[65%] lg:w-[70%] h-[100dvh] md:h-full bg-[var(--bg-app)] overflow-hidden">

      {/* Devs Mode: slow aurora behind the whole conversation */}
      {isDevs && <ChatThemeFx fx="aurora" />}

      {/* header — mirrors Chat.jsx's header dimensions so the layout does
          not shift when switching between a DM and InstaAI */}
      <div className="reciverDetails w-full h-[64px] md:h-[85px] shrink-0 flex items-center border-b border-[var(--border-soft)] devs:bg-[var(--bg-panel)] devs:backdrop-blur-xl">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to messages"
          className="backBtn md:hidden w-[44px] h-full flex-shrink-0 flex justify-center items-center"
        >
          <ArrowLeft size={22} color="var(--text-primary)" />
        </button>

        <div className="flex-1 min-w-0 h-full flex items-center gap-2 px-2">
          <div
            className={`w-[40px] h-[40px] md:w-[52px] md:h-[52px] lg:w-[64px] lg:h-[64px] shrink-0 rounded-full flex items-center justify-center ${
              isDevs ? "" : "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500"
            }`}
            style={aiAvatarStyle}
          >
            <Sparkles size={20} color="white" />
          </div>

          <div className="min-w-0 flex flex-col justify-center">
            <div className={`text-[var(--text-primary)] text-[15px] lg:text-[18px] truncate ${isDevs ? "devs-text-gradient font-bold" : ""}`}>
              InstaAI
            </div>
            <div className="text-[12px] lg:text-[14px] truncate text-[var(--text-muted)] devs:font-mono devs:text-[11px]">
              {isThinking ? "Typing..." : "AI assistant"}
            </div>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear conversation"
            className="w-[36px] h-[36px] mr-3 md:mr-4 flex items-center justify-center cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-primary)] devs:hover:text-[var(--devs-cyan)]"
          >
            <Trash2 size={19} />
          </button>
        )}
      </div>

      {/* messages */}
      <div
        ref={scrollRef}
        className="chatContainer no-scrollbar flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden px-3 sm:px-4 py-4"
      >
        {messages.length === 0 && !isThinking ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center px-4">
            <div
              className={`w-[76px] h-[76px] rounded-full flex items-center justify-center mb-4 ${
                isDevs ? "" : "bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500"
              }`}
              style={aiAvatarStyle}
            >
              <Sparkles size={34} color="white" />
            </div>

            <div
              className={`text-[var(--text-primary)] text-[20px] sm:text-[22px] mb-1 ${isDevs ? "devs-text-gradient font-extrabold" : ""}`}
              style={isDevs ? { fontFamily: "var(--devs-font-display)" } : undefined}
            >
              InstaAI
            </div>
            <div className="text-[var(--text-muted)] text-[14px] max-w-[300px] mb-6 devs:font-mono devs:text-[12px]">
              Ask for post ideas, captions, hashtags or anything else.
            </div>

            <div className="w-full max-w-[380px] flex flex-col gap-2">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s}
                  type="button"
                  {...(isDevs
                    ? {
                        initial: { opacity: 0, y: 12 },
                        animate: { opacity: 1, y: 0 },
                        transition: { delay: 0.1 + i * 0.08 },
                        whileHover: { x: 4 },
                        whileTap: { scale: 0.97 },
                      }
                    : {})}
                  onClick={() => handleSuggestion(s)}
                  className="w-full text-left px-4 py-2.5 rounded-2xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-menu-hover)] text-[var(--text-primary)] text-[13px] sm:text-[14px] cursor-pointer transition-colors devs:backdrop-blur-md devs:border devs:border-[var(--border-popup)] devs:font-mono devs:text-[12px] devs:hover:shadow-[0_0_18px_rgba(34,240,255,0.25)]"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => {
              const isUser = msg.role === "user";

              return (
                <motion.div
                  key={msg.id}
                  {...(isDevs
                    ? {
                        initial: { opacity: 0, y: 10, scale: 0.97 },
                        animate: { opacity: 1, y: 0, scale: 1 },
                        transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] },
                      }
                    : {})}
                  className={`w-full flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    style={
                      isDevs
                        ? isUser
                          ? {
                              background: "linear-gradient(135deg,#22f0ff,#8b5cf6)",
                              color: "#04050e",
                              boxShadow: "0 0 18px rgba(34,240,255,0.35)",
                            }
                          : {
                              backgroundColor: "rgba(16,18,44,0.7)",
                              color: "var(--text-primary)",
                              border: "1px solid rgba(139,92,246,0.35)",
                              backdropFilter: "blur(10px)",
                              WebkitBackdropFilter: "blur(10px)",
                            }
                        : {
                            backgroundColor: isUser ? "#3797F0" : "var(--bg-elevated)",
                            color: isUser ? "#FFFFFF" : "var(--text-primary)",
                          }
                    }
                    // whitespace-pre-wrap keeps the line breaks in long,
                    // list-style AI answers; break-words stops a long URL
                    // from blowing out the bubble width
                    className="max-w-[85%] sm:max-w-[75%] md:max-w-[70%] w-fit rounded-3xl px-4 py-2.5 my-1 text-[15px] sm:text-[16px] leading-relaxed whitespace-pre-wrap break-words"
                  >
                    {msg.content}
                  </div>
                </motion.div>
              );
            })}

            {isThinking && (
              <div className="w-full flex justify-start">
                <div className="bg-[var(--bg-elevated)] rounded-3xl px-4 py-3 my-1 flex items-center gap-1.5 devs:backdrop-blur-md devs:border devs:border-[var(--border-popup)]">
                  <span className="w-[7px] h-[7px] rounded-full bg-[var(--text-muted)] devs:bg-[var(--devs-cyan)] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-[7px] h-[7px] rounded-full bg-[var(--text-muted)] devs:bg-[var(--devs-cyan)] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-[7px] h-[7px] rounded-full bg-[var(--text-muted)] devs:bg-[var(--devs-cyan)] animate-bounce" />
                </div>
              </div>
            )}

            {error && !isThinking && (
              <div className="w-full flex justify-start">
                <div className="max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 my-1 bg-[var(--bg-elevated)] border border-[var(--color-error)]/40 devs:backdrop-blur-md">
                  <p className="text-[var(--color-error)] text-[13px] leading-snug devs:font-mono">
                    {isDevs ? "! " : ""}{error}
                  </p>
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="mt-1.5 flex items-center gap-1 text-[13px] text-[var(--accent-blue)] cursor-pointer hover:underline"
                  >
                    <RotateCw size={13} />
                    Retry
                  </button>
                </div>
              </div>
            )}

            <div ref={bottomRef} className="h-1" />
          </>
        )}
      </div>

      {/* composer — same pill shape as the DM input bar */}
      <div className="footer shrink-0 relative w-full flex flex-col justify-center px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <div className="messageBar relative w-[98%] mx-auto h-[48px] sm:h-[55px] rounded-3xl flex items-center border border-[var(--border-input)] bg-[var(--bg-input)] overflow-hidden devs:backdrop-blur-xl devs:transition-shadow devs:focus-within:border-[var(--devs-cyan)] devs:focus-within:shadow-[0_0_24px_rgba(34,240,255,0.25)]">
          <div className="w-[42px] sm:w-[48px] shrink-0 flex justify-center items-center">
            <Sparkles size={20} className="text-[var(--accent-blue)] devs:drop-shadow-[0_0_6px_rgba(34,240,255,0.8)]" />
          </div>

          <div className="flex-1 min-w-0 h-full">
            <input
              type="text"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              maxLength={2000}
              disabled={isThinking}
              placeholder={isThinking ? "InstaAI is typing..." : "Ask InstaAI..."}
              className="w-full h-full outline-none text-[16px] lg:text-[18px] px-2 sm:px-4 bg-transparent text-[var(--text-input)] placeholder-[var(--text-muted)] disabled:opacity-60 devs:font-mono devs:text-[15px]"
            />
          </div>

          <div className="shrink-0 h-full flex justify-center items-center pr-2 sm:pr-3">
            <button
              type="button"
              onClick={handleSend}
              disabled={isThinking || !input.trim()}
              aria-label="Send message"
              className="w-[36px] h-[36px] flex justify-center items-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer devs:hover:scale-110 devs:active:scale-90 devs:transition-transform"
            >
              <Send size={22} className="text-[var(--accent-blue)] devs:drop-shadow-[0_0_8px_rgba(34,240,255,0.8)]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstaAIChat;