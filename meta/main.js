import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let data = [];
let commits = [];
let xScale, yScale, rScale;

// Lab 8 Global Variables
let commitMaxTime;
let colors = d3.scaleOrdinal(d3.schemeTableau10); 

async function loadData() {
    data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));

    processCommits();
    displayStats();
    renderChart();
    
    // Initialize Scrollytelling (Slider removed)
    setupScrollytelling();
}

function processCommits() {
    commits = d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
        let first = lines[0];
        return {
            id: commit,
            url: 'https://github.com/ctruong0615/portfolio/commit/' + commit,
            author: first.author,
            datetime: first.datetime,
            hourFrac: first.datetime.getHours() + first.datetime.getMinutes() / 60,
            totalLines: lines.length,
            lines: lines
        };
    });
}

function displayStats() {
    const root = d3.select('#stats').html('');

    const numFiles = d3.groups(data, d => d.file).length;
    const maxDepth = d3.max(data, d => d.depth);
    const longestLine = d3.max(data, d => d.length);
    const maxLines = d3.max(d3.rollup(data, v => v.length, d => d.file).values());

    const statsData = [
        { label: 'COMMITS', value: commits.length },
        { label: 'FILES', value: numFiles },
        { label: 'TOTAL LOC', value: data.length },
        { label: 'MAX DEPTH', value: maxDepth },
        { label: 'LONGEST LINE', value: longestLine },
        { label: 'MAX LINES', value: maxLines }
    ];

    const dl = root.append('dl').attr('class', 'stats');
    
    statsData.forEach(stat => {
        dl.append('dt').text(stat.label);
        dl.append('dd').text(stat.value);
    });
}

function renderChart() {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 50 };

    const svg = d3.select('#chart').append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([margin.left, width - margin.right]).nice();

    yScale = d3.scaleLinear().domain([0, 24]).range([height - margin.bottom, margin.top]);

    const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
    rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

    svg.append('g').attr('class', 'gridlines')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).tickFormat('').tickSize(-width + margin.left + margin.right));

    svg.append('g')
        .attr('class', 'x-axis') 
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(d3.axisBottom(xScale));

    svg.append('g')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).tickFormat((d) => String(d).padStart(2, '0') + ':00'));

    svg.append('g').attr('class', 'dots');
    
    // Draw initial state
    updateScatterPlot(commits); 
    updateFileDisplay(commits);

    svg.call(d3.brush().on('start brush end', brushed));
    svg.select('.dots').raise(); 
}

function updateScatterPlot(filteredCommits) {
    const svg = d3.select('#chart').select('svg');

    xScale.domain(d3.extent(filteredCommits, d => d.datetime));

    const xAxisGroup = svg.select('g.x-axis');
    xAxisGroup.selectAll('*').remove();
    xAxisGroup.call(d3.axisBottom(xScale));

    const dots = svg.select('g.dots');
    const sortedCommits = d3.sort(filteredCommits, d => -d.totalLines);

    dots.selectAll('circle')
        .data(sortedCommits, d => d.id) 
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .style('--r', d => rScale(d.totalLines)) 
        .on('mouseenter', (event, d) => {
            d3.select('#tooltip').style('opacity', 1)
                .style('top', `${event.clientY + 10}px`)
                .style('left', `${event.clientX + 10}px`)
                .html(`<dl><dt>ID</dt><dd>${d.id}</dd><dt>Lines</dt><dd>${d.totalLines}</dd></dl>`);
        })
        .on('mouseleave', () => d3.select('#tooltip').style('opacity', 0));
}

function updateFileDisplay(filteredCommits) {
    let lines = filteredCommits.flatMap((d) => d.lines);
    
    let files = d3.groups(lines, (d) => d.file)
        .map(([name, lines]) => { return { name, lines }; })
        .sort((a, b) => b.lines.length - a.lines.length); 

    let filesContainer = d3.select('#files')
        .selectAll('div')
        .data(files, d => d.name)
        .join(
            enter => enter.append('div').call(div => {
                div.append('dt').html(d => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);
                div.append('dd');
            })
        );

    filesContainer.select('dt small').text(d => `${d.lines.length} lines`);

    filesContainer.select('dd')
        .selectAll('div')
        .data(d => d.lines)
        .join('div')
        .attr('class', 'loc')
        .style('background', d => colors(d.type)); 
}

function setupScrollytelling() {
    // Generate commit text for both scrollytelling sections
    const storyContent = (d, i) => `
        <p>
            On ${d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })},
            I made <a href="${d.url}" target="_blank">${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'}</a>.
            I edited ${d.totalLines} lines across ${d3.rollups(d.lines, D => D.length, d => d.file).length} files.
            Then I looked over all I had made, and I saw that it was very good.
        </p>
    `;

    // Populate Section 1 (Scatter Plot)
    d3.select('#scatter-story')
        .selectAll('.step')
        .data(commits)
        .join('div')
        .attr('class', 'step')
        .html(storyContent);

    // Populate Section 2 (Files)
    d3.select('#file-story')
        .selectAll('.step')
        .data(commits)
        .join('div')
        .attr('class', 'step')
        .html(storyContent);

    // Shared update function for both scrollers
    const handleStepEnter = (response) => {
        const commitDate = response.element.__data__.datetime;
        commitMaxTime = commitDate;
        
        let filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
        updateScatterPlot(filteredCommits);
        updateFileDisplay(filteredCommits);
    };

    // Scroller 1: Scatter Plot
    const scroller1 = scrollama();
    scroller1.setup({
        container: '#scrolly-1',
        step: '#scrolly-1 .step',
        offset: 0.5 
    }).onStepEnter(handleStepEnter);

    // Scroller 2: File Grid
    const scroller2 = scrollama();
    scroller2.setup({
        container: '#scrolly-2',
        step: '#scrolly-2 .step',
        offset: 0.5 
    }).onStepEnter(handleStepEnter);
}

function brushed(event) {
    const selection = event.selection;
    const selectedCommits = !selection ? [] : commits.filter(d => {
        const x = xScale(d.datetime);
        const y = yScale(d.hourFrac);
        return x >= selection[0][0] && x <= selection[1][0] && y >= selection[0][1] && y <= selection[1][1];
    });

    updateSelection(selectedCommits);
}

function updateSelection(selectedCommits) {
    d3.selectAll('circle').classed('selected', d => selectedCommits.includes(d));
    d3.select('#selection-count').text(`${selectedCommits.length || 'No'} commits selected`);

    const container = d3.select('#language-breakdown').html('');
    const lines = selectedCommits.flatMap(d => d.lines);
    const breakdown = d3.rollup(lines, v => v.length, d => d.type);
    
    for (const [type, count] of breakdown) {
        container.append('dt').text(type.toUpperCase());
        container.append('dd').html(`
            ${count} lines <br/>
            <span style="font-size: 0.8em; opacity: 0.8;">
                (${d3.format('.1%')(count / lines.length)})
            </span>
        `);
    }
}

loadData();