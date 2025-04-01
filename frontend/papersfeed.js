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
  
  try {
    const dt = DateTime.fromISO(dateString);
    if (!dt.isValid) {
      console.warn(`Invalid date string: "${dateString}"`);
      return '';
    }
    
    return dt.toFormat('yyyy-MM-dd');
  } catch (e) {
    console.warn(`Error formatting date: "${dateString}"`, e);
    return '';
  }
}

// Make sure the date string is in a safe format for sorting
function safeDateString(dateString) {
  if (!dateString) return '';
  
  // Extract just the date part for consistent sorting
  try {
    const dt = DateTime.fromISO(dateString);
    return dt.isValid ? dt.toISO() : '';
  } catch (e) {
    return '';
  }
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
            const date = DateTime.fromISO(interaction.timestamp);
            const formattedDate = date.isValid ? date.toLocaleString(DateTime.DATETIME_SHORT) : 'Invalid date';
            
            return `
              <tr>
                <td>${formattedDate}</td>
                <td>${formatReadingTime(interaction.data.duration_seconds)}</td>
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
            <td>${data.publishedFormatted}</td>
          </tr>
          <tr>
            <th>Last Read:</th>
            <td>${data.lastReadFormatted}</td>
          </tr>
          <tr>
            <th>Reading Time:</th>
            <td>${data.readingTimeFormatted}</td>
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

// Process complex data structure with debug logging
function processComplexData(data) {
  console.log("Starting data processing");
  const result = [];
  const objects = data.objects;
  const paperKeys = Object.keys(objects).filter(key => key.startsWith("paper:"));
  console.log(`Found ${paperKeys.length} papers to process`);
  
  for (let i = 0; i < paperKeys.length; i++) {
    const paperKey = paperKeys[i];
    console.log(`Processing paper ${i+1}/${paperKeys.length}: ${paperKey}`);
    
    try {
      const paperId = paperKey.split(":", 2)[1];
      const paperRaw = objects[paperKey];
      const paperData = paperRaw.data;
      const paperMeta = paperRaw.meta || {};
      
      // Debug info for this paper
      console.log(`- Paper ID: ${paperId}, Title: ${paperData.title ? paperData.title.substring(0, 30) + '...' : 'NO TITLE'}`);
      
      const interactionKey = `interactions:${paperId}`;
      console.log(`- Looking for interactions with key: ${interactionKey}`);
      
      // The problem is likely here - check if interactions exist first
      if (!objects[interactionKey]) {
        console.log(`- No interactions found for ${paperId}`);
        
        // Create result without interactions
        result.push({
          id: paperId,
          source: paperData.sourceId || "arxiv",
          title: paperData.title || 'Unknown',
          authors: paperData.authors || '',
          abstract: paperData.abstract || '',
          published: paperData.published_date || '',
          publishedFormatted: formatDate(paperData.published_date || ''),
          firstRead: paperMeta.created_at || '',
          firstReadFormatted: formatDate(paperMeta.created_at || ''),
          lastRead: '',
          lastReadFormatted: '',
          readingTime: 0,
          readingTimeFormatted: 'Not read',
          interactionDays: 0,
          tags: paperData.arxiv_tags || [],
          url: paperData.url || '',
          rawInteractionData: [],
          hasBeenRead: false
        });
        
        console.log(`- Added paper ${paperId} without interactions`);
        continue; // Skip to next paper
      }
      
      const paperInteractions = objects[interactionKey];
      console.log(`- Interaction object found: ${paperInteractions ? 'YES' : 'NO'}`);
      console.log(`- Interaction data exists: ${paperInteractions.data ? 'YES' : 'NO'}`);
      
      if (!paperInteractions.data || !paperInteractions.data.interactions) {
        console.log(`- No valid interactions data for ${paperId}`);
        
        // Create result without interactions
        result.push({
          id: paperId,
          source: paperData.sourceId || "arxiv",
          title: paperData.title || 'Unknown',
          authors: paperData.authors || '',
          abstract: paperData.abstract || '',
          published: paperData.published_date || '',
          publishedFormatted: formatDate(paperData.published_date || ''),
          firstRead: paperMeta.created_at || '',
          firstReadFormatted: formatDate(paperMeta.created_at || ''),
          lastRead: '',
          lastReadFormatted: '',
          readingTime: 0,
          readingTimeFormatted: 'Not read',
          interactionDays: 0,
          tags: paperData.arxiv_tags || [],
          url: paperData.url || '',
          rawInteractionData: [],
          hasBeenRead: false
        });
        
        console.log(`- Added paper ${paperId} without interactions`);
        continue; // Skip to next paper
      }
      
      // Calculate reading time
      let totalReadingTime = 0;
      let lastReadTimestamp = null;
      
      // Calculate unique days with interactions
      const uniqueDays = new Set();
      
      console.log(`- Processing ${paperInteractions.data.interactions.length} interactions`);
      
      for (const interaction of paperInteractions.data.interactions) {
        if (!interaction.data) {
          console.log(`  - Interaction missing data property`);
          continue;
        }
        
        totalReadingTime += interaction.data.duration_seconds || 0;
        
        const sessionTimestamp = interaction.timestamp || interaction.data.end_time;
        if (sessionTimestamp) {
          if (!lastReadTimestamp || sessionTimestamp > lastReadTimestamp) {
            lastReadTimestamp = sessionTimestamp;
          }
          
          try {
            const dtObj = DateTime.fromISO(sessionTimestamp);
            if (dtObj.isValid) {
              uniqueDays.add(dtObj.toISODate());
            }
          } catch (e) {
            console.log(`  - Invalid timestamp: ${sessionTimestamp}`);
          }
        }
      }
      
      const uniqueInteractionDays = uniqueDays.size;
      
      // Prepare preformatted display values
      const publishedFormatted = formatDate(paperData.published_date || '');
      const firstReadFormatted = formatDate(paperMeta.created_at || '');
      const lastReadFormatted = formatDate(lastReadTimestamp || '');
      const readingTimeFormatted = formatReadingTime(totalReadingTime);
      
      // Create the row data
      result.push({
        id: paperId,
        source: paperData.sourceId || "arxiv",
        title: paperData.title || 'Unknown',
        authors: paperData.authors || '',
        abstract: paperData.abstract || '',
        published: paperData.published_date || '',
        publishedFormatted: publishedFormatted,
        firstRead: paperMeta.created_at || '',
        firstReadFormatted: firstReadFormatted,
        lastRead: lastReadTimestamp || '',
        lastReadFormatted: lastReadFormatted,
        readingTime: totalReadingTime,
        readingTimeFormatted: readingTimeFormatted,
        interactionDays: uniqueInteractionDays,
        tags: paperData.arxiv_tags || [],
        url: paperData.url || '',
        rawInteractionData: paperInteractions.data.interactions || [],
        hasBeenRead: lastReadTimestamp !== null
      });
      
      console.log(`- Successfully processed paper ${paperId}`);
      
    } catch (error) {
      console.error(`ERROR processing paper ${paperKey}:`, error);
      // Continue processing other papers
    }
  }
  
  console.log(`Completed processing. ${result.length} papers in final dataset.`);
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
        field: "published", // Use the ISO string for sorting
        widthGrow: 1,
        formatter: function(cell) {
          return cell.getRow().getData().publishedFormatted;
        }
      },
      {
        title: "First Read", 
        field: "firstRead", // Use the ISO string for sorting
        widthGrow: 1,
        formatter: function(cell) {
          return cell.getRow().getData().firstReadFormatted;
        }
      },
      {
        title: "Last Read", 
        field: "lastRead", // Use the ISO string for sorting
        widthGrow: 1,
        formatter: function(cell) {
          return cell.getRow().getData().lastReadFormatted;
        }
      },
      {
        title: "Reading Time", 
        field: "readingTime", // Use seconds for sorting
        widthGrow: 1,
        formatter: function(cell) {
          return cell.getRow().getData().readingTimeFormatted;
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

// Load and initialize with better error visibility
document.addEventListener("DOMContentLoaded", function() {
  const loadingElement = document.querySelector(".loading");
  
  // Fetch data file
  fetch("gh-store-snapshot.json")
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to load data.json");
      }
      return response.json();
    })
    .then(data => {
      try {
        console.log("Data loaded successfully, processing...");
        allData = processComplexData(data);
        console.log("Data processing complete, initializing table...");
        initTable(allData);
        console.log("Table initialized, setting up event listeners...");
        setupEventListeners();
        console.log("Setup complete!");
      } catch (processingError) {
        console.error("ERROR DURING PROCESSING:", processingError);
        
        // Display error on page
        if (loadingElement) {
          loadingElement.innerHTML = `
            <div style="color: red; font-weight: bold;">
              Error processing data: ${processingError.message}
              <br><br>
              Check the console for more details (press F12).
              <pre style="background: #f8f8f8; padding: 10px; border: 1px solid #ddd; margin-top: 10px; max-height: 200px; overflow: auto;">
                ${processingError.stack}
              </pre>
            </div>
          `;
        }
      }
    })
    .catch(error => {
      console.error("FETCH ERROR:", error);
      
      if (loadingElement) {
        loadingElement.innerHTML = `
          <div style="color: red; font-weight: bold;">
            Error loading data: ${error.message}
            <br><br>
            Make sure data.json exists in the same directory as this HTML file.
            <pre style="background: #f8f8f8; padding: 10px; border: 1px solid #ddd; margin-top: 10px; max-height: 200px; overflow: auto;">
              ${error.stack || ''}
            </pre>
          </div>
        `;
      }
    });
});
