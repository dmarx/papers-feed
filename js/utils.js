/* frontend/src/js/utils.js */

const formatDate = (dateString, format = 'full') => {
    const date = new Date(dateString);
    if (format === 'full') {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } else if (format === 'group') {
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};

const getCategoryInfo = (tag) => {
    // Get the parent category (everything before the dot)
    const parentCategory = tag.split('.')[0];
    
    // Using ColorBrewer Set3 qualitative palette, optimized for colorblind accessibility
    const parentCategoryMap = {
        'cs': { color: '#8dd3c7', category: 'Computer Science' },
        'stat': { color: '#ffffb3', category: 'Statistics' },
        'math': { color: '#bebada', category: 'Mathematics' },
        'physics': { color: '#fb8072', category: 'Physics' },
        'q-bio': { color: '#80b1d3', category: 'Quantitative Biology' },
        'q-fin': { color: '#fdb462', category: 'Quantitative Finance' }
    };
    
    // Map of specific subcategory names
    const subcategoryMap = {
        // Computer Science
        'cs.AI': 'Artificial Intelligence',
        'cs.LG': 'Machine Learning',
        'cs.CL': 'Computation and Language',
        'cs.CV': 'Computer Vision and Pattern Recognition',
        'cs.RO': 'Robotics',
        'cs.NE': 'Neural and Evolutionary Computing',
        'cs.IR': 'Information Retrieval',
        'cs.HC': 'Human-Computer Interaction',
        'cs.SI': 'Social and Information Networks',
        'cs.DB': 'Databases',
        
        // Statistics
        'stat.ML': 'Machine Learning (Statistics)',
        'stat.ME': 'Methodology',
        'stat.TH': 'Statistics Theory',
        
        // Mathematics
        'math.ST': 'Statistics Theory',
        'math.PR': 'Probability',
        'math.OC': 'Optimization',
        
        // Physics
        'physics.data-an': 'Data Analysis',
        'physics.soc-ph': 'Social Physics',
        
        // Quantitative Biology
        'q-bio.NC': 'Neurons and Cognition',
        'q-bio.QM': 'Quantitative Methods',
        
        // Quantitative Finance
        'q-fin.ST': 'Statistical Finance',
        'q-fin.PM': 'Portfolio Management'
    };
    
    const parentInfo = parentCategoryMap[parentCategory] || { color: '#f5f5f5', category: 'Other' };
    const name = subcategoryMap[tag] || tag;
    
    return {
        name: name,
        color: parentInfo.color
    };
};
