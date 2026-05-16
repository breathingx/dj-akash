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