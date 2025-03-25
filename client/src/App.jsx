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
    transition: { duration: 0.3 }
  }
};

const thumbnailVariantss = {
  hover: { y: -5, scale: 1.02 },
  tap: { scale: 0.98 }
};

function App() {
  const [thumbnails, setThumbnails] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const [success, setSuccess] = useState(false);
  const [videoInfo, setVideoInfo] = useState({ title: '', channel: '' });

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
        throw new Error('Please open a YouTube video first');
      }

      const videoId = new URL(url).searchParams.get('v');
      if (!videoId) {
        throw new Error('Could not get video details');
      }

      // Get video title and channel name
      const videoData = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => ({
          title: document.querySelector('h1.ytd-watch-metadata')?.textContent?.trim() || 'YouTube Video',
          channel: document.querySelector('#text.ytd-channel-name a')?.textContent?.trim() || 'Unknown Channel'
        })
      });

      setVideoInfo({
        title: videoData[0].result.title,
        channel: videoData[0].result.channel
      });

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
      }))

      const validThumbs = thumbs.filter(thumb => thumb.valid);
      if (validThumbs.length === 0) {
        throw new Error('No thumbnails available for this video');
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
      const filename = `${videoInfo.channel} - ${videoInfo.title} (${quality}).jpg`
        .replace(/[<>:"/\\|?*]/g, '') // Remove invalid filename characters
        .substring(0, 100); // Limit filename length

      await chrome.downloads.download({ 
        url,
        filename: `ThumbGrabber/${filename}`
      });
      
      setSuccess(true);
      setTimeout(() => {
        setDownloading(null);
        setSuccess(false);
      }, 3000);
    } catch (error) {
      setError('Download failed. Please try again.');
      setDownloading(null);
    }
  };

  if (error) {
    return (
      <motion.div 
        initial="hidden"
        animate="show"
        variants={containerVariants}
        className="w-[340px] p-4 bg-white rounded-xl shadow-md"
      >
        <motion.div variants={itemVariants} className="flex flex-col items-center space-y-3">
          <FiAlertCircle className="w-8 h-8 text-red-500" />
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-800">ThumbGrabber</h2>
            <p className="text-sm text-gray-600 mt-1">{error}</p>
          </div>
          <motion.button
            onClick={fetchThumbnails}
            variants={itemVariants}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg flex items-center"
          >
            <FiRefreshCw className="mr-2" />
            Try Again
          </motion.button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="w-[340px] p-4 bg-white rounded-xl shadow-lg"
    >
      {/* Header */}
      <motion.div 
        variants={itemVariants}
        className="flex justify-between items-center mb-4"
      >
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
          ThumbGrabber
        </h1>
        <motion.button 
          onClick={fetchThumbnails}
          disabled={isLoading}
          whileHover={{ rotate: 20 }}
          whileTap={{ scale: 0.9 }}
          className="p-1.5 bg-gray-100 rounded-lg"
        >
          <FiRefreshCw className={`w-4 h-4 text-gray-600 ${isLoading ? 'animate-spin' : ''}`} />
        </motion.button>
      </motion.div>

      {/* Content */}
      <motion.div variants={itemVariants} className="mb-2">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
                className="rounded-lg overflow-hidden w-[150px] h-[84px]"
              >
                <div className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {thumbnails.map((thumb) => (
                <motion.div
                  key={thumb.value}
                  layout
                  variants={itemVariants}
                  whileHover="hover"
                  whileTap="tap"
                  variants={thumbnailVariantss}
                  className="relative w-[150px] h-[84px]"
                >
                  <div className="w-full h-full rounded-lg overflow-hidden shadow-sm">
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
                      className={`absolute bottom-0 left-0 right-0 flex items-center justify-center 
                        ${downloading === thumb.name ? 'bg-gray-800' : 'bg-blue-600'}
                        text-white text-xs font-medium h-8`}
                    >
                      {downloading === thumb.name ? (
                        <motion.span className="flex items-center">
                          <FiDownload className="mr-1.5 animate-bounce" />
                          Downloading...
                        </motion.span>
                      ) : (
                        <motion.span className="flex items-center">
                          <FiDownload className="mr-1.5" />
                          {thumb.name}
                        </motion.span>
                      )}
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Success Toast */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            className="fixed bottom-4 right-4 flex items-center px-3 py-2 bg-green-500 text-white text-xs font-medium rounded-lg shadow-md"
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