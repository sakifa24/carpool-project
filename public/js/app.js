// ==========================================================================
// CAMPUS CARPOOL - MAIN FRONTEND APPLICATION CONTROLLER
// ==========================================================================

let currentUser = null;
let currentChatRoomId = null;
let currentChatRideGroupId = null;
let chatPollInterval = null;

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  initAuth();
  initTabs();
  initSearch();
  initAutoMatch();
  initHostRide();
  initMyRides();
  initChat();
  initCalculator();
  initReviews();

  // Load initial demo users and check auth
  await loadDemoUsers();
  checkAuthStatus();
});

// Toast notification helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'error') icon = 'fa-triangle-exclamation';

  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================================================
// 1. AUTHENTICATION & DEMO SWITCHING
// ==========================================================================
async function loadDemoUsers() {
  try {
    const students = await API.get('/auth/demo-students');
    const select = document.getElementById('demoUserSelect');
    select.innerHTML = '<option value="">-- Quick Switch Student Account --</option>';

    students.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.student_id;
      opt.textContent = `${s.name} (${s.university_id}) - ⭐ ${s.credibility_score}`;
      select.appendChild(opt);
    });

    select.addEventListener('change', async (e) => {
      const studentId = e.target.value;
      if (!studentId) return;

      try {
        const res = await API.post('/auth/quick-switch', { student_id: studentId });
        API.setToken(res.token);
        API.setUser(res.user);
        currentUser = res.user;
        updateUserUI();
        showToast(`Switched user to ${res.user.name}`, 'success');
        refreshCurrentTab();
      } catch (err) {
        showToast(err.message, 'error');
      }
    });
  } catch (err) {
    console.error('Error loading demo students:', err);
  }
}

function checkAuthStatus() {
  const user = API.getUser();
  const token = API.getToken();

  if (user && token) {
    currentUser = user;
    updateUserUI();
  } else {
    // Default auto-login as first demo student (Aisha Rahman) for instant testing!
    autoLoginDefault();
  }
}

async function autoLoginDefault() {
  try {
    const res = await API.post('/auth/quick-switch', { student_id: 1 });
    API.setToken(res.token);
    API.setUser(res.user);
    currentUser = res.user;
    updateUserUI();
    loadRides();
  } catch (err) {
    console.log('No default login');
  }
}

function updateUserUI() {
  const pill = document.getElementById('userProfilePill');
  const btnLogin = document.getElementById('btnLoginModal');
  const avatar = document.getElementById('headerAvatar');
  const nameEl = document.getElementById('headerUserName');
  const scoreEl = document.getElementById('headerCredScore');
  const demoSelect = document.getElementById('demoUserSelect');

  if (currentUser) {
    pill.classList.remove('hidden');
    btnLogin.classList.add('hidden');
    avatar.textContent = currentUser.name.charAt(0).toUpperCase();
    nameEl.textContent = currentUser.name;
    scoreEl.innerHTML = `<i class="fa-solid fa-star"></i> ${parseFloat(currentUser.credibility_score || 5).toFixed(2)}`;
    if (demoSelect) demoSelect.value = currentUser.student_id;
  } else {
    pill.classList.add('hidden');
    btnLogin.classList.remove('hidden');
  }
}

function initAuth() {
  const modal = document.getElementById('authModal');
  const btnOpen = document.getElementById('btnLoginModal');
  const btnClose = document.getElementById('btnCloseAuthModal');
  const btnLogout = document.getElementById('btnLogout');
  const tabSignIn = document.getElementById('tabSignIn');
  const tabRegister = document.getElementById('tabRegister');
  const signInForm = document.getElementById('signInForm');
  const registerForm = document.getElementById('registerForm');

  btnOpen.addEventListener('click', () => modal.classList.add('active'));
  btnClose.addEventListener('click', () => modal.classList.remove('active'));

  tabSignIn.addEventListener('click', () => {
    tabSignIn.classList.add('active');
    tabRegister.classList.remove('active');
    signInForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabSignIn.classList.remove('active');
    registerForm.classList.remove('hidden');
    signInForm.classList.add('hidden');
  });

  signInForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const res = await API.post('/auth/login', { email, password });
      API.setToken(res.token);
      API.setUser(res.user);
      currentUser = res.user;
      updateUserUI();
      modal.classList.remove('active');
      showToast(`Welcome back, ${res.user.name}!`, 'success');
      refreshCurrentTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('regName').value;
    const university_id = document.getElementById('regUid').value;
    const email = document.getElementById('regEmail').value;
    const phone = document.getElementById('regPhone').value;
    const password = document.getElementById('regPassword').value;

    try {
      const res = await API.post('/auth/register', { name, university_id, email, phone, password });
      API.setToken(res.token);
      API.setUser(res.user);
      currentUser = res.user;
      updateUserUI();
      modal.classList.remove('active');
      showToast('Registration successful!', 'success');
      await loadDemoUsers();
      refreshCurrentTab();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  btnLogout.addEventListener('click', () => {
    API.setToken(null);
    API.setUser(null);
    currentUser = null;
    updateUserUI();
    showToast('You have been logged out.');
  });
}

// ==========================================================================
// 2. NAVIGATION TABS
// ==========================================================================
function initTabs() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');

      if (targetId === 'chat-tab') {
        loadChatRooms();
        startChatPolling();
      } else {
        stopChatPolling();
      }

      if (targetId === 'myrides-tab') loadMyRides();
      if (targetId === 'reviews-tab') loadProfileAndReviews();
      if (targetId === 'search-tab') loadRides();
    });
  });
}

