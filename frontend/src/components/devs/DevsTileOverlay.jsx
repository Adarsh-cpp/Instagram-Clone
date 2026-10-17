import React from 'react'
import { Heart, MessageCircle } from 'lucide-react'

/*
  Devs Mode hover layer shared by the Reel / Saved / Tagged tiles.
  The parent tile must have the `group` and `relative` classes.
*/
const CORNERS = [
  'top-2 left-2 border-t-2 border-l-2 rounded-tl-lg',
  'top-2 right-2 border-t-2 border-r-2 rounded-tr-lg',
  'bottom-2 left-2 border-b-2 border-l-2 rounded-bl-lg',
  'bottom-2 right-2 border-b-2 border-r-2 rounded-br-lg',
]

const DevsTileOverlay = ({ likesCount = 0, commentsCount = 0, onClick }) => (
  <>
    {/* HUD brackets appear on hover */}
    {CORNERS.map((c) => (
      <span
        key={c}
        className={`absolute w-3.5 h-3.5 pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${c}`}
        style={{
          borderColor: 'rgba(34,240,255,0.8)',
          filter: 'drop-shadow(0 0 4px rgba(34,240,255,0.8))',
        }}
      />
    ))}

    <div
      onClick={onClick}
      className="overlay w-full h-full absolute top-0 left-0 flex justify-center items-end pb-4 text-[12px] font-bold text-white bg-gradient-to-t from-black/0 via-black/0 to-black/0 group-hover:from-black/85 group-hover:via-black/30 group-hover:to-transparent transition-all duration-300 cursor-pointer"
    >
      <div className="details flex justify-center items-center gap-2 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
        <div className="likeCount devs-glass rounded-full px-3 h-[30px] flex justify-center items-center gap-1.5 font-mono">
          <Heart
            size={14}
            color="var(--devs-magenta)"
            fill="var(--devs-magenta)"
            style={{ filter: 'drop-shadow(0 0 6px rgba(255,43,214,0.9))' }}
          />
          {likesCount}
        </div>
        <div className="cmntCount devs-glass rounded-full px-3 h-[30px] flex justify-center items-center gap-1.5 font-mono">
          <MessageCircle
            size={14}
            color="var(--devs-cyan)"
            fill="var(--devs-cyan)"
            style={{ filter: 'drop-shadow(0 0 6px rgba(34,240,255,0.9))' }}
          />
          {commentsCount}
        </div>
      </div>
    </div>
  </>
)

export default DevsTileOverlay