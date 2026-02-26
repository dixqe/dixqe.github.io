document.addEventListener("DOMContentLoaded", function() {
    // --- ЛОГИКА ТЕМНОЙ ТЕМЫ ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // Проверяем, есть ли сохраненная тема в localStorage
    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-theme');
    }

    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('dark-theme');
        
        // Сохраняем выбор пользователя
        if (body.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    });
    // ---------------------------
    const videoCards = document.querySelectorAll(".video-card");
    let globalMuted = true; 
    let hoveredVideo = null; 
    
    // Определяем, с мобилки ли сидит юзер
    const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    const formatTime = (time) => {
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    videoCards.forEach(function(card) {
        const video = card.querySelector("video");
        
        let posterImg = null;
        if (video && video.hasAttribute("poster")) {
            posterImg = document.createElement("img");
            posterImg.src = video.getAttribute("poster");
            posterImg.className = "custom-poster";
            video.parentNode.insertBefore(posterImg, video.nextSibling);
            video.removeAttribute("poster");
        }

        const muteBtn = card.querySelector(".mute-btn");
        const muteLine = muteBtn.querySelector(".mute-line");
        const fsBtn = card.querySelector(".fs-btn");
        // --- ФИКС КНОПКИ ЗВУКА ДЛЯ МОБИЛОК И ПК ---
        if (muteBtn) {
            muteBtn.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation(); // Не даем клику перейти на саму карточку
                
                globalMuted = !globalMuted;
                video.muted = globalMuted;
                
                if (muteLine) muteLine.style.display = globalMuted ? "block" : "none";
                if (volSlider) volSlider.value = globalMuted ? 0 : 1;
            });
        }
        
        const progressContainer = card.querySelector(".progress-container");
        const progressFill = card.querySelector(".progress-fill");
        const timeDisplay = card.querySelector(".time-display");
        const volSlider = card.querySelector(".vol-slider");
        const bottomControls = card.querySelector(".bottom-controls");
        
        const playPauseBtn = card.querySelector(".play-pause-btn");
        const iconPlay = card.querySelector(".icon-play");
        const iconPause = card.querySelector(".icon-pause");

        let idleTimer;
        const wakeUpInterface = () => {
            const isFullscreen = document.fullscreenElement || document.webkitFullscreenElement || (video && video.webkitDisplayingFullscreen);
            if (!isFullscreen) return; 
            
            card.classList.remove("hide-interface");
            clearTimeout(idleTimer);
            
            idleTimer = setTimeout(() => {
                if (video && !video.paused) {
                    card.classList.add("hide-interface");
                }
            }, 2000); 
        };

        card.addEventListener("mousemove", wakeUpInterface);
        card.addEventListener("mousedown", wakeUpInterface);
        
        if (video) {
            video.muted = true;
            if (muteLine) muteLine.style.display = "block";

            let animationFrameId;

            const updateProgressBar = () => {
                if (video && !video.paused && video.duration) {
                    const progress = (video.currentTime / video.duration) * 100;
                    if (progressFill) progressFill.style.width = progress + "%";
                    animationFrameId = requestAnimationFrame(updateProgressBar);
                }
            };

            video.addEventListener("play", () => {
                if (iconPlay) iconPlay.style.display = "none";
                if (iconPause) iconPause.style.display = "block";
                if (posterImg) posterImg.classList.add("hidden"); 
                wakeUpInterface(); 
                animationFrameId = requestAnimationFrame(updateProgressBar); 
            });
            
            video.addEventListener("pause", () => {
                if (iconPlay) iconPlay.style.display = "block";
                if (iconPause) iconPause.style.display = "none";
                card.classList.remove("hide-interface"); 
                clearTimeout(idleTimer);
                cancelAnimationFrame(animationFrameId); 
            });

            video.addEventListener("timeupdate", () => {
                if (video.duration) {
                    if (timeDisplay) {
                        timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
                    }
                    if (video.paused && progressFill) {
                        const progress = (video.currentTime / video.duration) * 100;
                        progressFill.style.width = progress + "%";
                    }
                }
            });

            if (progressContainer) {
                progressContainer.addEventListener("click", (e) => {
                    e.stopPropagation(); 
                    const rect = progressContainer.getBoundingClientRect();
                    const pos = (e.clientX - rect.left) / rect.width;
                    video.currentTime = pos * video.duration;
                });
            }

            if (volSlider) {
                volSlider.addEventListener("input", (e) => {
                    e.stopPropagation();
                    video.volume = e.target.value;
                    if (video.volume > 0) {
                        video.muted = false;
                        globalMuted = false;
                        if (muteLine) muteLine.style.display = "none";
                    } else {
                        video.muted = true;
                        globalMuted = true;
                        if (muteLine) muteLine.style.display = "block";
                    }
                });
                volSlider.addEventListener("click", (e) => e.stopPropagation());
            }
        }

        if (playPauseBtn) {
            playPauseBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                if (video.paused) video.play();
                else video.pause();
            });
        }

        if (bottomControls) {
            bottomControls.addEventListener("click", (e) => e.stopPropagation());
        }

        card.addEventListener("mouseenter", function() {
            if (isTouchDevice) return; 
            if (posterImg) posterImg.classList.add("hidden"); 
            if (video) {
                hoveredVideo = video; 
                video.muted = globalMuted;
                if (muteLine) muteLine.style.display = globalMuted ? "block" : "none";
                if (volSlider) volSlider.value = globalMuted ? 0 : video.volume;
                
                video.currentTime = 0; // Гарантируем, что старт всегда с начала
let playPromise = video.play();
if (playPromise !== undefined) {
    playPromise.catch((error) => {
        console.log("Play interrupted or not ready", error);
    });
}
            }
        });

        card.addEventListener("mouseleave", function() {
            if (isTouchDevice) return; 
            if (hoveredVideo === video) hoveredVideo = null; 

            setTimeout(() => {
                const isFullscreen = document.fullscreenElement || 
                                   document.webkitFullscreenElement || 
                                   (video && video.webkitDisplayingFullscreen);

                if (isFullscreen) return; 

                if (video) {
                    video.pause();
                    video.currentTime = 0; 
                    if (posterImg) posterImg.classList.remove("hidden"); 
                }
            }, 50);
        });

        // --- ЛОГИКА КЛИКОВ (И ДЛЯ ПК И ДЛЯ ТАЧЕЙ) ---
        card.addEventListener("click", function(e) {
            if (e.target.closest('.fs-btn') || e.target.closest('.bottom-controls')) return; 
            e.preventDefault();

            if (isTouchDevice) {
                if (!card.classList.contains('mobile-active')) {
                    // Первый тап на мобильном: активируем карточку и видео
                    document.querySelectorAll('.video-card.mobile-active').forEach(c => {
                        c.classList.remove('mobile-active');
                        const v = c.querySelector('video');
                        const p = c.querySelector('.custom-poster');
                        if(v) { v.pause(); v.currentTime = 0; }
                        if(p) p.classList.remove('hidden');
                    });
                    
                    card.classList.add('mobile-active');
                    if (posterImg) posterImg.classList.add("hidden");
                    if (video) {
                        hoveredVideo = video;
                        video.muted = globalMuted;
                        if (muteLine) muteLine.style.display = globalMuted ? "block" : "none";
                        if (volSlider) volSlider.value = globalMuted ? 0 : video.volume;
                        
                        let playPromise = video.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(() => {});
                        }
                    }
                } else {
                    // Второй тап на мобильном: Пауза/Воспроизведение
                    if (video) {
                        if (video.paused) {
                            video.play();
                        } else {
                            video.pause();
                        }
                    }
                }
                return; // На мобильном дальше код не идет
            }

            // На ПК: Клик включает/выключает звук
            globalMuted = !globalMuted; 
            video.muted = globalMuted;
            if (muteLine) muteLine.style.display = globalMuted ? "block" : "none";
            if (volSlider) volSlider.value = globalMuted ? 0 : 1;
        });

       if (fsBtn) {
            fsBtn.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation(); // Не даем клику уйти на карточку
                
                // 1. СПЕЦИАЛЬНО ДЛЯ IPHONE (iOS Safari)
                // На iOS разворачивать можно ТОЛЬКО сам тег video
                if (video && video.webkitEnterFullscreen) {
                    video.webkitEnterFullscreen();
                } 
                // 2. Стандартный способ (ПК и Android)
                // Разворачиваем всю карточку с контроллами
                else if (card.requestFullscreen) {
                    card.requestFullscreen();
                } else if (card.webkitRequestFullscreen) {
                    card.webkitRequestFullscreen();
                }
            });
        }
    });

    document.addEventListener("click", function(e) {
        if (isTouchDevice && !e.target.closest('.video-card')) {
            document.querySelectorAll('.video-card.mobile-active').forEach(c => {
                c.classList.remove('mobile-active');
                const v = c.querySelector('video');
                const p = c.querySelector('.custom-poster');
                if(v) { v.pause(); v.currentTime = 0; }
                if(p) p.classList.remove('hidden');
            });
        }
    });

    document.addEventListener("keydown", function(e) {
        if (e.code === "Space") {
            let activeVideo = null;
            const fsElement = document.fullscreenElement || document.webkitFullscreenElement;

            if (fsElement) {
                activeVideo = fsElement.querySelector("video");
            } else if (hoveredVideo) {
                activeVideo = hoveredVideo;
            }

            if (activeVideo) {
                e.preventDefault(); 
                if (activeVideo.paused) {
                    activeVideo.play();
                } else {
                    activeVideo.pause();
                }
            }
        }
    });

    const handleExit = () => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            videoCards.forEach(card => {
                card.classList.remove("hide-interface"); 
                
                const video = card.querySelector("video");
                const posterImg = card.querySelector(".custom-poster");

                if (video && !card.matches(':hover') && !card.classList.contains('mobile-active')) {
                    video.pause();
                    video.currentTime = 0; 
                    if (posterImg) posterImg.classList.remove("hidden"); 
                } else if (video && (card.matches(':hover') || card.classList.contains('mobile-active'))) {
                    video.play();
                }
            });
        }
    };
    document.addEventListener("fullscreenchange", handleExit);
    document.addEventListener("webkitfullscreenchange", handleExit);

    const copyButtons = document.querySelectorAll(".copy-btn");
    copyButtons.forEach(function(btn) {
        btn.addEventListener("click", function() {
            const textToCopy = btn.getAttribute("data-copy");
            navigator.clipboard.writeText(textToCopy).then(function() {
                btn.classList.add("success");
                setTimeout(() => { btn.classList.remove("success"); }, 1500);
            }).catch(err => {
                console.error('Ошибка копирования: ', err);
            });
        });
    });

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.15 
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            } else {
                entry.target.classList.remove('visible');
            }
        });
   }, observerOptions);

    document.querySelectorAll('.fade-up').forEach(el => {
        observer.observe(el);
    });
});
