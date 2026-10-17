// BioCard.jsx
import React, { useState } from "react";

const BioCard = ({ bioText }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const MAX_LENGTH = 80;
  const shouldTruncate = bioText.length > MAX_LENGTH;

  const toggleReadMore = () => setIsExpanded(!isExpanded);

  const displayText = isExpanded
    ? bioText
    : bioText.slice(0, MAX_LENGTH) + (shouldTruncate ? "..." : "");

  return (
    <div className="bio w-full h-auto text-[var(--text-primary)] text-[14px] sm:text-[18px] devs:font-mono devs:text-[var(--text-secondary)]">
      <div className="bioContainer w-full px-1 sm:px-6 py-1 leading-relaxed break-words">
        <p className="inline whitespace-pre-wrap break-words">{displayText}</p>
        {shouldTruncate && (
          <button
            onClick={toggleReadMore}
            className="ml-1 text-[var(--link-muted)] hover:text-[var(--link-muted-hover)] font-medium cursor-pointer focus:outline-none devs:text-[var(--devs-cyan)] devs:hover:[text-shadow:0_0_10px_rgba(34,240,255,0.8)]"
          >
            {isExpanded ? "Read less" : "Read more"}
          </button>
        )}
      </div>
    </div>
  );
};

export default BioCard;