console.log('IT\'S ALIVE!');

export function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: 'index.html', title: 'Home' },
  { url: 'projects/index.html', title: 'Projects' },
  { url: 'contact/index.html', title: 'Contact' },
  { url: 'resume/', title: 'Resume' },
  { url: 'meta/index.html', title: 'Meta' },
  { url: 'https://github.com/ctruong0615', title: 'GitHub' },
];

let nav = document.createElement('nav');
document.body.prepend(nav);

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1") 
  ? "/" 
  : "https://ctruong0615.github.io/portfolio/"; 

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  url = !url.startsWith('http') ? BASE_PATH + url : url;


  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  if (a.host === location.host && a.pathname === location.pathname) {
    a.classList.add('current');
  }


  if (a.host !== location.host) {
    a.target = '_blank';
  }

  nav.append(a);
}


document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select id="theme-switcher">
			<option value="light dark">Automatic</option>
			<option value="light">Light</option>
			<option value="dark">Dark</option>
		</select>
	</label>`
);

const select = document.querySelector('#theme-switcher');


function setColorScheme(colorScheme) {
  document.documentElement.style.setProperty('color-scheme', colorScheme);
  select.value = colorScheme;
}


select.addEventListener('input', function (event) {
  setColorScheme(event.target.value);
  localStorage.colorScheme = event.target.value; 
});


if (localStorage.colorScheme) {
  setColorScheme(localStorage.colorScheme);
}

export async function fetchJSON(url) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
    }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    // Clear the container first
    containerElement.innerHTML = '';

    for (let project of projects) {
        const article = document.createElement('article');

        // Step 0.1: Wrap description and year in a div to prevent grid overlap 
        // Adding the project year using 'c. YYYY' format [cite: 92]
        article.innerHTML = `
            <${headingLevel}>${project.title}</${headingLevel}>
            <img src="${project.image}" alt="${project.title}">
            <div class="project-details">
                <p>${project.description}</p>
                <p class="project-year" style="font-family: Baskerville; font-variant-numeric: oldstyle-nums;">
                    c. ${project.year}
                </p>
            </div>
        `;

        containerElement.appendChild(article);
    }
}

