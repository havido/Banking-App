const routes = {
    '/login': { templateId: 'login' },
    '/dashboard': { templateId: 'dashboard' },
    '/credits': { templateId: 'credits' },
}; 

function updateRoute() {
    const path = window.location.pathname;
    const route = routes[path];
    if (!route) {
        return navigate('/login'); // redirect to login if the route is not found
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

updateRoute('login'); // load the login template by default
window.onpopstate = () => updateRoute();
updateRoute(); // load the current route