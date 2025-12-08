// Dynamic modal creation and teardown (refactored)
// Replaces previous openModal implementation. Handles both 'full' and 'box' styles.
// Also centralises panorama creation so we don't duplicate the viewer logic.
function openModal(data) {
    // Build modal overlay and ensure it's visible (CSS .modal often has display:none)
    const modalEl = document.createElement('div');
    modalEl.className = 'modal' + (data.style === 'full' ? ' full-modal' : '');
    modalEl.style.display = 'flex';

    // Helper to request fullscreen (vendor fallbacks)
    function requestFullscreen(el) {
        if (!el) return Promise.reject(new Error('No element'));
        if (el.requestFullscreen) return el.requestFullscreen();
        if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
        if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
        if (el.msRequestFullscreen) return el.msRequestFullscreen();
        return Promise.reject(new Error('Fullscreen API not supported'));
    }

    // Shared close button creator (styled by existing CSS .closeModalBtn)
    function makeCloseBtn() {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'closeModalBtn';
        closeBtn.type = 'button';
        closeBtn.innerHTML = '✕';
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
        // FULLSCREEN IMAGE SLIDER STYLE

        // Build slides (include only slides with any content)
        const slides = [];
        function pushSlide(img, title, text) {
            if (img || title || text) slides.push({ image: img || '', title: title || '', text: text || '' });
        }
        pushSlide(data.image, data.title, data.text);
        pushSlide(data.image2, data.title2, data.text2);
        pushSlide(data.image3, data.title3, data.text3);

        if (slides.length === 0) {
            // fallback to box modal if no slides
            data.style = undefined;
            return openModal(data);
        }

        let idx = 0;

        // Fullscreen background image element (cover)
        const imgEl = document.createElement('img');
        imgEl.className = 'modalImage full';
        imgEl.src = slides[0].image || '';

        // overlay shade
        const overlayShade = document.createElement('div');
        overlayShade.className = 'modalOverlayShade';

        // Text container bottom-left
        const infoContainer = document.createElement('div');
        infoContainer.className = 'modalFullInfo';

        const titleEl = document.createElement('h2');
        titleEl.style.margin = '0 0 8px 0';
        titleEl.style.color = 'inherit';

        const textEl = document.createElement('p');
        textEl.style.margin = '0';
        textEl.style.color = 'inherit';

        infoContainer.appendChild(titleEl);
        infoContainer.appendChild(textEl);

        // Arrow buttons (classes carry styling)
        function makeArrowButton(isLeft) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = isLeft ? 'modalArrowLeft' : 'modalArrowRight';
            btn.innerHTML = isLeft ? '&larr;' : '&rarr;';
            return btn;
        }
        const leftBtn = makeArrowButton(true);
        const rightBtn = makeArrowButton(false);

        function updateSlide(newIdx) {
            idx = (newIdx + slides.length) % slides.length;
            const s = slides[idx];
            imgEl.src = s.image || '';
            titleEl.textContent = s.title || '';
            textEl.textContent = s.text || '';
        }

        leftBtn.addEventListener('click', (e) => { e.stopPropagation(); updateSlide(idx - 1); });
        rightBtn.addEventListener('click', (e) => { e.stopPropagation(); updateSlide(idx + 1); });

        // Panorama (if any) using shared helper
        let panoramaContainer = null;
        if (data.panorama) {
            const { button, container } = setupPanorama(data.panorama, infoContainer, modalEl);
            panoramaContainer = container;
            // button already appended into infoContainer inside helper
        }

        // Assemble DOM
        const closeBtn = makeCloseBtn();
        modalEl.appendChild(imgEl);
        modalEl.appendChild(overlayShade);
        modalEl.appendChild(infoContainer);
        modalEl.appendChild(leftBtn);
        modalEl.appendChild(rightBtn);
        modalEl.appendChild(closeBtn);

        // initial slide
        updateSlide(0);

        // Add to DOM
        document.body.appendChild(modalEl);

        // keyboard/overlay handlers
        function onKeyDown(e) {
            if (e.key === 'Escape' || e.key === 'Esc') closeModal();
            else if (e.key === 'ArrowLeft') updateSlide(idx - 1);
            else if (e.key === 'ArrowRight') updateSlide(idx + 1);
        }
        function onOverlayClick(e) { if (e.target === modalEl) closeModal(); }

        // Close (also dispose panorama viewer if open)
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
            document.removeEventListener('keydown', onKeyDown);
            modalEl.removeEventListener('click', onOverlayClick);
            try { modalEl.parentNode.removeChild(modalEl); } catch (e) {}
            updateQuestLog();
        }

        closeBtn.addEventListener('click', closeModal);
        document.addEventListener('keydown', onKeyDown);
        modalEl.addEventListener('click', onOverlayClick);

        // Maintain quest semantics
        if (data.questEnd) completeQuest(data.questEnd);
        if (data.questStart) addQuest(data.questStart);

    } else {
        // BOX (standard) modal behaviour

        // Build content container, ensure it's visible via modalEl.style.display above
        const contentEl = document.createElement('div');
        contentEl.className = 'modalContent';

        // Close button
        const closeBtn = makeCloseBtn();

        // Title, text, image
        const titleEl = document.createElement('h2');
        titleEl.className = 'modalTitle';
        titleEl.textContent = data.title || '';

        const textEl = document.createElement('p');
        textEl.className = 'modalText';
        textEl.textContent = data.text || '';

        const imgEl = document.createElement('img');
        imgEl.className = 'modalImage';
        if (data.image) imgEl.src = data.image;

        // Basic info container
        const basicInfoEl = document.createElement('div');
        basicInfoEl.className = 'modalBasicInfo';
        basicInfoEl.style.display = 'block';

        // Helper for labeled lines
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

        // Panorama support via shared helper
        let panoramaContainer = null;
        if (data.panorama) {
            const { button, container } = setupPanorama(data.panorama, basicInfoEl, contentEl);
            panoramaContainer = container;
            // helper appended button to basicInfoEl and container to contentEl
        }

        // Assemble and append
        contentEl.appendChild(closeBtn);
        contentEl.appendChild(titleEl);
        contentEl.appendChild(textEl);
        if (data.image) contentEl.appendChild(imgEl);
        contentEl.appendChild(basicInfoEl);

        modalEl.appendChild(contentEl);
        document.body.appendChild(modalEl);

        // Focus for keyboard capture
        modalEl.tabIndex = -1;
        modalEl.focus();

        // Close function (cleans panorama viewer too)
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

            document.removeEventListener('keydown', onKeyDown);
            modalEl.removeEventListener('click', onOverlayClick);
            if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
            updateQuestLog();
        }

        // Overlay/keyboard
        function onOverlayClick(e) { if (e.target === modalEl) closeModal(); }
        function onKeyDown(e) { if (e.key === 'Escape' || e.key === 'Esc') closeModal(); }

        closeBtn.addEventListener('click', () => closeModal());
        modalEl.addEventListener('click', onOverlayClick);
        document.addEventListener('keydown', onKeyDown);

        // Maintain quest semantics
        if (data.questEnd) completeQuest(data.questEnd);
        if (data.questStart) addQuest(data.questStart);
    }
}


