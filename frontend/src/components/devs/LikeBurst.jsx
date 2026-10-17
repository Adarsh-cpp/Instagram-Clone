import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const COLORS = ["#22f0ff", "#8b5cf6", "#ff2bd6", "#b6ff3b", "#ff2bd6", "#22f0ff"];

/*
  Neon like-burst used in Devs Mode.
    variant="big"  -> centred on the post media (double-tap / double-click)
    variant="mini" -> small burst around the like button's heart
  Re-fires every time `burstKey` changes (0 = idle).
  Fewer particles on lite devices (phones / touch / low-end).
*/
const LikeBurst = ({ burstKey = 0, variant = "big" }) => {
  const { lite } = useTheme();
  const big = variant === "big";
  const [shown, setShown] = useState(false);

  const count = big ? (lite ? 8 : 16) : lite ? 5 : 9;
  const radius = big ? 150 : 38;

  useEffect(() => {
    if (!burstKey) return;
    setShown(true);
    const t = setTimeout(() => setShown(false), big ? 1500 : 900);
    return () => clearTimeout(t);
  }, [burstKey, big]);

  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const dist = radius * (0.65 + Math.random() * 0.6);
        return {
          id: i,
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          size: (big ? 6 : 3) + Math.random() * (big ? 8 : 3),
          color: COLORS[i % COLORS.length],
          delay: Math.random() * 0.08,
          spark: i % 3 === 0,
        };
      }),
    [burstKey, count, radius, big]
  );

  if (!shown) return null;

  return (
    <div
      key={burstKey}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-visible z-20"
    >
      {/* Shockwave rings */}
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border-2"
          style={{
            width: big ? 120 : 34,
            height: big ? 120 : 34,
            borderColor: i ? "#22f0ff" : "#ff2bd6",
          }}
          initial={{ scale: 0.2, opacity: 0.9 }}
          animate={{ scale: big ? 3.4 : 2.4, opacity: 0 }}
          transition={{ duration: big ? 0.9 : 0.6, delay: i * 0.12, ease: "easeOut" }}
        />
      ))}

      {/* Big heart (double-tap only) */}
      {big && (
        <motion.span
          initial={{ scale: 0, rotate: -20, opacity: 1, y: 0 }}
          animate={{
            scale: [0, 1.35, 1, 1],
            rotate: [-20, 8, 0, 0],
            opacity: [1, 1, 1, 0],
            y: [0, 0, 0, -70],
          }}
          transition={{ duration: 1.2, times: [0, 0.25, 0.5, 1], ease: "easeOut" }}
          style={{ filter: "drop-shadow(0 0 22px rgba(255,43,214,0.9))" }}
        >
          <Heart size={110} fill="#ff2bd6" color="#ff2bd6" strokeWidth={0} />
        </motion.span>
      )}

      {/* Particles */}
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 10px ${p.color}`,
            borderRadius: p.spark ? "2px" : "9999px",
          }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
          animate={{
            x: p.x,
            y: p.y,
            scale: 0,
            opacity: 0,
            rotate: p.spark ? 180 : 0,
          }}
          transition={{
            duration: big ? 0.9 : 0.6,
            delay: p.delay,
            ease: [0.2, 0.8, 0.2, 1],
          }}
        />
      ))}
    </div>
  );
};

export default LikeBurst;