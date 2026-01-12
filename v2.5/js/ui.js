"use strict";
// --- UI HELPERS ---
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-times-circle';
    if (type === 'warning') icon = 'fa-exclamation-circle';

    toast.innerHTML = `<i class="fas ${icon}"></i> <span>${msg}</span>`;
    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function renderAll() {
    renderDashboard();
    renderSalesTable();
    renderInventory();
    renderCustomers();
    updateFormDropdowns();
    catalog.render();
}

// --- CUSTOM MODAL HELPERS ---
let confirmCallback = null;

function showAlert(msg, title = "Notice", type = "info") {
    document.getElementById('alert-title').innerText = title;
    document.getElementById('alert-msg').innerText = msg;

    const iconBox = document.getElementById('alert-icon');
    if (type === 'error') {
        iconBox.style.color = 'var(--danger)';
        iconBox.innerHTML = '<i class="fas fa-times-circle"></i>';
    } else if (type === 'success') {
        iconBox.style.color = '#10b981';
        iconBox.innerHTML = '<i class="fas fa-check-circle"></i>';
    } else {
        iconBox.style.color = 'var(--primary)';
        iconBox.innerHTML = '<i class="fas fa-info-circle"></i>';
    }

    document.getElementById('customAlertModal').style.display = 'flex';
}

function closeCustomAlert() {
    document.getElementById('customAlertModal').style.display = 'none';
}

function showConfirm(msg, callback, title = "Confirm Action", showInput = false, defaultInput = "") {
    document.getElementById('confirm-title').innerText = title;
    document.getElementById('confirm-msg').innerText = msg;
    confirmCallback = callback;

    const inputContainer = document.getElementById('confirm-input-container');
    const inputField = document.getElementById('confirm-input');

    if (showInput) {
        inputContainer.style.display = 'block';
        inputField.value = defaultInput;
        inputField.focus();
    } else {
        inputContainer.style.display = 'none';
    }

    document.getElementById('customConfirmModal').style.display = 'flex';
}

document.getElementById('btn-confirm-ok').addEventListener('click', () => {
    const inputVal = document.getElementById('confirm-input').value;
    if (confirmCallback) confirmCallback(inputVal);
    document.getElementById('customConfirmModal').style.display = 'none';
});

document.getElementById('btn-confirm-cancel').addEventListener('click', () => {
    document.getElementById('customConfirmModal').style.display = 'none';
});


