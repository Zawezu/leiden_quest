// Dynamic modal creation and teardown (refactored)
// Replaces previous openModal implementation. Handles both 'full' and 'box' styles.
// Also centralises panorama creation so we don't duplicate the viewer logic.
function openModal(data) {
    // Build modal overlay and ensure it's visible (CSS .modal often has display:none)
    const modalEl = document.createElement('div');
    modalEl.className = 'modal' + (data.style === 'full' ? ' full-modal' : '');
    modalEl.style.display = 'flex';

    // centre-left positioning for box modal overlay
    modalEl.style.justifyContent = 'flex-start';
    modalEl.style.alignItems = 'center';
    modalEl.style.paddingLeft = '6vw'; // distance from left edge

    // Helper to request fullscreen (vendor fallbacks)
    function requestFullscreen(el) {
        if (!el) return Promise.reject(new Error('No element'));
        if (el.requestFullscreen) return el.requestFullscreen();
        if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
        if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
        if (el.msRequestFullscreen) return el.msRequestFullscreen();
        return Promise.reject(new Error('Fullscreen API not supported'));
    }

    // Shared close button creator (styled by CSS .closeModalBtn)
    // JS only adds an extra class for full-modal so styles live in CSS
    function makeCloseBtn() {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'closeModalBtn';
        closeBtn.type = 'button';
        closeBtn.innerHTML = '✕';
        if (data.style === 'full') {
            // add class so CSS can target full-modal close button visuals/position
            closeBtn.classList.add('closeModalBtn--full');
        }
        return closeBtn;
    }

    // Centralised panorama setup to avoid duplication.
    // appendTarget: node which will receive the panoramaContainer (the container must be in the DOM)
    // infoContainer: the element to hide/show when panorama opens/closes (can be null)
    function setupPanorama(panoramaFilename, infoContainer, appendTarget) {
        const openPanoramaButton = document.createElement('button');
        openPanoramaButton.className = 'openPanoramaButton';
        openPanoramaButton.type = 'button';
        openPanoramaButton.innerHTML = 'Open panorama';

        const panoramaContainer = document.createElement('div');
        panoramaContainer.className = 'panoramaContainer';
        panoramaContainer.style.display = 'none';

        // Attach button into infoContainer if provided, otherwise append near appendTarget
        if (infoContainer) infoContainer.appendChild(openPanoramaButton);
        if (appendTarget) appendTarget.appendChild(panoramaContainer);

        // Click handler - creates/cleans viewer, requests fullscreen
        openPanoramaButton.addEventListener('click', () => {
            if (infoContainer) infoContainer.style.display = 'none';
            panoramaContainer.style.display = 'block';

            // Clean up previous viewer if present
            if (window.panoramaViewer) {
                try {
                    if (typeof window.panoramaViewer.dispose === 'function') {
                        window.panoramaViewer.dispose();
                    }
                } catch (e) {
                    console.warn('Error disposing previous panoramaViewer', e);
                }
                try { panoramaContainer.innerHTML = ''; } catch (_) {}
                window.panoramaViewer = null;
            }

            // Create panorama image and viewer
            const panoramaImage = new PANOLENS.ImagePanorama(`static/360_images/${panoramaFilename}`);

            window.panoramaViewer = new PANOLENS.Viewer({
                container: panoramaContainer,
            });

            window.panoramaViewer.add(panoramaImage);

            // Handler to dispose and hide when exiting fullscreen
            function onFullscreenChange() {
                const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
                if (!fsElement) {
                    if (window.panoramaViewer) {
                        try {
                            if (typeof window.panoramaViewer.dispose === 'function') {
                                window.panoramaViewer.dispose();
                            }
                        } catch (e) {
                            console.warn('Error disposing panoramaViewer on fullscreen exit', e);
                        }
                        try { panoramaContainer.innerHTML = ''; } catch (_) {}
                        window.panoramaViewer = null;
                    }
                    panoramaContainer.style.display = 'none';
                    if (infoContainer) infoContainer.style.display = 'block';

                    document.removeEventListener('fullscreenchange', onFullscreenChange);
                    document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
                    document.removeEventListener('mozfullscreenchange', onFullscreenChange);
                    document.removeEventListener('MSFullscreenChange', onFullscreenChange);
                }
            }

            document.addEventListener('fullscreenchange', onFullscreenChange);
            document.addEventListener('webkitfullscreenchange', onFullscreenChange);
            document.addEventListener('mozfullscreenchange', onFullscreenChange);
            document.addEventListener('MSFullscreenChange', onFullscreenChange);

            // Request fullscreen (user-initiated click)
            requestFullscreen(panoramaContainer).catch((err) => {
                // If fullscreen fails, viewer still remains visible inline
                console.warn('Fullscreen request failed or not supported:', err);
            });
        });

        return { button: openPanoramaButton, container: panoramaContainer };
    }

    // Now branch by style. If data.style is missing or not 'full', treat as 'box'.
    if (data.style === 'full') {
        // FULLSCREEN IMAGE SLIDER STYLE (fixed: synchronized image vw track + text px track)
        const slides = [];
        function pushSlide(img, title, text) {
            if (img || title || text) slides.push({ image: img || '', title: title || '', text: text || '' });
        }
        pushSlide(data.image, data.title, data.text);
        pushSlide(data.image2, data.title2, data.text2);
        pushSlide(data.image3, data.title3, data.text3);

        if (slides.length === 0) {
            data.style = undefined;
            return openModal(data);
        }

        let idx = 0;
        let infoWidth = 0;
        let resizeObserver = null;


        // Slides track for images (each slide sized to viewport using vw)
        const slidesTrack = document.createElement('div');
        slidesTrack.className = 'modalFullSlidesTrack';
        slidesTrack.style.width = (slides.length * 100) + 'vw';

        slides.forEach(s => {
            const img = document.createElement('img');
            img.className = 'slideImage';
            img.style.width = '100vw';
            img.style.height = '100vh';
            img.style.objectFit = 'cover';
            img.src = s.image || '';
            slidesTrack.appendChild(img);
        });

        // overlay shade for contrast
        const overlayShade = document.createElement('div');
        overlayShade.className = 'modalOverlayShade';

        // Text info container and text track (animated)
        const infoContainer = document.createElement('div');
        infoContainer.className = 'modalFullInfo';

        const textTrack = document.createElement('div');
        textTrack.className = 'modalFullTextTrack';

        // Build text slides. Each slide is full-width, but the visible text sits in a left-side textBox.
        slides.forEach(s => {
            const panel = document.createElement('div');
            panel.className = 'textSlide';
            // width will be set later by measureAndSetTextWidths()
            const inner = document.createElement('div');
            inner.className = 'textSlideInner';

            const textBox = document.createElement('div');
            textBox.className = 'textBox';

            const titleEl = document.createElement('h2');
            titleEl.className = 'modalTitle';
            titleEl.textContent = s.title || '';
            titleEl.style.margin = '0 0 8px 0';

            const textEl = document.createElement('p');
            textEl.className = 'modalText';
            textEl.textContent = s.text || '';
            textEl.style.margin = '0';

            textBox.appendChild(titleEl);
            textBox.appendChild(textEl);
            inner.appendChild(textBox);
            panel.appendChild(inner);
            textTrack.appendChild(panel);
        });

        infoContainer.appendChild(textTrack);

        // Arrow buttons: only create & show when there's more than 1 slide
        function makeArrowButton(isLeft) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = isLeft ? 'modalArrowLeft' : 'modalArrowRight';
            btn.innerHTML = isLeft ? '&#9664;' : '&#9654;';
            return btn;
        }

        let leftBtn = null;
        let rightBtn = null;
        if (slides.length > 1) {
            leftBtn = makeArrowButton(true);
            rightBtn = makeArrowButton(false);
        }

        function updateSlide(newIdx) {
            idx = (newIdx + slides.length) % slides.length;
            // image track uses vw so it always fills viewport
            const txVw = -idx * 100;
            slidesTrack.style.transform = `translateX(${txVw}vw)`;
            // text track uses pixel width of info container so translate by infoWidth
            if (infoWidth) {
                const txPx = -idx * infoWidth;
                textTrack.style.transform = `translateX(${txPx}px)`;
            }
        }

        if (leftBtn && rightBtn) {
            leftBtn.addEventListener('click', (e) => { e.stopPropagation(); updateSlide(idx - 1); });
            rightBtn.addEventListener('click', (e) => { e.stopPropagation(); updateSlide(idx + 1); });
        }

        // Panorama (if any) using shared helper
        let panoramaContainer = null;
        if (data.panorama) {
            const { button, container } = setupPanorama(data.panorama, infoContainer, modalEl);
            panoramaContainer = container;
        }

        // Assemble (append controls conditionally)
        const closeBtn = makeCloseBtn();
        modalEl.appendChild(slidesTrack);
        modalEl.appendChild(overlayShade);
        modalEl.appendChild(infoContainer);
        if (leftBtn) modalEl.appendChild(leftBtn);
        if (rightBtn) modalEl.appendChild(rightBtn);
        modalEl.appendChild(closeBtn);

        // Append modal into DOM before measuring info width
        document.body.appendChild(modalEl);

        // Measure info container width and size textTrack accordingly
        function measureAndSetTextWidths() {
            // Use viewport width for the slide widths so image vw-track and text px-track match consistently.
            const vw = window.innerWidth;
            infoWidth = vw; // treat infoWidth as full viewport width for transforms

            // total width of textTrack = number of slides * viewport width (px)
            textTrack.style.width = (slides.length * vw) + 'px';

            // set each text slide to full viewport width
            const panels = textTrack.querySelectorAll('.textSlide');
            panels.forEach(p => {
                p.style.minWidth = vw + 'px';
                p.style.width = vw + 'px';
                p.style.boxSizing = 'border-box';
            });

            // ensure inner containers fill the slide and align text to bottom-left
            const inners = textTrack.querySelectorAll('.textSlideInner');
            const desiredTextBoxWidth = Math.floor(Math.min(window.innerWidth * 0.48, infoContainer.clientWidth || window.innerWidth * 0.48));
            inners.forEach(inner => {
                inner.style.width = '100%';
                inner.style.height = '100%';
                inner.style.display = 'flex';
                inner.style.alignItems = 'flex-end';
                inner.style.boxSizing = 'border-box';

                const box = inner.querySelector('.textBox');
                if (box) {
                    box.style.width = desiredTextBoxWidth + 'px';
                    box.style.maxWidth = '48vw';
                    box.style.padding = '24px';
                    box.style.boxSizing = 'border-box';
                    box.style.background = 'rgba(0,0,0,0.35)';
                    box.style.color = '#fff';
                    box.style.borderRadius = '6px';
                }
            });

            // re-apply current transform to keep in-sync after resize
            const txPx = -idx * vw;
            textTrack.style.transform = `translateX(${txPx}px)`;
        }

        // initial measurement
        measureAndSetTextWidths();

        // updateSlide initial (ensures both tracks aligned)
        slidesTrack.style.transform = 'translateX(0vw)';
        textTrack.style.transform = 'translateX(0px)';

        // Recompute on window resize. Use ResizeObserver if available to watch infoContainer
        function onWindowResize() {
            measureAndSetTextWidths();
        }
        window.addEventListener('resize', onWindowResize);

        // Close / cleanup
        function closeModal() {
            try {
                if (window.panoramaViewer) {
                    if (typeof window.panoramaViewer.dispose === 'function') window.panoramaViewer.dispose();
                    window.panoramaViewer = null;
                }
                if (panoramaContainer) {
                    try { panoramaContainer.innerHTML = ''; } catch (_) {}
                }
            } catch (err) {
                console.warn('Error disposing panoramaViewer on modal close', err);
            }
            window.removeEventListener('resize', onWindowResize);
            document.removeEventListener('keydown', onKeyDown);
            modalEl.removeEventListener('click', onOverlayClick);
            try { modalEl.parentNode.removeChild(modalEl); } catch (e) {}
            updateQuestLog();
        }

        // keyboard/overlay handlers
        function onKeyDown(e) {
            if (e.key === 'Escape' || e.key === 'Esc') closeModal();
            else if (e.key === 'ArrowLeft') updateSlide(idx - 1);
            else if (e.key === 'ArrowRight') updateSlide(idx + 1);
        }
        function onOverlayClick(e) { if (e.target === modalEl) closeModal(); }

        closeBtn.addEventListener('click', closeModal);
        document.addEventListener('keydown', onKeyDown);
        modalEl.addEventListener('click', onOverlayClick);

        if (data.questEnd) completeQuest(data.questEnd, data.newQuestLatitude, data.newQuestLongitude);
        if (data.questStart) addQuest(data.questStart);
    } else {
        // BOX (standard) modal behaviour (deterministic side/stacked layout)
        const contentEl = document.createElement('div');
        contentEl.className = 'modalContent';
        contentEl.style.position = 'relative';

        const closeBtn = makeCloseBtn();

        // Header: icon + title (kept outside the scrollable wrapper so it is never overlapped)
        const iconEl = document.createElement('img');
        iconEl.className = 'modalIcon';
        iconEl.src = 'static/marker_icons/favicon.webp';
        iconEl.alt = 'icon';

        const titleEl = document.createElement('h2');
        titleEl.className = 'modalTitle';
        titleEl.textContent = data.title || '';

        const headerEl = document.createElement('div');
        headerEl.className = 'modalHeader';
        headerEl.appendChild(iconEl);
        headerEl.appendChild(titleEl);

        // Text and image
        const textEl = document.createElement('p');
        textEl.className = 'modalText';
        textEl.textContent = data.text || '';

        const imgEl = document.createElement('img');
        imgEl.className = 'modalImage';
        if (data.image) imgEl.src = data.image;
        imgEl.style.display = data.image ? 'block' : 'none';
        imgEl.style.maxWidth = '100%';
        imgEl.style.height = 'auto';
        imgEl.style.borderRadius = '8px';
        imgEl.style.boxSizing = 'border-box';

        // Basic info
        const basicInfoEl = document.createElement('div');
        basicInfoEl.className = 'modalBasicInfo';
        basicInfoEl.style.display = 'block';
        function makeInfoLine(label, value) {
            const p = document.createElement('p');
            p.className = 'modalText modalAdditionalInfo';
            p.textContent = `${label}: ${value}`;
            return p;
        }
        if (data.author) basicInfoEl.appendChild(makeInfoLine('Author', data.author));
        if (data.placement_year) basicInfoEl.appendChild(makeInfoLine('Placement year', data.placement_year));
        if (data.language) basicInfoEl.appendChild(makeInfoLine('Language', data.language));
        if (data.rating !== undefined && data.rating !== null && data.rating !== '') {
            basicInfoEl.appendChild(makeInfoLine('Rating', `${data.rating}/5`));
        }

        // Body column (right column in side layout)
        const bodyEl = document.createElement('div');
        bodyEl.className = 'modalBody';
        bodyEl.appendChild(textEl);
        bodyEl.appendChild(basicInfoEl);
        bodyEl.style.boxSizing = 'border-box';

        // Wrapper holds image + body; default stacked (column)
        const wrapperEl = document.createElement('div');
        wrapperEl.className = 'modalContentWrapper';
        wrapperEl.style.display = 'flex';
        wrapperEl.style.flexDirection = 'column';
        wrapperEl.style.gap = '12px';
        wrapperEl.style.boxSizing = 'border-box';

        // Append wrapper children: image first, then body (header remains above)
        if (data.image) wrapperEl.appendChild(imgEl);
        wrapperEl.appendChild(bodyEl);

        // Panorama support (append panorama button into basicInfoEl, container into wrapper)
        let panoramaContainer = null;
        if (data.panorama) {
            const { button, container } = setupPanorama(data.panorama, basicInfoEl, wrapperEl);
            panoramaContainer = container;
        }

        // Assemble: header sits above wrapper; close button absolute in contentEl
        contentEl.appendChild(closeBtn);
        contentEl.appendChild(headerEl);
        contentEl.appendChild(wrapperEl);
        modalEl.appendChild(contentEl);
        document.body.appendChild(modalEl);

        // Accessibility focus
        modalEl.tabIndex = -1;
        modalEl.focus();

        // Layout toggle helpers
        function applySideLayout() {
            contentEl.classList.add('modalContent--side');
            wrapperEl.style.flexDirection = 'row';
            wrapperEl.style.alignItems = 'flex-start';
            wrapperEl.style.gap = '20px';

            if (data.image) {
                imgEl.style.flex = '0 0 55%';
                imgEl.style.maxHeight = '70vh';
                imgEl.style.objectFit = 'cover';
                bodyEl.style.flex = '1 1 auto';
                bodyEl.style.minWidth = '0';
            }
        }
        function removeSideLayout() {
            contentEl.classList.remove('modalContent--side');
            wrapperEl.style.flexDirection = 'column';
            imgEl.style.flex = '';
            imgEl.style.maxHeight = '';
            imgEl.style.objectFit = '';
            bodyEl.style.flex = '';
            bodyEl.style.minWidth = '';
        }

        // Deterministic evaluate: use intrinsic image aspect ratio + available content width
        let resizeTimeout = null;
        function evaluateLayout() {
            // default to stacked when no image
            if (!data.image || !imgEl.src) { removeSideLayout(); return; }

            // Use full screen height (user asked for "whole screen") for the threshold check
            const screenH = window.screen && window.screen.height ? window.screen.height : (window.innerHeight || document.documentElement.clientHeight);
            // read computed content width (contentEl now in DOM)
            const contentWidth = contentEl.clientWidth || Math.min(window.innerWidth - 48, 900);

            // Prefer natural dimensions (deterministic). If not available yet, fallback to bounding rect.
            const natW = imgEl.naturalWidth || 0;
            const natH = imgEl.naturalHeight || 0;

            // threshold: if expected stacked-rendered height > 60% of the whole screen -> side layout
            const threshold = 0.6;

            if (natW > 0 && natH > 0) {
                const expectedHeight = contentWidth * (natH / natW);
                if (expectedHeight > screenH * threshold) applySideLayout();
                else removeSideLayout();
            } else {
                // fallback to actual rendered size (should be rare; only if image not loaded)
                const rect = imgEl.getBoundingClientRect();
                if (rect.height > screenH * threshold) applySideLayout();
                else removeSideLayout();
            }
        }

        // Debounced resize handler
        function onBoxResize() {
            if (resizeTimeout) clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                evaluateLayout();
                resizeTimeout = null;
            }, 120);
        }
        window.addEventListener('resize', onBoxResize);

        // Run evaluation once image is available / after a short delay to stabilise layout
        if (data.image) {
            imgEl.addEventListener('load', () => {
                setTimeout(evaluateLayout, 40);
            });
            if (imgEl.complete && imgEl.naturalWidth) {
                setTimeout(evaluateLayout, 0);
            } else {
                // ensure we run a measurement a short time after append even if cached
                setTimeout(evaluateLayout, 60);
            }
        } else {
            // no image -> ensure stacked
            removeSideLayout();
        }

        // Close/cleanup
        function closeModal() {
            try {
                if (window.panoramaViewer) {
                    if (typeof window.panoramaViewer.dispose === 'function') window.panoramaViewer.dispose();
                    window.panoramaViewer = null;
                }
                if (panoramaContainer) {
                    try { panoramaContainer.innerHTML = ''; } catch (_) {}
                }
            } catch (err) { console.warn('Error disposing panoramaViewer on modal close', err); }

            window.removeEventListener('resize', onBoxResize);
            document.removeEventListener('keydown', onKeyDown);
            modalEl.removeEventListener('click', onOverlayClick);
            try { modalEl.parentNode.removeChild(modalEl); } catch (e) {}
            updateQuestLog();
        }

        function onOverlayClick(e) { if (e.target === modalEl) closeModal(); }
        function onKeyDown(e) { if (e.key === 'Escape' || e.key === 'Esc') closeModal(); }

        closeBtn.addEventListener('click', () => closeModal());
        modalEl.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onKeyDown);

        if (data.questEnd) completeQuest(data.questEnd);
        if (data.questStart) addQuest(data.questStart);
    }
}