function refreshCurrentTab() {
  const activeTab = document.querySelector('.nav-tab.active');
  if (activeTab) {
    const targetId = activeTab.getAttribute('data-tab');
    if (targetId === 'search-tab') loadRides();
    if (targetId === 'myrides-tab') loadMyRides();
    if (targetId === 'chat-tab') loadChatRooms();
    if (targetId === 'reviews-tab') loadProfileAndReviews();
  }
}

// ==========================================================================
// 3. SEARCH & FIND RIDES
// ==========================================================================
function initSearch() {
  const searchForm = document.getElementById('searchRidesForm');
  const btnReset = document.getElementById('btnResetSearch');
  const quickTags = document.querySelectorAll('.quick-tags .tag-btn');

  // Explicit form submit handler
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    performRideSearch();
  });

  // Reset filters
  btnReset.addEventListener('click', () => {
    document.getElementById('searchDestination').value = '';
    document.getElementById('searchPickup').value = 'BRAC University';
    document.getElementById('searchVehicleType').value = 'all';
    document.getElementById('searchDate').value = '';
    performRideSearch();
  });

  // Quick tags
  quickTags.forEach(tag => {
    tag.addEventListener('click', () => {
      document.getElementById('searchDestination').value = tag.getAttribute('data-dest');
      performRideSearch();
    });
  });

  // Load initial rides
  loadRides();
}

async function performRideSearch() {
  const destination = document.getElementById('searchDestination').value.trim();
  const pickup = document.getElementById('searchPickup').value.trim();
  const vehicle_type = document.getElementById('searchVehicleType').value;
  const date = document.getElementById('searchDate').value;

  const filters = {};
  if (destination) filters.destination = destination;
  if (pickup) filters.pickup = pickup;
  if (vehicle_type && vehicle_type !== 'all') filters.vehicle_type = vehicle_type;
  if (date) filters.date = date;

  await loadRides(filters);
}

