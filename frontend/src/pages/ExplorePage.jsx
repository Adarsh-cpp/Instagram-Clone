import React, { useEffect, useState } from 'react'
import axios from "axios"
import IconSidebar from '../components/IconSidebar'
import FollowingSuggestionCard from '../components/FollowingSuggestionCard'
import ExplorePostCard from '../components/ExplorePostCard'

const ExplorePage = () => {

    const [posts, setPosts] = useState([])
    const [users, setUsers] = useState([])

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
    } 
} catch (error) {
    console.log(error.message)
}
}
fetchAllUsers()
}, [])


    

  return (
    <div className="explorePage w-screen min-h-screen md:h-screen bg-[#0c1014] flex flex-col md:flex-row text-white overflow-y-auto md:overflow-hidden">
      <IconSidebar />

      <div className="exploreSection w-full md:w-[80%] h-auto md:h-full flex flex-col md:flex-row border">

       <div className="exploreContainer w-full md:w-[70%] lg:w-[65%] md:min-h-full grid grid-cols-3 auto-rows-[110px] xs:auto-rows-[130px] sm:auto-rows-[160px] md:auto-rows-[200px] lg:auto-rows-[250px] gap-[2px] md:overflow-y-auto hide-scrollbar bg-black">
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

<div className="followingSuggestions w-full md:w-[30%] lg:w-[35%] h-auto md:h-full flex justify-start items-start content-start flex-wrap md:overflow-y-auto bg-black">

  <div className="heading w-full h-[60px] flex justify-center items-center text-[14px] font-semibold text-center px-2">
    Find friends and accounts that you like
  </div>

  {users?.map((user) => (
    <FollowingSuggestionCard
      key={user._id}
      suggestedUserId={user._id}
      user={user}
    />
  ))}

</div>

      </div>
    </div>
  )
}

export default ExplorePage