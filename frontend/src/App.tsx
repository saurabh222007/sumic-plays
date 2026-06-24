import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { Toasts } from './components/Toast';
import { ClickToEnableOverlay } from './components/ClickToEnableOverlay';
import { Auth } from './pages/Auth';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Library } from './pages/Library';
import { MoodPlaylist } from './pages/MoodPlaylist';
import { MoodBrowser } from './pages/MoodBrowser';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as any } }}
        exit={{ opacity: 0, y: -6, transition: { duration: 0.18, ease: 'easeIn' as any } }}
        className="h-full w-full"
      >
        <Routes location={location}>
          <Route path="/login" element={<Auth />} />
          <Route element={<Layout />}>
            <Route path="/"         element={<Home />} />
            <Route path="/search"   element={<Search />} />
            <Route path="/library"  element={<Library />} />
            <Route path="/mood"     element={<MoodBrowser />} />
            <Route path="/mood/:id" element={<MoodPlaylist />} />
          </Route>
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AnimatedRoutes />
      <Toasts />
      <ClickToEnableOverlay />
    </BrowserRouter>
  );
}

export default App;