async function loadRides(filters = {}) {
  const grid = document.getElementById('ridesGrid');
  const countEl = document.getElementById('resultsCount');
  const summaryEl = document.getElementById('filterSummary');

  grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><p>Finding open rides...</p></div>';

  try {
    const res = await API.get('/rides/search', filters);
    const rides = res.rides || [];

    countEl.textContent = rides.length;
    
    // Update summary text
    if (filters.destination) {
      summaryEl.textContent = `Filtered by destination "${filters.destination}"`;
    } else {
      summaryEl.textContent = 'Showing all open campus rides';
    }

    if (rides.length === 0) {
      grid.innerHTML = `
        <div class="empty-placeholder" style="grid-column: 1/-1;">
          <i class="fa-solid fa-car-tunnel placeholder-icon"></i>
          <h4>No Matching Rides Found</h4>
          <p>No open rides currently match your filters. Try adjusting your destination or use the <strong>AUTO Matching Engine</strong> tab to find co-riders!</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = '';
    rides.forEach(ride => {
      const card = createRideCard(ride);
      grid.appendChild(card);
    });
  } catch (err) {
    grid.innerHTML = `<div class="empty-placeholder" style="grid-column:1/-1; color:var(--danger);"><p>Error loading rides: ${err.message}</p></div>`;
  }
}

function createRideCard(ride) {
  const card = document.createElement('div');
  card.className = 'ride-card';

  const isHost = currentUser && currentUser.student_id === ride.host_id;
  const departureDate = new Date(ride.departure_time);
  const formattedTime = departureDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formattedDate = departureDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

  const vehicleClass = `vehicle-${ride.vehicle_type}`;
  const seatPercentage = (ride.current_count / ride.max_capacity) * 100;

  card.innerHTML = `
    <div class="card-top">
      <div class="host-badge">
        <div class="host-avatar">${ride.host_name.charAt(0)}</div>
        <div class="host-details">
          <h4>${ride.host_name} ${isHost ? '<span class="badge-tag">You</span>' : ''}</h4>
          <div class="host-credibility"><i class="fa-solid fa-star"></i> ${parseFloat(ride.host_credibility).toFixed(2)} Rating</div>
        </div>
      </div>
      <span class="vehicle-pill ${vehicleClass}">${ride.vehicle_name}</span>
    </div>

    <div class="route-info">
      <div class="route-step">
        <i class="fa-solid fa-circle-dot step-icon step-pickup"></i>
        <span><strong>From:</strong> ${ride.pickup_location || 'BRAC University'}</span>
      </div>
      <div class="route-step">
        <i class="fa-solid fa-location-dot step-icon step-dropoff"></i>
        <span><strong>To:</strong> ${ride.dropoff_location || 'Destination'}</span>
      </div>
    </div>

    <div class="card-meta-row">
      <span><i class="fa-regular fa-clock"></i> ${formattedDate}, ${formattedTime}</span>
      <span><i class="fa-solid fa-users"></i> ${ride.current_count} / ${ride.max_capacity} Seats</span>
    </div>

    <div class="seat-progress-bar">
      <div class="seat-progress-fill" style="width: ${seatPercentage}%;"></div>
    </div>

    <div class="fare-box">
      <div>
        <div class="fare-label">CURRENT SPLIT FARE</div>
        <div class="fare-amount">৳${ride.fare_details.current_fare_per_person.toFixed(2)} <span style="font-size:0.75rem; font-weight:600; color:var(--gray-500);">/ person</span></div>
      </div>
      <div style="text-align: right;">
        <div style="font-size:0.75rem; color:var(--gray-500);">Total Trip Fare</div>
        <div style="font-size:0.95rem; font-weight:700; color:var(--gray-700);">৳${parseFloat(ride.total_fare).toFixed(2)}</div>
      </div>
    </div>

    ${ride.notes ? `<p style="font-size:0.8rem; color:var(--gray-500); font-style:italic;"><i class="fa-regular fa-note-sticky"></i> "${ride.notes}"</p>` : ''}

    <div class="card-footer">
      ${isHost 
        ? `<button class="btn btn-outline btn-block" onclick="openChatForRide(${ride.ride_group_id})"><i class="fa-solid fa-comments"></i> Open Ride Chat</button>`
        : `<button class="btn btn-primary btn-block" onclick="openJoinModal(${ride.ride_group_id}, '${ride.dropoff_location}', ${ride.fare_details.next_joiner_fare})">
            <i class="fa-solid fa-user-plus"></i> Request to Join (৳${ride.fare_details.next_joiner_fare}/person)
           </button>`
      }
    </div>
  `;

  return card;
}

// ==========================================================================
// 4. JOIN RIDE REQUEST MODAL
// ==========================================================================
window.openJoinModal = function(rideGroupId, dropoff, nextFare) {
  if (!currentUser) {
    showToast('Please sign in to join a ride.', 'error');
    document.getElementById('authModal').classList.add('active');
    return;
  }

  const modal = document.getElementById('joinModal');
  document.getElementById('joinRideGroupId').value = rideGroupId;
  document.getElementById('joinDropoffPoint').value = dropoff || '';
  document.getElementById('joinEstFare').textContent = `৳${nextFare.toFixed(2)} / person`;
  modal.classList.add('active');
};

document.getElementById('btnCloseJoinModal').addEventListener('click', () => {
  document.getElementById('joinModal').classList.remove('active');
});

document.getElementById('submitJoinRequestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const ride_group_id = document.getElementById('joinRideGroupId').value;
  const pickup_point = document.getElementById('joinPickupPoint').value;
  const dropoff_point = document.getElementById('joinDropoffPoint').value;

  try {
    const res = await API.post('/rides/request-join', {
      ride_group_id,
      pickup_point,
      dropoff_point
    });

    document.getElementById('joinModal').classList.remove('active');
    showToast(res.message, 'success');
    loadRides();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// ==========================================================================
// 5. AUTO MATCHING ENGINE
// ==========================================================================
function initAutoMatch() {
  const form = document.getElementById('autoMatchForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please sign in to use the AUTO Matching Engine.', 'error');
      document.getElementById('authModal').classList.add('active');
      return;
    }

    const destination = document.getElementById('matchDestination').value.trim();
    const pickup_location = document.getElementById('matchPickup').value.trim();
    const preferred_vehicle = document.getElementById('matchVehicle').value;
    const target_time = document.getElementById('matchTime').value;
    const save_if_not_found = document.getElementById('saveMatchRequest').checked;

    const btn = document.getElementById('btnRunMatch');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Running Matching Engine...';
    btn.disabled = true;

    try {
      const res = await API.post('/match/auto-match', {
        destination,
        pickup_location,
        preferred_vehicle,
        target_time,
        save_if_not_found
      });

      renderAutoMatchResults(res);
      showToast(`Found ${res.match_summary.open_rides_found} matching rides and ${res.match_summary.co_riders_found} co-riders!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Run AUTO Match Engine';
      btn.disabled = false;
    }
  });
}