// --- SETTINGS & DATA MANAGEMENT ---
function exportDB() {
    const perms = auth.currentUser ? auth.currentUser.permissions : {};
    const isMaster = auth.currentUser && auth.currentUser.role === 'Master';
    if (!isMaster && !perms.backup) return showToast("Permission Denied: Backup access required", "error");

    const data = {};
    Object.values(DB_KEYS).forEach(key => {
        const val = localStorage.getItem(key);
        if (val) data[key] = val;
    });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `UHB_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link); // Required for some browsers
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up memory
    showToast("Backup exported successfully!");
}

function importDB(input) {
    const perms = auth.currentUser ? auth.currentUser.permissions : {};
    const isMaster = auth.currentUser && auth.currentUser.role === 'Master';
    if (!isMaster && !perms.backup) return showToast("Permission Denied: Restore access required", "error");

    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            showConfirm("This will overwrite all current data. Are you sure?", () => {
                // Clear existing UDT keys before restore to ensure a clean state
                Object.values(DB_KEYS).forEach(key => localStorage.removeItem(key));

                Object.entries(data).forEach(([key, value]) => {
                    if (value) localStorage.setItem(key, value);
                });
                showToast("Data restored! Reloading...");
                setTimeout(() => location.reload(), 1500);
            }, "Restore Database");

        } catch (err) {
            showToast("Invalid backup file", "error");
        }
    };
    reader.readAsText(file);
    input.value = ''; // Reset input to allow re-uploading the same file
}

function resetDB() {
    if (auth.currentUser?.role !== 'Master') return showToast("Master Access Required!", "error");
    showConfirm("CRITICAL WARNING: This will PERMANENTLY delete all transactions, customers, and catalog data. Proceed only if you have a backup. Continue?", () => {
        // Double Confirm
        showConfirm("LAST CHANCE: Are you absolutely sure? This cannot be undone.", () => {
            Object.values(DB_KEYS).forEach(key => localStorage.removeItem(key));
            showToast("Database Reset! Reloading...");
            setTimeout(() => location.reload(), 1500);
        }, "CONFIRM WIPE");
    }, "Factory Reset");
}

function changeMasterPass() {
    const newPass = document.getElementById('new-master-pass').value.trim();
    if (!newPass) return showToast("Password cannot be empty", "error");

    showConfirm("Change Master Password? You will be logged out.", () => {
        // In this V2 implementation, we'll store the master pass in localStorage if it's changed
        localStorage.setItem('udt_master_pass_v2', newPass);
        showToast("Password updated! Logging out...");
        setTimeout(() => auth.logout(), 1500);
    }, "Update Security");
}

// --- CATALOG MANAGEMENT ---
function openCatalogModal() {
    document.getElementById('catalogModal').style.display = 'flex';
    catalog.render();
}

function setDashMode(mode) {
    try {
        state.dashMode = mode;

        // UI Update - Global Header Toggles
        const btnSales = document.getElementById('btn-mode-sales');
        const btnBuy = document.getElementById('btn-mode-buy');

        if (btnSales && btnBuy) {
            if (mode === 'sales') {
                btnSales.style.background = 'white';
                btnSales.style.color = 'var(--primary)';
                btnSales.style.boxShadow = '0 2px 8px var(--shadow-color)';
                btnBuy.style.background = 'transparent';
                btnBuy.style.color = '#94a3b8';
                btnBuy.style.boxShadow = 'none';
            } else {
                btnBuy.style.background = 'white';
                btnBuy.style.color = 'var(--primary)';
                btnBuy.style.boxShadow = '0 2px 8px var(--shadow-color)';
                btnSales.style.background = 'transparent';
                btnSales.style.color = '#94a3b8';
                btnSales.style.boxShadow = 'none';
            }
        }

        // Re-render current page to apply mode-specific styles
        nav(state.currentPage);
    } catch (e) {
        console.error("setDashMode error:", e);
        showToast("Error switching mode", "error");
    }
}

function openModalWithMode() {
    const defaultType = state.dashMode === 'buy' ? 'buy' : 'sell';

    // Set dynamic title and hidden type field
    document.getElementById('tx-title').innerText = defaultType === 'sell' ? 'Sales Entry' : 'Purchase Entry';
    document.getElementById('t-type').value = defaultType;

    // Reset Form for New Entry
    const form = document.getElementById('txForm');
    form.reset();
    delete form.dataset.editId;
    document.getElementById('t-date').valueAsDate = new Date();
    document.getElementById('t-amount').value = "";
    document.getElementById('t-status').value = "purchased";

    updateFormDropdowns();
    openModal(); // Standard open
}

// --- DASHBOARD ---
function renderDashboard() {
    // 1. Filter Data based on Filters
    state.dateFilter = document.getElementById('date-filter').value;
    const now = new Date();
    const txList = state.getTransactions();
    const filteredTx = txList.filter(t => {
        // Date Filter
        const tDate = new Date(t.date);
        const diffTime = Math.abs(now - tDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (state.dateFilter === 'daily' && diffDays > 1) return false;
        if (state.dateFilter === 'weekly' && diffDays > 7) return false;
        if (state.dateFilter === 'monthly' && diffDays > 30) return false;
        if (state.dateFilter === '6months' && diffDays > 180) return false;
        if (state.dateFilter === '1year' && diffDays > 365) return false;
        if (state.dateFilter === '3years' && diffDays > 1095) return false;

        return true;
    });

    // Make sure we have labels for empty stats
    // Make sure we have labels for empty stats
    const modeColor = getComputedStyle(document.body).getPropertyValue('--primary').trim();
    const modeLabel = state.dashMode === 'buy' ? 'Purchases' : 'Sales';

    const lblTotal = document.getElementById('val-total-label');
    if (lblTotal) {
        lblTotal.innerText = `Total ${modeLabel} (Monthly)`;
        lblTotal.style.color = modeColor;
    }

    const iconTotal = document.getElementById('val-total-icon');
    if (iconTotal) iconTotal.style.color = modeColor;

    const iconStock = document.getElementById('val-stock-icon');
    if (iconStock) iconStock.style.color = modeColor;

    // Update Stat Label
    const statLabel = document.querySelector('.stat-card .stat-label');
    if (statLabel) statLabel.innerText = `Total ${modeLabel} (${state.dateFilter})`;

    // Stats
    document.getElementById('val-total').innerText = filteredTx.length;

    // Charts using FILTERED data
    const ctxLine = document.getElementById('mainChart').getContext('2d');
    const dateMap = {};
    // Sort by date for chart
    filteredTx.sort((a, b) => new Date(a.date) - new Date(b.date)).forEach(t => {
        dateMap[t.date] = (dateMap[t.date] || 0) + 1;
    });
    const labels = Object.keys(dateMap); // All dates in range
    // Calculate total amount per day for better insights, not just count
    const data = labels.map(date => {
        return filteredTx.filter(t => t.date === date).reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    });

    if (window.myLine) window.myLine.destroy();

    // Dynamic Colors from CSS Variables
    const style = getComputedStyle(document.body);
    const primaryColor = style.getPropertyValue('--primary').trim();
    const primaryRgb = style.getPropertyValue('--primary-rgb').trim();

    const chartColor = {
        border: primaryColor,
        bg: `rgba(${primaryRgb}, 0.1)`,
        point: primaryColor
    };

    const chartData = {
        labels: labels,
        datasets: [{
            label: state.dashMode === 'buy' ? 'Purchases (\u20B9)' : 'Sales (\u20B9)',
            data: data,
            borderColor: chartColor.border,
            backgroundColor: chartColor.bg,
            tension: 0.4,
            fill: true,
            pointBackgroundColor: chartColor.point,
            pointRadius: 4,
            pointHoverRadius: 6
        }]
    };

    window.myLine = new Chart(ctxLine, {
        type: 'line',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#f8fafc',
                    padding: 10,
                    cornerRadius: 8,
                    displayColors: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                    ticks: { font: { size: 11, family: "'Inter', sans-serif" }, color: '#64748B' }
                },
                x: {
                    grid: { display: false },
                    ticks: { font: { size: 11, family: "'Inter', sans-serif" }, color: '#64748B' }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });

    const ctxPie = document.getElementById('pieChart').getContext('2d');
    const prodMap = {};
    filteredTx.forEach(t => { prodMap[t.product] = (prodMap[t.product] || 0) + Number(t.qty); });

    if (window.myPie) window.myPie.destroy();
    const labelsPie = Object.keys(prodMap);
    const dataPie = Object.values(prodMap);
    const pieColors = state.dashMode === 'buy' ?
        ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'] :
        ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];

    window.myPie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: labelsPie,
            datasets: [{
                data: dataPie,
                backgroundColor: pieColors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });

    // Recent Table
    document.getElementById('recent-table-body').innerHTML = filteredTx.slice(0, 5).map(t => {
        const data = state.traders[t.name];
        const contact = (typeof data === 'object') ? data.contact : (data || 'N/A');
        return `
        <tr>
            <td>${t.date}</td>
            <td><span class="badge ${t.type === 'sell' ? 'badge-sell' : 'badge-buy'}">${t.type.toUpperCase()}</span></td>
            <td>${t.name}</td>
            <td>${contact}</td>
            <td>${t.product}</td>
            <td>${t.qty}</td>
            <td style="font-weight:700;">\u20B9${(Number(t.amount) || 0).toLocaleString()}</td>
            <td><span class="badge ${t.status === 'purchased' ? 'badge-buy' : 'badge-info'}">${(t.status || 'purchased').toUpperCase()}</span></td>
        </tr>
    `}).join('');

    // Update Stock Valuation (Phase 2)
    updateValuation();

    // Settlement Reminders (Phase 4)
    renderReminders();
}

function renderReminders() {
    const today = new Date().toISOString().split('T')[0];
    // Check both datasets for reminders
    const reminders = [...state.sales, ...state.purchases].filter(t =>
        t.status === 'booked' && t.promiseDate === today
    );

    const card = document.getElementById('reminders-card');
    const list = document.getElementById('reminder-list');
    const count = document.getElementById('reminder-count');

    if (reminders.length > 0) {
        card.style.display = 'block';
        count.innerText = reminders.length;
        list.innerHTML = reminders.map(t => {
            const balance = (Number(t.amount) || 0) - (Number(t.paidAmount) || 0);
            // Gate Pay button: Master or perms.edit
            const canEdit = auth.currentUser && (auth.currentUser.role === 'Master' || (auth.currentUser.permissions && auth.currentUser.permissions.edit));
            const payBtn = canEdit ? `<button onclick="editTx(${t.id})" style="background:var(--accent); color:white; border:none; padding:2px 8px; border-radius:4px; font-size:0.7rem; cursor:pointer;">Pay</button>` : '';

            return `
                <div style="background:white; padding:10px 15px; border-radius:10px; border:1px solid #fed7aa; display:flex; flex-direction:column; gap:4px; min-width:200px;">
                    <div style="font-weight:700; color:var(--dark); font-size:0.85rem;">${t.name}</div>
                    <div style="font-size:0.75rem; color:#64748B;">${t.product} (${t.size})</div>
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:5px;">
                        <span style="font-size:0.8rem; font-weight:700; color:var(--accent);">Due: \u20B9${balance.toLocaleString()}</span>
                        ${payBtn}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        card.style.display = 'none';
    }
}

