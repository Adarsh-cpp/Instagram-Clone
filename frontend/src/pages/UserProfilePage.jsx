// UserProfilePage.jsx
import React, { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
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
import { X, BadgeCheck, Plus, Grid3x3, Clapperboard, Bookmark, Tag } from "lucide-react";


import axios from "axios"
import axiosInstance from "../utils/axiosInstance"
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import FollowersFollowingOverlay from '../components/FollowersFollowingOverlay';
import { useTheme } from '../context/ThemeContext';

const BASE_URL = import.meta.env.VITE_SERVER_URL

// On mobile every highlight tile (the "New" tile included) takes exactly a
// quarter of the row, so 4 fit across the screen with no sideways scrolling
// until a 5th one exists. Row padding is 0.25rem x 2 and the gap is 0.75rem x 3:
//   (100% - 0.5rem - 2.25rem) / 4
// From the `sm` breakpoint upward the original fixed sizing is used again.
const HIGHLIGHT_TILE_W = "w-[calc((100%-0.5rem-2.25rem)/4)] sm:w-auto"

// NEW: a highlight is "empty" when we can see it has zero stories.
// If the backend doesn't send any story info we assume it's NOT empty,
// so we never block a highlight by mistake.
const isHighlightEmpty = (h) => {
  if (!h) return false
  if (Array.isArray(h.stories)) return h.stories.length === 0
  if (typeof h.storiesCount === "number") return h.storiesCount === 0
  if (typeof h.storyCount === "number") return h.storyCount === 0
  return false
}

/* ---------- Devs Mode: number that counts up when it changes ---------- */
const CountUp = ({ value }) => {
  const mv = useMotionValue(0)
  const rounded = useTransform(mv, (v) => Math.round(v))

  useEffect(() => {
    const controls = animate(mv, Number(value) || 0, { duration: 0.9, ease: 'easeOut' })
    return () => controls.stop()
  }, [value, mv])

  return <motion.span>{rounded}</motion.span>
}

/* ---------- Empty state (classic markup identical to the original) ---------- */
const EmptyState = ({ title, children }) => {
  const { isDevs } = useTheme()

  if (!isDevs) {
    return (
      <div className="w-full min-h-[44%] flex flex-col justify-center items-center gap-3">
        <h2 className="text-[var(--text-primary)] text-2xl font-bold">{title}</h2>
        <p className="text-[var(--text-muted)] text-sm">{children}</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full min-h-[44%] flex flex-col justify-center items-center gap-3 py-10"
    >
      <span className="devs-float devs-text-gradient font-mono text-[34px] font-bold">{'</>'}</span>
      <h2
        className="text-[var(--text-primary)] text-2xl font-bold"
        style={{ fontFamily: 'var(--devs-font-display)' }}
      >
        {title}
      </h2>
      <p className="text-[var(--text-muted)] text-sm font-mono text-center px-6">{children}</p>
    </motion.div>
  )
}


const UserProfilePage = () => {

  const { isDevs, lite } = useTheme()

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
  // the highlight the "Delete highlight?" popup is currently open for
  const [highlightToDelete, setHighlightToDelete] = useState(null)
  const [deletingHighlight, setDeletingHighlight] = useState(false)

  // long-press (touch) tracking for the highlight delete popup
  const longPressTimer = useRef(null)
  const touchStartPos = useRef(null)
  const lastLongPress = useRef(0)

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

  // NEW: open a highlight, unless it has no stories — then tell the user why
  const handleHighlightClick = (h) => {
    if (isHighlightEmpty(h)) {
      toast.info(
        isOwnProfile
          ? "This highlight is empty. Add a story to the highlight to view it."
          : "This highlight is empty."
      )
      return
    }
    navigate(`/highlight/view/${h._id}`)
  }

  /* ---------- delete a highlight: right-click (PC) / long-press (mobile) ---------- */
  const LONG_PRESS_MS = 500

  const cancelLongPress = () => {
    clearTimeout(longPressTimer.current)
  }

  const startLongPress = (h, e) => {
    if (!isOwnProfile) return
    const t = e.touches?.[0]
    touchStartPos.current = t ? { x: t.clientX, y: t.clientY } : null
    cancelLongPress()
    longPressTimer.current = setTimeout(() => {
      lastLongPress.current = Date.now()
      setHighlightToDelete(h)
    }, LONG_PRESS_MS)
  }

  // moving the finger (scrolling the row) cancels the long press
  const moveLongPress = (e) => {
    const t = e.touches?.[0]
    const s = touchStartPos.current
    if (!t || !s) return
    if (Math.hypot(t.clientX - s.x, t.clientY - s.y) > 10) cancelLongPress()
  }

  // right-click on PC (also fired by some mobile browsers on long press)
  const openDeletePopup = (h, e) => {
    if (!isOwnProfile) return
    e.preventDefault()
    cancelLongPress()
    lastLongPress.current = Date.now()
    setHighlightToDelete(h)
  }

  // lifting the finger after a long press would otherwise count as a tap
  // and open the highlight viewer — swallow that click
  const blockClickAfterLongPress = (e) => {
    if (Date.now() - lastLongPress.current < 700) {
      e.stopPropagation()
      e.preventDefault()
    }
  }

  const closeDeletePopup = () => {
    if (deletingHighlight) return
    setHighlightToDelete(null)
  }

  const handleDeleteHighlight = async () => {
    if (!highlightToDelete) return
    const id = highlightToDelete._id
    setDeletingHighlight(true)
    try {
      await axiosInstance.delete(`/highlight/${id}`)
      setHighlights((prev) => prev.filter((h) => h._id !== id))
      toast.success("Highlight deleted")
      setHighlightToDelete(null)
    } catch (error) {
      toast.error(error?.response?.data?.message || "Couldn't delete highlight")
    } finally {
      setDeletingHighlight(false)
    }
  }

  useEffect(() => {
    return () => clearTimeout(longPressTimer.current)
  }, [])

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
      if (e.key === "Escape") {
        setIsDpOverlayOpen(false);
        setHighlightToDelete(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // hide the highlights row entirely when viewing someone else's profile
  // and they have zero highlights — on your own profile it always shows
  // because of the "New" tile
  const showHighlightSection = isOwnProfile || highlights.length > 0

  const tapProps = isDevs ? { whileTap: { scale: 0.95 }, whileHover: { y: -2 } } : {}

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
          <motion.div
            {...(isDevs ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } } : {})}
            className="dpOverlay fixed inset-0 z-50 bg-black/80 devs:bg-[rgba(2,3,10,0.85)] devs:backdrop-blur-md flex justify-center items-center"
            onClick={() => setIsDpOverlayOpen(false)}
          >
            <button
              onClick={() => setIsDpOverlayOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex justify-center items-center text-white cursor-pointer devs:border devs:border-[var(--border-popup)] devs:text-[var(--devs-cyan)] devs:hover:shadow-[0_0_16px_rgba(34,240,255,0.5)]"
              aria-label="Close"
            >
              <X size={22} />
            </button>

            <motion.div
              {...(isDevs
                ? {
                    initial: { scale: 0.8, opacity: 0 },
                    animate: { scale: 1, opacity: 1 },
                    transition: { type: "spring", stiffness: 260, damping: 22 },
                  }
                : {})}
              className="dpOverlayContent w-[80vw] max-w-[500px] aspect-square rounded-full overflow-hidden devs:ring-4 devs:ring-[rgba(34,240,255,0.6)] devs:shadow-[0_0_90px_rgba(139,92,246,0.55)]"
              onClick={(e) => e.stopPropagation()} // prevents click on image from closing overlay
            >
              <img
                src={user.profilePic ? user.profilePic : "images/default-profile-pic.jpg"}
                alt=""
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>
        )}

        <div className="profileContainer w-full 2xl:w-[80%] h-full relative ">
            {/* profileInfo now grows naturally with content (h-auto) instead of a
                fixed % height, so a long/multi-line bio pushes the highlights row
                down instead of overlapping it */}
            <div className="profileInfo w-full h-auto py-4 sm:py-6">

                {/* Devs Mode: header strip */}
                {isDevs && (
                  <div className="px-1 sm:px-4 pb-1 flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--text-muted)]">
                    <span className="devs-pulse-glow w-2 h-2 rounded-full bg-[var(--devs-lime)]" />
                    profile.sys
                    {user.username && <span className="text-[var(--devs-cyan)] truncate">@{user.username}</span>}
                  </div>
                )}

                <div className="personalInfoSection w-full flex flex-row items-center gap-3 sm:gap-6 py-4 sm:py-0">
                    <div className="profilePicSection shrink-0 w-auto sm:w-[30%] md:w-[25%] lg:w-[20%] h-auto flex justify-center items-center ">
                        {isDevs ? (
                          <motion.div
                            whileHover={{ scale: 1.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setIsDpOverlayOpen(true)}
                            className="profilePic relative w-[90px] h-[90px] sm:w-[150px] sm:h-[150px] md:w-[150px] md:h-[150px] lg:w-[180px] lg:h-[180px] cursor-pointer shrink-0"
                          >
                            <span
                              className="absolute -inset-[3px] rounded-full"
                              style={{
                                background:
                                  "conic-gradient(from var(--devs-angle), #22f0ff, #8b5cf6, #ff2bd6, #22f0ff)",
                                animation: lite ? "none" : "devs-spin 5s linear infinite",
                                boxShadow: "0 0 34px rgba(139,92,246,0.5)",
                              }}
                            />
                            <div className="relative w-full h-full rounded-full overflow-hidden border-[3px] border-[#04050e] bg-black">
                              <img
                                src={user?.profilePic ? user.profilePic : "/images/default-profile-pic.jpg"}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </motion.div>
                        ) : (
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
                        )}
                    </div>
                    <div className="profileDetails flex-1 min-w-0 h-auto flex flex-col justify-center gap-2 sm:gap-3 ">
                        <div className="nameSection w-full h-auto flex flex-col md:flex-row justify-start items-start md:items-center gap-2 md:gap-0 ">
                           <div className="name w-full md:w-[70%] h-auto md:h-full px-1 sm:px-6 flex items-center gap-1 text-[var(--text-primary)] text-[16px] sm:text-[20px] font-bold truncate ">
                             <span className={isDevs ? "devs-text-gradient truncate" : ""}>{user.username}</span>
                             {user?.role === "admin" && (
                               <BadgeCheck
                                 size={20}
                                 className="text-sky-400 devs:text-[var(--devs-cyan)] devs:drop-shadow-[0_0_6px_rgba(34,240,255,0.9)] shrink-0"
                               />
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
                              <motion.button {...tapProps} className='w-full sm:max-w-[160px] mx-auto block h-[36px] sm:h-[40px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-menu-hover)] cursor-pointer text-[var(--text-primary)] text-[13px] sm:text-[16px] font-bold rounded-xl truncate px-2 devs:border devs:border-[var(--border-popup)] devs:font-mono devs:tracking-wider devs:hover:shadow-[0_0_18px_rgba(34,240,255,0.3)]'>Edit Profile</motion.button>
                            </Link>
                           </div>

                           {/* Follow Button */}
                          {!isOwnProfile && (
                              <>
                                {/* Follow Button */}
                                <div className="followbtn flex-1 min-w-0 flex justify-center items-center">
                                   <motion.button
                                    {...tapProps}
                                    onClick={handleFollowToggle}
                                    className={`w-full sm:max-w-[160px] h-[36px] sm:h-[40px] cursor-pointer text-[var(--text-on-brand)] text-[13px] sm:text-[16px] font-bold rounded-xl truncate px-2 devs:font-mono devs:tracking-wider ${
                                    isFollowing
                                        ? "bg-[var(--bg-secondary-btn)] hover:bg-[var(--bg-secondary-btn-hover)] devs:text-[var(--text-primary)] devs:border devs:border-[var(--border-popup)]"
                                        : "bg-[var(--accent-indigo)] hover:bg-[var(--accent-indigo-hover)] devs:shadow-[0_0_20px_rgba(139,92,246,0.55)]"
                                    }`}
                                >
                                    {isFollowing ? "Unfollow" : "Follow"}
                                </motion.button>
                                </div>

                                {/* Message Button */}
                                <div className="msgbtn flex-1 min-w-0 flex justify-center items-center">
                                  <motion.button {...tapProps} onClick={handleMessage} className="w-full sm:max-w-[160px] h-[36px] sm:h-[40px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-menu-hover)] cursor-pointer text-[var(--text-primary)] text-[13px] sm:text-[16px] font-bold rounded-xl truncate px-2 devs:border devs:border-[var(--border-popup)] devs:font-mono devs:tracking-wider devs:hover:shadow-[0_0_18px_rgba(34,240,255,0.3)]">
                                    Message
                                  </motion.button>
                                </div>
                              </>
                            )}

                           </div>

                           
                        </div>
                        <div className="postCount w-full md:w-[80%] h-auto flex justify-start md:justify-center items-center gap-1 sm:gap-0 devs:font-mono">
                            <div className="posts flex-1 h-auto px-1 sm:px-6 flex justify-start items-center text-[var(--text-muted)] sm:text-[20px] text-[13px] whitespace-nowrap "><span className='text-[var(--text-primary)] devs:font-bold'>{isDevs ? <CountUp value={user.postsCount} /> : user.postsCount}</span>&nbsp;posts</div>
                            <div onClick={() => openFollowOverlay("followers")} className="fllwers flex-1 h-auto px-1 sm:px-6 flex justify-start items-center text-[var(--text-muted)] sm:text-[20px] text-[13px] whitespace-nowrap cursor-pointer devs:hover:text-[var(--devs-cyan)] transition-colors "><span className='text-[var(--text-primary)] devs:font-bold'>{isDevs ? <CountUp value={followers} /> : followers}</span>&nbsp;followers</div>
                            <div onClick={() => openFollowOverlay("following")} className="fllwing flex-1 h-auto px-1 sm:px-6 flex justify-start items-center text-[var(--text-muted)] sm:text-[20px] text-[13px] whitespace-nowrap cursor-pointer devs:hover:text-[var(--devs-cyan)] transition-colors "><span className='text-[var(--text-primary)] devs:font-bold'>{isDevs ? <CountUp value={user.following?.length} /> : user.following?.length}</span>&nbsp;following</div>
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
                       className="highlightSection w-full min-h-[110px] sm:min-h-[150px] py-2 px-1 sm:px-2 flex justify-start items-center sm:items-start gap-3 sm:gap-10 overflow-x-auto scrollbar-hide select-none cursor-grab ">
                          {isOwnProfile && (
                            <div
                              onClick={() => setShowNewHighlightModal(true)}
                              className={`newHighlightsection group h-full ${HIGHLIGHT_TILE_W} sm:w-[100px] flex flex-col justify-center sm:justify-start items-center cursor-pointer shrink-0`}
                            >
                               <div className="newHighLightCircle w-[70px] h-[70px] sm:w-[100px] sm:h-[100px] shrink-0 rounded-full object-fit object-center border-[4px] border-[var(--border-container)] overflow-hidden flex justify-center items-center bg-[var(--bg-input)] devs:border-2 devs:border-dashed devs:border-[var(--devs-cyan)] devs:transition-all devs:duration-300 devs:group-hover:shadow-[0_0_24px_rgba(34,240,255,0.45)] devs:group-hover:rotate-90">
                                 <Plus size={32} className="text-[var(--text-primary)] devs:text-[var(--devs-cyan)] select-none sm:w-10 sm:h-10" />
                              </div>
                              <div className="newtext text-[var(--text-primary)] text-[12px] devs:font-mono devs:mt-1.5">New</div>
                             </div>
                          )}
                          {highlights.map((h, i) => (
                            // quarter-width slot on mobile; the circle + title are centred inside it
                            <div
                              key={h._id}
                              className={`shrink-0 min-w-0 flex justify-center ${HIGHLIGHT_TILE_W}`}
                              style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
                              onContextMenu={(e) => openDeletePopup(h, e)}
                              onTouchStart={(e) => startLongPress(h, e)}
                              onTouchMove={moveLongPress}
                              onTouchEnd={cancelLongPress}
                              onTouchCancel={cancelLongPress}
                              onClickCapture={blockClickAfterLongPress}
                            >
                              <HighlightCircle
                                title={h.title}
                                coverImage={h.coverImage}
                                index={i + 1}
                                onClick={() => handleHighlightClick(h)}
                              />
                            </div>
                          ))}
                  </div>
                )}

            </div>

            <div className="postHeader w-full h-[10%] flex justify-center items-center ">

             <PostType type={"Posts"} icon={Grid3x3} activeTab={activeTab} setActiveTab={setActiveTab} />
             <PostType type={"Reels"} icon={Clapperboard} activeTab={activeTab} setActiveTab={setActiveTab} />
             {isOwnProfile && (
               <PostType type={"Saved"} icon={Bookmark} activeTab={activeTab} setActiveTab={setActiveTab} />
             )}
             <PostType type={"Tagged"} icon={Tag} activeTab={activeTab} setActiveTab={setActiveTab} />

            </div>

          {activeTab === "Posts" && (
            <>
              {posts.length > 0 ? (
                <div className="postSection w-full min-h-[44%] grid grid-cols-3 devs:gap-1.5 devs:p-1.5">
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
                <EmptyState title="No Posts Yet">
                  When posts are shared, they'll appear here.
                </EmptyState>
              )}
            </>
          )}

        {activeTab === "Reels" && (
            <>
              {reels.length > 0 ? (
                <div className="reelSection w-full min-h-[44%] grid grid-cols-4 devs:gap-1.5 devs:p-1.5">
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
                <EmptyState title="No Reels Yet">
                  When reels are posted, they'll appear here.
                </EmptyState>
              )}
            </>
          )}

        {activeTab === "Tagged" && (
          <>
            {taggedItems.length > 0 ? (
              <div className="tagSection w-full min-h-[44%] grid grid-cols-3 devs:gap-1.5 devs:p-1.5">
                {taggedItems.map((item) => (
                  <TagCard key={`${item.type}-${item._id}`} item={item} />
                ))}
              </div>
            ) : (
              <EmptyState title="No Tagged Posts">
                When people tag {isOwnProfile ? "you" : "them"} in photos and videos, they'll appear here.
              </EmptyState>
            )}
          </>
        )}
        
        {activeTab === "Saved" && isOwnProfile && (
          <>
            <div className="savedSectionHeader w-full h-[50px] flex justify-between items-center p-4">
              <div className="msg text-[12px] text-[var(--text-muted)] devs:font-mono devs:tracking-wide">Only you can see what you've saved</div>
              {/* <button className="newCollection text-[14px] text-[var(--link-muted)] hover:text-[var(--link-muted-hover)] cursor-pointer ">+ New collection</button> */}
            </div>

            {savedItems.length > 0 ? (
              <div className="SavedSection w-full min-h-[44%] grid grid-cols-5 devs:gap-1.5 devs:p-1.5">
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
              <EmptyState title="No Saved Posts Yet">
                When posts are saved, they'll appear here.
              </EmptyState>
            )}
          </>
        )}

      <MobileFooter />
       

        </div>
      </div>

      {/* Delete-highlight popup (right-click on PC / long-press on mobile) */}
      {highlightToDelete && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 devs:backdrop-blur-sm flex items-center justify-center px-6"
          onClick={() => {
            // ignore the click that follows the finger lifting after a long press
            if (Date.now() - lastLongPress.current < 700) return
            closeDeletePopup()
          }}
        >
          <motion.div
            {...(isDevs
              ? {
                  initial: { scale: 0.9, y: 16, opacity: 0 },
                  animate: { scale: 1, y: 0, opacity: 1 },
                  transition: { type: "spring", stiffness: 380, damping: 28 },
                }
              : {})}
            onClick={(e) => e.stopPropagation()}
            className={`bg-neutral-900 rounded-2xl p-5 w-full max-w-xs text-center ${isDevs ? "devs-glass devs-neon-border !rounded-3xl" : ""}`}
          >
            <p className="text-white text-base font-medium mb-2 devs:font-bold truncate">
              Delete “{highlightToDelete.title}”?
            </p>
            <p className="text-neutral-400 text-sm mb-5 devs:font-mono devs:text-[11px] devs:leading-relaxed">
              This will permanently delete the whole highlight. The stories themselves won't be deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={closeDeletePopup}
                disabled={deletingHighlight}
                className="flex-1 py-2 rounded-lg bg-neutral-700 text-white text-sm disabled:opacity-50 devs:bg-[var(--bg-secondary-btn)] devs:hover:bg-[var(--bg-secondary-btn-hover)] devs:font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteHighlight}
                disabled={deletingHighlight}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm disabled:opacity-50 devs:bg-[var(--color-danger)] devs:font-mono devs:font-bold"
              >
                {deletingHighlight ? "..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

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