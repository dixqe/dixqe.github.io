document.addEventListener("DOMContentLoaded", function() {

    // --- ТЕМА ---
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
    const videoCards = document.querySelectorAll(".video-card, .showreel-card");
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
        const isShowreel = card.classList.contains('showreel-card');

        // Кастомная обложка
        let posterImg = null;
        if (video && video.getAttribute("poster")) {
            posterImg = document.createElement("img");
            posterImg.src = video.getAttribute("poster");
            posterImg.className = "custom-poster";
            posterImg.alt = "";
            video.parentNode.insertBefore(posterImg, video.nextSibling);
            video.removeAttribute("poster");
        }

        if (video) video.preload = "metadata";

        // Мобильный оверлей — только кнопка Play без фона/блюра
        let mobileOverlay = null;
        let mobilePlayBtn = null;
        if (isTouchDevice) {
            mobileOverlay = document.createElement('div');
            mobileOverlay.className = 'mobile-play-overlay';
            mobileOverlay.innerHTML = `
                <div class="mobile-play-btn" aria-label="Play">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </div>`;
            card.appendChild(mobileOverlay);
            mobilePlayBtn = mobileOverlay.querySelector('.mobile-play-btn');
        }

        const muteBtn        = card.querySelector(".mute-btn");
        const muteLine       = muteBtn ? muteBtn.querySelector(".mute-line") : null;
        const fsBtn          = card.querySelector(".fs-btn");
        const progressContainer = card.querySelector(".progress-container");
        const progressFill   = card.querySelector(".progress-fill");
        const timeDisplay    = card.querySelector(".time-display");
        const volSlider      = card.querySelector(".vol-slider");
        const bottomControls = card.querySelector(".bottom-controls");
        const playPauseBtn   = card.querySelector(".play-pause-btn");
        const iconPlay       = card.querySelector(".icon-play");
        const iconPause      = card.querySelector(".icon-pause");

        let leaveTimer = null;
        let animationFrameId = null;
        let idleTimer;
        let touchStartY = 0;
        let touchStartX = 0;

        // Helpers
        const hideOverlay = () => { if (mobileOverlay) mobileOverlay.classList.add("hidden"); };
        const showOverlay = () => { if (mobileOverlay) mobileOverlay.classList.remove("hidden"); };

        const deactivateCard = (c) => {
            const v  = c.querySelector("video");
            const p  = c.querySelector(".custom-poster");
            const o  = c.querySelector(".mobile-play-overlay");
            const sr = c.classList.contains("showreel-card");
            c.classList.remove("mobile-active");
            if (v) {
                v.pause();
                if (!sr) {
                    v.currentTime = 0;
                    if (p) p.classList.remove("hidden");
                }
            }
            if (o) o.classList.remove("hidden");
        };

        const wakeUpInterface = () => {
            const isFS = document.fullscreenElement
                || document.webkitFullscreenElement
                || (video && video.webkitDisplayingFullscreen);
            if (!isFS) return;
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
                    if (progressFill) progressFill.style.width = (video.currentTime / video.duration) * 100 + "%";
                    animationFrameId = requestAnimationFrame(updateProgressBar);
                }
            };

            video.addEventListener("play", () => {
                if (iconPlay)  iconPlay.style.display  = "none";
                if (iconPause) iconPause.style.display = "block";
                if (posterImg) posterImg.classList.add("hidden");
                hideOverlay();
                wakeUpInterface();
                animationFrameId = requestAnimationFrame(updateProgressBar);
            });

            video.addEventListener("pause", () => {
                if (iconPlay)  iconPlay.style.display  = "block";
                if (iconPause) iconPause.style.display = "none";
                card.classList.remove("hide-interface");
                clearTimeout(idleTimer);
                if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
                if (isTouchDevice && card.classList.contains("mobile-active")) showOverlay();
            });

            video.addEventListener("timeupdate", () => {
                if (video.duration) {
                    if (timeDisplay) timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
                    if (video.paused && progressFill) progressFill.style.width = (video.currentTime / video.duration) * 100 + "%";
                }
            });

            if (progressContainer) {
                progressContainer.addEventListener("click", (e) => {
                    e.stopPropagation();
                    const rect = progressContainer.getBoundingClientRect();
                    video.currentTime = ((e.clientX - rect.left) / rect.width) * video.duration;
                });
                if (isTouchDevice) {
                    progressContainer.addEventListener("touchstart", (e) => {
                        e.stopPropagation();
                        const rect = progressContainer.getBoundingClientRect();
                        video.currentTime = ((e.touches[0].clientX - rect.left) / rect.width) * video.duration;
                    }, { passive: true });
                }
            }

            if (volSlider) {
                volSlider.addEventListener("input", (e) => {
                    e.stopPropagation();
                    const val = parseFloat(e.target.value);
                    video.volume = val;
                    globalVolume = val;
                    const muted = val <= 0;
                    video.muted = muted;
                    globalMuted = muted;
                    if (muteLine) muteLine.style.display = muted ? "block" : "none";
                });
                volSlider.addEventListener("click", (e) => e.stopPropagation());
            }
        }

        // Mute: touchend на мобиле, click на ПК
        if (muteBtn) {
            const handleMute = (e) => {
                e.preventDefault();
                e.stopPropagation();
                globalMuted = !globalMuted;
                video.muted = globalMuted;
                if (muteLine) muteLine.style.display = globalMuted ? "block" : "none";
                if (volSlider) volSlider.value = globalMuted ? 0 : globalVolume;
            };
            if (isTouchDevice) {
                muteBtn.addEventListener("touchend", handleMute, { passive: false });
            } else {
                muteBtn.addEventListener("click", handleMute);
            }
        }

        if (playPauseBtn) {
            playPauseBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                video.paused ? video.play() : video.pause();
            });
        }

        if (bottomControls) bottomControls.addEventListener("click", (e) => e.stopPropagation());

        // startVideo: просто вызываем play() — браузер сам подгрузит видео
        const tryPlay = () => {
            if (!isShowreel) video.currentTime = 0;
            video.muted = globalMuted;
            if (!globalMuted) video.volume = globalVolume;
            if (muteLine) muteLine.style.display = globalMuted ? "block" : "none";
            if (volSlider) volSlider.value = globalMuted ? 0 : globalVolume;
            video.play().catch(err => console.log("Play interrupted:", err));
        };

        // Исправление: не проверяем readyState — video.play() сам запустит загрузку
        const startVideo = () => {
            tryPlay();
        };

        // ── ПК: hover ─────────────────────────────────────────────────
        card.addEventListener("mouseenter", function() {
            if (isTouchDevice) return;
            if (leaveTimer) { clearTimeout(leaveTimer); leaveTimer = null; }
            hoveredVideo = video;
            card.style.willChange = 'transform, box-shadow';
            card.dataset.hovered = 'true';
            if (posterImg) posterImg.classList.add("hidden");
            startVideo();
        });

        card.addEventListener("mouseleave", function() {
            if (isTouchDevice) return;
            if (hoveredVideo === video) hoveredVideo = null;
            card.style.willChange = 'auto';
            card.dataset.hovered = 'false';
            leaveTimer = setTimeout(() => {
                const isFS = document.fullscreenElement || document.webkitFullscreenElement
                    || (video && video.webkitDisplayingFullscreen);
                if (isFS) return;
                if (video) {
                    if (!isShowreel && posterImg) posterImg.classList.remove("hidden");
                    video.pause();
                    if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
                    if (!isShowreel) video.currentTime = 0;
                }
            }, 50);
        });

        // ── Мобиль: touchstart — запоминаем позицию (для определения скролла) ──
        if (isTouchDevice) {
            card.addEventListener("touchstart", function(e) {
                touchStartY = e.touches[0].clientY;
                touchStartX = e.touches[0].clientX;
            }, { passive: true });

            // Мобиль: touchend на карточке — активация / play-pause
            card.addEventListener("touchend", function(e) {
                // Пропускаем если это был скролл (>10px)
                const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);
                const dx = Math.abs(e.changedTouches[0].clientX - touchStartX);
                if (dy > 10 || dx > 10) return;

                // Пропускаем кнопки — у них свои обработчики
                if (e.target.closest('.fs-btn')
                    || e.target.closest('.mute-btn')
                    || e.target.closest('.bottom-controls')
                    || e.target.closest('.mobile-play-btn')) return;

                e.preventDefault(); // Отменяем последующий click (устраняет дублирование)

                if (!card.classList.contains("mobile-active")) {
                    // Первый тап: активируем
                    document.querySelectorAll(".video-card.mobile-active").forEach(c => {
                        if (c !== card) deactivateCard(c);
                    });
                    card.classList.add("mobile-active");
                    hideOverlay();
                    hoveredVideo = video;
                    if (video) startVideo();
                } else {
                    // Повторный тап: play/pause
                    if (video) {
                        if (video.paused) { video.play().catch(() => {}); hideOverlay(); }
                        else              { video.pause(); showOverlay(); }
                    }
                }
            }, { passive: false });

            // Кнопка Play в оверлее
            if (mobilePlayBtn) {
                mobilePlayBtn.addEventListener("touchend", function(e) {
                    e.preventDefault();
                    e.stopPropagation();

                    if (!card.classList.contains("mobile-active")) {
                        document.querySelectorAll(".video-card.mobile-active").forEach(c => {
                            if (c !== card) deactivateCard(c);
                        });
                        card.classList.add("mobile-active");
                        hideOverlay();
                        hoveredVideo = video;
                        if (video) startVideo();
                    } else if (video && video.paused) {
                        video.play().catch(() => {});
                        hideOverlay();
                    }
                }, { passive: false });
            }
        }

        // ── ПК: click = переключить звук ─────────────────────────────
        card.addEventListener("click", function(e) {
            if (isTouchDevice) return;
            if (e.target.closest('.fs-btn') || e.target.closest('.mute-btn') ||
                e.target.closest('.bottom-controls')) return;
            e.preventDefault();
            globalMuted = !globalMuted;
            video.muted = globalMuted;
            if (muteLine) muteLine.style.display = globalMuted ? "block" : "none";
            if (volSlider) volSlider.value = globalMuted ? 0 : globalVolume;
        });

        // ── Fullscreen ────────────────────────────────────────────────
        if (fsBtn) {
            const handleFS = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (video && video.webkitEnterFullscreen) video.webkitEnterFullscreen();
                else if (card.requestFullscreen)          card.requestFullscreen();
                else if (card.webkitRequestFullscreen)    card.webkitRequestFullscreen();
            };
            if (isTouchDevice) {
                fsBtn.addEventListener("touchend", handleFS, { passive: false });
            } else {
                fsBtn.addEventListener("click", handleFS);
            }
        }
    }); // end forEach

    // ── Шоурил: автоплей при скролле на мобиле ───────────────────────
    if (isTouchDevice) {
        const srCard = document.querySelector('.showreel-card');
        if (srCard) {
            const srVideo   = srCard.querySelector('video');
            const srOverlay = srCard.querySelector('.mobile-play-overlay');

            new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
                        if (srVideo && srVideo.paused) {
                            srCard.classList.add('mobile-active');
                            if (srOverlay) srOverlay.classList.add('hidden');
                            srVideo.muted = true;
                            srVideo.play().catch(() => {});
                        }
                    } else if (!entry.isIntersecting && srVideo && !srVideo.paused) {
                        srVideo.pause();
                    }
                });
            }, { threshold: [0, 0.35] }).observe(srCard);
        }
    }

    // ── Клик вне карточки на мобильном ───────────────────────────────
    document.addEventListener("touchend", function(e) {
        if (isTouchDevice && !e.target.closest('.video-card')) {
            document.querySelectorAll('.video-card.mobile-active').forEach(c => deactivateCard(c));
        }
    });

    // ── Space для паузы (ПК) ─────────────────────────────────────────
    document.addEventListener("keydown", function(e) {
        if (e.code === "Space") {
            let activeVideo = null;
            const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
            if (fsEl)               activeVideo = fsEl.querySelector("video");
            else if (hoveredVideo)  activeVideo = hoveredVideo;
            if (activeVideo) { e.preventDefault(); activeVideo.paused ? activeVideo.play() : activeVideo.pause(); }
        }
    });

    // ── Выход из fullscreen ───────────────────────────────────────────
    const handleExit = () => {
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
            videoCards.forEach(card => {
                card.classList.remove("hide-interface");
                const video     = card.querySelector("video");
                const posterImg = card.querySelector(".custom-poster");
                const isActive  = card.classList.contains('mobile-active');
                const hovered   = card.dataset.hovered === 'true';
                const isSR      = card.classList.contains('showreel-card');
                if (video && !hovered && !isActive) {
                    video.pause();
                    if (!isSR) { video.currentTime = 0; if (posterImg) posterImg.classList.remove("hidden"); }
                } else if (video && (hovered || isActive)) {
                    video.play().catch(() => {});
                }
            });
        }
    };
    document.addEventListener("fullscreenchange",       handleExit);
    document.addEventListener("webkitfullscreenchange", handleExit);

    // ── Кнопка копирования ────────────────────────────────────────────
    document.querySelectorAll(".copy-btn").forEach(function(btn) {
        btn.addEventListener("click", function() {
            const text = btn.getAttribute("data-copy");
            const fallback = () => {
                const ta = document.createElement("textarea");
                ta.value = text;
                ta.style.cssText = "position:fixed;opacity:0;pointer-events:none;";
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy'); btn.classList.add("success"); setTimeout(() => btn.classList.remove("success"), 1500); } catch(e) {}
                document.body.removeChild(ta);
            };
            if (navigator.clipboard && window.isSecureContext)
                navigator.clipboard.writeText(text)
                    .then(() => { btn.classList.add("success"); setTimeout(() => btn.classList.remove("success"), 1500); })
                    .catch(fallback);
            else fallback();
        });
    });

    // ── Fade-up ───────────────────────────────────────────────────────
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) { entry.target.classList.add('visible'); fadeObserver.unobserve(entry.target); }
        });
    }, { rootMargin: '-10% 0px', threshold: 0.1 });
    document.querySelectorAll('.fade-up').forEach(el => fadeObserver.observe(el));

});