function updateValuation() {
    // Valuation Stock logic
    const currentStock = calculateStock();
    const activeCatalog = state.getCatalog();
    let totalVal = 0;

    Object.entries(currentStock).forEach(([key, qty]) => {
        const [prod, size] = key.split('-');
        const variants = activeCatalog[prod] || [];
        const v = variants.find(v => v.size === size);
        if (v && qty > 0) totalVal += (v.price * qty);
    });
    document.getElementById('val-stock-est').innerText = "\u20B9" + totalVal.toLocaleString();
}

// --- INVENTORY LOGIC ---
function calculateStock(prod, size) {
    let total = 0;
    state.getAllTx().forEach(t => {
        if (t.product === prod && t.size === size) {
            if (t.type === 'buy') total += Number(t.qty);
            if (t.type === 'sell') total -= Number(t.qty);
        }
    });
    return total;
}

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;

    let html = '';
    let hasAlert = false;
    const activeCatalog = state.getCatalog();

    Object.entries(activeCatalog).forEach(([prod, items]) => {
        if (!Array.isArray(items)) return;

        items.forEach(item => {
            if (!item || typeof item !== 'object') return;

            const size = item.size || 'N/A';
            const stock = calculateStock(prod, size);

            // Threshold Logic
            const key = `${prod}-${size}`;
            const limit = state.thresholds[key] !== undefined ? state.thresholds[key] : 50;

            const isLow = stock < limit;
            if (isLow) hasAlert = true;

            // Button for Master to set Limit
            const canSetLimit = auth.currentUser && (auth.currentUser.role === 'Master' || (auth.currentUser.permissions && auth.currentUser.permissions.limit));
            const limitDisplay = canSetLimit
                ? `<button class="badge" onclick="setLimit('${prod}', '${size}')" 
                       style="background:#f1f5f9; color:#64748B; border:none; cursor:pointer; font-size:0.7rem; padding:4px 8px; font-weight:700;">Set Limit (${limit})</button>`
                : `<span style="font-size:0.7rem; color:#94A3B8; font-weight:700;">Limit: ${limit}</span>`;

            html += `
                <div class="card inventory-card" style="border-left:5px solid ${isLow ? 'var(--danger)' : 'var(--primary)'}; transition: 0.3s; padding:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
                        <div style="font-size:0.75rem; color:#64748B; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${prod}</div>
                        ${limitDisplay}
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-size:1.2rem; font-weight:700; color:var(--dark);">${size}</div>
                        <div style="font-size:0.85rem; color:#64748B; font-weight:700;">\u20B9${item.price || 0}</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:baseline; margin-top:10px;">
                        <div style="font-size:2.5rem; font-weight:800; color:${isLow ? 'var(--danger)' : 'var(--dark)'};">${stock}</div>
                        <div style="font-size:0.85rem; color:${isLow ? 'var(--danger)' : '#10b981'}; font-weight:600;">
                            ${isLow ? '<i class="fas fa-exclamation-circle"></i> Low Stock' : '<i class="fas fa-check-circle"></i> In Stock'}
                        </div>
                    </div>
                    <div style="margin-top:15px; border-top:1px solid #f1f5f9; padding-top:15px; text-align:right;">
                        <button onclick="openLedger('${prod}', '${size}')" 
                           style="background:none; border:none; color:var(--primary); text-decoration:none; font-size:0.85rem; font-weight:700; cursor:pointer; padding:0;">View Ledger &rarr;</button>
                    </div>
                </div>
                `;
        });
    });

    // Add New Product Placeholder Card (Master or Limit Permission)
    if (auth.currentUser && (auth.currentUser.role === 'Master' || (auth.currentUser.permissions && auth.currentUser.permissions.limits))) {
        html += `
                    <div class="card inventory-card" onclick="openCatalogModal()" 
                        style="border:2px dashed #E2E8F0; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; background:rgba(248, 250, 252, 0.5); min-height:180px; transition:0.3s;">
                        <i class="fas fa-plus-circle" style="font-size:2rem; color:#94A3B8; margin-bottom:12px;"></i>
                        <div style="font-weight:700; color:#475569;">Add New Product</div>
                        <div style="font-size:0.75rem; color:#94A3B8;">Update Catalog</div>
                    </div>
                    `;
    }

    grid.innerHTML = html;
    document.getElementById('inv-alert-dot').style.display = hasAlert ? 'block' : 'none';
}

