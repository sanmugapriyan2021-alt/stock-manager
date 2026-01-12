"use strict";
const catalog = {
    activeMgrMode: 'sales',

    setMgrMode(mode) {
        this.activeMgrMode = mode;
        const sBtn = document.getElementById('mgr-cat-sales');
        const bBtn = document.getElementById('mgr-cat-buy');
        if (mode === 'sales') {
            sBtn.style.background = 'white'; sBtn.style.color = 'var(--primary)'; sBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            bBtn.style.background = 'transparent'; bBtn.style.color = '#64748B'; bBtn.style.boxShadow = 'none';
        } else {
            bBtn.style.background = 'white'; bBtn.style.color = '#10b981'; bBtn.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            sBtn.style.background = 'transparent'; sBtn.style.color = '#64748B'; sBtn.style.boxShadow = 'none';
        }
        this.render();
    },

    render() {
        const container = document.getElementById('catalog-list');
        if (!container) return;

        const activeCatalog = state.getCatalog(this.activeMgrMode);

        let html = `
            <table style="width:100%; border-collapse:collapse; background:white; border-radius:12px; overflow:hidden; font-size:0.9rem;">
                <thead style="background:#f8fafc; text-align:left;">
                    <tr>
                        <th style="padding:12px; border-bottom:1px solid #e2e8f0;">Product</th>
                        <th style="padding:12px; border-bottom:1px solid #e2e8f0;">Size</th>
                        <th style="padding:12px; border-bottom:1px solid #e2e8f0;">Price (\u20B9)</th>
                        <th style="padding:12px; border-bottom:1px solid #e2e8f0; text-align:right;">Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const canEditCatalog = auth.currentUser && (auth.currentUser.role === 'Master' || (auth.currentUser.permissions && auth.currentUser.permissions.limits));

        let count = 0;
        Object.entries(activeCatalog).forEach(([prod, items]) => {
            if (!Array.isArray(items)) return;

            items.forEach((item, idx) => {
                if (!item || typeof item !== 'object') return; // Ensure item is an object
                count++;
                html += `
                    <tr>
                        <td style="padding:12px; border-bottom:1px solid #f1f5f9; font-weight:600; color:var(--primary);">${prod}</td>
                        <td style="padding:12px; border-bottom:1px solid #f1f5f9;">${item.size || 'N/A'}</td>
                        <td style="padding:12px; border-bottom:1px solid #f1f5f9;">
                            <input type="number" value="${item.price || 0}" 
                                onchange="catalog.updatePrice('${prod}', '${item.size}', this.value)"
                                ${!canEditCatalog ? 'disabled' : ''}
                                style="width:70px; padding:4px; border:1px solid #ddd; border-radius:4px; ${!canEditCatalog ? 'background:#f8fafc; border:none;' : ''}">
                        </td>
                        <td style="padding:12px; border-bottom:1px solid #f1f5f9; text-align:right;">
                            ${canEditCatalog ? `<i class="fas fa-trash" onclick="catalog.removeSize('${prod}', '${item.size}')" 
                               style="cursor:pointer; color:var(--danger); opacity:0.7;"></i>` : ''}
                        </td>
                    </tr>
                `;
            });
        });

        if (count === 0) {
            html += `<tr><td colspan="4" style="text-align:center; padding:40px; color:#94A3B8;">No items in ${this.activeMgrMode === 'sales' ? 'Sales' : 'Purchase'} catalog.</td></tr>`;
        }

        html += `</tbody></table>`;
        container.innerHTML = html;
    },

    updatePrice(prod, size, newPrice) {
        const canEditCatalog = auth.currentUser && (auth.currentUser.role === 'Master' || (auth.currentUser.permissions && auth.currentUser.permissions.limits));
        if (!canEditCatalog) return showToast("Permission Denied: Catalog edit access required", "error");

        const activeCatalog = state.getCatalog(this.activeMgrMode);
        const item = activeCatalog[prod].find(i => i.size === size);
        if (item) {
            item.price = Number(newPrice);
            this.save();
            updateValuation();
        }
    },

    addProduct() {
        const canEditCatalog = auth.currentUser && (auth.currentUser.role === 'Master' || (auth.currentUser.permissions && auth.currentUser.permissions.limits));
        if (!canEditCatalog) return showToast("Permission Denied: Catalog edit access required", "error");

        const name = document.getElementById('new-prod-name').value.trim();
        const size = document.getElementById('new-prod-size').value.trim();
        const price = Number(document.getElementById('new-prod-price').value) || 0;

        if (!name || !size) return showToast("Product name and Size are required", "warning");

        const activeCatalog = state.getCatalog(this.activeMgrMode);
        if (!activeCatalog[name]) activeCatalog[name] = [];

        if (activeCatalog[name].some(i => i.size === size)) {
            return showToast("Size already exists for this product", "warning");
        }

        activeCatalog[name].push({ size: size, price: price });
        this.save();

        document.getElementById('new-prod-name').value = '';
        document.getElementById('new-prod-size').value = '';
        document.getElementById('new-prod-price').value = '';

        this.render();
        updateFormDropdowns();
        renderInventory();
        showToast("Item added successfully!");
    },

    removeSize(prod, size) {
        const canEditCatalog = auth.currentUser && (auth.currentUser.role === 'Master' || (auth.currentUser.permissions && auth.currentUser.permissions.limits));
        if (!canEditCatalog) return showToast("Permission Denied: Catalog edit access required", "error");

        const activeCatalog = state.getCatalog(this.activeMgrMode);
        if (!activeCatalog[prod]) return;
        activeCatalog[prod] = activeCatalog[prod].filter(i => i.size !== size);
        if (activeCatalog[prod].length === 0) delete activeCatalog[prod];

        this.save();
        this.render();
        updateFormDropdowns();
        renderInventory();
    },

    save() {
        state.saveCatalog(this.activeMgrMode);
    }
};

