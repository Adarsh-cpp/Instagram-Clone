// ExplorePage.jsx
import React, { useEffect, useState } from 'react'
import axios from "axios"
import IconSidebar from '../components/IconSidebar'
import FollowingSuggestionCard from '../components/FollowingSuggestionCard'
import ExplorePostCard from '../components/ExplorePostCard'


const ExplorePage = () => {


    const [posts, setPosts] = useState([])
    const [users, setUsers] = useState([])
    const [searchQuery, setSearchQuery] = useState("")
    const [filteredUsers, setFilteredUsers] = useState([])


    useEffect(() => {
        const fetchAllPosts = async () => {
        try {
            const url = "http://localhost:4000/post/get-all-posts"
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
   const url = "http://localhost:4000/user/profile/get-all-profiles"
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


   
    return (
    <div className="explorePage w-screen h-screen bg-[var(--bg-app)] flex flex-col md:flex-row text-[var(--text-primary)] overflow-hidden">
      <IconSidebar />


      {/* On mobile this section is a fixed-height flex column so its two children
          (post grid + suggestions) can each scroll independently, instead of the
          page just growing until every post has rendered before you ever reach
          the suggestions list. Desktop (md:flex-row) is untouched. */}
      <div className="exploreSection w-full md:w-[80%] flex-1 min-h-0 md:flex-none md:h-full flex flex-col md:flex-row overflow-hidden md:overflow-visible">


       <div className="exploreContainer w-full md:w-[70%] lg:w-[65%] h-[50vh] md:h-full md:min-h-full grid grid-cols-3 auto-rows-[110px] xs:auto-rows-[130px] sm:auto-rows-[160px] md:auto-rows-[200px] lg:auto-rows-[250px] gap-[2px] overflow-y-auto hide-scrollbar bg-[var(--bg-app)]">
  {posts.map((post, index) => {
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


<div className="followingSuggestions w-full md:w-[30%] lg:w-[35%] flex-1 min-h-0 md:flex-none md:h-full flex flex-col overflow-y-auto bg-[var(--bg-app)] border-t md:border-t-0 md:border-l border-[var(--border-soft)]">


  <div className="heading w-full h-[60px] shrink-0 flex justify-center items-center text-[14px] font-semibold text-center px-2">
    Find friends and accounts that you like
  </div>


  {/* Search Bar */}
  <div className="searchSection w-full shrink-0 px-3 py-2">
    <div className="searchContainer w-full h-[40px] bg-[var(--bg-elevated)] rounded-lg flex items-center px-3 border border-[var(--border-soft)] focus-within:border-[var(--brand-blue)] transition-colors">
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
        className="w-full bg-transparent text-[var(--text-primary)] text-sm outline-none placeholder-[var(--text-muted)]"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery("")}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
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
      <div className="w-full flex justify-center items-center py-8 text-[var(--text-muted)] text-sm">
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
