import React, { useState } from 'react';
import { Search, ChevronDown, Heart, MessageCircle, Repeat2, Eye, LayoutTemplate, Shuffle } from 'lucide-react';

const POSTS = [
  {
    id: 1,
    author: {
      name: 'Scott Redler',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=faces',
    },
    content: 'As we get older we all need a few things to help perspective. This APP "headway" is great. Takes 100+ books. Turns them into 15 minute Audios. (Good for my ADHD as that\'s about all I can last.\nhttps://t.co/1hUO3e8R1e',
    image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400&auto=format&fit=crop',
    stats: { likes: 11, comments: 2, retweets: 3 },
    platform: 'X'
  },
  {
    id: 2,
    author: {
      name: 'TeacherGoals',
      avatar: 'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=32&h=32&fit=crop&crop=faces',
    },
    content: 'So true! 🙌\nhttps://t.co/SJTA7ZFfv9',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=400&auto=format&fit=crop',
    stats: { likes: 1397, comments: 10, retweets: 315 },
    platform: 'X'
  },
  {
    id: 3,
    author: {
      name: 'Matt - V Shape Fitness',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop&crop=faces',
    },
    content: 'Can\'t drop fat? I guarantee it\'s your crappy diet. I\'ve put together the 5-Step V Shape Nutrition System to help you nail your nutrition permanently. Automate your fat loss with over 5,000 other High Performers and grab your FREE copy here:\nhttps://t.co/D1YErLTZca\nhttps://t.co/aj7z2yiXMD',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=400&auto=format&fit=crop',
    stats: { likes: 1, comments: 0, retweets: 1 },
    platform: 'X'
  },
  {
    id: 4,
    author: {
      name: 'The Economist',
      avatar: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=32&h=32&fit=crop&crop=faces',
    },
    content: 'Whether the regime can regain popular legitimacy in Iran could largely depend on how much leeway it lends the new president. Anticipating his victory, residents crowded the streets as if the regime\'s strict dress code had already been repealed\nhttps://t.co/d52FMRGAKY 👇',
    stats: { likes: 46, comments: 11, retweets: 19 },
    platform: 'X'
  },
  {
    id: 5,
    author: {
      name: 'The Wall Street Journal',
      avatar: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=32&h=32&fit=crop&crop=faces',
    },
    content: 'Rich Hill, 44, took most of the season off to coach his son\'s team of 12-year-olds. Then the Red Sox came calling.\nhttps://t.co/bFAW21fS2r\nhttps://t.co/bFAW21fS2r',
    stats: { likes: 30, comments: 2, retweets: 9 },
    platform: 'X'
  },
  {
    id: 6,
    author: {
      name: 'Bryan Johnson /dd',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=faces',
    },
    content: 'I told my 12 and 14 year old boys that I was always going to be able to beat them up, and I\'d do it in front of their partners.\nhttps://t.co/mw5yNkCLw8',
    stats: { likes: 926, comments: 53, retweets: 29 },
    platform: 'X'
  },
  {
    id: 7,
    author: {
      name: 'Nate Silver',
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=32&h=32&fit=crop&crop=faces',
    },
    content: 'Suspicious of any Yelp review that: * Mentions the server/host/hostess by name * Uses the phrase "hands down" * Makes implausible claims as to "best I\'ve ever had" (e.g. claiming you just ate the "best crab cake I\'ve ever had" at the Comfort Inn Omaha Airport)',
    stats: { likes: 664, comments: 72, retweets: 24 },
    platform: 'X'
  },
  {
    id: 8,
    author: {
      name: '@levelsio',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=32&h=32&fit=crop&crop=faces',
    },
    content: 'This is every European waiter in 2024\nhttps://t.co/MhkOwU3Rcw\nhttps://t.co/cYsV6H1xyE',
    video: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
    stats: { likes: 0, comments: 0, retweets: 0 },
    platform: 'X'
  },
  {
    id: 9,
    author: {
      name: 'Moz',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=32&h=32&fit=crop&crop=faces',
    },
    content: 'You\'ve heard a lot about inclusivity marketing in the last few years. But do you know how to use it to boost your organic search traffic — and drive revenue? 📈 Learn how in this new Whiteboard Friday episode, with @IsaLavs_ as your host!\nhttps://t.co/Rs8THb1ZVz 📺',
    stats: { likes: 6, comments: 0, retweets: 4 },
    platform: 'X'
  },
  {
    id: 10,
    author: {
      name: 'Steve Hanke',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=faces',
    },
    content: '#TurkeyWatch🇹🇷: Turkish President Erdogan announced that TUR\'s central bank reserves have reached an ALL-TIME HIGH. TURKEY IS EMERGING FROM THE SHADOWS.\nhttps://t.co/x8YWp0UcNy',
    image: 'https://images.unsplash.com/photo-1527866959252-deab85ef7d1b?q=80&w=400&auto=format&fit=crop',
    stats: { likes: 0, comments: 0, retweets: 0 },
    platform: 'X'
  }
];

