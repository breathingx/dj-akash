/// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://fiibrecmehhebuthkvcz.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_037d9RVXZEJAFuL0eiXSyQ_gx5l6gWt'; 

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const TO_DUTCH_MONTH = ["JAN", "FEB", "MRT", "APR", "MEI", "JUN", "JUL", "AUG", "SEP", "OKT", "NOV", "DEC"];

// State tracking for the immersive photo gallery viewer
let currentAlbumPhotos = [];
let currentPhotoIndex = 0;
window.globalGalleryStorage = {}; // Safe global bucket for mapping assets

// Main initialization loop
document.addEventListener('DOMContentLoaded', () => {
    loadUpcomingEvents();
    loadPastGallery();
});

// ===================================================
// 1. LOAD UPCOMING EVENTS
// ===================================================
async function loadUpcomingEvents() {
    const eventContainer = document.getElementById('dynamic-event-list');
    if (!eventContainer) return;

    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: events, error } = await supabaseClient
            .from('events')
            .select('*')
            .gte('event_date', today)
            .order('event_date', { ascending: true });

        if (error) throw error;

        if (!events || events.length === 0) {
            eventContainer.innerHTML = `<p style="text-align: center; color: #888;">No upcoming events planned at the moment. Check back soon!</p>`;
            return;
        }

        eventContainer.innerHTML = '';
        events.forEach(event => {
            const dateParts = event.event_date.split('-');
            const day = parseInt(dateParts[2], 10);
            const monthStr = TO_DUTCH_MONTH[parseInt(dateParts[1], 10) - 1];

            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            
            eventCard.style.cursor = 'pointer';
            eventCard.onclick = () => openFlyer(event.flyer_url);

            eventCard.innerHTML = `
                <div class="date">${day} ${monthStr}</div>
                <div class="details">
                    <h3>${event.name}</h3>
                    <p>${event.description}</p>
                    <p>Tijd: ${event.event_time.substring(0, 5)}</p>
                    <p>Locatie: ${event.location}</p>
                </div>
            `;
            eventContainer.appendChild(eventCard);
        });
    } catch (err) {
        console.error(err);
    }
}

// ===================================================
// 2. LOAD PAST EVENTS & GALLERY PHOTOS
// ===================================================
async function loadPastGallery() {
    const galleryContainer = document.getElementById('dynamic-gallery-list');
    if (!galleryContainer) return;

    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: pastEvents, error } = await supabaseClient
            .from('events')
            .select(`
                id, name, event_date, location,
                event_images ( image_url )
            `)
            .lt('event_date', today)
            .order('event_date', { ascending: false });

        if (error) throw error;

        if (!pastEvents || pastEvents.length === 0) {
            galleryContainer.innerHTML = `<p style="text-align: center; color: #888;">Gallery photos will appear here after events conclude!</p>`;
            return;
        }

        galleryContainer.innerHTML = '';

        pastEvents.forEach(event => {
            // REMOVED the strict "return;" skip so the event name always shows up!

            const eventBlock = document.createElement('div');
            eventBlock.className = 'past-event-section';
            eventBlock.style.marginBottom = '40px';
            eventBlock.style.position = 'relative'; 
            eventBlock.style.zIndex = '5';          

            // 1. Render the Header text regardless of image count
            let htmlContent = `
                <h3 style="color: var(--gold); margin-bottom: 5px;">${event.name}</h3>
                <p style="font-size: 14px; color: #aaa; margin: 0 0 15px 0;">Bij ${event.location || 'Locatie TBD'} op ${event.event_date}!</p>
            `;

            // 2. Check if it actually has images to display
            if (event.event_images && event.event_images.length > 0) {
                // Stash the photo URLs into global memory
                window.globalGalleryStorage[event.id] = event.event_images.map(img => img.image_url);

                htmlContent += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px;">`;

                event.event_images.forEach((img, index) => {
                    htmlContent += `
                        <img src="${img.image_url}" alt="Recap photo" 
                             style="width: 100%; height: 150px; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); cursor: pointer; transition: 0.3s; position: relative; z-index: 10;" 
                             onmouseover="this.style.boxShadow='0 0 12px var(--gold)'" 
                             onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.4)'"
                             onclick="launchGalleryPopup('${event.id}', ${index})">
                    `;
                });

                htmlContent += `</div>`;
            } else {
                // Clean fallback design if you haven't uploaded test photos yet!
                htmlContent += `<p style="font-size: 14px; color: #666; font-style: italic; margin-left: 5px;">No recap photos uploaded for this event yet.</p>`;
            }

            eventBlock.innerHTML = htmlContent;
            galleryContainer.appendChild(eventBlock);
        });

    } catch (err) {
        console.error("Error loading gallery:", err);
    }
}

