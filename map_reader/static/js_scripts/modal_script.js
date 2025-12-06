// const panoramaContainer = document.getElementById('panoramaContainer')
// const openPanoramaButton = document.getElementById("openPanoramaButton");


// Dynamic modal creation and teardown
function openModal(data) {
    // Build modal overlay
    const modalEl = document.createElement('div');
    modalEl.className = 'modal';
    modalEl.style.display = 'flex';

    // Modal content box
    const contentEl = document.createElement('div');
    contentEl.className = 'modalContent';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'closeModalBtn';
    closeBtn.type = 'button';
    closeBtn.innerHTML = '✕';

    // Title, text, image elements (use same class names as before so CSS applies)
    const titleEl = document.createElement('h2');
    titleEl.className = 'modalTitle';
    titleEl.textContent = data.title || '';

    const textEl = document.createElement('p');
    textEl.className = 'modalText';
    textEl.textContent = data.text || '';

    const imgEl = document.createElement('img');
    imgEl.className = 'modalImage';
    if (data.image) imgEl.src = data.image;

    // Basic info container (same class used previously)
    const basicInfoEl = document.createElement('div');
    basicInfoEl.className = 'modalBasicInfo';
    basicInfoEl.style.display = 'block';

    // Helper to create labeled info line (inherits modalText style)
    function makeInfoLine(label, value) {
        const p = document.createElement('p');
        p.className = 'modalText modalAdditionalInfo';
        p.textContent = `${label}: ${value}`;
        return p;
    }

    // Add optional fields if present
    if (data.author) basicInfoEl.appendChild(makeInfoLine('Author', data.author));
    if (data.placement_year) basicInfoEl.appendChild(makeInfoLine('Placement year', data.placement_year));
    if (data.language) basicInfoEl.appendChild(makeInfoLine('Language', data.language));
    if (data.rating !== undefined && data.rating !== null && data.rating !== '') {
        basicInfoEl.appendChild(makeInfoLine('Rating', `${data.rating}/5`));
    }

    // If the marker has a panorama, add panorama button and container
    if (data.panorama) {
        console.log("Creating panorama");
        openPanoramaButton = document.createElement('button');
        openPanoramaButton.className = 'openPanoramaButton';
        openPanoramaButton.type = 'button';
        openPanoramaButton.innerHTML = 'Open panorama';

        panoramaContainer = document.createElement('div');
        panoramaContainer.className = 'panoramaContainer';

        openPanoramaButton.addEventListener('click', () => {
            console.log("Opening panorama");

            // Ensure basic info hidden and container visible before creating viewer
            basicInfoEl.style.display = 'none';
            panoramaContainer.style.display = 'block';

            // Clean up any previous viewer and leftover DOM
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
            const panoramaImage = new PANOLENS.ImagePanorama(`static/360_images/${data.panorama}`);

            window.panoramaViewer = new PANOLENS.Viewer({
                container: panoramaContainer,
            });

            window.panoramaViewer.add(panoramaImage);

            // Request fullscreen helper (vendor fallbacks)
            function requestFullscreen(el) {
                if (!el) return Promise.reject(new Error('No element'));
                if (el.requestFullscreen) return el.requestFullscreen();
                if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
                if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
                if (el.msRequestFullscreen) return el.msRequestFullscreen();
                return Promise.reject(new Error('Fullscreen API not supported'));
            }

            // Handler to dispose and hide when exiting fullscreen
            function onFullscreenChange() {
                const fsElement = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
                if (!fsElement) {
                    // Exit fullscreen: dispose viewer and hide container
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
                    basicInfoEl.style.display = 'block';

                    // Remove listeners
                    document.removeEventListener('fullscreenchange', onFullscreenChange);
                    document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
                    document.removeEventListener('mozfullscreenchange', onFullscreenChange);
                    document.removeEventListener('MSFullscreenChange', onFullscreenChange);
                }
            }

            // Add fullscreen change listeners (vendor prefixes)
            document.addEventListener('fullscreenchange', onFullscreenChange);
            document.addEventListener('webkitfullscreenchange', onFullscreenChange);
            document.addEventListener('mozfullscreenchange', onFullscreenChange);
            document.addEventListener('MSFullscreenChange', onFullscreenChange);

            // Request fullscreen immediately (still inside user click handler)
            requestFullscreen(panoramaContainer)
                .catch((err) => {
                    // If fullscreen fails, the viewer still remains visible in the page.
                    console.warn('Fullscreen request failed or not supported:', err);
                });
        });
    }

    // Assemble modal content
    contentEl.appendChild(closeBtn);
    contentEl.appendChild(titleEl);
    contentEl.appendChild(textEl);
    if (data.image) contentEl.appendChild(imgEl);
    contentEl.appendChild(basicInfoEl);
    if (data.panorama) {
        contentEl.appendChild(openPanoramaButton);
        contentEl.appendChild(panoramaContainer);
    }
    modalEl.appendChild(contentEl);

    // Append to body
    document.body.appendChild(modalEl);

    // Focus to catch Esc key
    modalEl.tabIndex = -1;
    modalEl.focus();

    // Close function that cleans up listeners and DOM
    function closeModal() {
        // Remove key listener
        document.removeEventListener('keydown', onKeyDown);
        // Remove overlay click listener
        modalEl.removeEventListener('click', onOverlayClick);
        // Remove DOM
        if (modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
        // Restore quest log and other UI
        updateQuestLog();
    }

    // Close on close button
    closeBtn.addEventListener('click', () => {
        closeModal();
    });

    // Close on clicking outside content
    function onOverlayClick(e) {
        if (e.target === modalEl) {
            closeModal();
        }
    }
    modalEl.addEventListener('click', onOverlayClick);

    // Close on Esc key
    function onKeyDown(e) {
        if (e.key === 'Escape' || e.key === 'Esc') {
            closeModal();
        }
    }
    document.addEventListener('keydown', onKeyDown);

    // Maintain quest logic from previous modal behavior
    if (data.questEnd) {
        completeQuest(data.questEnd);
    }
    if (data.questStart) {
        addQuest(data.questStart);
    }


}


