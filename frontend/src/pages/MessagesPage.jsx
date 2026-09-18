// MessagesPage.jsx
import React, { useEffect, useState } from 'react'
import MessageCard from '../components/MessageCard'
import Chat from '../components/Chat'
import InstaAIChat from '../components/InstaAIChat'
import axios from 'axios'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { Search, MessageCircle, Sparkles, BadgeCheck } from 'lucide-react'

const BASE_URL = import.meta.env.VITE_SERVER_URL

// Reserved conversation id for the AI assistant. Real conversations are
// 24-char hex ObjectIds, so this can never collide with one — which is why
// no new route is needed: /user/messages/insta-ai simply resolves here.
const AI_CONVERSATION_ID = "insta-ai"

const MessagesPage = () => {

  const [conversations, setConversations] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const { conversationId } = useParams()
  const { user } = useAuth()
  const { socket } = useSocket()
  const navigate = useNavigate()

  const isAiOpen = conversationId === AI_CONVERSATION_ID

  useEffect(() => {
  const getAllConversations = async () => {
    try {
      const url = `${BASE_URL}/conversation/get-all-conversations`
      const token = localStorage.getItem("authToken")

      const response = await axios.get(url,{
        headers:{
          Authorization: `Bearer ${token}`
        }}
      )

      if(response.status === 200){
        setConversations(response.data.conversations)
      }
      else
        console.log("error fetching conversations")

    } catch (error) {
      console.log(error.message)
    }
  }
  getAllConversations()
  }, [])

  // If the *other* participant deletes the conversation, our copy needs to
  // disappear too — deletion is a hard delete on the backend for both sides.
  useEffect(() => {
    if (!socket) return

    const handleConversationDeleted = ({ conversationId: deletedId }) => {
      setConversations((prev) => prev.filter((c) => c._id !== deletedId))
      if (conversationId === deletedId) {
        navigate('/user/messages')
      }
    }

    socket.on("conversationDeleted", handleConversationDeleted)
    return () => socket.off("conversationDeleted", handleConversationDeleted)
  }, [socket, conversationId, navigate])

  // Each conversation's `participants` array (from the backend) contains
  // BOTH users in the chat. We find the "other" participant (not the
  // logged-in user) to search/display against.
  const getOtherParticipant = (conversation) => {
    return conversation?.participants?.find(
      (p) => p._id?.toString() !== user?._id?.toString()
    )
  }

  const filteredConversations = conversations.filter((conversation) => {
    if (!searchTerm.trim()) return true

    const term = searchTerm.toLowerCase()
    const otherUser = getOtherParticipant(conversation)

    const username = otherUser?.username?.toLowerCase() || ""
    const fullname = otherUser?.fullname?.toLowerCase() || ""

    return username.includes(term) || fullname.includes(term)
  })

  // The AI row is pinned above real conversations, and stays searchable
  // alongside them.
  const showAiRow =
    !searchTerm.trim() || "instaai ai assistant".includes(searchTerm.trim().toLowerCase())

  // Passed down to MessageCard — actually performs the delete and keeps
  // this list (the single source of truth for conversations) in sync.
  const handleDeleteConversation = async (idToDelete) => {
    const token = localStorage.getItem("authToken")

    // optimistic removal so the UI feels instant
    const previousConversations = conversations
    setConversations((prev) => prev.filter((c) => c._id !== idToDelete))

    try {
      const url = `${BASE_URL}/conversation/${idToDelete}`
      const response = await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.status !== 200) {
        throw new Error("Failed to delete conversation")
      }

      if (conversationId === idToDelete) {
        navigate('/user/messages')
      }
    } catch (error) {
      console.log(error.message)
      // rollback on failure
      setConversations(previousConversations)
    }
  }

  return (
    <div className="messagePage w-screen h-screen flex bg-[var(--bg-app)] overflow-hidden">

      <div className={`messagesList w-full md:w-[35%] lg:w-[30%] h-full border-r border-[var(--border-soft)] bg-[var(--bg-app)] ${conversationId ? "hidden md:block" : "block"}`}>

        <div className="upperPart w-full h-[20%]">

          <div className="accName w-full h-[40%] text-[var(--text-primary)] text-[18px] sm:text-[20px] font-semibold px-4 sm:px-8 flex justify-start items-center gap-1.5">
            {user?.username}
            {user?.role === "admin" && (
             <BadgeCheck size={14} className="text-sky-400 shrink-0" />
            )}
          </div>

          <div className="searchSection w-full h-[60%] flex justify-center items-center border-b border-[var(--border-soft)]">

            <div className="searchbar w-[90%] h-[60%] flex justify-center items-center bg-[var(--bg-elevated)] rounded-3xl overflow-hidden">

              <div className="searchIcon w-[15%] sm:w-[10%] h-full flex justify-center items-center">
                <Search className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--text-muted)]" />
              </div>

              <div className="searchText flex-1 h-full flex justify-center items-center">
                <input
                  type="text"
                  name="search"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-full outline-none text-[var(--text-primary)] px-4 bg-transparent"
                  placeholder="Search"
                />
              </div>

            </div>

          </div>

        </div>

        <div className="bottomPart w-full h-[75%]  overflow-y-auto">

        {/* --- InstaAI entry, pinned above real conversations --- */}
        {showAiRow && (
          <div
            onClick={() => navigate(`/user/messages/${AI_CONVERSATION_ID}`)}
            className={`instaAiRow w-full h-[72px] flex items-center gap-3 px-4 cursor-pointer transition-colors ${
              isAiOpen ? "bg-[var(--bg-elevated)]" : "hover:bg-[var(--bg-row-hover)]"
            }`}
          >
            <div className="w-[50px] h-[50px] shrink-0 rounded-full flex items-center justify-center bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500">
              <Sparkles size={22} color="white" />
            </div>

            <div className="min-w-0 flex flex-col">
              <span className="text-[var(--text-primary)] text-[15px] font-semibold truncate">
                InstaAI
              </span>
              <span className="text-[var(--text-muted)] text-[13px] truncate">
                Your AI assistant
              </span>
            </div>
          </div>
        )}

       {
          filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <MessageCard
                key={conversation._id}
                conversation={conversation}
                onDeleteConversation={handleDeleteConversation}
              />
            ))
          ) : (
            !showAiRow && (
              <div className="w-full h-full flex justify-center items-center text-[var(--text-muted)] text-[14px]">
                No conversations found
              </div>
            )
          )
        }
        </div>

      </div>

      {isAiOpen ? (
        <InstaAIChat />
      ) : conversationId ? (
        <Chat conversationId={conversationId} />
      ) : (
        <div className="messageDisplay hidden md:flex md:flex-col relative md:w-[65%] lg:w-[70%] h-full bg-[var(--bg-app)] text-[var(--text-primary)] text-[20px]  justify-center items-center ">
          <div className="messageIcon w-full h-[120px] flex justify-center items-center ">
            <MessageCircle className="h-[80px] w-[80px] text-[var(--text-primary)]" strokeWidth={1.5} />
          </div>
          <div className="text w-full h-[60px] ">
            <div className="upperText w-full h-[50%] flex justify-center items-center text-[var(--text-primary)] text-[24px] ">
              <span>Your messages</span>
            </div>
            <div className="lowerText w-full h-[50%] flex justify-center items-end text-[var(--text-muted)] text-[18px] ">
              <span>Send private photos and messages to a friend or group.</span>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default MessagesPage
