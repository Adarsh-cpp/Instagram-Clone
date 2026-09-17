// FollowingSuggestionCard.jsx
import React, { useState, useEffect } from 'react'
import axios from "axios"
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const BASE_URL = import.meta.env.VITE_SERVER_URL

const FollowingSuggestionCard = ({...props}) => {


  const [isFollowed, setIsFollowed] = useState(false);


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


    <div className="suggestedCard w-[calc(50%-16px)] max-w-[180px] h-auto min-h-[140px] rounded-xl m-2 cursor-pointer bg-[var(--bg-elevated)] hover:bg-[var(--bg-menu-hover)] transition-all duration-200 border border-[var(--border-soft)] hover:border-[var(--border-popup)] shadow-sm hover:shadow-md">
      
      {/* Profile Picture Section */}
      <div className="profilePicSection w-full h-[45%] flex justify-center items-center pt-3 pb-2">
        <div className="pic w-[70px] h-[70px] rounded-full overflow-hidden ring-2 ring-[var(--border-soft)] hover:ring-[var(--brand-blue)] transition-all duration-200">
          <img 
            src={props.user.profilePic ? props.user.profilePic : "/images/default-profile-pic.jpg"} 
            alt="" 
            className="w-full h-full object-cover" 
          />
        </div>
      </div>
      
      {/* Name Section */}
      <div className="nameSection w-full h-[35%] px-2 pb-2">
        <Link to={`/user/get-profile/${props.user._id}`}>
          <div className="fullname w-full text-center text-[13px] font-semibold text-[var(--text-primary)] truncate hover:text-[var(--brand-blue)] transition-colors px-1">
            {props.user.fullname}
          </div>
          <div className="username w-full text-center text-[11px] text-[var(--text-muted)] truncate hover:text-[var(--text-secondary)] transition-colors px-1">
            @{props.user.username}
          </div>
        </Link>
      </div>


      {/* Follow Button */}
      <div className="followBtn w-full h-[20%] flex justify-center items-center pb-3 px-2">
        <button
          onClick={handleFollowToggle}
          className={`w-full h-[32px] flex justify-center items-center font-semibold text-[12px] rounded-lg cursor-pointer transition-all duration-200 ${
            isFollowed
              ? "bg-transparent border border-[var(--border-container)] hover:border-[var(--border-input)] text-[var(--text-primary)] hover:bg-[var(--bg-menu-hover)]"
              : "bg-[var(--brand-blue)] hover:bg-[var(--brand-blue-hover)] text-[var(--text-on-brand)] shadow-sm hover:shadow"
          }`}
        >
          {isFollowed ? "Unfollow" : "Follow"}
        </button>
      </div>


    </div>


  )
}


export default FollowingSuggestionCard