export default function Inspiration() {
  const [showFilters, setShowFilters] = useState(true);

  return (
    <div className="flex h-[calc(100vh-80px)] -m-10">
      {/* Filters Sidebar */}
      {showFilters && (
        <div className="w-64 border-r border-gray-200 bg-white flex flex-col h-full overflow-y-auto shrink-0">
          <div className="p-4 flex justify-between items-center">
            <h2 className="font-bold text-gray-900 text-lg">Filters</h2>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Reset</button>
          </div>
          
          <div className="p-4 pt-0">
            <button 
              onClick={() => setShowFilters(false)}
              className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium mb-4 transition-colors"
            >
              Hide Filters
            </button>
            
            <div className="relative mb-6">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search posts..." 
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-1">
              {['Sort By', 'Media Type', 'Likes Range', 'Comments Range', 'Shares Range', 'Followers Range', 'Exclude Keywords', 'Creator'].map((filter) => (
                <button key={filter} className="w-full flex items-center justify-between py-3 text-sm text-gray-700 hover:bg-gray-50 px-2 rounded-lg border-b border-gray-100 last:border-0">
                  <span className="font-medium">{filter}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#F9FAFB]">
        <div className="p-6 flex justify-between items-center bg-white border-b border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900">Inspiration</h1>
          <div className="flex gap-3">
            {!showFilters && (
              <button 
                onClick={() => setShowFilters(true)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Show Filters
              </button>
            )}
            {showFilters && (
              <button 
                onClick={() => setShowFilters(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Hide Filters
              </button>
            )}
            <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-medium flex items-center transition-colors">
              <Shuffle className="w-4 h-4 mr-2" />
              Shuffle
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
            {POSTS.map((post) => (
              <div key={post.id} className="break-inside-avoid bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full object-cover" />
                      <span className="font-bold text-sm text-gray-900">{post.author.name}</span>
                    </div>
                    <div className="text-gray-900 font-bold text-xl leading-none">
                      𝕏
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-800 whitespace-pre-wrap mb-3">
                    {post.content}
                  </p>
                </div>

                {post.image && (
                  <img src={post.image} alt="Post media" className="w-full h-auto object-cover" />
                )}
                
                {post.video && (
                  <div className="relative bg-black aspect-video flex items-center justify-center">
                    <video src={post.video} className="w-full h-full object-cover" controls />
                  </div>
                )}

                <div className="p-4 border-t border-gray-100 mt-auto">
                  <div className="flex items-center gap-4 text-gray-500 text-xs mb-4">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" /> {post.stats.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" /> {post.stats.comments}
                    </span>
                    <span className="flex items-center gap-1">
                      <Repeat2 className="w-4 h-4" /> {post.stats.retweets}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <button className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1">
                      <LayoutTemplate className="w-3 h-3" />
                      Remix
                    </button>
                    <button className="text-blue-600 hover:text-blue-800">
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
