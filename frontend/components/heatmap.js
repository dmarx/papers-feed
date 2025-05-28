// frontend/components/heatmap.js - Reusable heatmap component

class ReadingHeatmap {
  constructor(containerId, options = {}) {
    this.containerId = containerId;
    this.container = d3.select(`#${containerId}`);
    
    // Default configuration
    this.config = {
      cellSize: 11,
      cellGap: 2,
      monthsBack: 8,
      colors: {
        empty: '#ebedf0',
        palette: d3.interpolateGreens,
        border: '#d1d5db',
        borderHover: '#333'
      },
      tooltip: {
        enabled: true,
        className: 'heatmap-tooltip'
      },
      legend: {
        enabled: true,
        labels: ['Less', 'More']
      },
      onClick: null, // Callback for cell clicks
      ...options
    };
    
    this.colorScale = null;
    this.tooltip = null;
    this.data = [];
    this.maxValue = 0;
    
    this.init();
  }
  
  init() {
    // Clear existing content
    this.container.selectAll("*").remove();
    
    // Create main container structure
    this.container
      .style('display', 'flex')
      .style('flex-direction', 'column')
      .style('align-items', 'center');
    
    // Create header container for controls and legend
    this.headerContainer = this.container
      .append('div')
      .attr('class', 'heatmap-header')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('justify-content', 'space-between')
      .style('margin-bottom', '8px')
      .style('font-size', '12px')
      .style('color', '#666')
      .style('font-weight', '500');
    
    // Create SVG container
    this.svgContainer = this.container
      .append('div')
      .attr('class', 'heatmap-svg-container');
    
    // Initialize tooltip if enabled
    if (this.config.tooltip.enabled) {
      this.initTooltip();
    }
  }
  
