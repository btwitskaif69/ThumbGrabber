import { useEffect, useState } from 'react';
import { FiDownload, FiRefreshCw, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

const thumbnailVariants = {
  hover: { y: -5, scale: 1.02 },
  tap: { scale: 0.98 }
};

function App() {
  const [thumbnails, setThumbnails] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [success, setSuccess] = useState(false);
  const [channelName, setChannelName] = useState('');

  useEffect(() => { 
    fetchThumbnails(); 
  }, []);

  const fetchThumbnails = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab?.url;

      if (!url?.includes('youtube.com/watch')) {
        throw new Error('Open a YouTube video to grab thumbnails');
      }

      const videoId = new URL(url).searchParams.get('v');
      if (!videoId) {
        throw new Error('Could not get video details');
      }

      // Get channel name only
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.querySelector('#text.ytd-channel-name a')?.textContent?.trim() || 'Unknown Channel'
      });

      setChannelName(result[0].result);

      const resolutions = [
        { name: 'Max', value: 'maxresdefault' },
        { name: 'High', value: 'hqdefault' },
        { name: 'Medium', value: 'mqdefault' },
        { name: 'Standard', value: 'default' },
      ];

      const thumbs = await Promise.all(resolutions.map(async (res) => {
        const imgUrl = `https://img.youtube.com/vi/${videoId}/${res.value}.jpg`;
        const valid = await checkImageExists(imgUrl);
        return { ...res, url: imgUrl, valid };
      }));

      const validThumbs = thumbs.filter(thumb => thumb.valid);
      if (validThumbs.length === 0) {
        throw new Error('No thumbnails available');
      }

      setThumbnails(validThumbs);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const checkImageExists = (url) => {
    return new Promise(resolve => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
    });
  };

  const downloadImage = async (url, quality) => {
    setDownloading(quality);
    try {
      const filename = `${channelName} (${quality}).jpg`
        .replace(/[<>:"/\\|?*]/g, '')
        .substring(0, 80);

      await chrome.downloads.download({ 
        url,
        filename: `ThumbGrabber/${filename}`
      });
      
      setSuccess(true);
      setTimeout(() => {
        setDownloading(null);
        setSuccess(false);
      }, 2000);
    } catch (error) {
      setError('Download failed. Please try again.');
      setDownloading(null);
    }
  };

  if (error) {
    return (
<motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-[320px] p-6 bg-white rounded-xl shadow-lg border border-gray-200"
      >
        <div className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
            <FiAlertCircle className="text-red-500 text-2xl" />
          </div>
          
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Error</h2>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>

          <button
            onClick={fetchThumbnails}
            className="mx-auto px-5 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center"
          >
            <FiRefreshCw className="mr-2" />
            Reload
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="w-[340px] p-5 bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20"
    >
      {/* Header with glass morphism */}
      <motion.div 
        variants={itemVariants}
        className="flex justify-between items-center mb-5"
      >
<div className="mb-1">
  <div className="inline-block">
    <h1 className="text-2xl font-bold text-white">
      <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        Thumb
      </span>
      <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
        Grabber
      </span>
    </h1>
    {channelName && (
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center"
      >
        <span className="text-base font-medium text-gray-400">@</span>
        <span className="text-base font-semibold text-gray-400">
          {channelName}
        </span>
      </motion.div>
    )}
  </div>
</div>
        <motion.button 
          onClick={fetchThumbnails}
          disabled={isLoading}
          whileHover={{ rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          className="p-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-sm"
        >
          <FiRefreshCw className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : ''}`} />
        </motion.button>
      </motion.div>

      {/* Thumbnail grid */}
      <motion.div variants={itemVariants} className="mb-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
                className="rounded-xl overflow-hidden w-[150px] h-[84px] bg-white/20 backdrop-blur-sm"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {thumbnails.map((thumb) => (
                <motion.div
                  key={thumb.value}
                  layout
                  initial="hidden"
                  animate="show"
                  whileHover="hover"
                  whileTap="tap"
                  variants={thumbnailVariants}
                  className="relative w-[150px] h-[84px] rounded-xl overflow-hidden group"
                >
                  <img
                    src={thumb.url}
                    alt={thumb.name}
                    className="w-full h-full object-cover"
                  />
                  <motion.button
                    onClick={() => downloadImage(thumb.url, thumb.name)}
                    disabled={downloading === thumb.name}
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className={`absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent flex items-end justify-center p-2 ${
                      downloading === thumb.name ? 'opacity-100' : ''
                    }`}
                  >
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium ${
                        downloading === thumb.name 
                          ? 'bg-gray-800/90 text-white/90' 
                          : 'bg-white/90 text-gray-900 hover:bg-white'
                      }`}
                    >
                      {downloading === thumb.name ? (
                        <>
                          <FiDownload className="mr-1.5 animate-bounce" />
                          Downloading...
                        </>
                      ) : (
                        <>
                          <FiDownload className="mr-1.5" />
                          {thumb.name}
                        </>
                      )}
                    </motion.span>
                  </motion.button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Success notification */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="fixed bottom-4 right-4 flex items-center px-4 py-2.5 bg-green-500/90 text-white text-sm font-medium rounded-xl shadow-lg backdrop-blur-sm"
          >
            <FiCheckCircle className="mr-2" />
            Download started!
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default App;