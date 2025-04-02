// Global variables
let table;
let allData = [];

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
    groupBy:"lastRead",
    //rowDetails: rowDetailFormatter,
    //rowClickPopup: rowDetailFormatter,
    // rowClick: function(e, row) {
    //   // POC: reveal the sidebar when a row is clicked
    //   document.getElementById("sidebar").classList.add("active");
    // },
    rowClick: function(e, row) {
      // Get a direct reference to the sidebar
      const sidebar = document.getElementById("sidebar");
      
      // Try forcing the sidebar style directly
      sidebar.style.width = "300px";
      sidebar.style.padding = "20px";
      
      // Also add the active class
      sidebar.classList.add("active");
      
      // Log the result
      console.log("Row clicked, forced sidebar styles:", 
        "width:", sidebar.style.width, 
        "padding:", sidebar.style.padding,
        "classes:", sidebar.className
      );
    },
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
    // rowExpanded: function(row) {
    //   // Adjust the detail row when expanded
    //   const detailEl = row.getElement().nextElementSibling;
    //   if (detailEl && detailEl.classList.contains("tabulator-row-detail")) {
    //     detailEl.style.backgroundColor = "#f9f9f9";
    //   }
    // }
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