  initTooltip() {
    // Remove existing tooltip
    d3.select(`body .${this.config.tooltip.className}`).remove();
    
    this.tooltip = d3.select("body")
      .append("div")
      .attr("class", this.config.tooltip.className)
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.9)")
      .style("color", "white")
      .style("padding", "8px 12px")
      .style("border-radius", "6px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000")
      .style("white-space", "nowrap")
      .style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.3)")
      .style("opacity", 0);
  }
  
  createColorScale(data) {
    if (!data || data.length === 0) {
      this.maxValue = 0;
      return d3.scaleOrdinal().domain([0]).range([this.config.colors.empty]);
    }
    
    this.maxValue = d3.max(data, d => d.count) || 1;
    
    // Create a proper color scale that handles 0 values
    this.colorScale = (value) => {
      if (value === 0) return this.config.colors.empty;
      
      if (this.maxValue > 10) {
        // Use log scale for large ranges
        const logScale = d3.scaleSequentialLog(this.config.colors.palette)
          .domain([1, this.maxValue]);
        return logScale(value);
      } else {
        // Use linear scale for small ranges
        const linearScale = d3.scaleSequential(this.config.colors.palette)
          .domain([1, this.maxValue]);
        return linearScale(value);
      }
    };
    
    return this.colorScale;
  }
  
  createLegend() {
    if (!this.config.legend.enabled) return;
    
    const legendContainer = this.headerContainer
      .append('div')
      .attr('class', 'heatmap-legend')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '4px')
      .style('font-size', '11px')
      .style('color', '#666');
    
    // Add "Less" label
    legendContainer.append('span').text(this.config.legend.labels[0]);
    
    // Create legend cells using the same color scale
    const legendValues = this.maxValue === 0 ? [0] : [0, 1, Math.ceil(this.maxValue * 0.25), Math.ceil(this.maxValue * 0.5), Math.ceil(this.maxValue * 0.75), this.maxValue];
    const uniqueValues = [...new Set(legendValues)].sort((a, b) => a - b);
    
    uniqueValues.forEach(value => {
      legendContainer
        .append('div')
        .style('width', '10px')
        .style('height', '10px')
        .style('border', `1px solid ${this.config.colors.border}`)
        .style('border-radius', '2px')
        .style('background-color', this.colorScale ? this.colorScale(value) : this.config.colors.empty);
    });
    
    // Add "More" label
    legendContainer.append('span').text(this.config.legend.labels[1]);
  }
  
  update(data, metric = 'papers') {
    this.data = data || [];
    this.metric = metric;
    
    // Clear existing content except structure
    this.headerContainer.selectAll('*').remove();
    this.svgContainer.selectAll('*').remove();
    
    if (this.data.length === 0) {
      this.svgContainer
        .append("div")
        .style("text-align", "center")
        .style("color", "#666")
        .style("font-size", "12px")
        .style("padding", "20px")
        .text("No data available");
      return;
    }
    
    // Create color scale and legend
    this.createColorScale(this.data);
    this.createLegend();
    
    // Calculate date range
    const endDateTime = new Date();
    endDateTime.setHours(23, 59, 59, 999);
    
    const startDateTime = new Date(endDateTime);
    startDateTime.setMonth(startDateTime.getMonth() - this.config.monthsBack);
    startDateTime.setHours(0, 0, 0, 0);
    
    // Calculate dimensions
    const endSunday = new Date(endDateTime);
    endSunday.setDate(endDateTime.getDate() - endDateTime.getDay());
    endSunday.setHours(0, 0, 0, 0);
    
    const totalWeeks = Math.ceil(d3.timeWeek.count(startDateTime, endSunday)) + 1;
    const width = totalWeeks * (this.config.cellSize + this.config.cellGap);
    const height = 7 * (this.config.cellSize + this.config.cellGap) + 20;
    
    // Set header width to match heatmap
    this.headerContainer.style('width', width + 'px');
    
    // Create SVG
    const svg = this.svgContainer
      .append("svg")
      .attr("width", width)
      .attr("height", height);
    
    // Process data into lookup map
    const dataMap = new Map();
    this.data.forEach(d => {
      const dateStr = d3.timeFormat("%Y-%m-%d")(d.date);
      dataMap.set(dateStr, d.count);
    });
    
    // Generate all dates
    const allDates = d3.timeDays(startDateTime, new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000));
    
    // Create cells with proper styling
    const cells = svg.selectAll(".heatmap-cell")
      .data(allDates)
      .enter()
      .append("rect")
      .attr("class", "heatmap-cell")
      .attr("width", this.config.cellSize)
      .attr("height", this.config.cellSize)
      .attr("rx", 2)
      .attr("ry", 2)
      .attr("x", d => {
        const weeksSinceStart = d3.timeWeek.count(startDateTime, d);
        return weeksSinceStart * (this.config.cellSize + this.config.cellGap);
      })
      .attr("y", d => {
        const dayOfWeek = d.getDay();
        return dayOfWeek * (this.config.cellSize + this.config.cellGap) + 20;
      })
      .attr("fill", d => {
        const dateStr = d3.timeFormat("%Y-%m-%d")(d);
        const count = dataMap.get(dateStr) || 0;
        return this.colorScale(count);
      })
      .attr("stroke", this.config.colors.border)
      .attr("stroke-width", 1)
      .style("cursor", "pointer");
    
    // Add interactions
    if (this.config.tooltip.enabled) {
      this.addTooltipInteractions(cells, dataMap);
    }
    
    if (this.config.onClick) {
      this.addClickInteractions(cells, dataMap);
    }
    
    // Add month and day labels
    this.addLabels(svg, startDateTime, endDateTime);
  }
  
  addTooltipInteractions(cells, dataMap) {
    cells
      .on("mouseover", (event, d) => {
        // Update visual state
        d3.select(event.target)
          .attr("stroke", this.config.colors.borderHover)
          .attr("stroke-width", 2);
        
        // Show tooltip
        const dateStr = d3.timeFormat("%Y-%m-%d")(d);
        const count = dataMap.get(dateStr) || 0;
        const formatDate = d3.timeFormat("%B %d, %Y");
        
        const tooltipText = this.formatTooltipText(d, count, formatDate);
        
        this.tooltip.transition()
          .duration(200)
          .style("opacity", .9);
        
        this.tooltip.html(tooltipText)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", (event, d) => {
        // Restore visual state
        d3.select(event.target)
          .attr("stroke", this.config.colors.border)
          .attr("stroke-width", 1);
        
        // Hide tooltip
        this.tooltip.transition()
          .duration(500)
          .style("opacity", 0);
      });
  }
  
  addClickInteractions(cells, dataMap) {
    cells.on("click", (event, d) => {
      const dateStr = d3.timeFormat("%Y-%m-%d")(d);
      const count = dataMap.get(dateStr) || 0;
      
      if (this.config.onClick) {
        this.config.onClick(d, count, dateStr);
      }
    });
  }
  
  formatTooltipText(date, count, formatDate) {
    // Default tooltip formatting - can be overridden
    let metricText;
    switch (this.metric) {
      case 'papers':
        metricText = `${count} paper${count !== 1 ? 's' : ''} read`;
        break;
      case 'time':
        metricText = `${count} minute${count !== 1 ? 's' : ''} reading`;
        break;
      case 'sessions':
        metricText = `${count} session${count !== 1 ? 's' : ''}`;
        break;
      case 'discoveries':
        metricText = `${count} paper${count !== 1 ? 's' : ''} discovered`;
        break;
      default:
        metricText = `${count} item${count !== 1 ? 's' : ''}`;
    }
    
    return `
      <div><strong>${formatDate(date)}</strong></div>
      <div>${metricText}</div>
    `;
  }
  
  addLabels(svg, startDateTime, endDateTime) {
    // Add month labels
    const monthsInRange = d3.timeMonths(startDateTime, endDateTime);
    svg.selectAll(".month-label")
      .data(monthsInRange)
      .enter()
      .append("text")
      .attr("class", "month-label")
      .attr("x", d => {
        const weeksSinceStart = d3.timeWeek.count(startDateTime, d);
        return weeksSinceStart * (this.config.cellSize + this.config.cellGap);
      })
      .attr("y", 12)
      .style("font-size", "10px")
      .style("fill", "#666")
      .style("font-weight", "500")
      .text(d => d3.timeFormat("%b")(d));
    
    // Add day labels
    const dayLabels = ["M", "", "W", "", "F", "", ""];
    svg.selectAll(".day-label")
      .data(dayLabels)
      .enter()
      .append("text")
      .attr("class", "day-label")
      .attr("x", -8)
      .attr("y", (d, i) => i * (this.config.cellSize + this.config.cellGap) + 20 + this.config.cellSize/2 + 3)
      .attr("text-anchor", "end")
      .style("font-size", "9px")
      .style("fill", "#666")
      .text(d => d);
  }
  
  // Method to update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
  
  // Method to get current data
  getData() {
    return this.data;
  }
  
  // Method to destroy the component
  destroy() {
    if (this.tooltip) {
      this.tooltip.remove();
    }
    this.container.selectAll("*").remove();
  }
}

