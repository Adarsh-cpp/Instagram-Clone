// UserProfilePage.jsx
import React, { useEffect, useRef, useState } from 'react'
import HighlightCircle from '../components/HighlightCircle'
import PostType from '../components/PostType';
import PostCard from '../components/PostCard';
import ReelCard from '../components/ReelCard';
import TagCard from '../components/TagCard';
import SavedCard from '../components/SavedCard';
import ProfileIconCard from '../components/ProfileIconCard';
import MobileIcons from '../components/MobileIcons';
import BioCard from '../components/BioCard';
import MobileFooter from '../components/MobileFooter';
import IconSidebar from '../components/IconSidebar';
import { X } from "lucide-react";


import axios from "axios"
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import FollowersFollowingOverlay from '../components/FollowersFollowingOverlay';


const UserProfilePage = () => {

  const [user, setUser] = useState([])
  const [posts, setPosts] = useState([])
  const [isOwnProfile, setIsOwnProfile] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [conversation, setConversation] = useState()
  const [followers, setFollowers] = useState(user.followers?.length)
  const [savedPosts, setSavedPosts] = useState([])
  const [reels, setReels] = useState([])

   //for switching between post types
   const [activeTab, setActiveTab] = useState("Posts");

  // Followers/Following overlay state
  const [isFollowOverlayOpen, setIsFollowOverlayOpen] = useState(false)
  const [followOverlayTab, setFollowOverlayTab] = useState("followers")

  // Profile pic overlay state
  const [isDpOverlayOpen, setIsDpOverlayOpen] = useState(false)

  const {userId} = useParams()

  //For Swipping Highlights

  const scrollRef = useRef(null);
  let isDown = false;
  let startX;
  let scrollLeft; 

  const location = useLocation()
  const navigate = useNavigate()

  const handleMouseDown = (e) => {
    isDown = true;
    scrollRef.current.classList.add("cursor-grabbing");
    startX = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft = scrollRef.current.scrollLeft;
  };

  const handleMouseLeave = () => {
    isDown = false;
    scrollRef.current.classList.remove("cursor-grabbing");
  };

  const handleMouseUp = () => {
    isDown = false;
    scrollRef.current.classList.remove("cursor-grabbing");
  };

  const handleMouseMove = (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1; // scroll speed
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleFollowToggle = async () => {
  try {
    const token = localStorage.getItem("authToken");

    const response = await axios.post(
      `http://localhost:4000/user/profile/${user._id}/follow-toggle`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.data.success) {
      setIsFollowing(response.data.isFollowing);
      setFollowers(response.data.updatedFollowers);
    }

  } catch (error) {
    console.log(error);
  }
};

  // Open the followers/following overlay on a given tab
  const openFollowOverlay = (tab) => {
    setFollowOverlayTab(tab)
    setIsFollowOverlayOpen(true)
  }

  // Fetching data from backend

  useEffect(() => {
    const getProfile = async () => {
      try {

        const token = localStorage.getItem("authToken")

        const url = userId ? `http://localhost:4000/user/profile/get-profile/${userId}` : "http://localhost:4000/user/profile/get-profile"
        const response = await axios.get(url, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
        if(response.status === 200){
          setIsOwnProfile(response.data.isOwnProfile)
          setIsFollowing(response.data.isFollowing)
          setUser(response.data.user)
          setPosts(response.data.posts)
          setReels(response.data.reels)
        }
        else{
          console.log("Error fetching profile")
        }

      } catch (error) {
        console.log(error.message)
      }
    }

    getProfile()

  }, [userId])
  

  useEffect(() => {
    setFollowers(user.followers?.length)
  }, [user.followers])


  useEffect(() => {
    if (location.state?.message) {
      toast.success(location.state.message);
  
      navigate(location.pathname, {
        replace: true,
        state: {},
      });
    }
  }, [location, navigate]);

  
  const handleMessage = async () => {
    try {

      const token = localStorage.getItem("authToken")
      const url = `http://localhost:4000/conversation/${userId}`

      const response = await axios.post(url,{},{
        headers:{
          Authorization: `Bearer ${token}`
        }
      })

      if(response.status === 200){
        navigate(`/user/messages/${response.data.conversation?._id}`)
      }
      else
        toast.error("Something went wrong")

    } catch (error) {
      toast.error("Something went wrong")
    }
  }

  useEffect(() => {
    const getSavedPosts = async () => {
      try {
        const token = localStorage.getItem("authToken")
        const url = "http://localhost:4000/post/get-saved-posts"

        const response = await axios.get(url,{
          headers:{
            Authorization:`Bearer ${token}`
          }
        })

        setSavedPosts(response.data.savedPosts)

      } catch (error) {
        toast.error("Something went wrong")
      }
    }
    getSavedPosts()
  }, [])

  // lock background scroll while the dp overlay is open
  useEffect(() => {
    document.body.style.overflow = isDpOverlayOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDpOverlayOpen]);

  // close dp overlay on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsDpOverlayOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="UserProfilePage w-[100vw] h-[100vh] flex justify-between items-center bg-[#0c1014]">

      <IconSidebar />

      <div className="profileSection relative w-full md:w-[88%] 2xl:w-[80%] h-full  flex justify-center items-center overflow-x-hidden overflow-y-auto ">
        <FollowersFollowingOverlay
            isOpen={isFollowOverlayOpen}
            onClose={() => setIsFollowOverlayOpen(false)}
            mode={followOverlayTab}
            userId={user._id}
          />

        {/* Profile picture overlay */}
        {isDpOverlayOpen && (
          <div
            className="dpOverlay fixed inset-0 z-50 bg-black/80 flex justify-center items-center"
            onClick={() => setIsDpOverlayOpen(false)}
          >
            <button
              onClick={() => setIsDpOverlayOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex justify-center items-center text-white cursor-pointer"
              aria-label="Close"
            >
              <X size={22} />
            </button>

            <div
              className="dpOverlayContent w-[80vw] max-w-[500px] aspect-square rounded-full overflow-hidden"
              onClick={(e) => e.stopPropagation()} // prevents click on image from closing overlay
            >
              <img
                src={user.profilePic}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        <div className="profileContainer w-full 2xl:w-[80%] h-full relative ">
            <div className="profileInfo w-full h-[46%]  ">
                <div className="personalInfoSection w-full h-[75%] sm:h-[62%] flex justify-start items-center ">
                    <div className="profilePicSection w-[30%] md:w-[25%] lg:w-[20%] h-full flex justify-center items-center ">
                        <div
                          onClick={() => setIsDpOverlayOpen(true)}
                          className="profilePic w-[120px] h-[120px] sm:w-[180px] sm:h-[180px] md:w-[150px] md:h-[150px] lg:w-[180px] lg:h-[180px] rounded-full overflow-hidden object-cover cursor-pointer "
                        >
                            <img src={user.profilePic} alt="" className='w-full h-full' />
                        </div>
                    </div>
                    <div className="profileDetails w-[300px] sm:w-[70%] h-full ">
                        <div className="nameSection w-full h-[50%] md:h-[25%] flex flex-col md:flex-row justify-center items-start md:items-center  ">
                           <div className="name w-[70%] h-[50%] md:h-full px-2 sm:px-6 flex items-center text-white text-[16px] sm:text-[20px] font-bold ">{user.username}</div>

                           <div className="buttons  h-[50%] md:w-[60%] md:h-full flex justify-start items-center ">
                            {/* Edit Button */}
                           <div
                                className={`editbtn w-[50%] h-full justify-center items-center ${
                                  isOwnProfile ? "flex" : "hidden"
                                }`}
                              >
                            <Link to="/user/edit-profile"><button className='w-[100px] sm:w-[150px] h-[40px] bg-[#25292e] hover:bg-[#363c44] cursor-pointer text-white text-[14px] sm:text-[16px] font-bold rounded-xl'>Edit Profile</button></Link>
                           </div>

                           {/* Follow Button */}
                          {!isOwnProfile && (
                              <>
                                {/* Follow Button */}
                                <div className="followbtn w-[50%] h-full flex justify-center items-center">
                                   <button
                                    onClick={handleFollowToggle}
                                    className={`w-[100px] sm:w-[150px] h-[40px]  cursor-pointer text-white text-[14px] sm:text-[16px] font-bold rounded-xl ${
                                    isFollowing
                                        ? "bg-[#363636] hover:bg-[#4a4a4a]"
                                        : "bg-[#4a5df9] hover:bg-[#4150f7]"
                                    }`}
                                >
                                    {isFollowing ? "Unfollow" : "Follow"}
                                </button>
                                </div>

                                {/* Message Button */}
                                <div className="msgbtn w-[50%] h-full flex justify-center items-center">
                                  <button onClick={handleMessage} className="w-[100px] sm:w-[150px] h-[40px] bg-[#25292e] hover:bg-[#363C34] cursor-pointer text-white text-[14px] sm:text-[16px] font-bold rounded-xl ml-4">
                                    Message
                                  </button>
                                </div>
                              </>
                            )}

                           </div>

                           
                        </div>
                        <div className="postCount w-full md:w-[80%] h-[20%] flex justify-center items-center ">
                            <div className="posts w-[26%] sm:w-[30%] h-full px-2 sm:px-6 flex justify-start items-center text-[#A8A8A8] sm:text-[20px] text-[12px] "><span className='text-white'>{user.postsCount}</span>&nbsp;posts</div>
                            <div onClick={() => openFollowOverlay("followers")} className="fllwers w-[37%] sm:w-[35%] h-full px-2 sm:px-6 flex justify-start items-center text-[#A8A8A8] sm:text-[20px] text-[12px] cursor-pointer "><span className='text-white'>{followers}</span>&nbsp;followers</div>
                            <div onClick={() => openFollowOverlay("following")} className="fllwing w-[37%] sm:w-[35%] h-full px-2 sm:px-6 flex justify-start items-center text-[#A8A8A8] sm:text-[20px] text-[12px] cursor-pointer "><span className='text-white'>{user.following?.length}</span>&nbsp;following</div>
                        </div>
                        <BioCard bioText={user.bio || ""} />
                    </div>
                </div>

                <div ref={scrollRef}
                     onMouseDown={handleMouseDown}
                     onMouseLeave={handleMouseLeave}
                     onMouseUp={handleMouseUp}
                     onMouseMove={handleMouseMove}
                     className="highlightSection w-full h-[30%] sm:h-[38%] p-2 flex justify-start items-center sm:items-start gap-10 overflow-x-auto scrollbar-hide select-none cursor-grab ">
                           <div className="newHighlightsection h-full w-[100px] flex flex-col justify-center sm:justify-start items-center" >
                             <div className="newHighLightCircle w-[70px] h-[70px] sm:w-[100px] sm:h-[100px] shrink-0 rounded-full object-fit object-center border-[4px] border-[#363636] overflow-hidden flex justify-center items-center bg-[#121212]">
                               <img src="/images/plus-icon.png" alt="" draggable="false" className='w-[60%] h-[60%] select-none' />
                            </div>
                            <div className="newtext text-white text-[12px]">New</div>
                           </div>
                        <HighlightCircle />
                        <HighlightCircle />
                        <HighlightCircle />
                        <HighlightCircle />
                        <HighlightCircle />
                        <HighlightCircle />
                        <HighlightCircle />
                        <HighlightCircle />
                        <HighlightCircle />
                        <HighlightCircle />
                        <HighlightCircle />
                        <HighlightCircle />
                        <HighlightCircle />
                        <HighlightCircle />
                </div>

            </div>

            <div className="postHeader w-full h-[10%] border flex justify-center items-center border-b-[#2b3036]">

             <PostType type={"Posts"} imgSrc={"/images/grid-icon.png"} activeTab={activeTab} setActiveTab={setActiveTab} />
             <PostType type={"Reels"} imgSrc={"/images/reel-icon.png"} activeTab={activeTab} setActiveTab={setActiveTab} />
             <PostType type={"Saved"} imgSrc={"/images/bookmark-icon.png"} activeTab={activeTab} setActiveTab={setActiveTab} />
             <PostType type={"Tagged"} imgSrc={"/images/tag-icon.png"} activeTab={activeTab} setActiveTab={setActiveTab} />

            </div>

          {activeTab === "Posts" && (
            <>
              {posts.length > 0 ? (
                <div className="postSection w-full min-h-[44%] grid grid-cols-3">
                  {posts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      authorId={post.author._id}
                      imgSrc={post.media?.[0]?.url}
                      likesCount={post.likes.length}
                      commentsCount={post.commentsCount}
                    />
                  ))}
                </div>
              ) : (
                <div className="w-full min-h-[44%] flex flex-col justify-center items-center gap-3">
                 
                  <h2 className="text-white text-2xl font-bold">No Posts Yet</h2>
                  <p className="text-[#A8A8A8] text-sm">
                    When posts are shared, they'll appear here.
                  </p>
                </div>
              )}
            </>
          )}

        {activeTab === "Reels" && (
            <>
              {reels.length > 0 ? (
                <div className="reelSection w-full min-h-[44%] grid grid-cols-4">
                  {reels.map((reel) => (
                    <ReelCard
                      key={reel._id}
                      reel={reel}
                      authorId={reel.author?._id}
                      imgSrc={reel.media?.thumbnailUrl}
                      likesCount={reel.likes.length}
                      commentsCount={reel.commentsCount}
                    />
                  ))}
                </div>
              ) : (
                <div className="w-full min-h-[44%] flex flex-col justify-center items-center gap-3">
                 
                  <h2 className="text-white text-2xl font-bold">No Reels Yet</h2>
                  <p className="text-[#A8A8A8] text-sm">
                    When reels are posted, they'll appear here.
                  </p>
                </div>
              )}
            </>
          )}

         {activeTab === "Tagged" && <div className="tagSection w-full min-h-[44%]  grid grid-cols-3" >
          <TagCard imgSrc={"/images/profile-pic.JPG"} />
        </div>}
        
        {activeTab === "Saved" && <>
         <div className="savedSectionHeader w-full h-[50px] flex justify-between items-center p-4">
          <div className="msg text-[12px] text-[#A3A3A3]">Only you can see what you've saved</div>
          {/* <button className="newCollection text-[14px] text-[#85a1ff] hover:text-[#a3bcff] cursor-pointer ">+ New collection</button> */}
         </div>

        {savedPosts.length > 0 ? (
        <div className="SavedSection w-full min-h-[44%] grid grid-cols-5">
           {savedPosts.map((post) => (
                    <SavedCard
                      key={post._id}
                      imgSrc={post.media?.[0]?.url}
                      likesCount={post.likes.length}
                      commentsCount={post.commentsCount}
                    />
                  ))}
        </div>
        ) : (
          <div className="w-full min-h-[44%] flex flex-col justify-center items-center gap-3">
                 
                  <h2 className="text-white text-2xl font-bold">No Saved Posts Yet</h2>
                  <p className="text-[#A8A8A8] text-sm">
                    When posts are saved, they'll appear here.
                  </p>
                </div>
        )}
      </>}

      <MobileFooter />
       

        </div>
      </div>

    </div>
  )
}

export default UserProfilePage