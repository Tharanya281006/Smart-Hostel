document.addEventListener('DOMContentLoaded', () => {
        // With JWT cookies enabled, we no longer require localStorage token for page loads
        const token = localStorage.getItem('token');
        // Keep the redirect only if neither cookie nor token exists. A simple probe can check auth.
        if (!window.location.pathname.includes('/login')) {
            fetch('/dashboard/resident', { credentials: 'include' })
                .then(r => {
                    if (r.status === 401) {
                        if (!token) window.location.href = '/login';
                    }
                })
                .catch(() => {
                    if (!token) window.location.href = '/login';
                });
        }

    const loginForm = document.getElementById('loginForm');
    // Show next resident suggestion on login page
    const nextResidentHint = document.getElementById('nextResidentHint');
    const nextResidentValue = document.getElementById('nextResidentValue');
    const useNextResidentBtn = document.getElementById('useNextResident');
    if (nextResidentHint && nextResidentValue) {
        fetch('/next-resident')
            .then(r => r.json())
            .then(d => {
                if (d && d.next) {
                    nextResidentValue.textContent = d.next.replace('@hostel.com','');
                    nextResidentHint.style.display = '';
                    if (useNextResidentBtn) {
                        useNextResidentBtn.onclick = () => {
                            const emailEl = document.getElementById('email');
                            if (emailEl) emailEl.value = d.next;
                            const roleEl = document.getElementById('role');
                            if (roleEl) roleEl.value = 'resident';
                            const pwdEl = document.getElementById('password');
                            if (pwdEl) pwdEl.value = 'pass123';
                        };
                    }
                }
            })
            .catch(() => {});
    }
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();
            const role = document.getElementById('role').value.trim();
            try {
                        const response = await fetch('/login', {
                    method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                    body: JSON.stringify({ email, password, role })
                });
                const data = await response.json();
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    window.location.href = data.redirect || `/dashboard/${role}`;
                } else {
                    alert(data.error || 'Login failed');
                }
            } catch (error) {
                console.error('Login error:', error);
                alert('An error occurred during login');
            }
        });
    }

    // Profile save
    const saveProfileBtn = document.getElementById('saveProfile');
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', () => {
            const nameEl = document.getElementById('profileName');
            const phoneEl = document.getElementById('profilePhone');
            const name = (nameEl && nameEl.value.trim()) || '';
            const phone = (phoneEl && phoneEl.value.trim()) || '';
            if (!name) { showNotification('Please enter your name'); return; }
            fetch('/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ display_name: name, phone })
            }).then(r => r.json()).then(d => {
                showNotification(d.msg || 'Saved');
                const greet = document.getElementById('greetName');
                if (greet) greet.textContent = name;
            }).catch(() => showNotification('Error saving profile'));
        });
    }

    const bookBtn = document.getElementById('bookBtn');
    const setFormEnabled = (formEl, enabled) => {
        if (!formEl) return;
        const fields = formEl.querySelectorAll('input, select, textarea, button');
        fields.forEach(f => { f.disabled = !enabled; });
    };
    if (bookBtn) {
        // Check if user already has approved booking and disable button
        fetch('/me/booking-status', { credentials: 'include' })
            .then(r => r.json())
            .then(d => {
                if (d && d.approved_room) {
                    bookBtn.disabled = true;
                    const msg = document.getElementById('bookingDisabledMsg');
                    if (msg) msg.style.display = '';
                    // Enable service/outing forms when approved
                    const serviceForm = document.getElementById('serviceForm');
                    const outingForm = document.getElementById('outingForm');
                    const lockMsg = document.getElementById('featureLockMsg');
                    setFormEnabled(serviceForm, true);
                    setFormEnabled(outingForm, true);
                    if (lockMsg) lockMsg.style.display = 'none';
                } else {
                    // Lock forms until approval
                    const serviceForm = document.getElementById('serviceForm');
                    const outingForm = document.getElementById('outingForm');
                    const lockMsg = document.getElementById('featureLockMsg');
                    setFormEnabled(serviceForm, false);
                    setFormEnabled(outingForm, false);
                    if (lockMsg) lockMsg.style.display = '';
                }
            })
            .catch(() => {});
        let acceptances = [];
        const bookingCountdown = document.getElementById('bookingCountdown');
        const updateCountdown = () => {
            if (acceptances.length === 0 || !bookingCountdown) return;
            const ttl = 10 * 60 * 1000;
            const timeLeft = ttl - (Date.now() - Math.max(...acceptances));
            bookingCountdown.textContent = timeLeft > 0 ? `Time left: ${Math.ceil(timeLeft / 1000)}s` : 'Expired';
        };
        setInterval(updateCountdown, 1000);

            bookBtn.addEventListener('click', () => {
            acceptances.push(Date.now());
            if (acceptances.length > 4) acceptances.shift();
            const tkn = localStorage.getItem('token');
                const roommatesCountEl = document.getElementById('roommatesCount');
                const roomIdInputEl = document.getElementById('roomIdInput');
                const roommates_count = parseInt((roommatesCountEl && roommatesCountEl.value) || '1', 10);
                const room_id = parseInt((roomIdInputEl && roomIdInputEl.value) || '101', 10);
                    fetch('/book', {
                method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(tkn ? { 'Authorization': `Bearer ${tkn}` } : {}) },
                        credentials: 'include',
                    body: JSON.stringify({ room_id, group_id: 'group1', acceptances, roommates_count })
            }).then(res => res.json()).then(data => {
                const bookingStatus = document.getElementById('bookingStatus');
                if (bookingStatus) bookingStatus.textContent = data.msg || 'Submitted';
                showNotification('Booking submitted!');
                updateCountdown();
            }).catch(() => showNotification('Error submitting booking'));
        });

            const loadAvailabilityBtn = document.getElementById('loadAvailability');
            if (loadAvailabilityBtn) {
                loadAvailabilityBtn.addEventListener('click', () => {
                    const tkn = localStorage.getItem('token');
                    fetch('/rooms/available', { credentials: 'include', headers: { ...(tkn ? { 'Authorization': `Bearer ${tkn}` } : {}) } })
                        .then(r => r.json())
                        .then(rows => {
                            const holder = document.getElementById('availability');
                            if (!holder) return;
                            holder.innerHTML = '';
                            const table = document.createElement('table');
                            table.className = 'table table-sm';
                            table.innerHTML = '<thead><tr><th>Room</th><th>Total</th><th>Available</th><th>Residents</th></tr></thead>';
                            const tbody = document.createElement('tbody');
                            rows.forEach(r => {
                                const tr = document.createElement('tr');
                                const residents = Array.isArray(r.residents) && r.residents.length ? r.residents.join(', ') : '-';
                                const roomLabel = (r.room_no === 101) ? 'Room1' : `Room ${r.room_no}`;
                                tr.innerHTML = `<td>${roomLabel}</td><td>${r.total_beds}</td><td>${r.available}</td><td>${residents}</td>`;
                                tr.addEventListener('click', () => {
                                    const roomIdInputEl = document.getElementById('roomIdInput');
                                    if (roomIdInputEl) roomIdInputEl.value = r.room_no;
                                });
                                tbody.appendChild(tr);
                            });
                            table.appendChild(tbody);
                            holder.appendChild(table);
                        }).catch(() => showNotification('Error loading availability'));
                });
            }
    }

    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
        serviceForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const tkn = localStorage.getItem('token');
            const issueType = (formData.get('issue_type') || '').toString();
            const desc = (formData.get('description') || '').toString();
            fetch('/service', {
                method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(tkn ? { 'Authorization': `Bearer ${tkn}` } : {}) },
                        credentials: 'include',
                body: JSON.stringify({
                    description: issueType ? `[${issueType}] ${desc}` : desc
                })
            }).then(res => res.json()).then(data => {
                showNotification(data.msg || 'Service request submitted');
                // Optionally refresh page to update logs
                setTimeout(() => window.location.reload(), 600);
            }).catch(() => showNotification('Error submitting service request'));
        });
    }

    const outingForm = document.getElementById('outingForm');
    if (outingForm) {
        outingForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            // Client-side validation to avoid native popup
            const start = (formData.get('start_time') || '').toString();
            const end = (formData.get('end_time') || '').toString();
            const reason = (formData.get('reason') || '').toString().trim();
            if (!start || !end) {
                showNotification('Please select both start and end date & time.');
                return;
            }
            const startMs = Date.parse(start);
            const endMs = Date.parse(end);
            if (isNaN(startMs) || isNaN(endMs)) {
                showNotification('Invalid date/time. Please pick valid values.');
                return;
            }
            if (endMs <= startMs) {
                showNotification('End time must be after start time.');
                return;
            }
            if (!reason) {
                showNotification('Please provide a reason.');
                return;
            }
            const tkn = localStorage.getItem('token');
                    fetch('/outing', {
                method: 'POST',
                        headers: { 'Content-Type': 'application/json', ...(tkn ? { 'Authorization': `Bearer ${tkn}` } : {}) },
                        credentials: 'include',
                body: JSON.stringify({
                    start_time: formData.get('start_time'),
                    end_time: formData.get('end_time'),
                    reason
                })
            }).then(res => res.json()).then(data => {
                showNotification(data.msg || 'Outing request submitted');
                setTimeout(() => window.location.reload(), 600);
            }).catch(() => showNotification('Error submitting outing request'));
        });
    }

    const serviceRequestsList = document.getElementById('serviceRequestsList');
    const outingRequestsList = document.getElementById('outingRequestsList');
    const heatmapCanvas = document.getElementById('heatmap');
    const bookingsHeatmapCanvas = document.getElementById('bookingsHeatmap');
    if (serviceRequestsList || outingRequestsList || heatmapCanvas || bookingsHeatmapCanvas) {
        const tkn = localStorage.getItem('token');
        fetch('/dashboard/warden', { credentials: 'include', headers: { ...(tkn ? { 'Authorization': `Bearer ${tkn}` } : {}) } })
            .then(res => res.text()).then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                if (serviceRequestsList && doc.getElementById('serviceRequestsList')) {
                    serviceRequestsList.innerHTML = '';
                    const items = doc.getElementById('serviceRequestsList').getElementsByTagName('li');
                    Array.from(items).forEach(li => serviceRequestsList.appendChild(li));
                }
                if (outingRequestsList && doc.getElementById('outingRequestsList')) {
                    outingRequestsList.innerHTML = '';
                    const items = doc.getElementById('outingRequestsList').getElementsByTagName('li');
                    Array.from(items).forEach(li => outingRequestsList.appendChild(li));
                }

                document.querySelectorAll('.approveBtn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.dataset.id;
                        const type = btn.dataset.type;
                                    fetch(`/approve/${type}/${id}`, {
                            method: 'PUT',
                                        headers: { 'Content-Type': 'application/json', ...(tkn ? { 'Authorization': `Bearer ${tkn}` } : {}) },
                                        credentials: 'include',
                            body: JSON.stringify({ status: 'approved' })
                        }).then(res => res.json()).then(data => {
                            showNotification(data.msg || 'Updated');
                            // Reload to refresh heatmaps and lists after approval
                            location.reload();
                        }).catch(() => showNotification('Error approving request'));
                    });
                });

                document.querySelectorAll('.rejectBtn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.dataset.id;
                        const type = btn.dataset.type;
                        const reason = prompt('Enter rejection reason');
                        if (reason) {
                                            fetch(`/approve/${type}/${id}`, {
                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json', ...(tkn ? { 'Authorization': `Bearer ${tkn}` } : {}) },
                                                credentials: 'include',
                                body: JSON.stringify({ status: 'rejected', reason })
                            }).then(res => res.json()).then(data => {
                                showNotification(data.msg || 'Updated');
                                location.reload();
                            }).catch(() => showNotification('Error rejecting request'));
                        }
                    });
                });
            }).catch(err => console.error('Error fetching warden data:', err));

            if (heatmapCanvas) {
            const ctx = heatmapCanvas.getContext('2d');
            const heatmapDataScript = document.getElementById('heatmap-data');
            try {
                const heatmapData = heatmapDataScript ? JSON.parse(heatmapDataScript.textContent || '[]') : [];
                if (window.Chart && Array.isArray(heatmapData)) {
                    // Build a color scale based on counts (green -> yellow -> red)
                    const counts = heatmapData.map(d => d[1]);
                    const max = Math.max(1, ...counts);
                    const colors = counts.map(c => {
                        const t = c / max; // 0..1
                        // interpolate: green (0,200,0) -> yellow (255,200,0) -> red (220,0,0)
                        let r, g, b;
                        if (t < 0.5) {
                            const k = t / 0.5;
                            r = Math.round(0 + k * 255);
                            g = 200;
                            b = 0;
                        } else {
                            const k = (t - 0.5) / 0.5;
                            r = 255 - Math.round(k * 35); // 255 -> 220
                            g = 200 - Math.round(k * 200); // 200 -> 0
                            b = 0;
                        }
                        return `rgba(${r}, ${g}, ${b}, 0.6)`;
                    });
                    const chart = new Chart(ctx, {
                        type: 'bar',
                        data: {
                            labels: heatmapData.map(d => (d[0] === 101 ? 'Room1' : `Room ${d[0]}`)),
                            datasets: [{ label: 'Requests', data: counts, backgroundColor: colors }]
                        },
                        options: { scales: { y: { beginAtZero: true } } }
                    });
                    // Add legend for color meanings
                    const legend = document.createElement('div');
                    legend.className = 'mt-2';
                    legend.innerHTML = `
                        <div><strong>Legend:</strong>
                          <span style="display:inline-block;width:12px;height:12px;background:rgba(0,200,0,0.6);"></span> Low
                          <span style="display:inline-block;width:12px;height:12px;background:rgba(255,200,0,0.6);margin-left:8px;"></span> Medium
                          <span style="display:inline-block;width:12px;height:12px;background:rgba(220,0,0,0.6);margin-left:8px;"></span> High
                        </div>`;
                    heatmapCanvas.parentElement.appendChild(legend);
                }
            } catch (e) {
                console.error('Heatmap parse error', e);
                }
            if (bookingsHeatmapCanvas) {
                const ctx2 = bookingsHeatmapCanvas.getContext('2d');
                const bookingsDataScript = document.getElementById('bookings-heatmap-data');
                try {
                    const bookingsData = bookingsDataScript ? JSON.parse(bookingsDataScript.textContent || '[]') : [];
                    if (window.Chart && Array.isArray(bookingsData)) {
                        const counts2 = bookingsData.map(d => d[1]);
                        const max2 = Math.max(1, ...counts2);
                        const colors2 = counts2.map(c => {
                            const t = c / max2;
                            let r, g, b;
                            if (t < 0.5) { const k = t / 0.5; r = Math.round(0 + k * 255); g = 200; b = 0; }
                            else { const k = (t - 0.5) / 0.5; r = 255 - Math.round(k * 35); g = 200 - Math.round(k * 200); b = 0; }
                            return `rgba(${r}, ${g}, ${b}, 0.6)`;
                        });
                        new Chart(ctx2, {
                            type: 'bar',
                            data: {
                                labels: bookingsData.map(d => (d[0] === 101 ? 'Room1' : `Room ${d[0]}`)),
                                datasets: [{ label: 'Approved occupancy (beds)', data: counts2, backgroundColor: colors2 }]
                            },
                            options: { scales: { y: { beginAtZero: true } } }
                        });
                    }
                } catch (e) {
                    console.error('Bookings heatmap parse error', e);
                }
            }

                // Populate occupancy table from live availability
                const occupancyTableBody = document.querySelector('#occupancyTable tbody');
                if (occupancyTableBody) {
                    fetch('/rooms/available', { credentials: 'include', headers: { ...(tkn ? { 'Authorization': `Bearer ${tkn}` } : {}) } })
                        .then(r => r.json())
                        .then(rows => {
                            occupancyTableBody.innerHTML = '';
                            rows.forEach(row => {
                                const tr = document.createElement('tr');
                                const occupied = Math.max((row.total_beds || 0) - (row.available || 0), 0);
                                const residents = Array.isArray(row.residents) && row.residents.length ? row.residents.join(', ') : '-';
                                tr.innerHTML = `
                                    <td>${row.room_no === 101 ? 'Room1' : row.room_no}</td>
                                    <td>${row.total_beds}</td>
                                    <td>${occupied}</td>
                                    <td>${row.available}</td>
                                    <td>${residents}</td>
                                `;
                                occupancyTableBody.appendChild(tr);
                            });
                        })
                        .catch(() => {
                            // leave empty or show a message
                        });
                }
        }
    }

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                fetch('/logout', { method: 'POST', credentials: 'include' })
                    .finally(() => {
                        localStorage.removeItem('token');
                        window.location.href = '/login';
                    });
            });
        }
});

function showNotification(message) {
    let notifications = document.getElementById('notifications');
    if (!notifications) {
        notifications = document.createElement('div');
        notifications.id = 'notifications';
        document.body.appendChild(notifications);
    }
    const div = document.createElement('div');
    div.className = 'notification';
    div.textContent = message;
    notifications.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}