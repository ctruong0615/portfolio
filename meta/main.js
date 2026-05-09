import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


let data = [];
let commits = [];
let xScale, yScale, rScale;


async function loadData() {
    // Step 1.1: Load CSV with Row Conversion
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
}


function processCommits() {
    // Step 1.2: Group by commit
    commits = d3.groups(data, (d) => d.commit).map(([commit, lines]) => {
        let first = lines[0];
        return {
            id: commit,
            url: 'https://github.com/NathanSu-afk/portfolio/commit/' + commit,
            author: first.author,
            datetime: first.datetime,
            hourFrac: first.datetime.getHours() + first.datetime.getMinutes() / 60,
            totalLines: lines.length,
            lines: lines // Required for Step 5.6
        };
    });
}


function displayStats() {
    // Step 1.3: Display Summary Statistics
    const root = d3.select('#stats').html('');
    const dl = root.append('dl').attr('class', 'stats');
    dl.append('dt').text('TOTAL LOC');
    dl.append('dd').text(data.length);
    dl.append('dt').text('TOTAL COMMITS');
    dl.append('dd').text(commits.length);

    const numFiles = new Set(data.map(d => d.file)).size;
    dl.append('dt').text('FILES');
    dl.append('dd').text(numFiles);

    const maxDepth = d3.max(data, d => d.depth);
    dl.append('dt').text('MAX DEPTH');
    dl.append('dd').text(maxDepth);

    const workByDay = d3.rollup(commits, (v) => v.length, (d) => d.datetime.getDay());
    const days = ['Sun.', 'Mon.', 'Tues.', 'Wed.', 'Thurs.', 'Fri.', 'Sat.'];
    const maxDayEntry = d3.greatest(workByDay, (d) => d[1]);
    dl.append('dt').text('MOST ACTIVE DAY');
    dl.append('dd').text(days[maxDayEntry[0]]);
}


function renderChart() {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 50 };


    const svg = d3.select('#chart').append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');


    // Step 2.2: Set up Scales
    xScale = d3.scaleTime()
        .domain(d3.extent(commits, d => d.datetime))
        .range([margin.left, width - margin.right]).nice();


    yScale = d3.scaleLinear().domain([0, 24]).range([height - margin.bottom, margin.top]);


    // Step 4.1 & 4.2: Area perception scaling (Square Root)
    const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
    rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);


    // Step 2.3: Add Gridlines
    svg.append('g').attr('class', 'gridlines')
        .attr('transform', `translate(${margin.left}, 0)`)
        .call(d3.axisLeft(yScale).tickFormat('').tickSize(-width + margin.left + margin.right));


    // Axes
    svg.append('g').attr('transform', `translate(0, ${height - margin.bottom})`).call(d3.axisBottom(xScale));
    svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale)
        // This line controls the text format.
        // d is the number (0-24). padStart makes 1 look like 01:00
        .tickFormat((d) => String(d).padStart(2, '0') + ':00')
    );


    // Step 2.1: Draw Dots
    const dots = svg.append('g').attr('class', 'dots');
    dots.selectAll('circle').data(commits).join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .attr('opacity', 0.45) // Step 4.3: Transparency
        .on('mouseenter', (event, d) => {
            // Step 3.3: Tooltip visibility and content
            d3.select('#tooltip').style('opacity', 1)
                .style('top', `${event.clientY + 10}px`)
                .style('left', `${event.clientX + 10}px`)
                .html(`<dl><dt>ID</dt><dd>${d.id}</dd><dt>Lines</dt><dd>${d.totalLines}</dd></dl>`);
        })
        .on('mouseleave', () => d3.select('#tooltip').style('opacity', 0));


    // Step 5.1 & 5.2: Brushing
    svg.call(d3.brush().on('start brush end', brushed));
    svg.select('.dots').raise(); // Ensure dots stay on top
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
    // Step 5.4: Visual Highlight
    d3.selectAll('circle').classed('selected', d => selectedCommits.includes(d));
   
    // Step 5.5: Selection Count
    d3.select('#selection-count').text(`${selectedCommits.length || 'No'} commits selected`);


    // Step 5.6: Language Breakdown
    const container = d3.select('#language-breakdown').html('');
    const lines = selectedCommits.flatMap(d => d.lines);
    const breakdown = d3.rollup(lines, v => v.length, d => d.type);
   
    for (const [type, count] of breakdown) {
    // .toUpperCase() ensures "html" becomes "HTML" to match the style of your other labels
    container.append('dt').text(type.toUpperCase());
    container.append('dd').text(`${count} lines (${d3.format('.1%')(count / lines.length)})`);
    }
}


loadData();
