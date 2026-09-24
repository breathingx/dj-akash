// ==========================================
// CONFIGURATION
// ==========================================

const SUPABASE_URL = 'https://fiibrecmehhebuthkvcz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_037d9RVXZEJAFuL0eiXSyQ_gx5l6gWt';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// ==========================================
// DOM ELEMENTS
// ==========================================

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const eventForm = document.getElementById('event-form');
const logoutBtn = document.getElementById('logout-btn');
const loginMsg = document.getElementById('login-msg');
const uploadMsg = document.getElementById('upload-msg');
const galleryForm = document.getElementById('gallery-form');
const galleryFiles = document.getElementById('gallery-files');
const gallerySubmitBtn = document.getElementById('gallery-submit-btn');
const galleryMsg = document.getElementById('gallery-msg');
const adminPhotoStream = document.getElementById('admin-photo-stream');

// Edit-event elements
const editEventSelector = document.getElementById('edit-event-selector');
const editEventForm = document.getElementById('edit-event-form');
const editFieldset = document.getElementById('edit-fieldset');
const editName = document.getElementById('edit-event-name');
const editDesc = document.getElementById('edit-event-desc');
const editDate = document.getElementById('edit-event-date');
const editTime = document.getElementById('edit-event-time');
const editLocation = document.getElementById('edit-event-location');
const editFlyer = document.getElementById('edit-event-flyer');
const editFlyerPreview = document.getElementById('edit-flyer-preview');
const editFlyerWrap = document.getElementById('edit-flyer-wrap');
const editFlyerDelete = document.getElementById('edit-flyer-delete');
const editNoFlyer = document.getElementById('edit-no-flyer');
const editSubmitBtn = document.getElementById('edit-submit-btn');
const editMsg = document.getElementById('edit-msg');

let eventsCache = [];


// ==========================================
// CHECK SESSION
// ==========================================

async function checkUser() {
    try {
        const {
            data: { session }
        } = await supabaseClient.auth.getSession();

        if (session) {
            showDashboard();
        } else {
            showLogin();
        }
    } catch (err) {
        console.error(err);
    }
}

checkUser();


// ==========================================
// LOAD CURRENT EVENT PHOTOS
// ==========================================

async function loadCurrentEventPhotos(eventId) {
    adminPhotoStream.innerHTML = `
        <p style="
            color: #aaa;
            font-size: 13px;
            text-align: center;
            grid-column: 1/-1;
        ">
            Loading photos...
        </p>
    `;

    const {
        data: photos,
        error
    } = await supabaseClient
        .from('event_images')
        .select('id, image_url')
        .eq('event_id', eventId);

    if (error) {
        adminPhotoStream.innerHTML = `
            <p style="color: red; font-size: 13px;">
                Error loading images.
            </p>
        `;

        return;
    }

    if (!photos || photos.length === 0) {
        adminPhotoStream.innerHTML = `
            <p style="
                color: #555;
                font-size: 13px;
                text-align: center;
                grid-column: 1/-1;
                margin: 10px 0;
            ">
                No photos uploaded yet.
            </p>
        `;

        return;
    }

    adminPhotoStream.innerHTML = '';

    photos.forEach(photo => {
        const wrapper = document.createElement('div');

        wrapper.style.position = 'relative';
        wrapper.style.aspectRatio = '1/1';

        wrapper.innerHTML = `
            <img
                src="${photo.image_url}"
                style="
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 4px;
                "
            >
            <button
                type="button"
                onclick="deletePhoto(
                    ${photo.id},
                    '${photo.image_url}'
                )"
                style="
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    width: 22px;
                    height: 22px;
                    padding: 0;
                    background: rgba(192, 57, 43, 0.9);
                    color: white;
                    border-radius: 50%;
                    font-size: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.5);
                "
            >
                ✕
            </button>
        `;

        adminPhotoStream.appendChild(wrapper);
    });
}


// ==========================================
// DELETE PHOTO
// ==========================================

window.deletePhoto = async function(photoId, imageUrl) {
    if (!confirm("Are you sure you want to delete this photo permanently?")) {
        return;
    }

    try {
        // Delete image from storage
        const marker = '/object/public/gallery/';
        const markerIndex = imageUrl.indexOf(marker);

        if (markerIndex !== -1) {
            const storagePath = decodeURIComponent(
                imageUrl.slice(markerIndex + marker.length)
            );

            const {
                error: storageErr
            } = await supabaseClient
                .storage
                .from('gallery')
                .remove([storagePath]);

            if (storageErr) {
                throw storageErr;
            }
        }

        // Delete database reference
        const {
            error: dbErr
        } = await supabaseClient
            .from('event_images')
            .delete()
            .eq('id', photoId);

        if (dbErr) {
            throw dbErr;
        }

        // Refresh photos
        loadCurrentEventPhotos(editEventSelector.value);
    } catch (err) {
        alert("Failed to delete image: " + err.message);
    }
};