function openLedger(prod, size) {
    document.getElementById('ledger-title-prod').innerText = prod;
    document.getElementById('ledger-title-size').innerText = size;

    const history = state.getAllTx()
        .filter(t => t.product === prod && t.size === size)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    let runningStock = 0;
    const body = document.getElementById('ledger-body');
    body.innerHTML = history.map(t => {
        if (t.type === 'buy') runningStock += Number(t.qty);
        else runningStock -= Number(t.qty);

        return `
                <tr>
                <td>${t.date}</td>
                <td><span class="badge ${t.type === 'sell' ? 'badge-sell' : 'badge-buy'}">${t.type.toUpperCase()}</span></td>
                <td>${t.name}</td>
                <td style="font-weight:700; color:${t.type === 'buy' ? '#059669' : 'var(--primary)'}">${t.type === 'buy' ? '+' : '-'}${t.qty}</td>
                <td style="font-weight:700;">${runningStock}</td>
            </tr>
                `;
    }).reverse().join(''); // Show latest on top

    if (history.length === 0) {
        body.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:#94A3B8;">No transaction history for this item.</td></tr>';
    }

    document.getElementById('ledgerModal').style.display = 'flex';
}

function setLimit(prod, size) {
    const isMaster = auth.currentUser && auth.currentUser.role === 'Master';
    const perms = auth.currentUser ? auth.currentUser.permissions : {};
    if (!isMaster && !perms.limits) return showToast("Permission Denied: Stock Limit access required", "error");

    showConfirm(`Set low stock warning limit for ${prod}(${size}):`, (val) => {
        if (val !== null) {
            const lim = parseInt(val);
            if (!isNaN(lim)) {
                state.thresholds[`${prod}-${size}`] = lim;
                localStorage.setItem(DB_KEYS.THRESHOLDS, JSON.stringify(state.thresholds));
                renderInventory();
            } else {
                showToast("Invalid number entered", "error");
            }
        }
    }, "Set Stock Limit", true, "50");
}

// --- CUSTOMER LOGIC ---
function renderCustomers() {
    const body = document.getElementById('customer-table-body');
    const perms = auth.currentUser ? auth.currentUser.permissions : {};
    const isMaster = auth.currentUser && auth.currentUser.role === 'Master';

    let html = '';
    Object.entries(state.traders).forEach(([name, data]) => {
        const contact = (typeof data === 'object') ? data.contact : (data || 'N/A');
        const type = (typeof data === 'object') ? data.type : (state.getAllTx().some(t => t.name === name && t.type === 'buy') ? 'Dealer' : 'Customer');
        const typeLabel = type === 'Dealer' ? '<span style="color:var(--secondary);">Dealer</span>' : 'Customer';

        html += `
            <tr onclick="openCustPortal('${name}')" style="cursor:pointer;">
                <td><b>${name}</b></td>
                <td>${contact}</td>
                <td>${typeLabel}</td>
                <td style="text-align:right;">
                    <div style="display:inline-flex; gap:10px;" onclick="event.stopPropagation()">
                        ${(isMaster || perms.edit) ? `<button style="color:var(--secondary); border:none; background:none; cursor:pointer;" onclick="editCust('${name}')"><i class="fas fa-edit"></i></button>` : ''}
                        ${(isMaster || perms.delete) ? `<button style="color:var(--danger); border:none; background:none; cursor:pointer;" onclick="deleteCust('${name}')"><i class="fas fa-trash"></i></button>` : ''}
                    </div>
                </td>
            </tr>
        `;
    });
    body.innerHTML = html || '<tr><td colspan="4" style="text-align:center; padding:20px; color:#94A3B8;">No customers yet.</td></tr>';
}

