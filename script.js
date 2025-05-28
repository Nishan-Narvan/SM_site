import collection from "./collection.js";

document.addEventListener('DOMContentLoaded', () => {
    const gsapScript = document.createElement('script');
    gsapScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js';
    document.head.appendChild(gsapScript);

    gsapScript.onload = () => {
        // Ensure GSAP is loaded before initializing
        if (typeof gsap !== 'undefined') {
            initGallery();
        } else {
            console.error("GSAP failed to load.");
        }
    };

    function initGallery() {
        const gallery = document.querySelector(".gallery");
        const galleryContainer = document.querySelector(".gallery-container");
        const titleContainer = document.querySelector(".title-container");

        if (!gallery || !galleryContainer || !titleContainer) {
            console.error("One or more essential gallery DOM elements not found!");
            return;
        }

        const cards = [];
        const transformState = [];

        let currentTitle = null;
        let currentPreviewButton = null;
        let isPreviewActive = false;
        let isTransitioning = false;
        let activePreviewCardIndex = -1;

        const config = {
            imageCount: 8, // <<< SET TO 8 CARDS
            radius: 275, // Adjust radius if needed for 8 cards to fit well
            sensitivity: 500,
            effectFalloff: 250,
            cardMoveAmount: 50,
            lerpFactor: 0.15,
            isMobile: window.innerWidth < 1000,
        };

        const parallaxState = {
            targetX: 0, targetY: 0, targetZ: 0,
            currentX: 0, currentY: 0, currentZ: 0,
        };

        // Ensure collection has enough items for imageCount or handle repetition
        if (collection.length === 0) {
            console.error("Collection is empty. Cannot build gallery.");
            return;
        }

        for (let i = 0; i < config.imageCount; i++) {
            const angle = (i / config.imageCount) * Math.PI * 2;
            const x = config.radius * Math.cos(angle);
            const y = config.radius * Math.sin(angle);
            
            const collectionItemIndex = i % collection.length;
            const albumData = collection[collectionItemIndex];

            if (!albumData) {
                console.warn(`No album data for index ${i} (collection index ${collectionItemIndex})`);
                continue; // Skip if data is somehow undefined
            }

            const card = document.createElement('div');
            card.className = "card";
            card.dataset.index = i;
            card.dataset.title = albumData.title;
            card.dataset.url = albumData.url; 

            const img = document.createElement("img");
            img.src = albumData.img;
            img.alt = albumData.title; // Add alt text for accessibility
            card.appendChild(img);

            gsap.set(card, {
                x, y,
                rotation: (angle * 180) / Math.PI + 90,
                transformPerspective: 800,
                transformOrigin: "center center",
            });

            gallery.appendChild(card);
            cards.push(card);
            transformState.push({
                currentRotation: 0, targetRotation: 0,
                currentX: 0, targetX: 0, currentY: 0, targetY: 0,
                currentScale: 1, targetScale: 1,
                angle,
            });

            card.addEventListener("click", (e) => {
                if (isTransitioning) return;
                const clickedCardUniqueIndex = parseInt(card.dataset.index);

                if (!isPreviewActive) {
                    togglePreview(clickedCardUniqueIndex);
                    e.stopPropagation(); 
                }
            });
        }

        function togglePreview(indexOfCardToPreview) {
            isPreviewActive = true;
            isTransitioning = true;
            activePreviewCardIndex = indexOfCardToPreview;

            const angle = transformState[indexOfCardToPreview].angle;
            const targetPosition = (Math.PI * 3) / 2; // Target top position
            let rotationRadians = targetPosition - angle;

            // Normalize rotation to be the shortest path
            if (rotationRadians > Math.PI) rotationRadians -= Math.PI * 2;
            else if (rotationRadians < -Math.PI) rotationRadians += Math.PI * 2;

            // Reset individual card transforms from hover effects
            transformState.forEach((state) => {
                state.currentRotation = state.targetRotation = 0;
                state.currentScale = state.targetScale = 1;
                state.currentX = state.targetX = state.currentY = state.targetY = 0;
            });
            cards.forEach((c, i) => {
                gsap.to(c, {
                    x: config.radius * Math.cos(transformState[i].angle),
                    y: config.radius * Math.sin(transformState[i].angle),
                    rotationY: 0,
                    scale: 1,
                    duration: 1.25, // Sync with gallery's onStart logic
                    ease: "power4.out",
                });
            });


            gsap.to(gallery, {
                scale: 5, // Zoom factor
                y: window.innerHeight / 2 - 100, // Adjust to center vertically considering card size
                rotation: (rotationRadians * 180) / Math.PI, // No extra 360 needed if normalized
                duration: 2,
                ease: "power4.inOut",
                onComplete: () => (isTransitioning = false),
            });

            // Reset parallax container
            gsap.to(parallaxState, {
                currentX: 0, currentY: 0, currentZ: 0,
                duration: 0.5,
                ease: "power2.out",
                onUpdate: () => {
                    gsap.set(galleryContainer, {
                        rotateX: parallaxState.currentX,
                        rotateY: parallaxState.currentY,
                        rotateZ: parallaxState.currentZ,
                        transformOrigin: "center center",
                    });
                },
            });

            // --- Title ---
            const titleText = cards[indexOfCardToPreview].dataset.title;
            const p = document.createElement("p");
            p.textContent = titleText;
            titleContainer.appendChild(p);
            currentTitle = p;

            gsap.fromTo(p,
                { y: "30px", opacity: 0 }, // Initial state from CSS (or slightly adjusted)
                {
                    y: "0%", opacity: 1,
                    duration: 0.75, delay: 1.25, ease: "power4.out",
                }
            );

            // --- Link Button ---
            const albumUrl = cards[indexOfCardToPreview].dataset.url;
            if (albumUrl && albumUrl !== "#") {
                const button = document.createElement("button");
                button.className = "preview-link-button";
                button.textContent = "Listen Now";
                
                button.addEventListener('click', (e) => {
                    e.stopPropagation(); 
                    window.open(albumUrl, '_blank');
                });

                titleContainer.appendChild(button);
                currentPreviewButton = button;

                gsap.fromTo(button,
                    { y: "50px", opacity: 0 }, // Initial state from CSS
                    {
                        y: "0%", opacity: 1,
                        duration: 0.75, delay: 1.4, ease: "power4.out",
                    }
                );
            }
        }

        function resetGallery() {
            if (isTransitioning && !isPreviewActive) return; // Avoid double reset if already resetting
            if (!isPreviewActive && !currentTitle && !currentPreviewButton) return; // Nothing to reset

            isTransitioning = true; // Set transitioning true at the start of reset

            if (currentTitle) {
                gsap.to(currentTitle, {
                    y: "30px", opacity: 0,
                    duration: 0.6, ease: "power4.in",
                    onComplete: () => {
                        if (currentTitle) currentTitle.remove();
                        currentTitle = null;
                    },
                });
            }

            if (currentPreviewButton) {
                gsap.to(currentPreviewButton, {
                    y: "50px", opacity: 0,
                    duration: 0.6, ease: "power4.in",
                    onComplete: () => {
                        if (currentPreviewButton) currentPreviewButton.remove();
                        currentPreviewButton = null;
                    },
                });
            }

            const viewportWidth = window.innerWidth;
            let galleryScale = 1;
            if (viewportWidth < 768) galleryScale = 0.5;
            else if (viewportWidth < 1200) galleryScale = 0.5;

            // Ensure isPreviewActive is true when starting the gallery reset animation
            // so the animate() loop doesn't interfere
            isPreviewActive = true; 

            gsap.to(gallery, {
                scale: galleryScale, y: 0, x: 0, rotation: 0,
                duration: 2, // Slightly shorter duration for reset
                ease: "power4.inOut",
                delay: (currentTitle || currentPreviewButton) ? 0.3 : 0, // Delay if title/button are animating out
                onComplete: () => {
                    isPreviewActive = false; // Now gallery is fully reset
                    isTransitioning = false;
                    activePreviewCardIndex = -1;
                    // Reset parallax state to default position for next interaction
                    Object.assign(parallaxState, {
                        targetX: 0, targetY: 0, targetZ: 0,
                        currentX: 0, currentY: 0, currentZ: 0,
                    });
                    gsap.set(galleryContainer, { // Apply reset immediately
                        rotateX: 0, rotateY: 0, rotateZ: 0,
                    });
                },
            });
        }

        function handleResize() {
            const viewportWidth = window.innerWidth;
            config.isMobile = viewportWidth < 1000;
            let galleryScale = 1;
            if (viewportWidth < 768) galleryScale = 0.6;
            else if (viewportWidth < 1200) galleryScale = 0.8;
            
            if (!isPreviewActive) { // Only adjust scale if not in preview
                gsap.set(gallery, { scale: galleryScale });
                Object.assign(parallaxState, { targetX: 0, targetY: 0, targetZ: 0, currentX: 0, currentY: 0, currentZ: 0 });
                transformState.forEach((state) => {
                    Object.assign(state, { targetRotation: 0, currentRotation: 0, targetScale: 1, currentScale: 1, targetX: 0, currentX: 0, targetY: 0, currentY: 0 });
                });
            }
        }

        window.addEventListener("resize", handleResize);
        handleResize(); // Initial call

        document.addEventListener("click", (e) => {
            // Check if the click is outside the active card area when in preview
            // and not on the button itself (which handles its own propagation)
            if (isPreviewActive && !isTransitioning) {
                // A simple way to check: if the target isn't a card or the title container's children
                let clickedOnPreviewElements = false;
                if (activePreviewCardIndex !== -1 && cards[activePreviewCardIndex]?.contains(e.target)) {
                    clickedOnPreviewElements = true;
                }
                if (titleContainer.contains(e.target)) {
                     clickedOnPreviewElements = true;
                }

                // If not clicking on the active card or the title/button area, then reset.
                // The button click is already stopped.
                // The card click to enter preview is also stopped.
                // This reset is for general "click outside" behavior.
                if (!clickedOnPreviewElements && !cards.some(card => card.contains(e.target))) {
                     resetGallery();
                }
            }
        });

        document.addEventListener("mousemove", (e) => {
            if (isPreviewActive || isTransitioning || config.isMobile) return;
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const percentX = (e.clientX - centerX) / centerX;
            const percentY = (e.clientY - centerY) / centerY;
            parallaxState.targetY = percentX * 15; // Tilt Y based on X mouse
            parallaxState.targetX = -percentY * 15; // Tilt X based on Y mouse
            parallaxState.targetZ = 0; // (percentX + percentY) * 5; // Keep Z rotation minimal or zero for less distraction

            cards.forEach((card, index) => {
                const rect = card.getBoundingClientRect();
                const dx = e.clientX - (rect.left + rect.width / 2);
                const dy = e.clientY - (rect.top + rect.height / 2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < config.sensitivity && !config.isMobile) {
                    const flipFactor = Math.max(0, 1 - distance / config.effectFalloff);
                    const angle = transformState[index].angle;
                    const moveAmount = config.cardMoveAmount * flipFactor;
                    transformState[index].targetRotation = 180 * flipFactor;
                    transformState[index].targetScale = 1 + 0.2 * flipFactor; // Slightly less scale
                    transformState[index].targetX = moveAmount * Math.cos(angle);
                    transformState[index].targetY = moveAmount * Math.sin(angle);
                } else {
                    transformState[index].targetRotation = 0;
                    transformState[index].targetScale = 1;
                    transformState[index].targetX = 0;
                    transformState[index].targetY = 0;
                }
            });
        });

        function animate() {
            if (!isPreviewActive && !isTransitioning) {
                parallaxState.currentX += (parallaxState.targetX - parallaxState.currentX) * config.lerpFactor;
                parallaxState.currentY += (parallaxState.targetY - parallaxState.currentY) * config.lerpFactor;
                parallaxState.currentZ += (parallaxState.targetZ - parallaxState.currentZ) * config.lerpFactor;
                gsap.set(galleryContainer, {
                    rotateX: parallaxState.currentX,
                    rotateY: parallaxState.currentY,
                    rotationZ: parallaxState.currentZ,
                });
                cards.forEach((card, index) => {
                    const state = transformState[index];
                    state.currentRotation += (state.targetRotation - state.currentRotation) * config.lerpFactor;
                    state.currentScale += (state.targetScale - state.currentScale) * config.lerpFactor;
                    state.currentX += (state.targetX - state.currentX) * config.lerpFactor;
                    state.currentY += (state.targetY - state.currentY) * config.lerpFactor;
                    
                    const baseAngle = state.angle;
                    const initialRotationZ = (baseAngle * 180) / Math.PI + 90;
                    const x = config.radius * Math.cos(baseAngle) + state.currentX;
                    const y = config.radius * Math.sin(baseAngle) + state.currentY;

                    gsap.set(card, {
                        x: x,
                        y: y,
                        rotationY: state.currentRotation,
                        rotationZ: initialRotationZ, // Ensure this is always applied
                        scale: state.currentScale,
                        transformPerspective: 1000, // Keep perspective consistent
                    });
                });
            }
            requestAnimationFrame(animate);
        }
        animate(); // Start the animation loop
    }
});