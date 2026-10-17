// FollowingSuggestionCard.jsx
import React, { useState, useEffect } from 'react'
import axios from "axios"
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { BadgeCheck } from 'lucide-react';


const BASE_URL = import.meta.env.VITE_SERVER_URL

const FollowingSuggestionCard = ({...props}) => {

  const { isDevs, lite } = useTheme()

  const [isFollowed, setIsFollowed] = useState(false);

  const isAdmin = props.user.role === "admin"


  const { user, refreshUser } = useAuth()


  useEffect(() => {
    const followed = user?.following?.some(
      (id) => id.toString() === props.user?._id?.toString()
    );


    setIsFollowed(Boolean(followed));
  }, [user?.following, props.user?._id]);


  const handleFollowToggle = async () => {
    try {
      const token = localStorage.getItem("authToken");


      const response = await axios.post(
        `${BASE_URL}/user/profile/${props.user._id}/follow-toggle`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );


      if (response.data.success) {
        setIsFollowed(response.data.isFollowing);
        await refreshUser();
      }
    } catch (error) {
      console.log(error);
    }
  };


  return (


    <motion.div
      {...(isDevs
        ? {
            initial: { opacity: 0, y: 14, scale: 0.95 },
            animate: { opacity: 1, y: 0, scale: 1 },
            whileHover: { y: -4 },
            transition: { duration: 0.3, ease: [0.2, 0.8, 0.2, 1] },
          }
        : {})}
      className="suggestedCard w-[calc(50%-16px)] max-w-[180px] h-auto min-h-[140px] rounded-xl m-2 cursor-pointer bg-[var(--bg-elevated)] hover:bg-[var(--bg-menu-hover)] transition-all duration-200 border border-[var(--border-soft)] hover:border-[var(--border-popup)] shadow-sm hover:shadow-md devs:rounded-2xl devs:backdrop-blur-md devs:hover:border-[var(--devs-cyan)] devs:hover:shadow-[0_0_26px_rgba(34,240,255,0.22)]"
    >
      
      {/* Profile Picture Section */}
      <div className="profilePicSection w-full h-[45%] flex justify-center items-center pt-3 pb-2">
        {isDevs ? (
          <div className="relative w-[70px] h-[70px]">
            <span
              className="absolute -inset-[2px] rounded-full"
              style={{
                background:
                  "conic-gradient(from var(--devs-angle), #22f0ff, #8b5cf6, #ff2bd6, #22f0ff)",
                animation: lite ? "none" : "devs-spin 6s linear infinite",
              }}
            />
            <div className="pic relative w-full h-full rounded-full overflow-hidden border-2 border-[#04050e] bg-black">
              <img
                src={props.user.profilePic ? props.user.profilePic : "/images/default-profile-pic.jpg"}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ) : (
          <div className="pic w-[70px] h-[70px] rounded-full overflow-hidden ring-2 ring-[var(--border-soft)] hover:ring-[var(--brand-blue)] transition-all duration-200">
            <img 
              src={props.user.profilePic ? props.user.profilePic : "/images/default-profile-pic.jpg"} 
              alt="" 
              className="w-full h-full object-cover" 
            />
          </div>
        )}
      </div>
      
      {/* Name Section */}

        <div className="nameSection w-full h-[35%] px-2 pb-2">
          <Link to={`/user/get-profile/${props.user._id}`}>
            <div className="fullname w-full flex items-center justify-center gap-1 px-1">
              <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate hover:text-[var(--brand-blue)] transition-colors devs:font-bold">
                {props.user.fullname}
              </span>

              {isAdmin && (
                <BadgeCheck
                  size={13}
                  className="text-sky-400 devs:text-[var(--devs-cyan)] devs:drop-shadow-[0_0_5px_rgba(34,240,255,0.9)] shrink-0"
                />
              )}
            </div>

            <div className="username w-full text-center text-[11px] text-[var(--text-muted)] truncate hover:text-[var(--text-secondary)] transition-colors px-1 devs:font-mono">
              @{props.user.username}
            </div>
          </Link>
        </div>




      {/* Follow Button */}
      <div className="followBtn w-full h-[20%] flex justify-center items-center pb-3 px-2">
        <button
          onClick={handleFollowToggle}
          className={`w-full h-[32px] flex justify-center items-center font-semibold text-[12px] rounded-lg cursor-pointer transition-all duration-200 devs:rounded-full devs:font-mono devs:uppercase devs:tracking-wider devs:text-[10px] devs:active:scale-95 ${
            isFollowed
              ? "bg-transparent border border-[var(--border-container)] hover:border-[var(--border-input)] text-[var(--text-primary)] hover:bg-[var(--bg-menu-hover)] devs:border-[var(--border-popup)]"
              : "bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] text-[var(--text-on-brand)] shadow-sm hover:shadow devs:bg-[linear-gradient(120deg,#22f0ff,#8b5cf6)] devs:hover:bg-[linear-gradient(120deg,#22f0ff,#8b5cf6)] devs:font-bold devs:shadow-[0_0_14px_rgba(34,240,255,0.4)]"
          }`}
        >
          {isFollowed ? "Unfollow" : "Follow"}
        </button>
      </div>


    </motion.div>


  )
}


export default FollowingSuggestionCard