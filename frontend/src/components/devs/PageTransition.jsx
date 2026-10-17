import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTheme } from "../../context/ThemeContext";

/*
  Layout route used by router.jsx.

  - The wrapper is keyed by the first 3 path segments, so moving between
    /user/messages and /user/messages/:id does NOT remount the page
    (same behaviour as before). Different sections remount, which they
    already did.
  - Light/Dark: the wrapper is `display: contents`, so it has no box and
    the layout is identical to having no wrapper.
  - Devs Mode: pages fade/slide in on navigation.
*/
const PageTransition = () => {
  const { isDevs } = useTheme();
  const { pathname } = useLocation();

  const section = pathname.split("/").slice(0, 3).join("/") || "/";

  return (
    <motion.div
      key={section}
      initial={isDevs ? { opacity: 0, y: 14 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className={isDevs ? "w-full h-full" : undefined}
      style={isDevs ? undefined : { display: "contents" }}
    >
      <Outlet />
    </motion.div>
  );
};

export default PageTransition;