// ==========================================
// LOAD EVENTS
// ==========================================

async function fetchEventsForSelector() {
    const {
        data: events,
        error
    } = await supabaseClient
        .from('events')
        .select('id, name, description, event_date, event_time, location, flyer_url')
        .order('event_date', { ascending: false });

    if (!error && events) {
        eventsCache = events;

        const prevEditId = editEventSelector.value;

        editEventSelector.innerHTML = '<option value="">-- Choose an Event --</option>';

        events.forEach(evt => {
            const opt = document.createElement('option');

            opt.value = evt.id;
            opt.textContent = `${evt.event_date} - ${evt.name}`;

            editEventSelector.appendChild(opt);
        });

        editEventSelector.value = prevEditId;
    }
}


// ==========================================
// LOGIN
// ==========================================

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    loginMsg.textContent = "Logging in...";

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const {
        data,
        error
    } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        loginMsg.textContent = "Error: " + error.message;
    } else {
        loginMsg.textContent = "";

        showDashboard();
    }
});


// ==========================================
// LOGOUT
// ==========================================

logoutBtn.addEventListener('click', async () => {
    await supabaseClient.auth.signOut();

    showLogin();
});


// ==========================================
// PUBLISH EVENT
// ==========================================

eventForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = document.getElementById('submit-btn');

    submitBtn.disabled = true;

    uploadMsg.textContent = "Publishing event...";

    try {
        const name = document.getElementById('event-name').value;
        const description = document.getElementById('event-desc').value;
        const event_date = document.getElementById('event-date').value;
        const event_time = document.getElementById('event-time').value;
        const location = document.getElementById('event-location').value;
        const flyerFile = document.getElementById('event-flyer').files[0];

        const fileExt = flyerFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const {
            error: uploadError
        } = await supabaseClient
            .storage
            .from('flyers')
            .upload(filePath, flyerFile);

        if (uploadError) {
            throw uploadError;
        }

        const {
            data: urlData
        } = supabaseClient
            .storage
            .from('flyers')
            .getPublicUrl(filePath);

        const flyer_url = urlData.publicUrl;

        const {
            error: insertError
        } = await supabaseClient
            .from('events')
            .insert([
                {
                    name,
                    description,
                    event_date,
                    event_time,
                    location,
                    flyer_url
                }
            ]);

        if (insertError) {
            throw insertError;
        }

        uploadMsg.textContent = "✨ Event Published Successfully!";

        eventForm.reset();
        fetchEventsForSelector();
    } catch (err) {
        uploadMsg.textContent = "Error: " + err.message;
    } finally {
        submitBtn.disabled = false;
    }
});


// ==========================================
// GALLERY UPLOAD
// ==========================================

galleryForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    gallerySubmitBtn.disabled = true;

    const eventId = editEventSelector.value;
    const files = galleryFiles.files;

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            const fileExt = file.name.split('.').pop();
            const fileName = `${eventId}_${Date.now()}_${i}.${fileExt}`;
            const filePath = `public/${fileName}`;

            const {
                error: storageErr
            } = await supabaseClient
                .storage
                .from('gallery')
                .upload(filePath, file);

            if (storageErr) {
                throw storageErr;
            }

            const {
                data: urlData
            } = supabaseClient
                .storage
                .from('gallery')
                .getPublicUrl(filePath);

            const image_url = urlData.publicUrl;

            const {
                error: dbErr
            } = await supabaseClient
                .from('event_images')
                .insert([
                    {
                        event_id: eventId,
                        image_url: image_url
                    }
                ]);

            if (dbErr) {
                throw dbErr;
            }
        }

        galleryMsg.textContent = "✨ All photos uploaded successfully!";

        galleryForm.reset();

        loadCurrentEventPhotos(eventId);
    } catch (err) {
        galleryMsg.textContent = "Error: " + err.message;
    } finally {
        gallerySubmitBtn.disabled = false;
    }
});


// ==========================================
// EDIT EVENT
// ==========================================

function flyerStoragePath(url) {
    const marker = '/object/public/flyers/';
    const index = url ? url.indexOf(marker) : -1;

    if (index === -1) {
        return null;
    }

    return decodeURIComponent(url.slice(index + marker.length));
}

function showEditFlyer(url) {
    editFlyerPreview.src = url || '';
    editFlyerWrap.classList.toggle('hidden', !url);
    editNoFlyer.classList.toggle('hidden', !!url);
}

