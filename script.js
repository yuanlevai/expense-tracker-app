let transactions = [];
let editId = null;
let chartInstance = null;

const STORAGE_KEY = 'expense_tracker_data';
const RENDER_EVENT = 'render-expense';

// ---------------------
// STORAGE
// ---------------------
function isStorageExist() {
    if (typeof (Storage) === 'undefined') {
        alert('Browser tidak mendukung local storage..!')
        return false;
    }
    return true;
}

function loadData() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        const parsedData = JSON.parse(data);

        if (Array.isArray(parsedData)) {
            transactions = parsedData;
        } else {
            transactions = [];
        }
    } catch (error) {
        transactions = [];
    }
}

function saveData() {
    try {
        const data = JSON.stringify(transactions);
        localStorage.setItem(STORAGE_KEY, data);
        return true;
    } catch (error) {
        console.log('Gagal menyimpan:', error.message);
        return false;
    }
}

function generateId() {
    return Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-us', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------
// DOM REFS
// ---------------------
const descriptionInput = document.getElementById('descInput');
const amountInput = document.getElementById('amountInput');
const categorySelect = document.getElementById('categorySelect');
const addBtn = document.getElementById('addBtn');
const expensesList = document.getElementById('expensesList');
const filterCategory = document.getElementById('filterCategory');
const filterType = document.getElementById('filterType');
const totalBalance = document.getElementById('totalBalance');
const totalIncome = document.getElementById('totalIncome');
const totalExpense = document.getElementById('totalExpense');
const transactionCount = document.getElementById('totalTransactions');
const clearAllBtn = document.getElementById('clearAllBtn');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');

// ---------------------
// RENDER
// ---------------------

function renderAll() {
    renderStats();
    renderList();
    renderChart();
}

function renderStats() {
    const total = transactions.reduce((sum, transaction) => {
        return transaction.type === 'income' ? sum + transaction.amount : sum - transaction.amount;
    }, 0);

    const income = transactions
        .filter((transaction) => { return transaction.type === 'income'; })
        .reduce((sum, transaction) => { return sum + transaction.amount; }
            , 0);

    const expense = transactions
        .filter((transaction) => { return transaction.type === 'expense'; })
        .reduce((sum, transaction) => { return sum + transaction.amount; }
            , 0);

    const formatter = new Intl.NumberFormat('id-ID');

    totalBalance.textContent = `Rp. ${formatter.format(total)}`;
    totalIncome.textContent = `Rp. ${formatter.format(income)}`;
    totalExpense.textContent = `Rp. ${formatter.format(expense)}`;
    transactionCount.textContent = transactions.length;
}

function getFilteredTransaction() {
    const category = filterCategory.value;
    const type = filterType.value;

    return transactions.filter((transaction) => {
        if (category !== 'all' && transaction.category !== category) return false;
        if (type !== 'all' && transaction.type !== type) return false;
        return true;
    });
}

function renderList() {
    const filtered = getFilteredTransaction();
    if (filtered.length === 0) {
        return expensesList.innerHTML = `<div class='no-expenses'>
                                            No transaction matches your filters.
                                        </div>`;
    }

    // sort data descending
    const sorted = [...filtered].sort((a, b) => {
        return new Date(b.date) - new Date(a.date)
    });

    let html = '';
    const formatter = new Intl.NumberFormat('id-ID');
    sorted.forEach((transaction) => {
        const isIncome = transaction.type === 'income';
        const amountClass = isIncome ? 'income-amount' : '';
        const sign = isIncome ? '+' : '-';
        html = html +
            `<div class="expense-item" data-id="${transaction.id}">
                <div class="expense-info">
                    <div class="expense-meta">
                        <span class="category-badge">${transaction.category}</span>
                        <span>${transaction.description}</span>
                        <span>${formatDate(transaction.date)}</span>
                        <span style="text-transform: capitalize;">${transaction.type}</span>
                    </div>
                </div>
                <div class="expense-amount ${amountClass}">${sign} Rp. ${formatter.format(transaction.amount)}</div>
                <div class="expense-actions">
                    <button class="edit-btn" data-id="${transaction.id}">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="delete-btn" data-id="${transaction.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>`
    })
    expensesList.innerHTML = html;
}

// ---------------------
// CHART
// ---------------------

function renderChart() {
    const ctx = document.getElementById('categoryChart');
    // expense by category
    const expenses = transactions.filter((transaction) => {
        return transaction.type === 'expense';
    })

    const categoryMap = {};
    expenses.forEach(transaction => {
        categoryMap[transaction.category] = (categoryMap[transaction.category] || 0) + transaction.amount;
    })

    const labels = Object.keys(categoryMap);
    const data = Object.values(categoryMap);
    const colors = [
        '#6366f1', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#ec4899',
        '#14b8a6', '#f97316', '#6b7280',
    ];

    if (chartInstance) {
        chartInstance.destroy();
    }

    if (labels.length === 0) {
        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['No Data'],
                datasets: [{ data: [1], backgroundColor: ['#a5e7eb'] }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                cutout: '70%',
            }
        })
        return;
    }

    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 0,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        font: { size: 11 },
                        padding: 12,
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#1a1a2e',
                    }
                }
            },
            cutout: '65%',
        }
    });
}

// ---------------------
// DATA LOGIC
// ---------------------

