
const productList = [
    { name: 'Spring Roll', price: 30, pieces: 6 },
    { name: 'Chole Kulche', price: 40, pieces: 2 },
    { name: 'Cutlet', price: 30, pieces: 2 },
    { name: 'Burger', price: 40, pieces: 1 },
    { name: 'Dhokla', price: 30, pieces: 6 },
    { name: 'Cake, Pastry', price: 30, pieces: 1 },
    { name: 'Haldiram Mixture', price: 20, pieces: 1 },
    { name: 'Water Bottle', price: 20, pieces: 1 },
    { name: 'Chocolate', price: 15, pieces: 1 },
    { name: 'Gol Gappa', price: 10, pieces: 5 },
    { name: 'Dahi Golgapa', price: 20, pieces: 7 },
    { name: 'Chaat', price: 30, pieces: 1 },
    { name: 'Sweet Corn Chaat', price: 30, pieces: 1 },
    { name: 'Dabeli', price: 30, pieces: 2 },
    { name: 'Kachodi', price: 20, pieces: 1 },
    { name: 'Bhel', price: 20, pieces: 1 },
    { name: 'Vada Pav', price: 15, pieces: 1 },
    { name: 'Aloo Patties', price: 20, pieces: 1 },
    { name: 'Paneer Patties', price: 20, pieces: 1 }
];

const billSection = document.getElementById('bill-section');
const billContent = document.getElementById('bill-content');
const paymentMethod = document.getElementById('payment-method');
const shopkeeper = document.getElementById('shopkeeper');
const billModal = document.getElementById('bill-modal');
const closeModal = document.getElementById('close-modal');


let productListDiv;
let searchBar;

function renderProductList(filter = '') {
    productListDiv.innerHTML = '';
    let rendered = false;
    productList.forEach((p, idx) => {
        if (p.name.toLowerCase().includes(filter.toLowerCase())) {
            rendered = true;
            const row = document.createElement('div');
            row.className = 'product-row';
            row.innerHTML = `
                <label>
                    <input type="checkbox" class="product-check" data-idx="${idx}">
                    <span class="product-name">${p.name}</span>
                    <span class="product-pieces" id="pieces-${idx}">– ${p.pieces} Pcs</span>
                    <span class="product-price" id="price-${idx}">– ₹${p.price}</span>
                </label>
                <input type="number" class="product-qty" data-idx="${idx}" min="1" value="1" style="width:60px; margin-left:10px;">
            `;
            productListDiv.appendChild(row);

            // Add real-time update for quantity and bill
            const qtyInput = row.querySelector('.product-qty');
            const checkbox = row.querySelector('.product-check');
            function updateRowAndBill() {
                let qty = parseInt(qtyInput.value);
                if (isNaN(qty) || qty < 1) qty = 1;
                const totalPieces = p.pieces * qty;
                const totalPrice = p.price * qty;
                row.querySelector(`#pieces-${idx}`).textContent = `– ${totalPieces} Pcs`;
                row.querySelector(`#price-${idx}`).textContent = `– ₹${totalPrice}`;
                updateBillPreview();
            }
            qtyInput.addEventListener('input', updateRowAndBill);
            checkbox.addEventListener('change', updateBillPreview);
        }
    });
    if (!rendered) {
        productListDiv.innerHTML = '<div style="color:#1565c0; padding:16px;">No products found.</div>';
    }
    productListDiv.style.display = 'block';
    updateBillPreview();
}

function updateBillPreview() {
    const billPreview = document.getElementById('bill-preview');
    const paymentMethodBill = document.getElementById('payment-method-bill');
    const paymentMethodLeft = document.getElementById('payment-method');
    
    // Sync payment methods
    if (paymentMethodBill && paymentMethodLeft) {
        if (paymentMethodBill.value !== paymentMethodLeft.value) {
            paymentMethodBill.value = paymentMethodLeft.value;
        }
    }
    // Collect selected products
    const selectedProducts = [];
    document.querySelectorAll('.product-check').forEach((checkbox) => {
        if (checkbox.checked) {
            const idx = checkbox.getAttribute('data-idx');
            const qty = parseInt(document.querySelector(`.product-qty[data-idx="${idx}"]`).value);
            const p = productList[idx];
            selectedProducts.push({ ...p, quantity: qty });
        }
    });
    let total = 0;
    let bill = '<pre>';
    bill += '      College Canteen Bill\n';
    bill += '----------------------------------------\n';
    bill += 'Product           Qty  Pieces  Price\n';
    bill += '----------------------------------------\n';
    selectedProducts.forEach(p => {
        const totalPieces = p.pieces * p.quantity;
        const lineTotal = p.price * p.quantity;
        total += lineTotal;
        bill += `${p.name.padEnd(16)} ${p.quantity.toString().padEnd(4)} ${totalPieces.toString().padEnd(7)} ₹${lineTotal.toFixed(2)}\n`;
    });
    bill += '----------------------------------------\n';
    bill += `Total: ₹${total.toFixed(2)}\n`;
    
    // Use the appropriate payment method
    const currentPaymentMethod = document.getElementById('payment-method-bill')?.value || 
                                document.getElementById('payment-method')?.value || 'Cash';
    bill += `Payment: ${currentPaymentMethod}\n`;
    bill += '----------------------------------------\n';
    bill += 'Thank you!\n';
    bill += '</pre>';
    billPreview.innerHTML = bill;
}

