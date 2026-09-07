import React from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'
import { getTimeAgo } from '../utils/timeAgo'

const MessageCard = ({ ...props }) => {
  const { user } = useAuth()
  const { onlineUsers } = useSocket()

  const friend = props.conversation?.participants.find(
    (participant) => participant?._id !== user?._id
  );

  const isOnline = onlineUsers?.includes(friend?._id);

  const limit = 6;

  const isLastMessageMine =
    props.conversation?.lastMessageSenderId &&
    String(props.conversation.lastMessageSenderId) === String(user?._id);

  const rawLastMessage =
    props.conversation?.lastMessageType === "story_reply"
      ? isLastMessageMine
        ? "Replied to their story"
        : "Replied to your story"
      : props.conversation?.lastMessage || "";

  const words = rawLastMessage.split(" ");

  const shortText =
    words.length > limit ? words.slice(0, limit).join(" ") + "..." : rawLastMessage;

  const unreadCount = props.conversation?.unreadCount || 0;

  const timeAgo = getTimeAgo(props.conversation?.lastMessageTime);

  return (
    <Link to={`/user/messages/${props.conversation?._id}`}>
      <div className="messageCard w-full h-[80px] sm:h-[85px] flex justify-center items-center rounded-xl hover:bg-[#25292e] cursor-pointer px-2">

        <div className="profilePicSection w-[20%] h-full flex justify-center items-center">
          <div className="profilePic relative w-[55px] h-[55px] sm:w-[70px] sm:h-[70px]">
            <div className="w-full h-full rounded-full overflow-hidden">
              <img
                src={friend?.profilePic ? friend.profilePic : "/images/default-profile-pic.jpg" }
                alt=""
                className="w-full h-full object-cover"
              />
            </div>

            {isOnline && (
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[#121212]" />
            )}
          </div>
        </div>

        <div className="messageDetails w-[80%] h-full">
          <div className="fullname w-full h-[50%] flex justify-start items-end text-white text-[18px] md:text-[15px] lg:text-[18px]">
            <span className="ml-2">{friend?.fullname}</span>
          </div>

          <div className="lastMsg w-full h-[50%] flex justify-start items-start text-[14px] md:text-[12px] lg:text-[14px] mt-1">
            {unreadCount > 1 ? (
              <span className="ml-2 text-white font-semibold">
                {unreadCount > 9 ? "9+ new messages" : `${unreadCount} new messages`}
              </span>
            ) : (
              <>
                <span className={`ml-2 ${unreadCount === 1 ? "text-white font-semibold" : "text-[#a2a3a3]"}`}>
                  {shortText}
                </span>
                <span className="ml-2 text-[#a2a3a3]">· {timeAgo}</span>
              </>
            )}
          </div>
        </div>

      </div>
    </Link>
  )
}

export default MessageCard