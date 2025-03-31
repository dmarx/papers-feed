// papersfeed.js
// Global variables
let table;
let allData = [];

// Import Luxon (Add this to your HTML file)
// <script src="https://cdn.jsdelivr.net/npm/luxon@3.4.3/build/global/luxon.min.js"></script>
// Or if using modules:
// import { DateTime } from "luxon";
const { DateTime } = luxon;

// Format date to YYYY-MM-DD format using Luxon
function formatDate(dateString) {
  if (!dateString) return '';
  
  // This is added as a safety check during debugging - can be removed later
  if (typeof dateString !== 'string') {
    console.warn(`Expected string but got ${typeof dateString}:`, dateString);
    return '';
  }
  
  const dt = DateTime.fromISO(dateString);
  if (!dt.isValid) {
    console.warn(`Invalid date string: "${dateString}"`);
    return '';
  }
  
  return dt.toFormat('yyyy-MM-dd');
}

// Format reading time from seconds to a human-readable format using Luxon
function formatReadingTime(seconds) {
  if (!seconds || seconds === 0) return 'Not read';
  
  // Create a duration object from the seconds
  const duration = Duration.fromObject({ seconds });
  
  // Use Luxon's built-in human-readable formatting
  return duration.toHuman({ 
    maximumFractionDigits: 0,
    listStyle: "narrow",
    unitDisplay: "short"
  });
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

// Custom row formatter for row details
function rowDetailFormatter(e, row, onRendered) {
  const data = row.getData();
  
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
            // Use Luxon for date formatting
            const dt = DateTime.fromISO(interaction.timestamp);
            const formattedDate = dt.isValid ? dt.toLocaleString(DateTime.DATETIME_SHORT) : 'Invalid date';
            
            return `
              <tr>
                <td>${formattedDate}</td>
                <td>${interaction.data.duration_seconds} seconds</td>
                <td>${interaction.data.session_id}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }
  
  // Build the detail view
  const element = document.createElement("div");
  element.classList.add("detail-panel");
  
  element.innerHTML = `
    <div class="detail-grid">
      <div class="detail-section">
        <h3>Paper Details</h3>
        <table class="detail-table">
          <tr>
            <th>ID:</th>
            <td>${data.id}</td>
          </tr>
          <tr>
            <th>Authors:</th>
            <td>${data.authors}</td>
          </tr>
          <tr>
            <th>Publication Date:</th>
            <td>${data.published}</td>
          </tr>
          <tr>
            <th>Last Read:</th>
            <td>${data.lastRead}</td>
          </tr>
          <tr>
            <th>Reading Time:</th>
            <td>${data.readingTime}</td>
          </tr>
          <tr>
            <th>Interaction Days:</th>
            <td>${data.interactionDays === 1 ? '1 day' : data.interactionDays + ' days'}</td>
          </tr>
          <tr>
            <th>arXiv Tags:</th>
            <td>${formatTags({ getValue: () => data.tags })}</td>
          </tr>
          <tr>
            <th>URL:</th>
            <td><a href="${data.url}" target="_blank">${data.url}</a></td>
          </tr>
        </table>
      </div>
      
      <div class="detail-section">
        <h3>Abstract</h3>
        <div class="abstract-box">
          ${data.abstract}
        </div>
      </div>
    </div>
    
    <div class="detail-section" style="margin-top: 20px;">
      <h3>Reading Sessions</h3>
      ${formatInteractions(data.rawInteractionData)}
    </div>
  `;
  
  return element;
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
          
          // Find the most recent reading session using Luxon
          if (interaction.timestamp) {
            const sessionDate = DateTime.fromISO(interaction.timestamp);
            
            if (sessionDate.isValid) {
              // Only use valid dates
              if (!lastReadDate || sessionDate > lastReadDate) {
                lastReadDate = sessionDate;
              }
              
              // Track unique days - convert to ISO date format for the Set
              uniqueDays.add(sessionDate.toISODate());
            }
          }
        }
      }
      
      uniqueInteractionDays = uniqueDays.size;
    }
    
    // Convert lastReadDate to ISO string if it exists
    const lastReadString = lastReadDate ? lastReadDate.toISO() : null;
    
    // Create the row data
    result.push({
      id: paperId, //paperData.paper_id || paperData.arxivId,
      source: paperData.sourceId || paperData.sourceType,
      title: paperData.title,
      authors: paperData.authors,
      abstract: paperData.abstract,
      published: paperData.published_date,
      firstRead: paperMeta.created_at, 
      lastRead: lastReadString,
      readingTime: totalReadingTime,
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
    groupBy:"lastRead",
    //rowDetails: rowDetailFormatter,
    rowClickPopup: rowDetailFormatter,
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
        title: "source", 
        field: "source", 
        widthGrow: 1
      },
      {
        title: "Title", 
        field: "title", 
        widthGrow: 3,
        formatter: function(cell) {
          const value = cell.getValue();
          const url = cell.getRow().getData().url;
          return `<a href="${url}" target="_blank">${value}</a>`;
        }
        //,headerFilter: "input"
      },
      {
        title: "Authors", 
        field: "authors", 
        widthGrow: 2
        //,headerFilter: "input"
      },
      {
        title: "Published", 
        field: "published", 
        widthGrow: 1,
        formatter: formatDate
      },
      {
        title: "First Read", 
        field: "firstRead", 
        widthGrow: 1,
        formatter: formatDate
      },
      {
        title: "Last Read", 
        field: "lastRead", 
        widthGrow: 1,
        formatter: formatDate
      },
      {
        title: "Reading Time", 
        field: "readingTime", 
        widthGrow: 1,
        formatter: formatReadingTime
      },
      {
        title: "Days", 
        field: "interactionDays", 
        widthGrow: 1,
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
  });
  
  // Floating filter button
  document.getElementById("filter-toggle-btn").addEventListener("click", function() {
    document.getElementById("sidebar").classList.toggle("active");
  });
  
  // Date filter
  document.getElementById("apply-date-filter").addEventListener("click", function() {
    const fromDate = document.getElementById("date-filter-from").value;
    const toDate = document.getElementById("date-filter-to").value;
    
    table.setFilter(function(data) {
      if (!fromDate && !toDate) return true;
      if (!data.published) return false;
      
      // Use Luxon for date comparison
      const publishedDate = DateTime.fromISO(data.published);
      if (!publishedDate.isValid) return false;
      
      if (fromDate && toDate) {
        return publishedDate >= DateTime.fromISO(fromDate) && 
               publishedDate <= DateTime.fromISO(toDate);
      }
      
      if (fromDate) {
        return publishedDate >= DateTime.fromISO(fromDate);
      }
      
      if (toDate) {
        return publishedDate <= DateTime.fromISO(toDate);
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
