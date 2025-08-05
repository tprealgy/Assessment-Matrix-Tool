// Breadcrumb navigation component
function createBreadcrumb(currentPage, courseName = null) {
  const breadcrumbData = {
    landing: {
      title: 'Välj kurs',
      path: '/landing.html'
    },
    index: {
      title: courseName || 'Kurs',
      path: courseName ? `/?course=${encodeURIComponent(courseName)}` : '/'
    },
    admin: {
      title: 'Admin',
      path: courseName ? `/admin.html?course=${encodeURIComponent(courseName)}` : '/admin.html'
    },
    restore: {
      title: 'Återställ Student',
      path: courseName ? `/restore.html?course=${encodeURIComponent(courseName)}` : '/restore.html'
    }
  };

  const breadcrumbPaths = {
    landing: ['landing'],
    index: ['landing', 'index'],
    admin: ['landing', 'index', 'admin'],
    restore: ['landing', 'index', 'admin', 'restore']
  };

  const path = breadcrumbPaths[currentPage] || ['landing'];
  
  return path.map((page, index) => {
    const isLast = index === path.length - 1;
    const data = breadcrumbData[page];
    
    if (isLast) {
      return `<span class="breadcrumb-current">${data.title}</span>`;
    } else {
      return `<a href="${data.path}" class="breadcrumb-link">${data.title}</a>`;
    }
  }).join('<span class="breadcrumb-separator"> > </span>');
}

function initBreadcrumb(currentPage, courseName = null) {
  const nav = document.querySelector('header nav');
  if (nav) {
    let content = `<div class="breadcrumb">${createBreadcrumb(currentPage, courseName)}</div>`;
    
    // Add admin link for index page
    if (currentPage === 'index' && courseName) {
      content += `<a href="/admin.html?course=${encodeURIComponent(courseName)}" class="nav-link">Admin</a>`;
    }
    
    nav.innerHTML = content;
  }
}