function fillEditForm(eventId) {
    const evt = eventsCache.find(e => String(e.id) === String(eventId));

    if (!evt) {
        editEventForm.reset();
        editFieldset.disabled = true;
        editFlyerWrap.classList.add('hidden');
        editNoFlyer.classList.add('hidden');
        return;
    }

    editName.value = evt.name || '';
    editDesc.value = evt.description || '';
    editDate.value = evt.event_date || '';
    editTime.value = evt.event_time ? evt.event_time.slice(0, 5) : '';
    editLocation.value = evt.location || '';
    editFlyer.value = '';

    showEditFlyer(evt.flyer_url);

    editFieldset.disabled = false;
}

editEventSelector.addEventListener('change', () => {
    const eventId = editEventSelector.value;

    editMsg.textContent = '';
    galleryMsg.textContent = '';

    fillEditForm(eventId);

    if (eventId) {
        galleryFiles.disabled = false;
        gallerySubmitBtn.disabled = false;

        loadCurrentEventPhotos(eventId);
    } else {
        galleryFiles.disabled = true;
        gallerySubmitBtn.disabled = true;

        adminPhotoStream.innerHTML = `
            <p class="empty-photo-message">
                Select an event above to view photos.
            </p>
        `;
    }
});

editEventForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const eventId = editEventSelector.value;

    if (!eventId) {
        return;
    }

    editSubmitBtn.disabled = true;

    editMsg.textContent = "Saving changes...";

    try {
        const updates = {
            name: editName.value,
            description: editDesc.value,
            event_date: editDate.value,
            event_time: editTime.value,
            location: editLocation.value
        };

        const oldEvt = eventsCache.find(ev => String(ev.id) === String(eventId));
        const oldFlyerUrl = oldEvt ? oldEvt.flyer_url : null;

        // Only replace the flyer if a new one was chosen
        const newFlyer = editFlyer.files[0];

        if (newFlyer) {
            const fileExt = newFlyer.name.split('.').pop();
            const filePath = `public/${Date.now()}.${fileExt}`;

            const {
                error: uploadError
            } = await supabaseClient
                .storage
                .from('flyers')
                .upload(filePath, newFlyer);

            if (uploadError) {
                throw uploadError;
            }

            const {
                data: urlData
            } = supabaseClient
                .storage
                .from('flyers')
                .getPublicUrl(filePath);

            updates.flyer_url = urlData.publicUrl;
        }

        const {
            data,
            error: updateError
        } = await supabaseClient
            .from('events')
            .update(updates)
            .eq('id', eventId)
            .select();

        if (updateError) {
            throw updateError;
        }

        if (!data || data.length === 0) {
            throw new Error(
                "Nothing was saved. Check that the 'events' table has an UPDATE policy for logged-in users."
            );
        }

        // Remove the old flyer file from storage once the new one is saved
        if (newFlyer && oldFlyerUrl) {
            const oldPath = flyerStoragePath(oldFlyerUrl);

            if (oldPath) {
                await supabaseClient
                    .storage
                    .from('flyers')
                    .remove([oldPath]);
            }
        }

        editMsg.textContent = "✨ Event updated successfully!";

        await fetchEventsForSelector();

        fillEditForm(eventId);
    } catch (err) {
        editMsg.textContent = "Error: " + err.message;
    } finally {
        editSubmitBtn.disabled = false;
    }
});


// ==========================================
// DELETE FLYER
// ==========================================

editFlyerDelete.addEventListener('click', async () => {
    const eventId = editEventSelector.value;

    const evt = eventsCache.find(e => String(e.id) === String(eventId));

    if (!evt || !evt.flyer_url) {
        return;
    }

    if (!confirm("Are you sure you want to delete this flyer permanently?")) {
        return;
    }

    editFlyerDelete.disabled = true;

    editMsg.textContent = "Deleting flyer...";

    try {
        // Remove the reference from the event
        const {
            data,
            error: updateError
        } = await supabaseClient
            .from('events')
            .update({ flyer_url: null })
            .eq('id', eventId)
            .select();

        if (updateError) {
            throw updateError;
        }

        if (!data || data.length === 0) {
            throw new Error(
                "Nothing was saved. Check that the 'events' table has an UPDATE policy for logged-in users."
            );
        }

        // Remove the file from storage
        const path = flyerStoragePath(evt.flyer_url);

        if (path) {
            await supabaseClient
                .storage
                .from('flyers')
                .remove([path]);
        }

        editMsg.textContent = "✨ Flyer deleted.";

        await fetchEventsForSelector();

        showEditFlyer(null);
    } catch (err) {
        editMsg.textContent = "Error: " + err.message;
    } finally {
        editFlyerDelete.disabled = false;
    }
});


// ==========================================
// SHOW DASHBOARD
// ==========================================

function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');

    fetchEventsForSelector();
}


// ==========================================
// SHOW LOGIN
// ==========================================

function showLogin() {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
}