// ===================================================
// 3. GALLERY SLIDESHOW OVERLAY ENGINE
// ===================================================
window.launchGalleryPopup = function(eventId, index) {
    const modal = document.getElementById('galleryModal');
    const modalImg = document.getElementById('galleryModalImg');
    
    currentAlbumPhotos = window.globalGalleryStorage[eventId] || [];
    currentPhotoIndex = index;
    
    if (modal && modalImg && currentAlbumPhotos.length > 0) {
        modalImg.src = currentAlbumPhotos[currentPhotoIndex];
        
        // Match your native flyer behavior by using display class wrappers!
        modal.classList.add('show');
        modal.style.display = 'flex';
    }
};

window.closeGalleryModal = function() {
    const modal = document.getElementById('galleryModal');
    if (modal) {
        modal.classList.remove('show');
        // Let it blend away cleanly, then hide its structure block
        setTimeout(() => {
            if (!modal.classList.contains('show')) {
                modal.style.display = 'none';
            }
        }, 300);
    }
};

window.changeGalleryPhoto = function(direction) {
    if (!currentAlbumPhotos || currentAlbumPhotos.length === 0) return;
    
    // Safely shift layout positions backward or forward through array tracking boundaries
    currentPhotoIndex = (currentPhotoIndex + direction + currentAlbumPhotos.length) % currentAlbumPhotos.length;
    
    const modalImg = document.getElementById('galleryModalImg');
    if (modalImg) {
        modalImg.src = currentAlbumPhotos[currentPhotoIndex];
    }
};

// ===================================================
// 4. FLYER OVERLAY POPUPS
// ===================================================
function openFlyer(imagePath) {
    const modal = document.getElementById('flyerModal');
    const modalImg = document.getElementById('modalImg');
    
    if (modal && modalImg) {
        modalImg.src = imagePath;
        modal.classList.add('show');
    }
}

function closeFlyer() {
    const modal = document.getElementById('flyerModal');
    const modalImg = document.getElementById('modalImg');
    
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modalImg && !modal.classList.contains('show')) {
                modalImg.src = "";
            }
        }, 300); 
    }
}

// ===================================================
// 5. NAV ROUTING ENGINE & INTERACTIVES
// ===================================================
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });

    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
}

// Global hotkeys handler
document.addEventListener('keydown', (e) => {
    const galleryModal = document.getElementById('galleryModal');
    
    // Process keystrokes if the photo browser frame is opened
    if (galleryModal && (galleryModal.classList.contains('show') || galleryModal.style.display === 'flex')) {
        if (e.key === 'ArrowRight') changeGalleryPhoto(1);
        if (e.key === 'ArrowLeft') changeGalleryPhoto(-1);
        if (e.key === 'Escape') closeGalleryModal();
    }
    
    // Handle separate standalone flyers closing out
    const flyerModal = document.getElementById('flyerModal');
    if (flyerModal && flyerModal.classList.contains('show') && e.key === 'Escape') {
        closeFlyer();
    }
});

function showPage(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
    });

    // Show the selected page
    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active');
        window.scrollTo(0, 0);
    }
}


function openFlyer(imagePath) {
    // 1. Find the modal element and the image tag inside it
    const modal = document.getElementById('flyerModal');
    const modalImg = document.getElementById('modalImg');
    
    // 2. Change the source of the image to match the clicked card's flyer
    modalImg.src = imagePath;
    
    // 3. Show the popup
    modal.classList.add('show');
}

function closeFlyer() {
    const modal = document.getElementById('flyerModal');
    const modalImg = document.getElementById('modalImg');
    
    // Remove the show class to hide the modal
    modal.classList.remove('show');
    
    // Clean up: Clear out the image source after closing so the old flyer 
    // doesn't flash on screen the next time you open a different card
    setTimeout(() => {
        modalImg.src = "";
    }, 300); 
}
