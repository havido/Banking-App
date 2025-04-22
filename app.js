let state = Object.freeze({
    account: null,
}); // centralize all app data in a single state object

const storageKey = 'savedAccount'; // user data will be saved until user explicitly log out

const routes = {
    '/login': { templateId: 'login' },
    '/dashboard': { templateId: 'dashboard', init: refresh },
    '/credits': { templateId: 'credits' },
}; 

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
    document.title = route.templateId.charAt(0).toUpperCase() + route.templateId.slice(1);
}

function navigate(path) {
    // update the URL without reloading the page
    window.history.pushState({}, path, path);
    updateRoute();
}

function onLinkClick(event) {
    event.preventDefault(); // prevent the default link behavior
    navigate(event.target.href); // navigate to the new path
}

async function register() {
    const registerForm = document.getElementById('registerForm');
    const formData = new FormData(registerForm);
    const data = Object.fromEntries(formData);
    const jsonData = JSON.stringify(data);
    const result = await createAccount(jsonData);
    const errorContainer = document.getElementById('errorContainer')
    
    if (result.error) {
        errorContainer.textContent = 'Error: ' + result.error;
        errorContainer.style.display = 'block';
        return console.log('An error occurred:', result.error);
    }

    errorContainer.style.display = 'none'; // hide the error message
    console.log('Account created successfully!', result);

    updateState('account', result);
    navigate('/dashboard');
}

async function createAccount(account) {
    try {
        const response = await fetch('//localhost:5001/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json'},
            body: account
        });
        return await response.json();
    } catch (error) {
        return { error: error.message || 'Unknown error' };
    }
}

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

function logout() {
    updateState('account', null);
    navigate('/login');
}

async function getAccount(user) {
    try {
        const response = await fetch('//localhost:5001/api/accounts/' + encodeURIComponent(user));
        return await response.json();
    } catch (error) {
        return { error: error.message || 'Unknown error' };
    }
}

function updateElement(id, text) {
    const element = document.getElementById(id);
    element.textContent = ''; // removes all children
    element.append(textOrNode);
}

function updateDashboard() {
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

function init() {
    const savedAccount = localStorage.getItem(storageKey);
    if (savedAccount) {
        updateState('account', JSON.parse(savedAccount));
    } 
    window.onpopstate = () => updateRoute();
    updateRoute(); // load the current route
}

init();