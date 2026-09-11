import React, { useEffect, useState } from 'react'
import IconSidebar from '../components/IconSidebar'
import StoryContainer from '../components/StoryContainer'
import HomepagePostCard from '../components/HomepagePostCard'
import axios from "axios";
import MobileFooter from '../components/MobileFooter';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import socket from '../socket';
import { useUpload } from '../context/UploadContext';
import { ShareIcon } from 'lucide-react';
import ShareOverlay from '../components/ShareOverlay';

const HomePage = () => {

const [posts, setPosts] = useState([])
const {user, setUser} = useAuth()
const { uploads, markConsumed } = useUpload()

const location = useLocation();
const navigate = useNavigate()

  useEffect(() => {
    
    const getFeedPosts = async () => {
      try {
        const token = localStorage.getItem("authToken")
        const url = "http://localhost:4000/post/get-posts"
        const response = await axios.get(url, {
          headers:{
            Authorization : `Bearer ${token}`
          }
        })
        setPosts(response.data.posts)
      } catch (error) {
        toast.error(error.message)
      }
    }

    getFeedPosts()

  }, [])

 useEffect(() => {
  if (location.state?.message) {
    toast.success(location.state.message);

    navigate(location.pathname, {
      replace: true,
      state: {},
    });
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

 
//   useEffect(() => {
//   if (!user?._id) return;

//   socket.emit("join", user._id);

//   // re-join after any reconnect (socket.id changes on reconnect)
//   const handleConnect = () => socket.emit("join", user._id);
//   socket.on("connect", handleConnect);

//   return () => socket.off("connect", handleConnect);
// }, [user?._id]);
  


  return (
    <div className='homePage w-[100vw] h-[100vh] bg-[var(--bg-app)] flex text-[var(--text-primary)] overflow-x-hidden'>

     

      <IconSidebar />

     
      <div className="homeSection w-full md:w-[80%] min-h-full flex justify-center overflow-y-auto  ">

         
        <div className="homeContainer w-full sm:w-[70%] lg:w-[60%] min-h-full flex flex-col items-start  ">

          <StoryContainer />

         <div className="postContainer w-full xl:w-[75%] min-h-[calc(100vh-130px)] mx-auto py-4">

          {posts.length > 0 ? (
            posts.map((post) => (
           
              <HomepagePostCard
                key={post._id}
                postId={post._id}
                setPosts={setPosts}
                media={post.media}
                profileImgSrc={post.author.profilePic}
                authorId={post.author._id}
                author={post.author.username}
                caption={post.caption}
                aspectRatio={post.aspectRatio}
                isLiked={
                          post.likes.some(
                            (id) => id.toString() === user?._id
                          )
                        }
                likesCount={post.likes.length}
                commentsCount={post.commentsCount}
                isSaved={post.isSaved}
                createdAt={post.createdAt}
              />
            ))
          ) : (
            <div className="w-full h-[300px] flex justify-center items-center text-[var(--text-primary)]">
              No posts available
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