function openCustPortal(name) {
    const data = state.traders[name];
    const contact = (typeof data === 'object') ? data.contact : (data || 'No contact');
    const history = state.getAllTx().filter(t => t.name === name);

    document.getElementById('portal-cust-name').innerText = name;
    document.getElementById('portal-cust-contact').innerText = contact;

    document.getElementById('portal-total-orders').innerText = history.length;
    document.getElementById('portal-stock-in').innerText = history.filter(t => t.type === 'buy').length;

    // Total Balance (Total Sell Amt - Total Buy Amt)
    let bal = 0;
    history.forEach(t => {
        const amt = Number(t.amount) || 0;
        if (t.type === 'sell') bal += amt;
        else bal -= amt;
    });
    document.getElementById('portal-balance').innerText = "\u20B9" + bal.toLocaleString();

    const body = document.getElementById('portal-history-body');
    body.innerHTML = history.sort((a, b) => new Date(b.date) - new Date(a.date)).map(t => `
        <tr>
            <td>${t.date}</td>
            <td>${t.product}</td>
            <td><span class="badge badge-mode">${(t.status || 'purchased').toUpperCase()}</span></td>
            <td><span class="badge ${t.type === 'sell' ? 'badge-sell' : 'badge-buy'}">${t.type.toUpperCase()}</span></td>
            <td>${t.qty}</td>
            <td style="font-weight:700;">\u20B9${(Number(t.amount) || 0).toLocaleString()}</td>
            <td><i class="fas fa-chevron-right" style="color:#CBD5E1;"></i></td>
        </tr>
    `).join('');

    document.getElementById('custPortalModal').style.display = 'flex';
}

function deleteCust(name) {
    const isMaster = auth.currentUser && auth.currentUser.role === 'Master';
    const perms = auth.currentUser ? auth.currentUser.permissions : {};
    if (!isMaster && !perms.delete) return showToast("Permission Denied: Delete access required", "error");

    if (confirm(`Delete ${name} from database ? `)) {
        delete state.traders[name];
        localStorage.setItem(DB_KEYS.TRADERS, JSON.stringify(state.traders));
        renderAll();
    }
}

function editCust(name) {
    const isMaster = auth.currentUser && auth.currentUser.role === 'Master';
    const perms = auth.currentUser ? auth.currentUser.permissions : {};
    if (!isMaster && !perms.edit) return showToast("Permission Denied: Edit access required", "error");

    const data = state.traders[name];
    const contact = (typeof data === 'object') ? data.contact : (data || 'N/A');
    const type = (typeof data === 'object') ? data.type : (state.getAllTx().some(t => t.name === name && t.type === 'buy') ? 'Dealer' : 'Customer');

    document.getElementById('c-name').value = name;
    document.getElementById('c-contact').value = contact;
    document.getElementById('c-type').value = type;
    document.getElementById('custForm').dataset.editName = name; // Store original name
    openCustModal();
}

function openCustModal() {
    const form = document.getElementById('custForm');
    if (!form.dataset.editName) {
        form.reset();
        document.getElementById('c-name').value = '';
        document.getElementById('c-contact').value = '';
        document.getElementById('c-type').value = 'Customer';
    }
    document.getElementById('custModal').style.display = 'flex';
}
function openUserModal() {
    document.getElementById('userModal').style.display = 'flex';
    auth.renderUserList();
}

document.getElementById('custForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('c-name').value.trim();
    const contact = document.getElementById('c-contact').value.trim();
    const type = document.getElementById('c-type').value;
    const editName = e.target.dataset.editName;

    if (name) {
        // Check for duplicates if it's a new name or rename
        if ((!editName || editName !== name) && state.traders[name]) {
            return showToast("Customer already exists with this name!", "warning");
        }

        if (editName && editName !== name) {
            // It's a rename - delete old, update transactions in both sets
            delete state.traders[editName];
            state.sales.forEach(t => { if (t.name === editName) t.name = name; });
            state.purchases.forEach(t => { if (t.name === editName) t.name = name; });

            localStorage.setItem(DB_KEYS.SALES, JSON.stringify(state.sales));
            localStorage.setItem(DB_KEYS.PURCHASE, JSON.stringify(state.purchases));
        }

        const isUpdate = !!editName;
        state.traders[name] = { contact: contact || 'N/A', type: type };

        localStorage.setItem(DB_KEYS.TRADERS, JSON.stringify(state.traders));

        showToast(isUpdate ? "Customer Updated!" : "Customer Added!");
        closeModal('custModal');
        delete e.target.dataset.editName;
        renderAll();
    }
});

