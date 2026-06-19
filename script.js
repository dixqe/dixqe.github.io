document.addEventListener("DOMContentLoaded", function() {

    // --- ЛОГИКА ТЕМЫ ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;

    if (localStorage.getItem('theme') === 'dark') {
        body.classList.add('dark-theme');
    }

    themeToggleBtn.addEventListener('click', () => {
        body.classList.toggle('dark-theme');
        localStorage.setItem('theme', body.classList.contains('dark-theme') ? 'dark' : 'light');
    });

    // --- ВИДЕО ---
    const videoCards = document.querySelectorAll(".video-card");
    let globalMuted = true;
    let globalVolume = 1;
    let hoveredVideo = null;

    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;

    const formatTime = (time) => {
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    videoCards.forEach(function(card) {
        const video = card.querySelector("video");

        // Создаём img-обложку из нативного poster и убираем атрибут
        let posterImg = null;
        if (video && video.getAttribute("poster")) {
            posterImg = document.createElement("img");
            posterImg.src = video.getAttribute("poster");
            posterImg.className = "custom-poster";
            posterImg.alt = "";
            video.parentNode.insertBefore(posterImg, video.nextSibling);
            video.removeAttribute("poster");
        }

        // preload="metadata" — грузим только первый кадр и длительность
        if (video) {
            video.preload = "metadata";
        }

        const muteBtn = card.querySelector(".mute-btn");
        const muteLine = muteBtn ? muteBtn.querySelector(".mute-line") : null;
        const fsBtn = card.querySelector(".fs-btn");
        const progressContainer = card.querySelector(".progress-container");
        const progressFill = card.querySelector(".progress-fill");
        const timeDisplay = card.querySelector(".time-display");
        const volSlider = card.querySelector(".vol-slider");
        const bottomControls = card.querySelector(".bottom-controls");
        const playPauseBtn = card.querySelector(".play-pause-btn");
        const iconPlay = card.querySelector(".icon-play");
        const iconPause = card.querySelector(".icon-pause");

        let isHovered = false;
        let leaveTimer = null;
        let animationFrameId = null;
        let idleTimer;

        const wakeUpInterface = () => {
            const isFullscreen = document.fullscreenElement
                || document.webkitFullscreenElement
                || (video && video.webkitDisplayingFullscreen);
            if (!isFullscreen) return;
            card.classList.remove("hide-interface");
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                if (video && !video.paused) card.classList.add("hide-interface");
            }, 2000);
        };

        card.addEventListener("mousemove", wakeUpInterface);
        card.addEventListener("mousedown", wakeUpInterface);

        if (video) {
            video.muted = true;
            if (muteLine) muteLine.style.display = "block";

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
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                    animationFrameId = null;
                }
            });

            video.addEventListener("timeupdate", () => {
                if (video.duration) {
                    if (timeDisplay) {
                        timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
                    }
                    if (video.paused && progressFill) {
                        progressFill.style.width = (video.currentTime / video.duration) * 100 + "%";
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
                    const val = parseFloat(e.target.value);
                    video.volume = val;
                    globalVolume = val;
                    if (val > 0) {
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

        if (muteBtn) {
            muteBtn.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                globalMuted = !globalMuted;
                video.muted = globalMuted;
                if (muteLine) muteLine.style.display = globalMuted ? "block" : "none";
                if (volSlider) volSlider.value = globalMuted ? 0 : globalVolume;
            });
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

        // Безопасный запуск с проверкой readyState
        const tryPlay = () => {
            video.currentTime = 0;
            video.muted = globalMuted;
            if (!globalMuted) video.volume = globalVolume;
            if (muteLine) muteLine.style.display = globalMuted ? "block" : "none";
            if (volSlider) volSlider.value = globalMuted ? 0 : globalVolume;
            video.play().catch((err) => {
                console.log("Play interrupted:", err);
            });
        };

        const startVideo = () => {
            if (video.readyState >= 2) {
                tryPlay();
            } else {
                video.addEventListener('canplay', tryPlay, { once: true });
            }
        };

        card.addEventListener("mouseenter", function() {
            if (isTouchDevice) return;

            if (leaveTimer) {
                clearTimeout(leaveTimer);
                leaveTimer = null;
            }

            isHovered = true;
            hoveredVideo = video;
            card.style.willChange = 'transform, box-shadow';
            card.dataset.hovered = 'true';

            if (posterImg) posterImg.classList.add("hidden");
            startVideo();
        });

        card.addEventListener("mouseleave", function() {
            if (isTouchDevice) return;

            isHovered = false;
            if (hoveredVideo === video) hoveredVideo = null;
            card.style.willChange = 'auto';
            card.dataset.hovered = 'false';

            leaveTimer = setTimeout(() => {
                const isFullscreen = document.fullscreenElement
                    || document.webkitFullscreenElement
                    || (video && video.webkitDisplayingFullscreen);
                if (isFullscreen) return;

                if (video) {
                    if (posterImg) posterImg.classList.remove("hidden");
                    video.pause();
                    if (animationFrameId) {
                        cancelAnimationFrame(animationFrameId);
                        animationFrameId = null;
                    }
                    video.currentTime = 0;
                }
            }, 50);
        });

        // --- ЛОГИКА КЛИКОВ ---
        card.addEventListener("click", function(e) {
            if (e.target.closest('.fs-btn')
                || e.target.closest('.mute-btn')
                || e.target.closest('.bottom-controls')) return;
            e.preventDefault();

            if (isTouchDevice) {
                if (!card.classList.contains('mobile-active')) {
                    document.querySelectorAll('.video-card.mobile-active').forEach(c => {
                        c.classList.remove('mobile-active');
                        const v = c.querySelector('video');
                        const p = c.querySelector('.custom-poster');
                        if (v) { v.pause(); v.currentTime = 0; }
                        if (p) p.classList.remove('hidden');
                    });

                    card.classList.add('mobile-active');
                    if (posterImg) posterImg.classList.add("hidden");
                    if (video) {
                        hoveredVideo = video;
                        startVideo();
                    }
                } else {
                    if (video) {
                        if (video.paused) video.play();
                        else video.pause();
                    }
                }
                return;
            }

            // ПК: клик = переключить звук
            globalMuted = !globalMuted;
            video.muted = globalMuted;
            if (muteLine) muteLine.style.display = globalMuted ? "block" : "none";
            if (volSlider) volSlider.value = globalMuted ? 0 : globalVolume;
        });

        if (fsBtn) {
            fsBtn.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (video && video.webkitEnterFullscreen) {
                    video.webkitEnterFullscreen();
                } else if (card.requestFullscreen) {
                    card.requestFullscreen();
                } else if (card.webkitRequestFullscreen) {
                    card.webkitRequestFullscreen();
                }
            });
        }
    });

    // --- Клик вне карточки на мобильном ---
    document.addEventListener("click", function(e) {
        if (isTouchDevice && !e.target.closest('.video-card')) {
            document.querySelectorAll('.video-card.mobile-active').forEach(c => {
                c.classList.remove('mobile-active');
                const v = c.querySelector('video');
                const p = c.querySelector('.custom-poster');
                if (v) { v.pause(); v.currentTime = 0; }
                if (p) p.classList.remove('hidden');
            });
        }
    });

    // --- Space для паузы ---
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
                activeVideo.paused ? activeVideo.play() : activeVideo.pause();
            }
        }
    });

    // --- Выход из fullscreen ---
    const handleExit = () => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            videoCards.forEach(card => {
                card.classList.remove("hide-interface");
                const video = card.querySelector("video");
                const posterImg = card.querySelector(".custom-poster");
                const isActive = card.classList.contains('mobile-active');
                const hovered = card.dataset.hovered === 'true';

                if (video && !hovered && !isActive) {
                    video.pause();
                    video.currentTime = 0;
                    if (posterImg) posterImg.classList.remove("hidden");
                } else if (video && (hovered || isActive)) {
                    video.play().catch(() => {});
                }
            });
        }
    };
    document.addEventListener("fullscreenchange", handleExit);
    document.addEventListener("webkitfullscreenchange", handleExit);

    // --- Кнопка копирования с fallback ---
    const copyButtons = document.querySelectorAll(".copy-btn");
    copyButtons.forEach(function(btn) {
        btn.addEventListener("click", function() {
            const textToCopy = btn.getAttribute("data-copy");

            const doFallback = () => {
                const ta = document.createElement("textarea");
                ta.value = textToCopy;
                ta.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
                document.body.appendChild(ta);
                ta.select();
                try {
                    document.execCommand('copy');
                    btn.classList.add("success");
                    setTimeout(() => btn.classList.remove("success"), 1500);
                } catch (err) {
                    console.error('Fallback copy failed:', err);
                }
                document.body.removeChild(ta);
            };

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(textToCopy)
                    .then(() => {
                        btn.classList.add("success");
                        setTimeout(() => btn.classList.remove("success"), 1500);
                    })
                    .catch(doFallback);
            } else {
                doFallback();
            }
        });
    });

    // --- Fade-up анимации ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { root: null, rootMargin: '-10% 0px', threshold: 0.1 });

    document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
});
