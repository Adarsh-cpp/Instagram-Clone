import React, { useState, useEffect, useRef } from "react";
import { Search, X, Check } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";

const BASE_URL = import.meta.env.VITE_SERVER_URL

const MAX_TAGS = 20;

const TagPeoplePicker = ({ selected, onChange, onClose }) => {
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
    <div className="absolute inset-0 z-40 bg-[var(--bg-surface)] flex flex-col">
      <div className="flex items-center gap-3 px-4 h-[50px] flex-shrink-0 border-b border-[var(--border-soft)]">
        <button onClick={onClose} type="button" className="text-[var(--text-primary)]">
          <X size={20} />
        </button>
        <div className="font-semibold text-[var(--text-primary)] text-[15px]">Tag People</div>
        {selected.length > 0 && (
          <button
            onClick={onClose}
            type="button"
            className="ml-auto text-[var(--accent-blue)] text-sm hover:underline"
          >
            Done
          </button>
        )}
      </div>

      <div className="px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] rounded-lg px-3 h-[38px]">
          <Search size={16} className="text-[var(--text-muted)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 pb-2 flex-shrink-0">
          {selected.map((u) => (
            <div
              key={u._id}
              className="flex items-center gap-1.5 bg-[var(--bg-elevated)] rounded-full pl-1 pr-2 py-1"
            >
              <img
                src={u.profilePic || "/images/default-profile-pic.jpg"}
                className="w-5 h-5 rounded-full object-cover"
                alt=""
              />
              <span className="text-xs text-[var(--text-primary)]">{u.username}</span>
              <X
                size={12}
                className="text-[var(--text-muted)] cursor-pointer"
                onClick={() => toggleUser(u)}
              />
            </div>
          ))}
        </div>
      )}

      {!query.trim() && suggested.length > 0 && (
        <div className="px-4 pt-1 pb-1 text-xs font-semibold text-[var(--text-muted)] flex-shrink-0">
          Suggested
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 min-h-0">
        {loading && (
          <div className="text-center text-xs text-[var(--text-muted)] py-3">Searching...</div>
        )}
        {!loading &&
          list.map((u) => (
            <div
              key={u._id}
              onClick={() => toggleUser(u)}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer hover:bg-[var(--bg-elevated)]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={u.profilePic || "/images/default-profile-pic.jpg"}
                  className="w-9 h-9 rounded-full object-cover shrink-0"
                  alt=""
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {u.username}
                  </div>
                  {u.fullname && (
                    <div className="text-xs text-[var(--text-muted)] truncate">{u.fullname}</div>
                  )}
                </div>
              </div>
              {isSelected(u._id) && (
                <div className="w-5 h-5 rounded-full bg-[var(--accent-blue)] flex items-center justify-center shrink-0">
                  <Check size={12} color="white" />
                </div>
              )}
            </div>
          ))}
        {!loading && query.trim() && list.length === 0 && (
          <div className="text-center text-xs text-[var(--text-muted)] py-6">No users found</div>
        )}
      </div>
    </div>
  );
};

export default TagPeoplePicker;