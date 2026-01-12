"use strict";
document.addEventListener('DOMContentLoaded', () => {
    // Data Migration for Catalog (Phase 2 -> Phase 3)
    let migrated = false;
    Object.entries(state.catalog).forEach(([prod, items]) => {
        if (Array.isArray(items) && items.length > 0 && typeof items[0] === 'string') {
            state.catalog[prod] = items.map(s => ({ size: s, price: 0 }));
            migrated = true;
        }
    });
    if (migrated) state.save(DB_KEYS.CATALOG, state.catalog);

    // Data Migration for Datasets (Phase 4 -> Phase 5)
    if (state.transactions.length > 0) {
        state.sales = state.transactions.filter(t => t.type === 'sell');
        state.purchases = state.transactions.filter(t => t.type === 'buy');

        // Clear old key but keep array empty for now to avoid re-migration
        state.transactions = [];
        localStorage.removeItem(DB_KEYS.TX); // Explicit remove as we don't have a direct setter for 'transactions' that clears it from DB
        showToast("Data migrated to separate Sales/Purchase datasets.");
    }

    // Catalog Migration (v2 -> v3 separate catalogs)
    if (Object.keys(state.catalog).length > 0 &&
        localStorage.getItem(DB_KEYS.CATALOG_SALES) === null) {

        // Copy existing catalog to Sales (Standard Blocks/Rings)
        state.catalogSales = JSON.parse(JSON.stringify(state.catalog)); // Direct access to avoid setter triggering a partial save if used incorrectly without deep clone
        state.saveCatalog('sales');

        // Keep the default Purchase catalog (Dust/Jalli/Cement)
        state.saveCatalog('buy');

        // Clear old key
        localStorage.removeItem(DB_KEYS.CATALOG);
        state.catalog = {};
        showToast("Catalogs separated for Sales and Purchases.");
    }

    auth.init();
    document.getElementById('t-date').valueAsDate = new Date();

    // Login Listener
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            try {
                const u = document.getElementById('login-user').value.trim();
                const p = document.getElementById('login-pass').value.trim();

                const result = auth.login(u, p);
                if (!result.success) {
                    const errBox = document.getElementById('login-error');
                    if (errBox) {
                        errBox.style.display = 'block';
                        errBox.innerText = result.msg;
                    } else {
                        alert(result.msg);
                    }
                }
            } catch (err) {
                console.error("Login Error:", err);
                const errBox = document.getElementById('login-error');
                if (errBox) {
                    errBox.style.display = 'block';
                    errBox.innerText = "System Error: " + err.message;
                } else {
                    alert("System Error: " + err.message);
                }
            }
        });
    } else {
        console.error("Login form not found!");
    }

    // Signup Listener
    document.getElementById('signupForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('signup-user').value.trim();
        const p = document.getElementById('signup-pass').value.trim();
        auth.handleSignup(u, p);
    });



    // Initial Dashboard Mode
    setDashMode('sales');

    // Set up status change listener for settlement fields
    toggleSettlementFields();
});

