// ExplorePage.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from "axios"
import IconSidebar from '../components/IconSidebar'
import FollowingSuggestionCard from '../components/FollowingSuggestionCard'
import ExplorePostCard from '../components/ExplorePostCard'
import { useTheme } from '../context/ThemeContext'


const BASE_URL = import.meta.env.VITE_SERVER_URL

// Wait this long after the last keystroke before calling the AI search.
// The backend rate-limits search, so don't fire on every character.
const SEARCH_DEBOUNCE_MS = 600
const MIN_SEARCH_LENGTH = 2

const ExplorePage = () => {

    const { isDevs } = useTheme()

    const [posts, setPosts] = useState([])
    const [users, setUsers] = useState([])
    const [searchQuery, setSearchQuery] = useState("")
    const [filteredUsers, setFilteredUsers] = useState([])

    // ---- post search (AI) state ----
    const [postQuery, setPostQuery] = useState("")
    const [searchedPosts, setSearchedPosts] = useState(null) // null = not searching, show normal grid
    const [activeQuery, setActiveQuery] = useState("")       // the query the current results belong to
    const [isSearching, setIsSearching] = useState(false)
    const [searchError, setSearchError] = useState("")
    const [semanticUsed, setSemanticUsed] = useState(false)

    const requestIdRef = useRef(0)   // ignores out-of-date responses
    const debounceRef = useRef(null)


    useEffect(() => {
        const fetchAllPosts = async () => {
        try {
            const url = `${BASE_URL}/post/get-all-posts`
            const response = await axios.get(url)
            if(response.status === 200){
                setPosts(response.data.posts)
            }
        } catch (error) {
            console.log(error.message)
        }
        }
    fetchAllPosts()
    }, [])
   

useEffect(() => {
const fetchAllUsers = async () => {
try {
       const token = localStorage.getItem("authToken")
   const url = `${BASE_URL}/user/profile/get-all-profiles`
   const response = await axios.get(url, {
        headers: {
            Authorization: `Bearer ${token}`
        }
        });
    if(response.status === 200){
        setUsers(response.data.users)
        setFilteredUsers(response.data.users)
    } 
} catch (error) {
    console.log(error.message)
}
}
fetchAllUsers()
}, [])

// Search functionality
useEffect(() => {
    if (searchQuery.trim() === "") {
        setFilteredUsers(users)
    } else {
        const query = searchQuery.toLowerCase()
        const filtered = users.filter(user => 
            user.username?.toLowerCase().includes(query) ||
            user.fullname?.toLowerCase().includes(query)
        )
        setFilteredUsers(filtered)
    }
}, [searchQuery, users])


// ---- AI post search ----
const runPostSearch = useCallback(async (rawQuery) => {
    const q = rawQuery.trim()
    const requestId = ++requestIdRef.current

    // Too short: go back to the normal grid.
    if (q.length < MIN_SEARCH_LENGTH) {
        setSearchedPosts(null)
        setActiveQuery("")
        setIsSearching(false)
        setSearchError("")
        setSemanticUsed(false)
        return
    }

    setIsSearching(true)
    setSearchError("")

    try {
        const token = localStorage.getItem("authToken")
        const response = await axios.get(`${BASE_URL}/post/search`, {
            params: { q, type: "posts", limit: 30 },
            headers: { Authorization: `Bearer ${token}` },
        })

        if (requestId !== requestIdRef.current) return // a newer search replaced this one

        setSearchedPosts(response.data.posts || [])
        setActiveQuery(q)
        setSemanticUsed(Boolean(response.data.semanticUsed))
    } catch (error) {
        if (requestId !== requestIdRef.current) return

        setSearchedPosts([])
        setActiveQuery(q)
        setSemanticUsed(false)
        setSearchError(
            error.response?.status === 429
                ? "Too many searches. Please wait a moment and try again."
                : "Search failed. Please try again."
        )
    } finally {
        if (requestId === requestIdRef.current) setIsSearching(false)
    }
}, [])

const handlePostQueryChange = (e) => {
    const value = e.target.value
    setPostQuery(value)

    clearTimeout(debounceRef.current)

    if (value.trim().length < MIN_SEARCH_LENGTH) {
        runPostSearch(value) // resets to the normal grid right away
        return
    }

    debounceRef.current = setTimeout(() => runPostSearch(value), SEARCH_DEBOUNCE_MS)
}

const handlePostQueryKeyDown = (e) => {
    if (e.key === "Enter") {
        clearTimeout(debounceRef.current)
        runPostSearch(postQuery)
    }
}

const clearPostSearch = () => {
    clearTimeout(debounceRef.current)
    setPostQuery("")
    runPostSearch("")
}

useEffect(() => () => clearTimeout(debounceRef.current), [])

const displayPosts = searchedPosts ?? posts
const isSearchActive = searchedPosts !== null || isSearching
const showEmptyResults = searchedPosts !== null && searchedPosts.length === 0 && !isSearching

let statusText = ""
if (isSearching) {
    statusText = "Searching..."
} else if (searchError) {
    statusText = searchError
} else if (searchedPosts !== null) {
    const count = searchedPosts.length
    statusText = `${count} result${count === 1 ? "" : "s"} for “${activeQuery}”`
}


   
    return (
    <div className="explorePage w-screen h-screen bg-[var(--bg-app)] flex flex-col md:flex-row text-[var(--text-primary)] overflow-hidden">
      <IconSidebar />


      {/* On mobile this section is a fixed-height flex column so its two children
          (post grid + suggestions) can each scroll independently, instead of the
          page just growing until every post has rendered before you ever reach
          the suggestions list. Desktop (md:flex-row) is untouched. */}
      <div className="exploreSection w-full md:w-[80%] flex-1 min-h-0 md:flex-none md:h-full flex flex-col md:flex-row overflow-hidden md:overflow-visible">


       {/* Left column: post search bar on top, grid (or search results) below.
           The width/height classes moved here from the grid so the search bar
           can sit above it without changing the overall layout. */}
       <div className="exploreMain w-full md:w-[70%] lg:w-[65%] h-[50vh] md:h-full min-h-0 flex flex-col bg-[var(--bg-app)]">

        {/* Post Search Bar */}
        <div className="postSearchSection w-full shrink-0 px-2 pt-2 pb-1 devs:px-2 devs:pt-2">
          <div className="postSearchContainer w-full h-[40px] bg-[var(--bg-elevated)] rounded-lg flex items-center px-3 border border-[var(--border-soft)] focus-within:border-[var(--brand-blue)] transition-colors devs:rounded-xl devs:bg-[var(--bg-input)] devs:border-[var(--border-input)] devs:focus-within:border-[var(--devs-cyan)] devs:focus-within:shadow-[0_0_18px_rgba(34,240,255,0.25)]">
            <svg
              className="w-5 h-5 text-[var(--text-muted)] mr-2 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              aria-label="Search posts"
              placeholder="Search posts, e.g. “red dress in the rain”"
              value={postQuery}
              onChange={handlePostQueryChange}
              onKeyDown={handlePostQueryKeyDown}
              maxLength={200}
              className="w-full min-w-0 bg-transparent text-[var(--text-primary)] text-sm border-0 outline-none shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none placeholder-[var(--text-muted)] devs:font-mono devs:text-[13px]"
            />
            {isSearching && (
              <span
                aria-hidden="true"
                className="ml-2 w-4 h-4 shrink-0 rounded-full border-2 border-[var(--text-muted)] border-t-transparent animate-spin devs:border-[var(--devs-cyan)] devs:border-t-transparent"
              />
            )}
            {postQuery && (
              <button
                onClick={clearPostSearch}
                aria-label="Clear post search"
                className="ml-2 shrink-0 text-[var(--text-muted)] hover:text-[var(--text-primary)] devs:hover:text-[var(--devs-cyan)] transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Status line (only while a search is active) */}
          {isSearchActive && (
            <div
              role="status"
              aria-live="polite"
              className={`searchStatus w-full flex items-center gap-2 px-1 pt-1.5 text-[12px] devs:font-mono devs:text-[11px] ${
                searchError ? "text-red-500" : "text-[var(--text-muted)]"
              }`}
            >
              <span className="truncate">{statusText}</span>
              {semanticUsed && !isSearching && !searchError && (
                <span className="shrink-0 text-[10px] font-semibold leading-none px-1.5 py-[3px] rounded border border-[var(--brand-blue)] text-[var(--brand-blue)] devs:border-[var(--devs-cyan)] devs:text-[var(--devs-cyan)]">
                  AI
                </span>
              )}
            </div>
          )}
        </div>

        {showEmptyResults ? (
          <div className="exploreContainer w-full flex-1 min-h-0 flex flex-col justify-center items-center text-center gap-1 px-6 text-[var(--text-muted)] text-sm devs:font-mono bg-[var(--bg-app)]">
            <span>
              {isDevs && <span className="text-[var(--devs-cyan)] mr-2">&gt;</span>}
              {searchError ? "Something went wrong" : `No posts match “${activeQuery}”`}
            </span>
            {!searchError && (
              <span className="text-[12px]">
                Try describing what's in the photo, like “sunset at the beach”.
              </span>
            )}
          </div>
        ) : (
          <div
            className={`exploreContainer w-full flex-1 min-h-0 grid grid-cols-3 auto-rows-[110px] xs:auto-rows-[130px] sm:auto-rows-[160px] md:auto-rows-[200px] lg:auto-rows-[250px] gap-[2px] devs:gap-2 devs:p-2 overflow-y-auto hide-scrollbar bg-[var(--bg-app)] transition-opacity ${
              isSearching ? "opacity-60" : "opacity-100"
            }`}
          >
            {displayPosts.map((post, index) => {
              const group = Math.floor(index / 5);
              const position = index % 5;


              let className = "";


              if (
                (group % 2 === 0 && position === 2) || // right
                (group % 2 === 1 && position === 0)    // left
              ) {
                className = "row-span-2";
              }


              return (
                <div key={post._id} className={className}>
                  <ExplorePostCard post={post} users={users} />
                </div>
              );
            })}
          </div>
        )}

       </div>


<div className="followingSuggestions w-full md:w-[30%] lg:w-[35%] flex-1 min-h-0 md:flex-none md:h-full flex flex-col overflow-y-auto bg-[var(--bg-app)] border-t md:border-t-0 md:border-l border-[var(--border-soft)] devs:backdrop-blur-xl devs:border-[var(--border-popup)]">


  <div className="heading w-full h-[60px] shrink-0 flex justify-center items-center text-[14px] font-semibold text-center px-2">
    {isDevs ? (
      <span className="flex flex-col items-center gap-1">
        <span
          className="devs-text-gradient font-extrabold text-[20px] leading-none tracking-tight"
          style={{ fontFamily: "var(--devs-font-display)" }}
        >
          Explore
        </span>
        <span className="font-mono text-[9px] font-normal uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Find friends and accounts that you like
        </span>
      </span>
    ) : (
      "Find friends and accounts that you like"
    )}
  </div>


  {/* Search Bar */}
  <div className="searchSection w-full shrink-0 px-3 py-2">
    <div className="searchContainer w-full h-[40px] bg-[var(--bg-elevated)] rounded-lg flex items-center px-3 border border-[var(--border-soft)] focus-within:border-[var(--brand-blue)] transition-colors devs:rounded-xl devs:bg-[var(--bg-input)] devs:border-[var(--border-input)] devs:focus-within:border-[var(--devs-cyan)] devs:focus-within:shadow-[0_0_18px_rgba(34,240,255,0.25)]">
      <svg 
        className="w-5 h-5 text-[var(--text-muted)] mr-2" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
        />
      </svg>
      <input
        type="text"
        placeholder="Search users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full bg-transparent text-[var(--text-primary)] text-sm border-0 outline-none shadow-none focus:border-0 focus:outline-none focus:ring-0 focus:shadow-none placeholder-[var(--text-muted)] devs:font-mono devs:text-[13px]"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery("")}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] devs:hover:text-[var(--devs-cyan)] transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path 
              fillRule="evenodd" 
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
        </button>
      )}
    </div>
  </div>


  {/* Suggestions List */}
  <div className="suggestionsList w-full flex flex-wrap justify-start items-start content-start p-2">
    {filteredUsers?.length > 0 ? (
      filteredUsers.map((user) => (
        <FollowingSuggestionCard
          key={user._id}
          suggestedUserId={user._id}
          user={user}
        />
      ))
    ) : (
      <div className="w-full flex justify-center items-center py-8 text-[var(--text-muted)] text-sm devs:font-mono">
        {isDevs && <span className="text-[var(--devs-cyan)] mr-2">&gt;</span>}
        No users found
      </div>
    )}
  </div>


</div>


      </div>
    </div>
  )
}


export default ExplorePage