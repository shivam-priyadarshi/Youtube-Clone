const API_KEY = 'AIzaSyAJt8IECrF9htvCZnVbrVjjVRzNWvicZHM';

document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const mainContent = document.getElementById('main-content');
    const videoGrid = document.getElementById('video-grid');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const watchPage = document.getElementById('watch-page');
    const backToGridBtn = document.getElementById('back-to-grid-btn');
    const logoBtn = document.getElementById('logo-btn');
    const homeBtn = document.getElementById('home-btn');
    
    let player;

    searchForm.addEventListener('submit', e => {
        e.preventDefault();
        const query = searchInput.value.trim();
        if (query) searchVideos(query);
    });

    videoGrid.addEventListener('click', e => {
        const videoCard = e.target.closest('.video-card');
        if (videoCard && videoCard.dataset.videoId) {
            openWatchPage(videoCard.dataset.videoId);
        }
    });

    backToGridBtn.addEventListener('click', () => {
        watchPage.classList.add('hidden');
        mainContent.classList.remove('hidden');
        if (player && typeof player.stopVideo === 'function') {
            player.stopVideo();
        }
    });
    
    sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
        sidebarOverlay.classList.toggle('hidden');
    });
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
        sidebarOverlay.classList.add('hidden');
    });

    function goToHomePage(e) {
        e.preventDefault();
        if (!watchPage.classList.contains('hidden')) {
            watchPage.classList.add('hidden');
            mainContent.classList.remove('hidden');
            if (player && typeof player.stopVideo === 'function') {
                player.stopVideo();
            }
        }
        fetchTrendingVideos();
        searchInput.value = '';
    }

    logoBtn.addEventListener('click', goToHomePage);
    homeBtn.addEventListener('click', goToHomePage);

    async function searchVideos(query) {
        videoGrid.innerHTML = `<p class="col-span-full text-center text-gray-400">Searching...</p>`;
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${API_KEY}&type=video&maxResults=20`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();
            displayVideos(data.items);
        } catch (error) {
            console.error('Failed to fetch videos:', error);
            videoGrid.innerHTML = `<p class="col-span-full text-center text-red-500">Failed to load videos. Check the console.</p>`;
        }
    }
    
    async function fetchTrendingVideos() {
        videoGrid.innerHTML = `<p class="col-span-full text-center text-gray-400">Loading popular videos...</p>`;
        const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=IN&maxResults=50&key=${API_KEY}`;
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();
            const shuffledVideos = data.items.sort(() => 0.5 - Math.random());
            displayVideos(shuffledVideos.slice(0, 20));
        } catch (error) {
            console.error('Failed to fetch trending videos:', error);
            videoGrid.innerHTML = `<p class="col-span-full text-center text-red-500">Failed to load popular videos. Check the console.</p>`;
        }
    }

    function displayVideos(videos) {
        videoGrid.innerHTML = '';
        if (!videos || videos.length === 0) {
            videoGrid.innerHTML = `<p class="col-span-full text-center text-gray-400">No results found.</p>`;
            return;
        }
        videos.forEach(video => {
            const snippet = video.snippet;
            const videoId = (typeof video.id === 'object') ? video.id.videoId : video.id;
            if (!videoId) return;
            videoGrid.innerHTML += `
                <div class="flex flex-col space-y-2 video-card cursor-pointer" data-video-id="${videoId}">
                    <div class="video-thumbnail-container">
                        <img src="${snippet.thumbnails.high.url}" alt="Video Thumbnail" onerror="this.onerror=null;this.src='https://placehold.co/600x400/000000/FFFFFF?text=Error';">
                    </div>
                    <div class="flex items-start space-x-3 mt-2">
                        <h3 class="font-semibold text-base leading-snug">${snippet.title}</h3>
                    </div>
                </div>`;
        });
    }

    async function openWatchPage(videoId) {
        mainContent.classList.add('hidden');
        watchPage.classList.remove('hidden');
        
        if (player && typeof player.loadVideoById === 'function') {
            player.loadVideoById(videoId);
        }

        const videoDetails = await getVideoDetails(videoId);
        if (videoDetails) {
            displayWatchPageDetails(videoDetails);
        }
    }

    async function getVideoDetails(videoId) {
        const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${API_KEY}`;
        const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${API_KEY}&maxResults=20`;

        try {
            const [videoResponse, commentsResponse] = await Promise.all([fetch(videoUrl), fetch(commentsUrl)]);
            if (!videoResponse.ok || !commentsResponse.ok) throw new Error('Failed to fetch video details');
            
            const videoData = await videoResponse.json();
            const commentsData = await commentsResponse.json();
            const channelId = videoData.items[0].snippet.channelId;
            
            const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${API_KEY}`;
            const channelResponse = await fetch(channelUrl);
            if (!channelResponse.ok) throw new Error('Failed to fetch channel details');
            const channelData = await channelResponse.json();

            return {
                video: videoData.items[0],
                comments: commentsData.items,
                channel: channelData.items[0]
            };
        } catch (error) {
            console.error("Error fetching details:", error);
            return null;
        }
    }

    function displayWatchPageDetails({ video, comments, channel }) {
        document.getElementById('watch-title').textContent = video.snippet.title;
        document.getElementById('description-body').textContent = video.snippet.description;
        document.getElementById('view-count').textContent = Number(video.statistics.viewCount).toLocaleString();

        const channelInfoContainer = document.getElementById('channel-info');
        channelInfoContainer.innerHTML = `
            <img src="${channel.snippet.thumbnails.default.url}" alt="Channel Avatar" class="w-12 h-12 rounded-full">
            <div>
                <p class="font-bold">${channel.snippet.title}</p>
                <p class="text-sm text-gray-400">${formatSubscriberCount(channel.statistics.subscriberCount)} subscribers</p>
            </div>
        `;

        const videoStatsContainer = document.getElementById('video-stats');
        videoStatsContainer.innerHTML = `
            <button class="flex items-center space-x-2 bg-gray-800 px-4 py-2 rounded-full hover:bg-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.562 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg>
                <span>${formatNumber(video.statistics.likeCount)}</span>
            </button>
        `;

        const commentsContainer = document.getElementById('comments-container');
        commentsContainer.innerHTML = '';
        if (comments && comments.length > 0) {
            comments.forEach(commentThread => {
                const comment = commentThread.snippet.topLevelComment.snippet;
                commentsContainer.innerHTML += `
                    <div class="flex items-start space-x-3">
                        <img src="${comment.authorProfileImageUrl}" alt="User Avatar" class="w-9 h-9 rounded-full">
                        <div class="flex-1">
                            <p class="font-semibold text-sm">${comment.authorDisplayName}</p>
                            <p class="text-sm">${comment.textDisplay}</p>
                        </div>
                    </div>
                `;
            });
        } else {
            commentsContainer.innerHTML = '<p class="text-gray-400">No comments found.</p>';
        }
    }
    
    function formatNumber(num) {
        if (!num) return '0';
        return Math.abs(num) > 999 ? Math.sign(num)*((Math.abs(num)/1000).toFixed(1)) + 'K' : Math.sign(num)*Math.abs(num)
    }

    function formatSubscriberCount(num) {
        if (!num) return '0';
        const number = parseInt(num);
        if (number >= 1000000) return (number / 1000000).toFixed(1) + 'M';
        if (number >= 1000) return (number / 1000).toFixed(1) + 'K';
        return number;
    }

    window.onYouTubeIframeAPIReady = function() {
        player = new YT.Player('watch-player', {
            height: '100%',
            width: '100%',
            playerVars: { 'playsinline': 1, 'autoplay': 1, 'controls': 1 },
        });
    }

    fetchTrendingVideos();
});
