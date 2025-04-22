// --------------------
// CONSTANTS
// --------------------

const storageKey = 'savedAccount'; // user data will be saved until user explicitly log out
const serverUrl = 'http://localhost:5001/api';

// --------------------
// ROUTERS
// --------------------

const routes = {
    '/login': { templateId: 'login' },
    '/dashboard': { templateId: 'dashboard', init: refresh },
    '/credits': { templateId: 'credits' },
}; 

function navigate(path) {
    // update the URL without reloading the page
    window.history.pushState({}, path, window.location.origin + path);
    updateRoute();
}

function updateRoute() {
    const path = window.location.pathname;
    const route = routes[path];
    if (!route) {
        return navigate('/dashboard'); // redirect to dashboard if the route is not found
    }
    const template = document.getElementById(route.templateId);
    const view = template.content.cloneNode(true);
    const app = document.getElementById('app');
    app.innerHTML = ''; // clear the current content
    app.appendChild(view); // append the new content
    
    if (typeof route.init === 'function') {
        route.init();
      }

    document.title = route.templateId.charAt(0).toUpperCase() + route.templateId.slice(1);
}

// --------------------
// API INTERACTIONS
// --------------------

async function sendRequest(api, method, body) {
    try {
        const response = await fetch(serverUrl + api, {
            method: method || 'GET',
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body
        });
        return await response.json();
    } catch (error) {
        return { error: error.message || 'Unknown error' };
    }
}

async function getAccount(user) {
    return sendRequest('/accounts/' + encodeURIComponent(user));
}

async function createAccount(account) {
    return sendRequest('/accounts', 'POST', account);
}

async function createTransaction(user, transaction) {
    return sendRequest('/accounts/' + user + '/transactions', 'POST', transaction);
}

// --------------------
// GLOBAL STATE
// --------------------

let state = Object.freeze({
    account: null
});

/* 
 * Create a new state object and copy data from the previous state, then override a particular property
 * of the state object with the newData, and finally lock the object to prevent modifications using Object.freeze()
 */
function updateState(property, newData) {
    state = Object.freeze({
        ...state,
        [property]: newData,
    });
    localStorage.setItem(storageKey, JSON.stringify(state.account));
}

// --------------------
// LOGIN/REGISTER
// --------------------

async function login() {
    const loginForm = document.getElementById('loginForm')
    const user = loginForm.user.value;
    const data = await getAccount(user);

    if (data.error) {
        return updateElement('loginError', data.error);
    }

    updateState('account', data);
    navigate('/dashboard');
}

async function register() {
    const registerForm = document.getElementById('registerForm');
    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData);
    const jsonData = JSON.stringify(data);
    const result = await createAccount(jsonData);
    
    if (result.error) {
        return updateElement('registerError', result.error);
    }

    updateState('account', result);
    navigate('/dashboard');
}

// --------------------
// DASHBOARD
// --------------------

async function updateAccountData() {
    const account = state.account;
    if (!account) {
        return logout();
    }
    const data = await getAccount(account.user);
    if (data.error) {
        return logout();
    }
    updateState('account', data);
}

async function refresh() {
    await updateAccountData();
    updateDashboard();
}

function updateDashboard() {
    const account = state.account;
    if (!account) {
        return logout();
    }
    updateElement('description', account.description);
    updateElement('balance', account.balance.toFixed(2));
    updateElement('currency', account.currency);

    const transactionsRows = document.createDocumentFragment();
    for (const transaction of account.transactions) {
        const transactionRow = createTransactionRow(transaction);
        transactionsRows.appendChild(transactionRow);
    }
    updateElement('transactions', transactionsRows);
}

function createTransactionRow(transaction) {
    const template = document.getElementById('transaction');
    const transactionRow = template.content.cloneNode(true);
    const tr = transactionRow.querySelector('tr');
    tr.children[0].textContent = transaction.date;
    tr.children[1].textContent = transaction.object;
    tr.children[2].textContent = transaction.amount.toFixed(2);
    return transactionRow;
}

function addTransaction() {
    const dialog = document.getElementById('transactionDialog');
    dialog.classList.add('show');
    
    // reset form
    const transactionForm = document.getElementById('transactionForm');
    transactionForm.reset();

    // set date to today
    transactionForm.date.valueAsDate = new Date();
}

async function confirmTransaction() {
    const dialog = document.getElementById('transactionDialog');
    dialog.classList.remove('show');

    const transactionForm = document.getElementById('transactionForm');
    const formData = new FormData(transactionForm);
    const jsonData = JSON.stringify(Object.fromEntries(formData));
    const data = await createTransaction(state.account.user, jsonData);

    if (data.error) {
        return updateElement('transactionError', data.error);
    }

    // update local state w new transaction
    const newAccount = {
        ...state.account,
        balance: state.account.balance + data.amount,
        transactions: [...state.account.transactions, data],
    };
    updateState('account', newAccount);

    // update display
    updateDashboard();
}

async function cancelTransaction() {
    const dialog = document.getElementById('transactionDialog');
    dialog.classList.remove('show');
}

function logout() {
    updateState('account', null);
    navigate('/login');
}

// --------------------
// UTILS
// --------------------

function updateElement(id, textOrNode) {
    const element = document.getElementById(id);
    element.textContent = ''; // removes all children
    element.append(textOrNode);
}

// -----------------
// INIT
// -----------------

function init() {
    const savedAccount = localStorage.getItem(storageKey);
    if (savedAccount) {
        updateState('account', JSON.parse(savedAccount));
    } 
    window.onpopstate = () => updateRoute();
    updateRoute(); // load the current route
}

init();