// Integration helper for the existing codebase
function createReadingHeatmap(data) {
  // Check if we need to initialize the heatmap component
  if (!window.readingHeatmapInstance) {
    window.readingHeatmapInstance = new ReadingHeatmap('reading-heatmap', {
      onClick: (date, count, dateStr) => {
        // Only allow filtering when not viewing paper details
        if (currentDetailsPaper) {
          return;
        }
        
        if (count > 0) {
          const formatDate = d3.timeFormat("%B %d, %Y");
          const dateFilter = function(data) {
            if (!data.rawInteractionData || data.rawInteractionData.length === 0) return false;
            
            return data.rawInteractionData.some(interaction => {
              if (interaction.type === "reading_session" && interaction.timestamp) {
                const interactionDateStr = d3.timeFormat("%Y-%m-%d")(new Date(interaction.timestamp));
                return interactionDateStr === dateStr;
              }
              return false;
            });
          };
          
          // Remove any existing heatmap-date filter and add new one
          filterManager.removeFilter('heatmap-date');
          filterManager.setFilter('heatmap-date', dateFilter, `Read on ${formatDate(date)}`);
        }
      }
    });
  }
  
  // Update the heatmap with new data
  window.readingHeatmapInstance.update(data, currentHeatmapMetric);
}

// Modified version for single paper view
function createSinglePaperHeatmap(data, paperId) {
  if (!window.readingHeatmapInstance) {
    window.readingHeatmapInstance = new ReadingHeatmap('reading-heatmap', {
      onClick: null // Disable clicks for single paper view
    });
  }
  
  // Update tooltip formatter for single paper context
  const originalFormatTooltip = window.readingHeatmapInstance.formatTooltipText;
  window.readingHeatmapInstance.formatTooltipText = function(date, count, formatDate) {
    const metricText = count > 0 ? "Read this paper" : "No activity";
    return `
      <div><strong>${formatDate(date)}</strong></div>
      <div>${metricText}</div>
    `;
  };
  
  window.readingHeatmapInstance.update(data, currentHeatmapMetric);
}