// --- REPORTS ---
function generateReport(type) {
    let csv = [];
    let filename = '';

    if (type === 'sales') {
        csv = [['Date', 'Type', 'Customer', 'Product', 'Size', 'Qty', 'Amount', 'Status']];

        // Use filtered data if we are in the Sales view, otherwise all
        const isSalesView = document.getElementById('view-sales').style.display === 'block';
        let dataToExport = state.getTransactions();

        if (isSalesView) {
            const fDate = document.getElementById('f-date').value;
            const fName = document.getElementById('f-name') ? document.getElementById('f-name').value.toLowerCase() : '';
            const fProd = document.getElementById('f-prod') ? document.getElementById('f-prod').value : 'all';
            const fSize = document.getElementById('f-size') ? document.getElementById('f-size').value.toLowerCase() : '';
            const fStatus = document.getElementById('f-status') ? document.getElementById('f-status').value : 'all';

            dataToExport = state.getTransactions().filter(t => {
                if (fDate && t.date !== fDate) return false;
                if (fName && !t.name.toLowerCase().includes(fName)) return false;
                if (fProd !== 'all' && t.product !== fProd) return false;
                if (fSize && !t.size.toLowerCase().includes(fSize)) return false;
                if (fStatus !== 'all' && (t.status || 'purchased') !== fStatus) return false;
                return true;
            });
        }

        dataToExport.forEach(t => csv.push([t.date, t.type, t.name, t.product, t.size, t.amount || 0, t.status || 'purchased']));
        filename = isSalesView ? 'Filtered_Sales_Report.csv' : 'Full_Sales_Report.csv';
    } else if (type === 'stock') {
        csv = [['Product', 'Size', 'Current Stock']];
        const activeCatalog = state.getCatalog();
        Object.entries(activeCatalog).forEach(([prod, variants]) => {
            variants.forEach(v => csv.push([prod, v.size, calculateStock(prod, v.size)]));
        });
        filename = `${state.dashMode.toUpperCase()}_Inventory_Report.csv`;
    } else if (type === 'customers') {
        csv = [['Name', 'Contact']];
        Object.entries(state.traders).forEach(([n, c]) => csv.push([n, c]));
        filename = 'Customer_List.csv';
    }

    const csvContent = "data:text/csv;charset=utf-8," + csv.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = filename;
    link.click();
}

// --- CORE UI ---
function nav(page) {
    try {
        state.currentPage = page;
        const views = ['dashboard', 'sales', 'inventory', 'customers', 'reports', 'settings'];
        views.forEach(v => {
            const el = document.getElementById('view-' + v);
            if (el) el.style.display = (v === page) ? 'block' : 'none';
        });

        // Update Body Mode Class based on Page
        document.body.classList.remove('mode-sales', 'mode-buy', 'mode-customers', 'mode-reports', 'mode-settings');

        switch (page) {
            case 'dashboard':
            case 'sales':
            case 'inventory':
                document.body.classList.add('mode-' + state.dashMode);
                break;
            case 'customers':
                document.body.classList.add('mode-customers');
                break;
            case 'reports':
                document.body.classList.add('mode-reports');
                break;
            case 'settings':
                document.body.classList.add('mode-settings');
                break;
        }

        // Active Nav Item
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        const activeNav = document.querySelector(`[onclick="nav('${page}')"]`);
        if (activeNav) activeNav.classList.add('active');

        // Header Controls Context
        document.getElementById('global-controls').style.display = (page === 'dashboard' || page === 'sales' || page === 'inventory') ? 'flex' : 'none';

        // Date filter visibility (only on dashboard)
        const dateFilterBox = document.getElementById('dash-date-filter');
        if (dateFilterBox) {
            dateFilterBox.style.display = (page === 'dashboard') ? 'block' : 'none';
        }

        const fabBtn = document.getElementById('fab-add');
        if (fabBtn) {
            fabBtn.style.display = (['dashboard', 'sales', 'inventory'].includes(page)) ? 'flex' : 'none';
        }

        renderAll();
    } catch (e) {
        console.error("Navigation error:", e);
        // showToast("Navigation error", "error"); // Suppress to avoid loops
    }
}

