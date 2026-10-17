import React, { useState, useEffect, useRef } from "react";
import { Search, X, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useDebounce } from "../hooks/useDebounce";
import { useTheme } from "../context/ThemeContext";

const BASE_URL = import.meta.env.VITE_SERVER_URL

const MAX_TAGS = 20;

const TagPeoplePicker = ({ selected, onChange, onClose }) => {
  const { isDevs } = useTheme();
  const [query, setQuery] = useState("");
  const [suggested, setSuggested] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 350);
  const inputRef = useRef(null);
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    inputRef.current?.focus();
    fetch(`${BASE_URL}/post/suggested-tag-users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setSuggested(data.users || []))
      .catch(() => setSuggested([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!q) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);

    fetch(`${BASE_URL}/post/search-users?q=${encodeURIComponent(q)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setResults(data.users || []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, token]);

  const isSelected = (id) => selected.some((u) => u._id === id);

  const toggleUser = (u) => {
    if (isSelected(u._id)) {
      onChange(selected.filter((s) => s._id !== u._id));
    } else {
      if (selected.length >= MAX_TAGS) return;
      onChange([...selected, u]);
    }
  };

  const list = query.trim() ? results : suggested;

  return (
    <motion.div
      {...(isDevs
        ? {
            initial: { opacity: 0, x: 30 },
            animate: { opacity: 1, x: 0 },
            transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] },
          }
        : {})}
      className="absolute inset-0 z-40 bg-[var(--bg-surface)] flex flex-col devs:bg-[rgba(8,10,28,0.96)] devs:backdrop-blur-xl"
    >
      <div className="flex items-center gap-3 px-4 h-[50px] flex-shrink-0 border-b border-[var(--border-soft)]">
        <button onClick={onClose} type="button" className="text-[var(--text-primary)] devs:hover:text-[var(--devs-cyan)] devs:transition-colors">
          <X size={20} />
        </button>
        <div className="font-semibold text-[var(--text-primary)] text-[15px] devs:font-mono devs:uppercase devs:tracking-[0.2em] devs:text-[12px]">
          Tag People
        </div>
        {selected.length > 0 && (
          <button
            onClick={onClose}
            type="button"
            className="ml-auto text-[var(--accent-blue)] text-sm hover:underline devs:no-underline devs:font-mono devs:uppercase devs:tracking-wider devs:text-[11px] devs:font-bold devs:px-3 devs:py-1 devs:rounded-full devs:bg-[linear-gradient(120deg,#22f0ff,#8b5cf6)] devs:text-[#04050e] devs:shadow-[0_0_14px_rgba(34,240,255,0.45)]"
          >
            Done
          </button>
        )}
      </div>

      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-lg px-3 h-[38px] devs:rounded-xl devs:bg-[var(--bg-input)] devs:border devs:border-[var(--border-input)] devs:transition-all devs:focus-within:border-[var(--devs-cyan)] devs:focus-within:shadow-[0_0_18px_rgba(34,240,255,0.25)]">
          <Search size={16} className="text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] devs:font-mono devs:text-[13px]"
          />
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2 flex-shrink-0">
          {selected.map((u) => (
            <motion.div
              key={u._id}
              {...(isDevs
                ? {
                    initial: { opacity: 0, scale: 0.8 },
                    animate: { opacity: 1, scale: 1 },
                    transition: { type: "spring", stiffness: 420, damping: 24 },
                  }
                : {})}
              className="flex items-center gap-1.5 bg-[var(--bg-elevated)] rounded-full pl-1 pr-2 py-1 devs:border devs:border-[var(--devs-cyan)] devs:shadow-[0_0_12px_rgba(34,240,255,0.3)]"
            >
              <img
                src={u.profilePic || "/images/default-profile-pic.jpg"}
                className="w-5 h-5 rounded-full object-cover"
                alt=""
              />
              <span className="text-xs text-[var(--text-primary)] devs:font-mono">{u.username}</span>
              <X
                size={12}
                className="text-[var(--text-muted)] cursor-pointer devs:hover:text-[var(--devs-cyan)]"
                onClick={() => toggleUser(u)}
              />
            </motion.div>
          ))}
        </div>
      )}

      {!query.trim() && suggested.length > 0 && (
        <div className="px-4 pt-1 pb-1 text-xs font-semibold text-[var(--text-muted)] flex-shrink-0 devs:font-mono devs:uppercase devs:tracking-[0.2em] devs:text-[10px]">
          Suggested
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 min-h-0">
        {loading && (
          <div className="text-center text-xs text-[var(--text-muted)] py-3 devs:font-mono">
            {isDevs && <span className="text-[var(--devs-cyan)] mr-2">&gt;</span>}
            Searching...
          </div>
        )}
        {!loading &&
          list.map((u) => (
            <div
              key={u._id}
              onClick={() => toggleUser(u)}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer hover:bg-[var(--bg-elevated)] devs:rounded-xl devs:hover:bg-[var(--bg-row-hover)] devs:transition-all devs:hover:shadow-[inset_2px_0_0_var(--devs-cyan)]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={u.profilePic || "/images/default-profile-pic.jpg"}
                  className="w-9 h-9 rounded-full object-cover shrink-0 devs:ring-2 devs:ring-[var(--devs-violet)]"
                  alt=""
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate devs:font-bold">
                    {u.username}
                  </div>
                  {u.fullname && (
                    <div className="text-xs text-[var(--text-muted)] truncate devs:font-mono devs:text-[11px]">{u.fullname}</div>
                  )}
                </div>
              </div>
              {isSelected(u._id) && (
                <div className="w-5 h-5 rounded-full bg-[var(--accent-blue)] flex items-center justify-center shrink-0 devs:bg-[linear-gradient(135deg,#22f0ff,#8b5cf6)] devs:shadow-[0_0_10px_rgba(34,240,255,0.7)]">
                  <Check size={12} color={isDevs ? "#04050e" : "white"} />
                </div>
              )}
            </div>
          ))}
        {!loading && query.trim() && list.length === 0 && (
          <div className="text-center text-xs text-[var(--text-muted)] py-6 devs:font-mono">No users found</div>
        )}
      </div>
    </motion.div>
  );
};

export default TagPeoplePicker;