function addTransaction(transaction) {
    transactions.push(transaction)
    if (!saveData()) {
        transactions.pop();
        return false;
    }
    return true;
}

function editTransaction(id, data) {
    const index = transactions.findIndex(transaction => {
        return transaction.id === id;
    });

    if (index === -1) { return false; }

    const oldTransaction = { ...transactions[index] };

    transactions[index].description = data.description;
    transactions[index].amount = data.amount;
    transactions[index].category = data.category;
    transactions[index].type = data.type;
    transactions[index].updated = new Date().toISOString();

    if (!saveData()) {
        transactions[index] = oldTransaction;
        return false;
    }

    return true;
}

function deleteTransaction(id) {
    const index = transactions.findIndex(transaction => {
        return transaction.id === id;
    });

    if (index === -1) { return false; }
    const deletedTransaction = transactions[index];

    // hapus
    transactions.splice(index, 1);

    if (!saveData()) {
        transactions.splice(index, 0, deletedTransaction)
        return false;
    }
    return true;
}

function clearTransactions() {
    transactions = [];
}

// ---------------------
// HANDLE ADD / EDIT
// ---------------------

function handleAdd() {
    const description = descriptionInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categorySelect.value;
    const type = document.querySelector('input[name="type"]:checked').value;

    // validation
    if (!description) { alert('Please enter description'); return; }
    if (!Number.isFinite(amount) || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    if (editId) {
        // fungsi update
        const success = editTransaction(editId, {
            description: description,
            amount: amount,
            category: category,
            type: type
        });
        if (!success) {
            alert('Gagal memperbarui transaksi');
            return;
        }
    } else {
        // fungsi add
        const newTransaction = {
            id: generateId(),
            description: description,
            amount: amount,
            category: category,
            type: type,
            date: new Date().toISOString(),
            created: new Date().toISOString(),
        }
        const success = addTransaction(newTransaction);
        if (!success) {
            alert('Gagal menyimpan transaksi');
            return;
        }
    }
    clearForm();
    document.dispatchEvent(new Event(RENDER_EVENT));
}

// ---------------------
// CLEAR FORM
// ---------------------
function clearForm() {
    descriptionInput.value = '';
    amountInput.value = '';
    categorySelect.value = 'Food';
    document.querySelector('input[name="type"][value="expense"]').checked = true;
    editId = null;
    addBtn.innerHTML = `<i class="fas fa-plus"></i> Add`;
    addBtn.style.background = '';
}
// ---------------------
// CLEAR ALL
// ---------------------
function clearAll() {
    if (transactions.length === 0) {
        return;
    }
    if (confirm('Delete all Transactions? this cannot be undone')) {
        const oldTransaction = [...transactions];
        clearTransactions();
        if (!saveData()) {
            transactions = oldTransaction;
            return;
        }
        document.dispatchEvent(new Event(RENDER_EVENT));
        clearForm();
    }
}

// ---------------------
// THEME
// ---------------------

let darkMode = false;
themeToggle.addEventListener('click', () => {
    darkMode = !darkMode;
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');

    themeIcon.className = darkMode ? 'fas fa-sun' : 'fas fa-moon';

    // render chart update colors
    renderChart();
})

// ---------------------
// EVENT DELEGATION
// ---------------------

expensesList.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-btn');
    const editBtn = e.target.closest('.edit-btn');

    // DELETE
    if (deleteBtn) {
        const id = deleteBtn.dataset.id;

        if (confirm('Delete This transactions?..')) {
            const success = deleteTransaction(id);
            if (!success) {
                alert('Gagal menghapus transaksi');
                return;
            }
            if (editId === id) {
                editId = null;
                clearForm();
            }
            document.dispatchEvent(new Event(RENDER_EVENT));
        }

        // EDIT
    } else if (editBtn) {
        const id = editBtn.dataset.id;
        const transaction = transactions.find((tr) => { return tr.id === id; });
        if (transaction) {
            editId = id;
            descriptionInput.value = transaction.description;
            amountInput.value = transaction.amount;
            categorySelect.value = transaction.category;
            // radio
            document.querySelectorAll('input[name="type"]').forEach((radio) => {
                radio.checked = radio.value === transaction.type;
            })

            addBtn.innerHTML = `<i class="fas fa-save"></i> Update`;
            addBtn.style.background = 'var(--warning)';
        }
    }
})

// ---------------------
// EVENT LISTENERS
// ---------------------
addBtn.addEventListener('click', handleAdd);
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.closest('.add-form')) {
        handleAdd();
    }
})

clearAllBtn.addEventListener('click', clearAll);
filterCategory.addEventListener('change', renderList);
filterType.addEventListener('change', renderList);

// ---------------------
// CUSTOM EVENT
// --------------------- 
document.addEventListener(RENDER_EVENT, () => {
    renderAll();
});

// ---------------------
// DEFAULT
// ---------------------

categorySelect.value = 'Food';

// ---------------------
// INIT
// ---------------------

document.addEventListener(
    'DOMContentLoaded',
    () => {
        if (isStorageExist()) {
            loadData();
        }

        document.dispatchEvent(
            new Event(RENDER_EVENT)
        );

        console.log(
            '💰 Expense tracker loaded. data:',
            transactions.length,
            'transactions'
        );
    }
);