function renderSalesTable() {
    const perms = auth.currentUser ? auth.currentUser.permissions : {};
    const isMaster = auth.currentUser && auth.currentUser.role === 'Master';

    // Collect all filter values
    const fDate = document.getElementById('f-date') ? document.getElementById('f-date').value : '';
    const fName = document.getElementById('f-name') ? document.getElementById('f-name').value.toLowerCase() : '';
    const fProd = document.getElementById('f-prod') ? document.getElementById('f-prod').value : 'all';
    const fSize = document.getElementById('f-size') ? document.getElementById('f-size').value.toLowerCase() : '';
    const fStatus = document.getElementById('f-status') ? document.getElementById('f-status').value : 'all';

    // Update Product Dropdown options dynamically if empty (except 'all')
    const pSel = document.getElementById('f-prod');
    if (pSel && pSel.options.length <= 1) {
        Object.keys(state.catalog).forEach(p => {
            const opt = document.createElement('option');
            opt.value = p; opt.innerText = p;
            pSel.appendChild(opt);
        });
    }

    // Filter logic
    const txList = state.getTransactions();
    const filtered = txList.filter(t => {
        if (fDate && t.date !== fDate) return false;
        if (fName && !t.name.toLowerCase().includes(fName)) return false;
        if (fProd !== 'all' && t.product !== fProd) return false;
        if (fSize && !t.size.toLowerCase().includes(fSize)) return false;
        if (fStatus !== 'all' && (t.status || 'purchased') !== fStatus) return false;
        return true;
    });

    const body = document.getElementById('sales-body');
    if (filtered.length === 0) {
        body.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:40px; color:#94A3B8;">
                    <i class="fas fa-search" style="font-size:2rem; display:block; margin-bottom:10px;"></i>
                    No transactions found matching your filters
                </td></tr>`;
        return;
    }

    body.innerHTML = filtered.map(t => {
        const isBooked = t.status === 'booked';
        const paid = Number(t.paidAmount) || 0;
        const total = Number(t.amount) || 0;
        const balance = total - paid;
        const payProgress = isBooked ? `<div style="font-size:0.7rem; color:#64748B; margin-top:2px;">Paid: \u20B9${paid.toLocaleString('en-IN')} / \u20B9${total.toLocaleString('en-IN')}</div>` : '';

        return `
                <tr>
            <td>${t.date}</td>
            <td><b>${t.name}</b></td>
            <td>${t.product}</td>
            <td>${t.size}</td>
            <td>${t.qty}</td>
            <td>
                <div style="font-weight:700;">\u20B9${total.toLocaleString('en-IN')}</div>
                <div style="font-size:0.65rem; color:#94A3B8; margin-top:2px;">
                    ${t.paymentMethod || 'Cash'}
                    ${(t.paymentMethod === 'UPI' && t.upiId) ? ` | ID: ${t.upiId}` : ''}
                </div>
                ${payProgress}
            </td>
            <td>
                <span class="badge" style="background:${t.status === 'purchased' ? '#ECFDF5' : (isBooked ? '#FFF7ED' : '#eff6ff')}; 
                    color:${t.status === 'purchased' ? '#059669' : (isBooked ? '#C2410C' : '#3b82f6')}">
                    ${(t.status || 'purchased').toUpperCase()}
                </span>
                ${isBooked && t.promiseDate ? `<div style="font-size:0.65rem; color:#C2410C; margin-top:2px; font-weight:600;">Due: ${t.promiseDate}</div>` : ''}
            </td>
            <td style="text-align:right; white-space:nowrap;">
                <div style="display:inline-flex; gap:15px; align-items:center;">
                    <button style="color:var(--primary); border:none; background:none; cursor:pointer; padding:5px; font-size:1.1rem;" onclick="printReceipt(${t.id})" title="Print Receipt"><i class="fas fa-print"></i></button>
                    ${(isMaster || perms.edit) ? `<button style="color:var(--secondary); border:none; background:none; cursor:pointer; padding:5px; font-size:1.1rem;" onclick="editTx(${t.id})"><i class="fas fa-edit"></i></button>` : ''}
                    ${(isMaster || perms.delete) ? `<button style="color:var(--danger); border:none; background:none; cursor:pointer; padding:5px; font-size:1.1rem;" onclick="deleteTx(${t.id})"><i class="fas fa-trash"></i></button>` : ''}
                </div>
            </td>
        </tr>
                `}).join('');
}

function editTx(id) {
    const isMaster = auth.currentUser && auth.currentUser.role === 'Master';
    const perms = auth.currentUser ? auth.currentUser.permissions : {};
    if (!isMaster && !perms.edit) return showToast("Permission Denied: Edit access required", "error");

    const txList = [...state.sales, ...state.purchases];
    const t = txList.find(tx => tx.id === id);
    if (!t) return showToast("Transaction not found", "error");

    // Set dynamic title and hidden type field
    document.getElementById('tx-title').innerText = t.type === 'sell' ? 'Edit Sales Entry' : 'Edit Purchase Entry';
    document.getElementById('t-type').value = t.type;

    // Fill Form
    updateFormDropdowns();
    document.getElementById('t-date').value = t.date;
    document.getElementById('t-customer').value = t.name;
    document.getElementById('t-product').value = t.product;
    updateSizeDropdown();
    document.getElementById('t-size').value = t.size;
    document.getElementById('t-qty').value = t.qty;
    document.getElementById('t-amount').value = t.amount || "";
    document.getElementById('t-status').value = t.status || "purchased";
    document.getElementById('t-payment').value = t.paymentMethod || "Cash";
    document.getElementById('t-upi-id').value = t.upiId || "";
    document.getElementById('t-paid').value = t.paidAmount || "";
    document.getElementById('t-promise').value = t.promiseDate || "";

    toggleSettlementFields();
    toggleUPIField();

    // Store ID for update
    document.getElementById('txForm').dataset.editId = id;

    openModal();
}

function deleteTx(id) {
    const isMaster = auth.currentUser && auth.currentUser.role === 'Master';
    const perms = auth.currentUser ? auth.currentUser.permissions : {};
    if (!isMaster && !perms.delete) return showToast("Permission Denied: Delete access required", "error");

    if (confirm("Delete this record permanently?")) {
        state.deleteTransaction(id);
        renderAll();
    }
}

function openModal() { document.getElementById('txModal').style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function updateFormDropdowns() {
    const type = document.getElementById('t-type').value;
    const activeCatalog = state.getCatalog(type);
    const pSel = document.getElementById('t-product');
    pSel.innerHTML = Object.keys(activeCatalog).map(p => `<option value="${p}">${p}</option>`).join('');
    updateSizeDropdown();

    const dl = document.getElementById('traderList');
    dl.innerHTML = Object.keys(state.traders).map(k => `<option value="${k}">${k}</option>`).join('');
}

function updateSizeDropdown() {
    const type = document.getElementById('t-type').value;
    const activeCatalog = state.getCatalog(type);
    const prod = document.getElementById('t-product').value;
    const items = activeCatalog[prod] || [];
    document.getElementById('t-size').innerHTML = items.map(item => `<option value="${item.size}">${item.size}</option>`).join('');
}

function checkNewCustomer(val) {
    const box = document.getElementById('new-cust-phone-box');
    if (val && !state.traders[val]) {
        box.style.display = 'block';
        document.getElementById('t-phone').required = true;
    } else {
        box.style.display = 'none';
        document.getElementById('t-phone').required = false;
    }
}

function toggleSettlementFields() {
    const status = document.getElementById('t-status').value;
    const paidBox = document.getElementById('paid-amount-box');
    const dateBox = document.getElementById('promise-date-box');

    if (status === 'booked') {
        paidBox.style.display = 'block';
        dateBox.style.display = 'block';
    } else {
        paidBox.style.display = 'none';
        dateBox.style.display = 'none';
        if (status === 'purchased') {
            autoFillPaid();
        }
    }
}

function toggleUPIField() {
    const method = document.getElementById('t-payment').value;
    const upiBox = document.getElementById('upi-id-box');
    upiBox.style.display = (method === 'UPI') ? 'block' : 'none';
}

function autoFillPaid() {
    const status = document.getElementById('t-status').value;
    const total = document.getElementById('t-amount').value;
    if (status === 'purchased') {
        document.getElementById('t-paid').value = total;
    }
}

document.getElementById('txForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = e.target.dataset.editId;

    const txData = {
        date: document.getElementById('t-date').value,
        name: document.getElementById('t-customer').value.trim(),
        product: document.getElementById('t-product').value,
        size: document.getElementById('t-size').value,
        qty: Number(document.getElementById('t-qty').value),
        type: document.getElementById('t-type').value,
        amount: Number(document.getElementById('t-amount').value) || 0,
        status: document.getElementById('t-status').value,
        paymentMethod: document.getElementById('t-payment').value,
        upiId: document.getElementById('t-upi-id').value.trim(),
        paidAmount: Number(document.getElementById('t-paid').value) || 0,
        promiseDate: document.getElementById('t-promise').value || ""
    };

    // Validation: Negative Amounts
    if (txData.amount < 0 || txData.paidAmount < 0) {
        showToast("Monetary amounts cannot be negative!", "error");
        return;
    }

    if (!txData.name) {
        showToast("Customer name is required!", "warning");
        return;
    }

    // Enforce Phone for New Customer
    if (!state.traders[txData.name]) {
        const phone = document.getElementById('t-phone').value.trim();
        if (!phone || phone.length < 10) {
            showToast("Please enter a valid 10-digit contact number for the new customer.", "error");
            document.getElementById('t-phone').focus();
            return;
        }
        state.traders[txData.name] = {
            contact: phone,
            type: txData.type === 'buy' ? 'Dealer' : 'Customer'
        };
        localStorage.setItem(DB_KEYS.TRADERS, JSON.stringify(state.traders));
    }

    if (editId) {
        state.updateTransaction({ ...txData, id: Number(editId) });
        showToast("Entry Updated!");
    } else {
        txData.id = Date.now();
        state.addTransaction(txData);
        showToast("Entry Saved!");
    }

    closeModal('txModal');
    document.getElementById('new-cust-phone-box').style.display = 'none';
    document.getElementById('t-phone').value = '';

    // Clean up edit meta
    delete e.target.dataset.editId;
    document.getElementById('tx-title').innerText = 'New Transaction';

    renderAll();
});

function toggleSidebar() {
    const sidebar = document.getElementById('main-sidebar');
    sidebar.classList.toggle('collapsed');
}

function printReceipt(id) {
    const txList = [...state.sales, ...state.purchases];
    const t = txList.find(tx => tx.id === id);
    if (!t) return;
    const trader = state.traders[t.name];
    const contact = (typeof trader === 'object') ? trader.contact : (trader || 'N/A');

    document.getElementById('r-id').innerText = t.id.toString().slice(-6);
    document.getElementById('r-date').innerText = t.date;
    document.getElementById('r-cust').innerText = t.name;
    document.getElementById('r-contact').innerText = contact;
    document.getElementById('r-prod').innerText = `${t.product} (${t.size})`;
    document.getElementById('r-qty').innerText = t.qty;
    document.getElementById('r-amt').innerText = `\u20B9${(t.amount || 0).toLocaleString('en-IN')} `;
    document.getElementById('r-total').innerText = (t.amount || 0).toLocaleString('en-IN');

    // Payment Method Info in Receipt
    const pInfo = document.getElementById('r-payment-info');
    pInfo.innerHTML = `Method: ${t.paymentMethod || 'Cash'} ${(t.paymentMethod === 'UPI' && t.upiId) ? `| Ref: ${t.upiId}` : ''} `;

    // Settlement Info in Receipt
    const paid = Number(t.paidAmount) || 0;
    const total = Number(t.amount) || 0;
    const balance = total - paid;
    const sInfo = document.getElementById('r-settlement-info');
    if (t.status === 'booked') {
        sInfo.style.display = 'block';
        sInfo.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-top:5px; font-weight:700;">
                <span>Paid (Advance):</span> <span>\u20B9${paid.toLocaleString('en-IN')}</span>
            </div>
            <div style="display:flex; justify-content:space-between; color:var(--danger); border-top:1px solid #eee; margin-top:5px; padding-top:5px;">
                <span>Balance Due:</span> <span>\u20B9${balance.toLocaleString('en-IN')}</span>
            </div>
            ${t.promiseDate ? `<div style="font-size:0.75rem; color:#64748B; margin-top:5px;">Promised Settlement: ${t.promiseDate}</div>` : ''}
        `;
    } else {
        sInfo.style.display = 'none';
    }

    const printArea = document.getElementById('receipt-print');
    printArea.style.display = 'block';
    window.print();
    printArea.style.display = 'none';
}
