"use strict";
const DB_KEYS = {
    TX: 'udt_tx_v2', // Deprecated
    SALES: 'udt_sales_v3',
    PURCHASE: 'udt_purchase_v3',
    CATALOG_SALES: 'udt_catalog_sales_v1',
    CATALOG_PURCHASE: 'udt_catalog_purchase_v1',
    CATALOG: 'udt_catalog_v2', // Keep for migration
    TRADERS: 'udt_traders_v2',
    USERS: 'udt_users_v2',
    THRESHOLDS: 'udt_thresholds_v2',
    PASS_REQS: 'udt_pass_reqs_v2',
    SIGNUP_REQS: 'udt_signup_reqs_v2'
};

class Store {
    constructor() {
        // Internal data storage
        this._data = {
            sales: this.load(DB_KEYS.SALES, []),
            purchases: this.load(DB_KEYS.PURCHASE, []),
            transactions: this.load(DB_KEYS.TX, []), // Migration
            catalogSales: this.load(DB_KEYS.CATALOG_SALES, {
                'Block': [{ size: '6 inch', price: 50 }, { size: '4 inch', price: 40 }, { size: '8 inch', price: 60 }],
                'Ring': [{ size: '3 ft', price: 500 }, { size: '4 ft', price: 700 }, { size: '2 ft', price: 300 }],
                'Cover': [{ size: '1.5 ft', price: 200 }, { size: '2 ft', price: 250 }]
            }),
            catalogPurchase: this.load(DB_KEYS.CATALOG_PURCHASE, {
                'Dust': [{ size: 'Default', price: 0 }],
                'Jalli': [{ size: 'Default', price: 0 }],
                'Cement': [{ size: 'Default', price: 0 }]
            }),
            catalog: this.load(DB_KEYS.CATALOG, {}),
            traders: this.load(DB_KEYS.TRADERS, { 'Walk-in': 'Unknown' }),
            users: this.load(DB_KEYS.USERS, []),
            passRequests: this.load(DB_KEYS.PASS_REQS, []),
            thresholds: this.load(DB_KEYS.THRESHOLDS, {}),
            signupRequests: this.load(DB_KEYS.SIGNUP_REQS, []),

            // UI State
            dashMode: 'sales',
            dateFilter: 'monthly',
            currentPage: 'dashboard'
        };

        // Map property names to DB Keys for auto-saving
        this._keyMap = {
            sales: DB_KEYS.SALES,
            purchases: DB_KEYS.PURCHASE,
            users: DB_KEYS.USERS,
            traders: DB_KEYS.TRADERS,
            thresholds: DB_KEYS.THRESHOLDS,
            passRequests: DB_KEYS.PASS_REQS,
            signupRequests: DB_KEYS.SIGNUP_REQS,
            catalogSales: DB_KEYS.CATALOG_SALES,
            catalogPurchase: DB_KEYS.CATALOG_PURCHASE,
            catalog: DB_KEYS.CATALOG
        };

        // Return a Proxy to intercept all get/set operations
        return new Proxy(this, {
            get(target, prop) {
                // If the property exists in our data, return it
                if (prop in target._data) return target._data[prop];
                // Otherwise check if it's a method on the class
                return target[prop];
            },
            set(target, prop, value) {
                // Update internal data
                target._data[prop] = value;

                // If it's a persisted property, save to local storage
                if (target._keyMap[prop]) {
                    target.save(target._keyMap[prop], value);
                }
                return true;
            }
        });
    }

    load(key, defaultVal) {
        try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : defaultVal;
        } catch (e) {
            console.error(`Error loading key ${key}`, e);
            return defaultVal;
        }
    }

    save(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {
            console.error(`Error saving key ${key}`, e);
            // Don't show toast here to avoid spamming user if loop occurs
        }
    }

    // --- ACTIONS ---

    getCatalog(type) {
        return (type === 'buy' || (type === undefined && this._data.dashMode === 'buy'))
            ? this._data.catalogPurchase
            : this._data.catalogSales;
    }

    saveCatalog(type) {
        const isBuy = (type === 'buy' || (type === undefined && this._data.dashMode === 'buy'));
        // Trigger the Proxy setter by re-assigning the object reference (or deep clone if needed, but here simple trigger)
        if (isBuy) this.catalogPurchase = { ...this._data.catalogPurchase };
        else this.catalogSales = { ...this._data.catalogSales };
    }

    getTransactions(type) {
        return (type === 'buy' || (type === undefined && this._data.dashMode === 'buy'))
            ? this._data.purchases
            : this._data.sales;
    }

    getAllTx() {
        return [
            ...this._data.sales.map(t => ({ ...t, type: t.type || 'sell' })),
            ...this._data.purchases.map(t => ({ ...t, type: t.type || 'buy' }))
        ];
    }

    // --- DATA MUTATORS ---
    addTransaction(tx) {
        if (tx.type === 'sell') {
            this._data.sales.push(tx);
            this.save(DB_KEYS.SALES, this._data.sales);
        } else {
            this._data.purchases.push(tx);
            this.save(DB_KEYS.PURCHASE, this._data.purchases);
        }
    }

    updateTransaction(tx) {
        // Remove from both to ensure type changes are handled (e.g., sell -> buy, rare but possible)
        this.deleteTransaction(tx.id);
        this.addTransaction(tx);
    }

    deleteTransaction(id) {
        let changedSales = false;
        let changedPurchases = false;

        const sIdx = this._data.sales.findIndex(t => t.id === id);
        if (sIdx !== -1) {
            this._data.sales.splice(sIdx, 1);
            changedSales = true;
        }

        const pIdx = this._data.purchases.findIndex(t => t.id === id);
        if (pIdx !== -1) {
            this._data.purchases.splice(pIdx, 1);
            changedPurchases = true;
        }

        if (changedSales) this.save(DB_KEYS.SALES, this._data.sales);
        if (changedPurchases) this.save(DB_KEYS.PURCHASE, this._data.purchases);
    }
}


// Global Singleton Instance
const state = new Store();
