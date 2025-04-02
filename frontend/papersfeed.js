// frontend/papersfeed.js
// Global variables
let table;
let allData = [];
let currentDetailsPaper = null;

// Format date to YYYY-MM-DD format
function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

// Format reading time from seconds to minutes
function formatReadingTime(seconds) {
  if (!seconds || seconds === 0) return 'Not read';
  const minutes = Math.round(seconds / 60);
  return minutes + (minutes === 1 ? ' minute' : ' minutes');
}

// Custom cell formatter for tags
function formatTags(cell) {
  const tags = cell.getValue();
  if (!tags || !Array.isArray(tags) || tags.length === 0) {
    return '';
  }
  
  return tags.map(tag => 
    `<span class="tag">${tag}</span>`
  ).join(' ');
}

// Format interactions for display
function formatInteractions(interactions) {
  if (!interactions || interactions.length === 0) {
    return '<p>No reading sessions recorded</p>';
  }
  
  return `
    <table class="sessions-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Duration</th>
          <th>Session ID</th>
        </tr>
      </thead>
      <tbody>
        ${interactions.map(interaction => {
          const date = new Date(interaction.timestamp);
          return `
            <tr>
              <td>${date.toLocaleString()}</td>
              <td>${interaction.data.duration_seconds} seconds</td>
              <td>${interaction.data.session_id}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// Display paper details in the details sidebar
function displayPaperDetails(paperId) {
  const detailsSidebar = document.getElementById('details-sidebar');
  const paper = allData.find(p => p.id === paperId);
  
  if (!paper) {
    console.error('Paper not found:', paperId);
    return;
  }
  
  currentDetailsPaper = paper;
  
  // Update the details content
  const detailsContent = document.getElementById('details-content');
  detailsContent.innerHTML = `
    <div class="details-header">
      <h2>${paper.title}</h2>
      <button id="close-details" class="close-button">
        <i class="fas fa-times"></i>
      </button>
    </div>
    
    <div class="detail-section">
      <h3>Paper Details</h3>
      <table class="detail-table">
        <tr>
          <th>ID:</th>
          <td>${paper.id}</td>
        </tr>
        <tr>
          <th>Authors:</th>
          <td>${paper.authors}</td>
        </tr>
        <tr>
          <th>Publication Date:</th>
          <td>${paper.published}</td>
        </tr>
        <tr>
          <th>Last Read:</th>
          <td>${paper.lastRead}</td>
        </tr>
        <tr>
          <th>Reading Time:</th>
          <td>${paper.readingTime}</td>
        </tr>
        <tr>
          <th>Interaction Days:</th>
          <td>${paper.interactionDays === 1 ? '1 day' : paper.interactionDays + ' days'}</td>
        </tr>
        <tr>
          <th>arXiv Tags:</th>
          <td>${formatTags({ getValue: () => paper.tags })}</td>
        </tr>
        <tr>
          <th>URL:</th>
          <td><a href="${paper.url}" target="_blank">${paper.url}</a></td>
        </tr>
      </table>
    </div>
    
    <div class="detail-section">
      <h3>Abstract</h3>
      <div class="abstract-box">
        ${paper.abstract}
      </div>
    </div>
    
    <div class="detail-section">
      <h3>Reading Sessions</h3>
      ${formatInteractions(paper.rawInteractionData)}
    </div>
  `;
  
  // Show the details sidebar
  detailsSidebar.classList.add('active');
  
  // Set up close button
  document.getElementById('close-details').addEventListener('click', function() {
    detailsSidebar.classList.remove('active');
    currentDetailsPaper = null;
  });
}

// Process complex data structure
function processComplexData(data) {
  const result = [];
  const objects = data.objects;
  const paperKeys = Object.keys(objects).filter(key => key.startsWith("paper:"));
  
  for (const paperKey of paperKeys) {
    const paperId = paperKey.split(":", 1)[1];
    const paperRaw = objects[paperKey];
    const paperData = paperRaw.data;
    const paperMeta = paperRaw.meta;
    const interactionKey = `interactions:${paperId}`;
    const interactionData = objects[interactionKey] ? objects[interactionKey].data : null;
    
    // Calculate reading time
    let totalReadingTime = 0;
    let lastReadDate = null;
    
    // Calculate unique days with interactions
    let uniqueInteractionDays = 0;
    
    if (interactionData && interactionData.interactions) {
      const uniqueDays = new Set();
      
      for (const interaction of interactionData.interactions) {
        if (interaction.type === "reading_session") {
          totalReadingTime += interaction.data.duration_seconds || 0;
          
          // Find the most recent reading session
          const sessionDate = new Date(interaction.timestamp);
          if (!lastReadDate || sessionDate > lastReadDate) {
            lastReadDate = sessionDate;
          }
          
          // Track unique days
          if (interaction.timestamp) {
            const date = new Date(interaction.timestamp);
            const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
            uniqueDays.add(dateString);
          }
        }
      }
      
      uniqueInteractionDays = uniqueDays.size;
    }
    
    // Create the row data
    result.push({
      id: paperId, //paperData.paper_id || paperData.arxivId,
      source: paperData.sourceId || paperData.sourceType,
      title: paperData.title,
      authors: paperData.authors,
      abstract: paperData.abstract,
      published: paperData.published_date ? formatDate(paperData.published_date) : '',
      firstRead: formatDate(paperMeta.created_at),
      lastRead: lastReadDate ? formatDate(lastReadDate) : formatDate(paperMeta.updated_at),
      readingTime: formatReadingTime(totalReadingTime),
      readingTimeSeconds: totalReadingTime,
      interactionDays: uniqueInteractionDays,
      tags: paperData.arxiv_tags || [],
      url: paperData.url,
      rawInteractionData: interactionData ? interactionData.interactions : [],
      hasBeenRead: lastReadDate !== null
    });
  }
  
  return result;
}

// Initialize the Tabulator table
function initTable(data) {
  table = new Tabulator("#papers-table", {
    data: data,
    layout: "fitColumns",
    responsiveLayout: "collapse",
    pagination: "local",
    paginationSize: 100,
    paginationSizeSelector: [10, 25, 50, 100, 500, 1000],
    movableColumns: true,
    groupBy: "lastRead",
    initialSort: [
      {column: "lastRead", dir: "desc"}
    ],
    columns: [
      {
        title: "ID", 
        field: "id", 
        widthGrow: 1
      },
      {
        title: "Source", 
        field: "source", 
        widthGrow: 1
      },
      {
        title: "Title", 
        field: "title", 
        widthGrow: 3,
        formatter: function(cell) {
          const value = cell.getValue();
          return value;
        }
      },
      {
        title: "Authors", 
        field: "authors", 
        widthGrow: 2
      },
      {
        title: "Published", 
        field: "published", 
        widthGrow: 1
      },
      {
        title: "First Read", 
        field: "firstRead", 
        widthGrow: 1
      },
      {
        title: "Last Read", 
        field: "lastRead", 
        widthGrow: 1
      },
      {
        title: "Reading Time", 
        field: "readingTimeSeconds", 
        widthGrow: 1,
        formatter: function(cell) {
          return cell.getRow().getData().readingTime;
        }
      },
      {
        title: "Days", 
        field: "interactionDays", 
        widthGrow: 1,
        formatter: function(cell) {
          const value = cell.getValue();
          if (value === 0) return "None";
          return value === 1 ? "1 day" : `${value} days`;
        }
      },
      {
        title: "Tags", 
        field: "tags", 
        widthGrow: 2,
        formatter: formatTags
      }
    ],
    rowFormatter: function(row) {
      // Add classes based on read status
      if (row.getData().hasBeenRead) {
        row.getElement().classList.add("paper-read");
      } else {
        row.getElement().classList.add("paper-unread");
      }
    }
  });
  
  // Set up row click handler to show details
  table.on("rowClick", function(e, row) {
    e.preventDefault();
    const paperId = row.getData().id;
    displayPaperDetails(paperId);
  });
  
  // Remove loading message
  document.querySelector(".loading").style.display = "none";
}

// Setup event listeners for filters and search
function setupEventListeners() {
  // Global search
  document.getElementById("search-input").addEventListener("input", function(e) {
    table.setFilter(function(data) {
      const searchTerm = e.target.value.toLowerCase();
      if (!searchTerm) return true;
      
      // Search in title, authors, abstract, and tags
      return (
        data.title.toLowerCase().includes(searchTerm) ||
        data.authors.toLowerCase().includes(searchTerm) ||
        data.abstract.toLowerCase().includes(searchTerm) ||
        (data.tags && data.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    });
  });
  
  // Toggle sidebar
  document.getElementById("sidebar-toggle").addEventListener("click", function() {
    document.getElementById("sidebar").classList.toggle("active");
    
    // Close details sidebar if open (to avoid both being open at once)
    document.getElementById("details-sidebar").classList.remove("active");
  });
  
  // Floating filter button
  document.getElementById("filter-toggle-btn").addEventListener("click", function() {
    document.getElementById("sidebar").classList.toggle("active");
    
    // Close details sidebar if open (to avoid both being open at once)
    document.getElementById("details-sidebar").classList.remove("active");
  });
  
  // Toggle details with keyboard escape key
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      document.getElementById("details-sidebar").classList.remove("active");
      document.getElementById("sidebar").classList.remove("active");
    }
  });
  
  // Date filter
  document.getElementById("apply-date-filter").addEventListener("click", function() {
    const fromDate = document.getElementById("date-filter-from").value;
    const toDate = document.getElementById("date-filter-to").value;
    
    table.setFilter(function(data) {
      if (!fromDate && !toDate) return true;
      if (!data.published) return false;
      
      if (fromDate && toDate) {
        return data.published >= fromDate && data.published <= toDate;
      }
      
      if (fromDate) {
        return data.published >= fromDate;
      }
      
      if (toDate) {
        return data.published <= toDate;
      }
      
      return true;
    });
  });
  
  document.getElementById("clear-date-filter").addEventListener("click", function() {
    document.getElementById("date-filter-from").value = "";
    document.getElementById("date-filter-to").value = "";
    table.clearFilter();
  });
  
  // Read/Unread filters
  function updateReadFilter() {
    const showRead = document.getElementById("filter-read").checked;
    const showUnread = document.getElementById("filter-unread").checked;
    
    if (showRead && showUnread) {
      table.removeFilter("hasBeenRead");
      return;
    }
    
    if (showRead) {
      table.setFilter("hasBeenRead", "=", true);
      return;
    }
    
    if (showUnread) {
      table.setFilter("hasBeenRead", "=", false);
      return;
    }
    
    // If neither is checked, show nothing
    table.setFilter(function() { return false; });
  }
  
  document.getElementById("filter-read").addEventListener("change", updateReadFilter);
  document.getElementById("filter-unread").addEventListener("change", updateReadFilter);
  
  // Reading time filter
  document.getElementById("apply-reading-filter").addEventListener("click", function() {
    const minReading = document.getElementById("min-reading-time").value;
    
    if (!minReading) {
      table.removeFilter("readingTimeSeconds");
      return;
    }
    
    const minSeconds = parseInt(minReading) * 60;
    table.setFilter("readingTimeSeconds", ">=", minSeconds);
  });
  
  document.getElementById("clear-reading-filter").addEventListener("click", function() {
    document.getElementById("min-reading-time").value = "";
    table.removeFilter("readingTimeSeconds");
  });
  
  // Interaction days filter
  document.getElementById("apply-days-filter").addEventListener("click", function() {
    const minDays = document.getElementById("min-interaction-days").value;
    
    if (!minDays) {
      table.removeFilter("interactionDays");
      return;
    }
    
    table.setFilter("interactionDays", ">=", parseInt(minDays));
  });
  
  document.getElementById("clear-days-filter").addEventListener("click", function() {
    document.getElementById("min-interaction-days").value = "";
    table.removeFilter("interactionDays");
  });
  
  // Reset all filters
  document.getElementById("reset-all-filters").addEventListener("click", function() {
    // Clear all input fields
    document.getElementById("search-input").value = "";
    document.getElementById("date-filter-from").value = "";
    document.getElementById("date-filter-to").value = "";
    document.getElementById("min-reading-time").value = "";
    document.getElementById("min-interaction-days").value = "";
    
    // Reset checkboxes
    document.getElementById("filter-read").checked = true;
    document.getElementById("filter-unread").checked = true;
    
    // Clear all table filters
    table.clearFilter();
  });
}

// Load and initialize
document.addEventListener("DOMContentLoaded", function() {
  // Fetch data file
  fetch("gh-store-snapshot.json")
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to load data.json");
      }
      return response.json();
    })
    .then(data => {
      allData = processComplexData(data);
      initTable(allData);
      setupEventListeners();
    })
    .catch(error => {
      document.querySelector(".loading").innerHTML = 
        `Error loading data: ${error.message}. Make sure data.json exists in the same directory as this HTML file.`;
    });
});