document.addEventListener('DOMContentLoaded', function() {
    productListDiv = document.getElementById('product-list');
    searchBar = document.getElementById('search-bar');
    const paymentMethodBill = document.getElementById('payment-method-bill');
    
    // Initialize database
    initDatabase();
    
    renderProductList();
    searchBar.addEventListener('input', function() {
        renderProductList(searchBar.value);
    });
    
    // Sync payment method from bill section to left panel
    paymentMethodBill.addEventListener('change', function() {
        document.getElementById('payment-method').value = paymentMethodBill.value;
        updateBillPreview();
    });
    
    // Sync payment method from left panel to bill section
    document.getElementById('payment-method').addEventListener('change', function() {
        paymentMethodBill.value = this.value;
        updateBillPreview();
    });
});

// SQLite database setup
let SQL;
let db;

// Initialize SQLite database
async function initDatabase() {
    try {
        SQL = await initSqlJs({
            locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        
        // Load existing database or create new one
        const savedDb = localStorage.getItem('canteen_db');
        if (savedDb) {
            const buf = new Uint8Array(JSON.parse(savedDb));
            db = new SQL.Database(buf);
        } else {
            db = new SQL.Database();
            createTables();
        }
    } catch (error) {
        console.error('Error initializing database:', error);
    }
}

// Create tables for storing bills
function createTables() {
    db.run(`
        CREATE TABLE IF NOT EXISTS bills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            total_amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            items_count INTEGER NOT NULL
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS bill_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bill_id INTEGER NOT NULL,
            product_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            pieces_per_unit INTEGER NOT NULL,
            price_per_unit REAL NOT NULL,
            total_price REAL NOT NULL,
            FOREIGN KEY (bill_id) REFERENCES bills (id)
        )
    `);
    
    saveDatabase();
}

// Save bill to database
function saveBill(billData) {
    const stmt = db.prepare(`
        INSERT INTO bills (date, total_amount, payment_method, items_count)
        VALUES (?, ?, ?, ?)
    `);
    
    const date = new Date().toLocaleString('en-IN');
    stmt.run([date, billData.total, billData.paymentMethod, billData.items.length]);
    
    const billId = db.exec("SELECT last_insert_rowid()")[0].values[0][0];
    
    const itemStmt = db.prepare(`
        INSERT INTO bill_items (bill_id, product_name, quantity, pieces_per_unit, price_per_unit, total_price)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    billData.items.forEach(item => {
        itemStmt.run([
            billId,
            item.name,
            item.quantity,
            item.pieces,
            item.price,
            item.totalPrice
        ]);
    });
    
    saveDatabase();
}

// Save database to localStorage
function saveDatabase() {
    const data = db.export();
    localStorage.setItem('canteen_db', JSON.stringify(Array.from(data)));
}

document.getElementById('generate-bill').addEventListener('click', function() {
    // Collect selected products
    const selectedProducts = [];
    document.querySelectorAll('.product-check').forEach((checkbox) => {
        if (checkbox.checked) {
            const idx = checkbox.getAttribute('data-idx');
            const qty = parseInt(document.querySelector(`.product-qty[data-idx="${idx}"]`).value);
            const p = productList[idx];
            selectedProducts.push({ ...p, quantity: qty });
        }
    });
    if (selectedProducts.length === 0) {
        alert('Select at least one product!');
        return;
    }
    
    const method = document.getElementById('payment-method-bill').value;
    let total = 0;
    let bill = '<pre>';
    bill += '      College Canteen Bill\n';
    bill += '----------------------------------------\n';
    bill += 'Product           Qty  Pieces  Price\n';
    bill += '----------------------------------------\n';
    
    const billItems = [];
    selectedProducts.forEach(p => {
        const totalPieces = p.pieces * p.quantity;
        const lineTotal = p.price * p.quantity;
        total += lineTotal;
        bill += `${p.name.padEnd(16)} ${p.quantity.toString().padEnd(4)} ${totalPieces.toString().padEnd(7)} ₹${lineTotal.toFixed(2)}\n`;
        
        billItems.push({
            name: p.name,
            quantity: p.quantity,
            pieces: p.pieces,
            price: p.price,
            totalPrice: lineTotal
        });
    });
    
    bill += '----------------------------------------\n';
    bill += `Total: ₹${total.toFixed(2)}\n`;
    bill += `Payment: ${method}\n`;
    bill += '----------------------------------------\n';
    bill += 'Thank you!\n';
    bill += '</pre>';
    
    billContent.innerHTML = bill;
    billModal.style.display = 'block';
    
    // Save to database
    saveBill({
        items: billItems,
        total: total,
        paymentMethod: method
    });
});

closeModal.addEventListener('click', function() {
    billModal.style.display = 'none';
});

window.onclick = function(event) {
    if (event.target === billModal) {
        billModal.style.display = 'none';
    }
}

document.getElementById('print-bill').addEventListener('click', function() {
    const printWindow = window.open('', '', 'width=600,height=600');
    printWindow.document.write('<html><head><title>Print Bill</title>');
    printWindow.document.write('<style>body{font-family:Courier New,monospace;padding:30px;}pre{background:#fff;padding:20px;border-radius:6px;border:1px solid #eee;}</style>');
    printWindow.document.write('</head><body >');
    printWindow.document.write(billContent.innerHTML);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
});
