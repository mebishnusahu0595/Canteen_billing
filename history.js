// SQLite database setup and operations
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
        
        loadHistory();
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

// Load history from database
function loadHistory() {
    const historyList = document.getElementById('history-list');
    
    const bills = db.exec(`
        SELECT b.id, b.date, b.total_amount, b.payment_method, b.items_count,
               GROUP_CONCAT(
                   bi.product_name || ' (' || bi.quantity || 'x' || bi.pieces_per_unit || ') - ₹' || bi.total_price
               ) as items
        FROM bills b
        LEFT JOIN bill_items bi ON b.id = bi.bill_id
        GROUP BY b.id
        ORDER BY b.id DESC
    `);
    
    if (!bills || bills.length === 0 || bills[0].values.length === 0) {
        historyList.innerHTML = '<div class="no-history">No bills found in history</div>';
        return;
    }
    
    const billData = bills[0];
    const columns = billData.columns;
    const values = billData.values;
    
    let html = '';
    values.forEach(row => {
        const billId = row[0];
        const date = row[1];
        const totalAmount = row[2];
        const paymentMethod = row[3];
        const itemsCount = row[4];
        const items = row[5] ? row[5].split(',') : [];
        
        html += `
            <div class="bill-card">
                <div class="bill-header">
                    <div>
                        <strong>Bill #${billId}</strong>
                        <br>
                        <small>${date}</small>
                    </div>
                    <div>
                        <strong>₹${totalAmount.toFixed(2)}</strong>
                        <br>
                        <small>${paymentMethod}</small>
                    </div>
                </div>
                <div class="bill-items">
                    ${items.map(item => `<div class="bill-item">${item}</div>`).join('')}
                </div>
                <div class="bill-total">
                    Total: ₹${totalAmount.toFixed(2)} (${itemsCount} items)
                </div>
            </div>
        `;
    });
    
    historyList.innerHTML = html;
}

// Clear all history
function clearHistory() {
    if (confirm('Are you sure you want to clear all bill history? This action cannot be undone.')) {
        db.run('DELETE FROM bill_items');
        db.run('DELETE FROM bills');
        saveDatabase();
        loadHistory();
    }
}

// Save database to localStorage
function saveDatabase() {
    const data = db.export();
    localStorage.setItem('canteen_db', JSON.stringify(Array.from(data)));
}

// Initialize database when page loads
document.addEventListener('DOMContentLoaded', function() {
    initDatabase();
});
