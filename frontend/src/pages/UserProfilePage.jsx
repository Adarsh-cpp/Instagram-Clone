// UserProfilePage.jsx
import React, { useEffect, useRef, useState } from 'react'
import HighlightCircle from '../components/HighlightCircle'
import NewHighlightModal from '../components/NewHighlightModal'
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
import { X, BadgeCheck } from "lucide-react";


import axios from "axios"
import axiosInstance from "../utils/axiosInstance"
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import FollowersFollowingOverlay from '../components/FollowersFollowingOverlay';

const BASE_URL = import.meta.env.VITE_SERVER_URL


const UserProfilePage = () => {

  const [user, setUser] = useState([])
  const [posts, setPosts] = useState([])
  const [isOwnProfile, setIsOwnProfile] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [conversation, setConversation] = useState()
  const [followers, setFollowers] = useState(user.followers?.length)
  const [reels, setReels] = useState([])
  const [savedItems, setSavedItems] = useState([])
  const [taggedItems, setTaggedItems] = useState([])

   //for switching between post types
   const [activeTab, setActiveTab] = useState("Posts");

  // Followers/Following overlay state
  const [isFollowOverlayOpen, setIsFollowOverlayOpen] = useState(false)
  const [followOverlayTab, setFollowOverlayTab] = useState("followers")

  // Profile pic overlay state
  const [isDpOverlayOpen, setIsDpOverlayOpen] = useState(false)

  // Highlights
  const [highlights, setHighlights] = useState([])
  const [showNewHighlightModal, setShowNewHighlightModal] = useState(false)

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
      `${BASE_URL}/user/profile/${user._id}/follow-toggle`,
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

        const url = userId ? `${BASE_URL}/user/profile/get-profile/${userId}` : `${BASE_URL}/user/profile/get-profile`
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
      const url = `${BASE_URL}/conversation/${userId}`

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

  // Fetch merged saved posts + reels, sorted by save date (only needed on own profile)
  useEffect(() => {
    if (!isOwnProfile) return

    const getSavedItems = async () => {
      try {
        const token = localStorage.getItem("authToken")
        const res = await axios.get(`${BASE_URL}/user/profile/saved-items`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        setSavedItems(res.data.savedItems)
      } catch (error) {
        toast.error("Something went wrong")
      }
    }
    getSavedItems()
  }, [isOwnProfile])

  // fetch this profile's highlights (works for own profile and others' —
  // getUserHighlights isn't owner-gated on the backend)
  useEffect(() => {
    const getHighlights = async () => {
      if (!user._id) return
      try {
        const res = await axiosInstance.get(`/highlight/user/${user._id}`)
        setHighlights(res.data.highlights || [])
      } catch (error) {
        console.log(error)
      }
    }
    getHighlights()
  }, [user._id])

  // fetch this profile's tagged posts + reels (merged, sorted by recency) —
  // like highlights, this isn't owner-gated, so it works for any profile
  useEffect(() => {
    const getTaggedItems = async () => {
      if (!user._id) return
      try {
        const res = await axiosInstance.get(`/post/tagged-items/${user._id}`)
        setTaggedItems(res.data.taggedItems || [])
      } catch (error) {
        console.log(error)
      }
    }
    getTaggedItems()
  }, [user._id])

  const handleHighlightCreated = (highlight) => {
    setHighlights((prev) => [highlight, ...prev])
    setShowNewHighlightModal(false)
  }

  // keep the highlight circles in sync with changes made inside the story
  // viewer page. Removing a story there can change the highlight's cover
  // image; removing the last story (or explicitly deleting the highlight)
  // removes it entirely. The viewer lives on its own route, so it can't just
  // call setHighlights directly — it broadcasts these as window events and
  // whichever profile page is mounted patches its own state in response.
  useEffect(() => {
    const handleCoverUpdated = (e) => {
      const { highlightId, coverImage } = e.detail || {}
      if (!highlightId) return
      setHighlights((prev) =>
        prev.map((h) => (h._id === highlightId ? { ...h, coverImage } : h))
      )
    }

    const handleHighlightDeleted = (e) => {
      const { highlightId } = e.detail || {}
      if (!highlightId) return
      setHighlights((prev) => prev.filter((h) => h._id !== highlightId))
    }

    window.addEventListener("highlightCoverUpdated", handleCoverUpdated)
    window.addEventListener("highlightDeleted", handleHighlightDeleted)
    return () => {
      window.removeEventListener("highlightCoverUpdated", handleCoverUpdated)
      window.removeEventListener("highlightDeleted", handleHighlightDeleted)
    }
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

  // hide the highlights row entirely when viewing someone else's profile
  // and they have zero highlights — on your own profile it always shows
  // because of the "New" tile
  const showHighlightSection = isOwnProfile || highlights.length > 0

  return (
    <div className="UserProfilePage w-full h-[100dvh] flex justify-between items-center bg-[var(--bg-app)] overflow-x-hidden">

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
                src={user.profilePic ? user.profilePic : "images/default-profile-pic.jpg"}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        <div className="profileContainer w-full 2xl:w-[80%] h-full relative ">
            {/* profileInfo now grows naturally with content (h-auto) instead of a
                fixed % height, so a long/multi-line bio pushes the highlights row
                down instead of overlapping it */}
            <div className="profileInfo w-full h-auto py-4 sm:py-6">
                <div className="personalInfoSection w-full flex flex-row items-center gap-3 sm:gap-6 py-4 sm:py-0">
                    <div className="profilePicSection shrink-0 w-auto sm:w-[30%] md:w-[25%] lg:w-[20%] h-auto flex justify-center items-center ">
                        <div
                          onClick={() => setIsDpOverlayOpen(true)}
                          className="profilePic w-[90px] h-[90px] sm:w-[150px] sm:h-[150px] md:w-[150px] md:h-[150px] lg:w-[180px] lg:h-[180px] rounded-full overflow-hidden object-cover cursor-pointer shrink-0 "
                        >
                            <img
                                src={
                                  user?.profilePic
                                    ? user.profilePic
                                    : "/images/default-profile-pic.jpg"
                                }
                                alt=""
                                className="w-full h-full object-cover"
                              />
                        </div>
                    </div>
                    <div className="profileDetails flex-1 min-w-0 h-auto flex flex-col justify-center gap-2 sm:gap-3 ">
                        <div className="nameSection w-full h-auto flex flex-col md:flex-row justify-start items-start md:items-center gap-2 md:gap-0 ">
                           <div className="name w-full md:w-[70%] h-auto md:h-full px-1 sm:px-6 flex items-center gap-1 text-[var(--text-primary)] text-[16px] sm:text-[20px] font-bold truncate ">
                             {user.username}
                             {user?.role === "admin" && (
                               <BadgeCheck size={20} className="text-sky-400 shrink-0" />
                             )}
                           </div>

                           <div className="buttons w-[50%] h-auto md:w-[60%] md:h-full flex gap-2 sm:gap-3 items-center ">
                            {/* Edit Button */}
                           <div
                                className={`editbtn flex-1 min-w-0 justify-center items-center ${
                                  isOwnProfile ? "flex" : "hidden"
                                }`}
                              >
                            <Link to="/user/edit-profile" className="w-full">
                              <button className='w-full sm:max-w-[160px] mx-auto block h-[36px] sm:h-[40px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-menu-hover)] cursor-pointer text-[var(--text-primary)] text-[13px] sm:text-[16px] font-bold rounded-xl truncate px-2'>Edit Profile</button>
                            </Link>
                           </div>

                           {/* Follow Button */}
                          {!isOwnProfile && (
                              <>
                                {/* Follow Button */}
                                <div className="followbtn flex-1 min-w-0 flex justify-center items-center">
                                   <button
                                    onClick={handleFollowToggle}
                                    className={`w-full sm:max-w-[160px] h-[36px] sm:h-[40px] cursor-pointer text-[var(--text-on-brand)] text-[13px] sm:text-[16px] font-bold rounded-xl truncate px-2 ${
                                    isFollowing
                                        ? "bg-[var(--bg-secondary-btn)] hover:bg-[var(--bg-secondary-btn-hover)]"
                                        : "bg-[var(--accent-indigo)] hover:bg-[var(--accent-indigo-hover)]"
                                    }`}
                                >
                                    {isFollowing ? "Unfollow" : "Follow"}
                                </button>
                                </div>

                                {/* Message Button */}
                                <div className="msgbtn flex-1 min-w-0 flex justify-center items-center">
                                  <button onClick={handleMessage} className="w-full sm:max-w-[160px] h-[36px] sm:h-[40px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-menu-hover)] cursor-pointer text-[var(--text-primary)] text-[13px] sm:text-[16px] font-bold rounded-xl truncate px-2">
                                    Message
                                  </button>
                                </div>
                              </>
                            )}

                           </div>

                           
                        </div>
                        <div className="postCount w-full md:w-[80%] h-auto flex justify-start md:justify-center items-center gap-1 sm:gap-0 ">
                            <div className="posts flex-1 h-auto px-1 sm:px-6 flex justify-start items-center text-[var(--text-muted)] sm:text-[20px] text-[13px] whitespace-nowrap "><span className='text-[var(--text-primary)]'>{user.postsCount}</span>&nbsp;posts</div>
                            <div onClick={() => openFollowOverlay("followers")} className="fllwers flex-1 h-auto px-1 sm:px-6 flex justify-start items-center text-[var(--text-muted)] sm:text-[20px] text-[13px] whitespace-nowrap cursor-pointer "><span className='text-[var(--text-primary)]'>{followers}</span>&nbsp;followers</div>
                            <div onClick={() => openFollowOverlay("following")} className="fllwing flex-1 h-auto px-1 sm:px-6 flex justify-start items-center text-[var(--text-muted)] sm:text-[20px] text-[13px] whitespace-nowrap cursor-pointer "><span className='text-[var(--text-primary)]'>{user.following?.length}</span>&nbsp;following</div>
                        </div>
                        <BioCard bioText={user.bio || ""} />
                    </div>
                </div>

                {showHighlightSection && (
                  <div ref={scrollRef}
                       onMouseDown={handleMouseDown}
                       onMouseLeave={handleMouseLeave}
                       onMouseUp={handleMouseUp}
                       onMouseMove={handleMouseMove}
                       className="highlightSection w-full min-h-[110px] sm:min-h-[150px] py-2 px-1 sm:px-2 flex justify-start items-center sm:items-start gap-4 sm:gap-10 overflow-x-auto scrollbar-hide select-none cursor-grab ">
                          {isOwnProfile && (
                            <div
                              onClick={() => setShowNewHighlightModal(true)}
                              className="newHighlightsection h-full w-[100px] flex flex-col justify-center sm:justify-start items-center cursor-pointer shrink-0"
                            >
                               <div className="newHighLightCircle w-[70px] h-[70px] sm:w-[100px] sm:h-[100px] shrink-0 rounded-full object-fit object-center border-[4px] border-[var(--border-container)] overflow-hidden flex justify-center items-center bg-[var(--bg-input)]">
                                 <img src="/images/plus-icon.png" alt="" draggable="false" className='w-[60%] h-[60%] select-none' />
                              </div>
                              <div className="newtext text-[var(--text-primary)] text-[12px]">New</div>
                             </div>
                          )}
                          {highlights.map((h) => (
                            <HighlightCircle
                              key={h._id}
                              title={h.title}
                              coverImage={h.coverImage}
                              onClick={() => navigate(`/highlight/view/${h._id}`)}
                            />
                          ))}
                  </div>
                )}

            </div>

            <div className="postHeader w-full h-[10%] flex justify-center items-center ">

             <PostType type={"Posts"} imgSrc={"/images/grid-icon.png"} activeTab={activeTab} setActiveTab={setActiveTab} />
             <PostType type={"Reels"} imgSrc={"/images/reel-icon.png"} activeTab={activeTab} setActiveTab={setActiveTab} />
             {isOwnProfile && (
               <PostType type={"Saved"} imgSrc={"/images/bookmark-icon.png"} activeTab={activeTab} setActiveTab={setActiveTab} />
             )}
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
                      authorId={post?.author?._id}
                      authorRole={post?.author?.role}
                      imgSrc={post?.media?.[0]?.url}
                      likesCount={post?.likes.length}
                      commentsCount={post?.commentsCount}
                    />
                  ))}
                </div>
              ) : (
                <div className="w-full min-h-[44%] flex flex-col justify-center items-center gap-3">
                 
                  <h2 className="text-[var(--text-primary)] text-2xl font-bold">No Posts Yet</h2>
                  <p className="text-[var(--text-muted)] text-sm">
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
                      authorRole={reel?.author?.role}
                      imgSrc={reel.media?.thumbnailUrl}
                      likesCount={reel.likes.length}
                      commentsCount={reel.commentsCount}
                    />
                  ))}
                </div>
              ) : (
                <div className="w-full min-h-[44%] flex flex-col justify-center items-center gap-3">
                 
                  <h2 className="text-[var(--text-primary)] text-2xl font-bold">No Reels Yet</h2>
                  <p className="text-[var(--text-muted)] text-sm">
                    When reels are posted, they'll appear here.
                  </p>
                </div>
              )}
            </>
          )}

        {activeTab === "Tagged" && (
          <>
            {taggedItems.length > 0 ? (
              <div className="tagSection w-full min-h-[44%] grid grid-cols-3">
                {taggedItems.map((item) => (
                  <TagCard key={`${item.type}-${item._id}`} item={item} />
                ))}
              </div>
            ) : (
              <div className="w-full min-h-[44%] flex flex-col justify-center items-center gap-3">
                <h2 className="text-[var(--text-primary)] text-2xl font-bold">No Tagged Posts</h2>
                <p className="text-[var(--text-muted)] text-sm">
                  When people tag {isOwnProfile ? "you" : "them"} in photos and videos, they'll appear here.
                </p>
              </div>
            )}
          </>
        )}
        
        {activeTab === "Saved" && isOwnProfile && (
          <>
            <div className="savedSectionHeader w-full h-[50px] flex justify-between items-center p-4">
              <div className="msg text-[12px] text-[var(--text-muted)]">Only you can see what you've saved</div>
              {/* <button className="newCollection text-[14px] text-[var(--link-muted)] hover:text-[var(--link-muted-hover)] cursor-pointer ">+ New collection</button> */}
            </div>

            {savedItems.length > 0 ? (
              <div className="SavedSection w-full min-h-[44%] grid grid-cols-5">
                {savedItems.map((item) => (
                  <SavedCard
                    key={`${item.type}-${item._id}`}
                    item={item}
                    onUnsave={() =>
                      setSavedItems((prev) => prev.filter((i) => i._id !== item._id))
                    }
                  />
                ))}
              </div>
            ) : (
              <div className="w-full min-h-[44%] flex flex-col justify-center items-center gap-3">
                <h2 className="text-[var(--text-primary)] text-2xl font-bold">No Saved Posts Yet</h2>
                <p className="text-[var(--text-muted)] text-sm">
                  When posts are saved, they'll appear here.
                </p>
              </div>
            )}
          </>
        )}

      <MobileFooter />
       

        </div>
      </div>

      {showNewHighlightModal && (
        <NewHighlightModal
          onClose={() => setShowNewHighlightModal(false)}
          onCreated={handleHighlightCreated}
        />
      )}

    </div>
  )
}

export default UserProfilePage