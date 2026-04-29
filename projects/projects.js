import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
const projectsContainer = document.querySelector('.projects');

const projectsTitle = document.querySelector('.projects-title');
if (projectsTitle) {
    projectsTitle.textContent = `${projects.length} Projects`;
}

renderProjects(projects, projectsContainer, 'h2');

let selectedIndex = -1;
let query = '';


let selectedYear = null; // Top of file


function renderFilteredProjects() {
    let filteredProjects = projects.filter((project) => {
        let values = Object.values(project).join('\n').toLowerCase();
        let matchesSearch = values.includes(query);


        // Filter by the actual year string
        if (selectedYear) {
            return matchesSearch && project.year === selectedYear;
        }
        return matchesSearch;
    });


    renderProjects(filteredProjects, projectsContainer, 'h2');
   
    if (projectsTitle) {
        projectsTitle.textContent = `${filteredProjects.length} Project${filteredProjects.length === 1 ? '' : 's'}`;
    }
}




function renderPieChart(projectsToShow) {
    let rolledData = d3.rollups(projectsToShow, v => v.length, d => d.year);
    let data = rolledData.map(([year, count]) => ({ value: count, label: year }));


    let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
    let pieGenerator = d3.pie().value((d) => d.value);
    let sliceData = pieGenerator(data);
    let colors = d3.scaleOrdinal(d3.schemeTableau10);


    let svg = d3.select('#projects-plot');
    svg.selectAll('path').remove();
    let legend = d3.select('#projects-legend');
    legend.selectAll('*').remove();


    sliceData.forEach((d, i) => {
    svg.append('path')
       .attr('d', arcGenerator(d))
       .attr('fill', colors(i))
       // FIX: Use selectedYear to determine the 'selected' class
       .attr('class', d.data.label === selectedYear ? 'selected' : '')
       .on('click', () => {
           let clickedYear = data[i].label;
           selectedYear = selectedYear === clickedYear ? null : clickedYear;


           renderFilteredProjects();
           renderPieChart(projectsToShow);
       });


    legend.append('li')
          .attr('style', `--color:${colors(i)}`)
          // FIX: Use selectedYear here too so the legend highlights
          .attr('class', `legend-item ${d.data.label === selectedYear ? 'selected' : ''}`)
          .html(`<span class="swatch"></span> ${d.data.label} <em>(${d.data.value})</em>`);
    });
}


// Initial Render
renderProjects(projects, projectsContainer, 'h2');
renderPieChart(projects);
if (projectsTitle) {
    projectsTitle.textContent = `${projects.length} Project${projects.length === 1 ? '' : 's'}`;
}


// Search Listener
let searchInput = document.querySelector('#projects-search');
searchInput.addEventListener('input', (event) => {
    query = event.target.value.toLowerCase();


    // Call the central filter function
    renderFilteredProjects();


    // We still update the pie chart based on the search query
    let searchFiltered = projects.filter(p =>
        Object.values(p).join('\n').toLowerCase().includes(query)
    );
    renderPieChart(searchFiltered);
});
