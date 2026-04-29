import { fetchJSON, renderProjects } from './global.js';

// 1. Render the first 3 projects for the home page preview
const projects = await fetchJSON('./lib/projects.json');
const latestProjects = projects.slice(0, 3);
const projectsContainer = document.querySelector('.projects');

if (projectsContainer) {
    renderProjects(latestProjects, projectsContainer, 'h2');
}

// 2. Fetch and display live GitHub statistics
async function fetchGitHubData(username) {
    const data = await fetchJSON(`https://api.github.com/users/${username}`);
    const profileContainer = document.querySelector('#profile-stats');

    if (profileContainer && data) {
        profileContainer.innerHTML = `
            <dl>
                <dt>Public Repos:</dt><dd>${data.public_repos}</dd>
                <dt>Public Gists:</dt><dd>${data.public_gists}</dd>
                <dt>Followers:</dt><dd>${data.followers}</dd>
                <dt>Following:</dt><dd>${data.following}</dd>
            </dl>
        `;
    } 
}

fetchGitHubData('ctruong0615');