function renderAutoMatchResults(data) {
  document.getElementById('matchResultsPlaceholder').classList.add('hidden');
  const content = document.getElementById('matchResultsContent');
  content.classList.remove('hidden');

  const ridesList = document.getElementById('autoMatchedRides');
  const coRidersList = document.getElementById('autoMatchedCoRiders');

  // Direct Rides
  if (data.recommended_rides && data.recommended_rides.length > 0) {
    ridesList.innerHTML = '';
    data.recommended_rides.forEach(ride => {
      const card = document.createElement('div');
      card.className = 'ride-card';
      card.innerHTML = `
        <div class="card-top">
          <div class="host-badge">
            <div class="host-avatar">${ride.host_name.charAt(0)}</div>
            <div class="host-details">
              <h4>${ride.host_name}</h4>
              <div class="host-credibility"><i class="fa-solid fa-star"></i> ${parseFloat(ride.host_credibility).toFixed(2)} Rating</div>
            </div>
          </div>
          <span class="match-score-badge"><i class="fa-solid fa-bolt"></i> ${ride.match_score} Match</span>
        </div>
        <div class="route-info">
          <div class="route-step"><i class="fa-solid fa-location-dot step-pickup"></i> <strong>From:</strong> ${ride.pickup_location || 'BRAC University'}</div>
          <div class="route-step"><i class="fa-solid fa-location-dot step-dropoff"></i> <strong>To:</strong> ${ride.dropoff_location}</div>
        </div>
        <div class="card-meta-row">
          <span><i class="fa-solid fa-taxi"></i> ${ride.vehicle_name}</span>
          <span><i class="fa-solid fa-users"></i> ${ride.seats_available} Seats Left</span>
        </div>
        <div class="fare-box">
          <div><span class="fare-label">YOUR ESTIMATED FARE</span><div class="fare-amount">৳${ride.estimated_fare_share.toFixed(2)}</div></div>
          <button class="btn btn-primary btn-sm" onclick="openJoinModal(${ride.ride_group_id}, '${ride.dropoff_location}', ${ride.estimated_fare_share})">
            Join This Ride
          </button>
        </div>
      `;
      ridesList.appendChild(card);
    });
  } else {
    ridesList.innerHTML = `<div class="empty-placeholder" style="padding:1.5rem;"><p>No direct open rides currently going to ${data.query.destination}.</p></div>`;
  }

  // Co-Riders
  if (data.co_riders && data.co_riders.length > 0) {
    coRidersList.innerHTML = '';
    data.co_riders.forEach(cr => {
      const item = document.createElement('div');
      item.className = 'card';
      item.style.padding = '1rem';
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h5 style="font-size:0.95rem; font-weight:700;">${cr.student_name} (${cr.university_id})</h5>
            <p style="font-size:0.8rem; color:var(--gray-500);"><i class="fa-solid fa-location-dot"></i> Wants to go to: <strong>${cr.destination}</strong></p>
            <p style="font-size:0.75rem; color:var(--accent-gold); font-weight:700;"><i class="fa-solid fa-star"></i> ${cr.credibility_score} Credibility</p>
          </div>
          <button class="btn btn-secondary btn-sm" onclick="prefillHostWithCoRider('${cr.destination}', '${cr.preferred_vehicle}')">
            <i class="fa-solid fa-car"></i> Host a Ride for Both
          </button>
        </div>
      `;
      coRidersList.appendChild(item);
    });
  } else {
    coRidersList.innerHTML = `<div class="empty-placeholder" style="padding:1.5rem;"><p>No other students currently pooled for this route. Your request has been kept active!</p></div>`;
  }
}

window.prefillHostWithCoRider = function(dest, vehicle) {
  // Switch to Host Ride tab and prefill
  const hostTab = document.querySelector('.nav-tab[data-tab="host-tab"]');
  hostTab.click();
  document.getElementById('hostDropoff').value = dest;
  if (vehicle === 'auto') document.getElementById('hostVehicleSelect').value = '1';
  if (vehicle === 'cng') document.getElementById('hostVehicleSelect').value = '2';
  if (vehicle === 'car') document.getElementById('hostVehicleSelect').value = '3';
  showToast(`Pre-filled ride details for ${dest}! Complete the form to host.`, 'info');
};

// ==========================================================================
// 6. HOST A RIDE
// ==========================================================================
function initHostRide() {
  const form = document.getElementById('createRideForm');
  const fareInput = document.getElementById('hostTotalFare');
  const capInput = document.getElementById('hostCapacity');
  const vehicleSelect = document.getElementById('hostVehicleSelect');

  // Auto set capacity when vehicle changes
  vehicleSelect.addEventListener('change', () => {
    const val = vehicleSelect.value;
    if (val === '1') capInput.value = 3;
    if (val === '2') capInput.value = 3;
    if (val === '3') capInput.value = 4;
    updateHostPreview();
  });

  fareInput.addEventListener('input', updateHostPreview);
  capInput.addEventListener('input', updateHostPreview);

  // Set default datetime to now + 30 mins
  const now = new Date(Date.now() + 30 * 60000);
  const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
  document.getElementById('hostDepartureTime').value = localIso;

  function updateHostPreview() {
    const fare = parseFloat(fareInput.value) || 0;
    const cap = parseInt(capInput.value) || 3;

    document.getElementById('previewTotalFare').textContent = `৳${fare.toFixed(2)}`;
    document.getElementById('preview2Split').textContent = `৳${(fare / 2).toFixed(2)} / person`;
    document.getElementById('previewCap').textContent = cap;
    document.getElementById('previewFullSplit').textContent = `৳${(fare / cap).toFixed(2)} / person`;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) {
      showToast('Please sign in to host a ride.', 'error');
      document.getElementById('authModal').classList.add('active');
      return;
    }

    const pickup_location = document.getElementById('hostPickup').value;
    const dropoff_location = document.getElementById('hostDropoff').value;
    const vehicle_id = document.getElementById('hostVehicleSelect').value;
    const max_capacity = document.getElementById('hostCapacity').value;
    const total_fare = document.getElementById('hostTotalFare').value;
    const departure_time = document.getElementById('hostDepartureTime').value;
    const notes = document.getElementById('hostNotes').value;

    try {
      const res = await API.post('/rides/create', {
        pickup_location,
        dropoff_location,
        vehicle_id,
        max_capacity,
        total_fare,
        departure_time,
        notes
      });

      showToast(res.message, 'success');
      form.reset();
      document.getElementById('hostPickup').value = 'BRAC University';
      document.getElementById('hostDepartureTime').value = localIso;

      // Switch to My Rides tab
      document.querySelector('.nav-tab[data-tab="myrides-tab"]').click();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

// ==========================================================================
// 7. MY RIDES & BOOKING MANAGEMENT
// ==========================================================================
function initMyRides() {
  document.getElementById('btnCloseHostReqModal').addEventListener('click', () => {
    document.getElementById('hostRequestsModal').classList.remove('active');
  });
}

async function loadMyRides() {
  if (!currentUser) return;

  const hostedList = document.getElementById('hostedRidesList');
  const joinedList = document.getElementById('joinedRidesList');
  const pendingList = document.getElementById('pendingRequestsList');

  try {
    const res = await API.get('/rides/my-rides');
    const { hosted, joined, pending_requests } = res;

    document.getElementById('hostedCount').textContent = `${hosted.length} Rides`;
    document.getElementById('joinedCount').textContent = `${joined.length} Rides`;
    document.getElementById('pendingRequestsCount').textContent = `${pending_requests.length} Pending`;

    // Pending requests badge on tab
    const totalPending = hosted.reduce((sum, r) => sum + (r.pending_requests_count || 0), 0);
    const badgeEl = document.getElementById('pendingBadge');
    if (totalPending > 0) {
      badgeEl.textContent = totalPending;
      badgeEl.classList.remove('hidden');
    } else {
      badgeEl.classList.add('hidden');
    }

    // Render Hosted
    if (hosted.length === 0) {
      hostedList.innerHTML = '<div class="empty-placeholder" style="grid-column:1/-1; padding:1.5rem;"><p>You have not hosted any rides yet.</p></div>';
    } else {
      hostedList.innerHTML = '';
      hosted.forEach(r => hostedList.appendChild(createHostedRideCard(r)));
    }

    // Render Joined
    if (joined.length === 0) {
      joinedList.innerHTML = '<div class="empty-placeholder" style="grid-column:1/-1; padding:1.5rem;"><p>You have not joined any rides yet.</p></div>';
    } else {
      joinedList.innerHTML = '';
      joined.forEach(r => joinedList.appendChild(createJoinedRideCard(r)));
    }

    // Render Sent Pending
    if (pending_requests.length === 0) {
      pendingList.innerHTML = '<div class="empty-placeholder" style="grid-column:1/-1; padding:1.5rem;"><p>No pending join requests sent.</p></div>';
    } else {
      pendingList.innerHTML = '';
      pending_requests.forEach(p => pendingList.appendChild(createSentPendingCard(p)));
    }
  } catch (err) {
    console.error('Error loading my rides:', err);
  }
}

function createHostedRideCard(ride) {
  const card = document.createElement('div');
  card.className = 'ride-card';

  const departureDate = new Date(ride.departure_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  card.innerHTML = `
    <div class="card-top">
      <h4><i class="fa-solid fa-car-side"></i> ${ride.dropoff_location}</h4>
      <span class="badge-tag">${ride.status.toUpperCase()}</span>
    </div>
    <div class="route-info">
      <div class="route-step"><i class="fa-solid fa-circle-dot step-pickup"></i> ${ride.pickup_location} -> ${ride.dropoff_location}</div>
    </div>
    <div class="card-meta-row">
      <span><i class="fa-regular fa-clock"></i> ${departureDate}</span>
      <span><i class="fa-solid fa-users"></i> ${ride.current_count} / ${ride.max_capacity} Riders</span>
    </div>
    <div class="card-action-btns" style="display:flex; flex-direction:column; gap:0.5rem; margin-top:0.5rem;">
      ${ride.pending_requests_count > 0 ? `
        <button class="btn btn-primary btn-sm" onclick="openHostRequestsDrawer(${ride.ride_group_id})">
          <i class="fa-solid fa-bell"></i> Review Requests (${ride.pending_requests_count})
        </button>
      ` : ''}
      <button class="btn btn-outline btn-sm" onclick="openChatForRide(${ride.ride_group_id})">
        <i class="fa-solid fa-comments"></i> Group Chat
      </button>
      ${['open', 'full', 'in_progress'].includes(ride.status) ? `
        <button class="btn btn-secondary btn-sm" style="background:#059669;" onclick="updateRideStatus(${ride.ride_group_id}, 'completed')">
          <i class="fa-solid fa-flag-checkered"></i> End & Complete Ride
        </button>
        <button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:#fca5a5;" onclick="confirmCancelRide(${ride.ride_group_id})">
          <i class="fa-solid fa-ban"></i> Cancel Ride
        </button>
      ` : ''}
      ${ride.status === 'completed' ? `
        <button class="btn btn-primary btn-sm" onclick="openRatePassengersDrawer(${ride.ride_group_id})">
          <i class="fa-solid fa-star"></i> Rate Passengers
        </button>
      ` : ''}
    </div>
  `;
  return card;
}

function createJoinedRideCard(ride) {
  const card = document.createElement('div');
  card.className = 'ride-card';
  const departureDate = new Date(ride.departure_time).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  card.innerHTML = `
    <div class="card-top">
      <h4><i class="fa-solid fa-route"></i> ${ride.dropoff_location}</h4>
      <span class="badge-tag" style="background:#eff6ff; color:#1d4ed8;">${ride.status.toUpperCase()}</span>
    </div>
    <div class="host-details" style="font-size:0.85rem; color:var(--gray-700);">
      <strong>Host:</strong> ${ride.host_name} (⭐ ${ride.host_credibility})
    </div>
    <div class="card-meta-row">
      <span><i class="fa-regular fa-clock"></i> ${departureDate}</span>
      <span><strong>My Fare:</strong> ৳${parseFloat(ride.fare_share || (ride.total_fare/ride.current_count)).toFixed(2)}</span>
    </div>
    <div style="display:flex; gap:0.5rem; margin-top:0.5rem;">
      <button class="btn btn-outline btn-sm" style="flex:1;" onclick="openChatForRide(${ride.ride_group_id})">
        <i class="fa-solid fa-comments"></i> Chat
      </button>
      ${ride.status === 'completed' ? `
        <button class="btn btn-primary btn-sm" style="flex:1;" onclick="openReviewModal(${ride.ride_group_id}, ${ride.host_id}, '${ride.host_name}')">
          <i class="fa-solid fa-star"></i> Rate Host
        </button>
      ` : ''}
    </div>
  `;
  return card;
}

function createSentPendingCard(p) {
  const card = document.createElement('div');
  card.className = 'ride-card';
  card.innerHTML = `
    <div class="card-top">
      <h4>${p.dropoff_location}</h4>
      <span class="badge-tag" style="background:#fef3c7; color:#b45309;">PENDING APPROVAL</span>
    </div>
    <p style="font-size:0.85rem; color:var(--gray-700);"><strong>Host:</strong> ${p.host_name} (${p.vehicle_name})</p>
    <p style="font-size:0.8rem; color:var(--gray-500);">Expected Fare: ৳${parseFloat(p.fare_share).toFixed(2)}</p>
  `;
  return card;
}

window.updateRideStatus = async function(rideGroupId, status) {
  try {
    const res = await API.post('/rides/update-status', { ride_group_id: rideGroupId, status });
    showToast(res.message, 'success');
    loadMyRides();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.confirmCancelRide = async function(rideGroupId) {
  if (confirm('Are you sure you want to cancel this ride? All riders will be notified.')) {
    await updateRideStatus(rideGroupId, 'cancelled');
  }
};

window.openRatePassengersDrawer = async function(rideGroupId) {
  try {
    const res = await API.get(`/rides/${rideGroupId}`);
    const otherRiders = res.riders.filter(r => r.student_id !== currentUser.student_id);

    if (otherRiders.length === 0) {
      showToast('No passengers joined this ride.', 'info');
      return;
    }

    if (otherRiders.length === 1) {
      openReviewModal(rideGroupId, otherRiders[0].student_id, otherRiders[0].name);
    } else {
      // If multiple, show modal with choices
      const names = otherRiders.map((r, i) => `${i + 1}. ${r.name}`).join('\n');
      const pick = prompt(`Select passenger to rate:\n${names}\nEnter number (1-${otherRiders.length}):`);
      const idx = parseInt(pick) - 1;
      if (otherRiders[idx]) {
        openReviewModal(rideGroupId, otherRiders[idx].student_id, otherRiders[idx].name);
      }
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
};

window.openHostRequestsDrawer = async function(rideGroupId) {
  const modal = document.getElementById('hostRequestsModal');
  const listEl = document.getElementById('hostRequestsList');
  listEl.innerHTML = '<p>Loading pending requests...</p>';
  modal.classList.add('active');

  try {
    const res = await API.get(`/rides/${rideGroupId}`);
    const requests = res.requests.filter(r => r.status === 'pending');

    if (requests.length === 0) {
      listEl.innerHTML = '<p>No pending requests for this ride.</p>';
      return;
    }

    listEl.innerHTML = '';
    requests.forEach(req => {
      const item = document.createElement('div');
      item.className = 'card';
      item.style.padding = '1rem';
      item.style.marginBottom = '0.75rem';
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <h4 style="font-size:1rem; font-weight:700;">${req.name} (${req.university_id})</h4>
            <p style="font-size:0.82rem; color:var(--accent-gold); font-weight:700;"><i class="fa-solid fa-star"></i> ${req.credibility_score} Credibility</p>
            <p style="font-size:0.82rem; color:var(--gray-700);"><strong>Dropoff:</strong> ${req.dropoff_point || 'Same as destination'}</p>
            <p style="font-size:0.82rem; color:var(--gray-500);"><strong>Phone:</strong> ${req.phone || 'N/A'}</p>
          </div>
          <div style="display:flex; gap:0.5rem;">
            <button class="btn btn-primary btn-sm" onclick="handleRequestAction(${req.ride_request_id}, 'accept')">
              <i class="fa-solid fa-check"></i> Accept
            </button>
            <button class="btn btn-danger btn-sm" onclick="handleRequestAction(${req.ride_request_id}, 'reject')">
              <i class="fa-solid fa-xmark"></i> Reject
            </button>
          </div>
        </div>
      `;
      listEl.appendChild(item);
    });
  } catch (err) {
    listEl.innerHTML = `<p style="color:var(--danger)">Error: ${err.message}</p>`;
  }
};

window.handleRequestAction = async function(requestId, action) {
  try {
    const res = await API.post('/rides/handle-request', { request_id: requestId, action });
    showToast(res.message, 'success');
    document.getElementById('hostRequestsModal').classList.remove('active');
    loadMyRides();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// ==========================================================================
// 8. IN-APP GROUP CHAT
// ==========================================================================
function initChat() {
  const form = document.getElementById('chatInputForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('chatMessageInput');
    const content = input.value.trim();
    if (!content || !currentChatRoomId) return;

    try {
      await API.post('/chat/send', {
        chat_room_id: currentChatRoomId,
        content
      });
      input.value = '';
      loadChatMessages(currentChatRideGroupId);
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

function startChatPolling() {
  stopChatPolling();
  chatPollInterval = setInterval(() => {
    if (currentChatRideGroupId) {
      loadChatMessages(currentChatRideGroupId, true);
    }
  }, 3000);
}

function stopChatPolling() {
  if (chatPollInterval) {
    clearInterval(chatPollInterval);
    chatPollInterval = null;
  }
}

async function loadChatRooms() {
  if (!currentUser) return;
  const listEl = document.getElementById('chatRoomsList');

  try {
    const rooms = await API.get('/chat/my-rooms');
    if (rooms.length === 0) {
      listEl.innerHTML = '<p style="padding:1rem; font-size:0.85rem; color:var(--gray-500);">No active group chats. Join or host a ride to start chatting!</p>';
      return;
    }

    listEl.innerHTML = '';
    rooms.forEach((room, idx) => {
      const item = document.createElement('div');
      item.className = `chat-room-item ${room.chat_room_id === currentChatRoomId ? 'active' : ''}`;
      item.innerHTML = `
        <h5><i class="fa-solid fa-car"></i> Ride #${room.ride_group_id} - ${room.dropoff_location}</h5>
        <p>${room.last_message ? room.last_message : 'No messages yet. Say hi!'}</p>
      `;
      item.addEventListener('click', () => {
        document.querySelectorAll('.chat-room-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        openChatForRide(room.ride_group_id);
      });
      listEl.appendChild(item);

      // Auto open first room if none selected
      if (idx === 0 && !currentChatRoomId) {
        item.click();
      }
    });
  } catch (err) {
    console.error('Error loading chat rooms:', err);
  }
}

window.openChatForRide = async function(rideGroupId) {
  currentChatRideGroupId = rideGroupId;
  
  // Switch to chat tab if not active
  const chatTab = document.querySelector('.nav-tab[data-tab="chat-tab"]');
  if (!chatTab.classList.contains('active')) {
    chatTab.click();
  }

  await loadChatMessages(rideGroupId);
};

async function loadChatMessages(rideGroupId, isPolling = false) {
  try {
    const data = await API.get(`/chat/ride/${rideGroupId}`);
    currentChatRoomId = data.room.chat_room_id;

    // Header info
    document.getElementById('chatRoomTitle').textContent = `Ride #${rideGroupId} Group Chat (${data.room.vehicle_name})`;
    document.getElementById('chatRoomSubtitle').textContent = `${data.room.pickup_location} -> ${data.room.dropoff_location} | Total Fare: ৳${data.room.total_fare}`;

    // Participants Pills
    const pillsContainer = document.getElementById('chatParticipantsPills');
    pillsContainer.innerHTML = '';
    data.participants.forEach(p => {
      const pill = document.createElement('span');
      pill.className = 'p-pill';
      pill.textContent = `${p.name} (⭐${p.credibility_score})`;
      pillsContainer.appendChild(pill);
    });

    // Stream
    const stream = document.getElementById('chatMessagesStream');
    const inputForm = document.getElementById('chatInputForm');
    inputForm.classList.remove('hidden');

    if (data.messages.length === 0) {
      if (!isPolling) stream.innerHTML = '<div class="empty-chat-placeholder"><p>No messages yet. Send a message to your group!</p></div>';
      return;
    }

    stream.innerHTML = '';
    data.messages.forEach(msg => {
      const isMe = currentUser && msg.student_id === currentUser.student_id;
      const bubbleWrap = document.createElement('div');
      bubbleWrap.className = `msg-bubble-wrapper ${isMe ? 'sent' : 'received'}`;
      
      const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      bubbleWrap.innerHTML = `
        ${!isMe ? `<span class="msg-sender">${msg.sender_name} (⭐${msg.sender_credibility})</span>` : ''}
        <div class="msg-bubble">${msg.content}</div>
        <span class="msg-time">${timeStr}</span>
      `;
      stream.appendChild(bubbleWrap);
    });

    // Auto scroll to bottom
    stream.scrollTop = stream.scrollHeight;
  } catch (err) {
    if (!isPolling) showToast(err.message, 'error');
  }
}

// ==========================================================================
// 9. FARE SPLIT CALCULATOR
// ==========================================================================
function initCalculator() {
  const slider = document.getElementById('calcFareSlider');
  const fareDisplay = document.getElementById('calcFareDisplay');
  const vehicleSelect = document.getElementById('calcVehicleSelect');
  const paxButtons = document.querySelectorAll('.passenger-selector .btn-pax');

  slider.addEventListener('input', () => {
    fareDisplay.textContent = `৳${slider.value}`;
    calculateFare();
  });

  vehicleSelect.addEventListener('change', calculateFare);

  paxButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      paxButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      calculateFare();
    });
  });

  // Load campus estimates
  loadCampusEstimates();
  calculateFare();
}

async function calculateFare() {
  const total_fare = document.getElementById('calcFareSlider').value;
  const vehicle_type = document.getElementById('calcVehicleSelect').value;
  const activePaxBtn = document.querySelector('.passenger-selector .btn-pax.active');
  const num_passengers = activePaxBtn ? activePaxBtn.getAttribute('data-pax') : 2;

  try {
    const res = await API.post('/fare/calculate', {
      total_fare,
      num_passengers,
      vehicle_type
    });

    document.getElementById('calcPerPersonVal').textContent = `৳${res.fare_per_person.toFixed(2)}`;
    document.getElementById('calcSoloVal').textContent = `৳${res.solo_fare.toFixed(2)}`;
    document.getElementById('calcSavingsVal').textContent = `৳${res.savings_per_person.toFixed(2)} (${res.percent_saved} SAVED)`;

    // Render Tiers
    const tbody = document.getElementById('splitTiersBody');
    tbody.innerHTML = '';
    res.split_tiers.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${t.passengers} ${t.passengers === 1 ? 'Person (Solo)' : 'Passengers'}</strong></td>
        <td><strong>৳${t.fare_per_person.toFixed(2)}</strong></td>
        <td style="color:var(--primary-hover); font-weight:700;">৳${t.savings_per_person.toFixed(2)}</td>
        <td><span class="badge-tag">${t.discount_percent}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error calculating fare:', err);
  }
}

async function loadCampusEstimates() {
  try {
    const routes = await API.get('/fare/estimates');
    const container = document.getElementById('routeEstimatesContainer');
    container.innerHTML = '';

    routes.forEach(r => {
      const card = document.createElement('div');
      card.className = 'route-est-card';
      card.innerHTML = `
        <strong>${r.destination}</strong>
        <div>🛺 Auto: ৳${r.auto} (৳${(r.auto/3).toFixed(0)}/p)</div>
        <div>🟢 CNG: ৳${r.cng} (৳${(r.cng/3).toFixed(0)}/p)</div>
        <div>🚗 Car: ৳${r.car} (৳${(r.car/4).toFixed(0)}/p)</div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Error loading estimates:', err);
  }
}

// ==========================================================================
// 10. REVIEWS & RATINGS SYSTEM
// ==========================================================================
function initReviews() {
  // Star rating selector in modal
  const starOpts = document.querySelectorAll('.star-opt');
  const ratingInput = document.getElementById('ratingPointVal');

  starOpts.forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.getAttribute('data-val'));
      ratingInput.value = val;

      starOpts.forEach(s => {
        const sVal = parseInt(s.getAttribute('data-val'));
        if (sVal <= val) s.classList.add('active');
        else s.classList.remove('active');
      });
    });
  });

  document.getElementById('btnCloseReviewModal').addEventListener('click', () => {
    document.getElementById('reviewModal').classList.remove('active');
  });

  document.getElementById('submitReviewForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const ride_group_id = document.getElementById('reviewRideGroupId').value;
    const reviewed_student_id = document.getElementById('revieweeStudentId').value;
    const rating_point = document.getElementById('ratingPointVal').value;
    const comment = document.getElementById('reviewComment').value;

    try {
      const res = await API.post('/reviews/create', {
        ride_group_id,
        reviewed_student_id,
        rating_point,
        comment
      });

      document.getElementById('reviewModal').classList.remove('active');
      showToast(res.message, 'success');
      loadProfileAndReviews();
    } catch (err) {
      showToast(err.message, 'error');
    }
  });
}

window.openReviewModal = function(rideGroupId, revieweeId, revieweeName) {
  document.getElementById('reviewRideGroupId').value = rideGroupId;
  document.getElementById('revieweeStudentId').value = revieweeId;
  document.getElementById('revieweeName').textContent = revieweeName;
  document.getElementById('reviewModal').classList.add('active');
};

async function loadProfileAndReviews() {
  if (!currentUser) return;

  try {
    const data = await API.get('/auth/profile');
    const { student, stats, reviews } = data;

    document.getElementById('profAvatar').textContent = student.name.charAt(0);
    document.getElementById('profName').textContent = student.name;
    document.getElementById('profEmail').textContent = `${student.email} (${student.university_id})`;
    document.getElementById('profScore').textContent = parseFloat(student.credibility_score).toFixed(2);
    document.getElementById('profHosted').textContent = stats.hosted_count;
    document.getElementById('profJoined').textContent = stats.joined_count;
    document.getElementById('profReviewsCount').textContent = stats.review_count;

    // Render Reviews
    const listEl = document.getElementById('reviewsList');
    if (reviews.length === 0) {
      listEl.innerHTML = '<div class="empty-placeholder"><p>No reviews received yet. Complete rides with peers to earn credibility ratings!</p></div>';
      return;
    }

    listEl.innerHTML = '';
    reviews.forEach(rev => {
      const item = document.createElement('div');
      item.className = 'review-item';

      let starsHtml = '';
      for (let i = 1; i <= 5; i++) {
        starsHtml += `<i class="fa-solid fa-star ${i <= rev.rating_point ? '' : 'text-gray'}"></i>`;
      }

      item.innerHTML = `
        <div class="review-top">
          <span class="reviewer-name">${rev.reviewer_name} (${rev.reviewer_uid})</span>
          <div class="stars">${starsHtml}</div>
        </div>
        <p class="review-comment">"${rev.comment || 'Great travel experience!'}"</p>
      `;
      listEl.appendChild(item);
    });
  } catch (err) {
    console.error('Error loading profile/reviews:', err);
  }
}
