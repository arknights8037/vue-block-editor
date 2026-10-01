const navLinks = [...document.querySelectorAll('#nav a')];
const sections = [...document.querySelectorAll('main section[id]')];
const outline = document.querySelector('#outline-links');
const search = document.querySelector('#search');
const sidebar = document.querySelector('#sidebar');
const navGroups = [...document.querySelectorAll('[data-nav-group]')];

const sectionById = id => document.getElementById(id);
const setActive = id => {
  navLinks.forEach(link => link.classList.toggle('active', link.hash === '#' + id));
  const topGroup = ['overview', 'guide', 'quickstart', 'architecture', 'content'].includes(id) ? 'guide'
    : ['components', 'block-editor', 'renderer', 'document-renderer', 'tree', 'document-tree-node', 'document-tree-actions', 'document-tree-menu', 'table', 'provider', 'editor-context-menu', 'editor-bubble-menu', 'slash-menu', 'ui-primitives'].includes(id) ? 'components'
    : ['blocks', 'assets', 'limits'].includes(id) ? 'blocks'
    : 'agent';
  document.querySelectorAll('.top-nav-link').forEach(link => link.classList.toggle('active', link.hash === '#' + topGroup));
  navGroups.forEach(group => { group.hidden = group.dataset.navGroup !== topGroup; });
  document.querySelectorAll('#outline-links a').forEach(link => link.classList.toggle('active', link.hash === '#' + id));
};

// 顶部栏目与左侧目录保持一一对应，只展示当前栏目下的条目。
document.querySelectorAll('.top-nav-link').forEach(link => link.addEventListener('click', () => {
  const group = link.hash.slice(1);
  navGroups.forEach(item => { item.hidden = item.dataset.navGroup !== group; });
}));

const outlineItems = sections.filter(section => section.id !== 'guide').map(section => {
  const link = document.createElement('a');
  link.href = '#' + section.id;
  link.textContent = section.dataset.title || section.querySelector('h2')?.textContent || section.id;
  outline.append(link);
  return link;
});

setActive(location.hash ? location.hash.slice(1) : 'overview');

if (typeof IntersectionObserver !== 'undefined') {
  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setActive(visible.target.id);
  }, { rootMargin: '-18% 0px -68% 0px', threshold: [0, .15, .5] });
  sections.forEach(section => observer.observe(section));
} else {
  const updateActiveSection = () => {
    const current = sections.reduce((best, section) => Math.abs(section.getBoundingClientRect().top - 100) < Math.abs(best.getBoundingClientRect().top - 100) ? section : best, sections[0]);
    if (current) setActive(current.id);
  };
  window.addEventListener('scroll', updateActiveSection, { passive: true });
  updateActiveSection();
}

const jumpToHash = () => {
  const target = location.hash ? sectionById(location.hash.slice(1)) : null;
  if (!target) return;
  setActive(target.id);
  if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' });
};
window.addEventListener('hashchange', jumpToHash);
if (location.hash) setTimeout(jumpToHash, 0);
navLinks.forEach(link => link.addEventListener('click', () => sidebar.classList.remove('open')));

search.addEventListener('input', () => {
  const query = search.value.trim().toLowerCase();
  navLinks.forEach(link => {
    const target = sectionById(link.hash.slice(1));
    const group = link.closest('.nav-group');
    link.hidden = Boolean(query && !target?.textContent.toLowerCase().includes(query));
    if (group) group.hidden = Boolean(query && ![...group.querySelectorAll('a')].some(item => !item.hidden));
  });
});

document.addEventListener('keydown', event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    search.focus();
  }
  if (event.key === 'Escape' && document.activeElement === search) {
    search.value = '';
    search.dispatchEvent(new Event('input'));
    search.blur();
  }
});

document.querySelector('#mobile-menu').addEventListener('click', () => sidebar.classList.toggle('open'));

document.querySelector('#theme-toggle').addEventListener('click', event => {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  event.currentTarget.textContent = isDark ? '☀' : '☾';
  event.currentTarget.setAttribute('aria-label', isDark ? '切换浅色模式' : '切换深色模式');
  if (typeof localStorage !== 'undefined') localStorage.setItem('vue-block-editor-theme', isDark ? 'dark' : 'light');
});
if (typeof localStorage !== 'undefined' && localStorage.getItem('vue-block-editor-theme') === 'dark') {
  document.body.classList.add('dark');
  document.querySelector('#theme-toggle').textContent = '☀';
}

document.querySelectorAll('[data-demo-tab]').forEach(tab => {
  tab.addEventListener('click', () => {
    const name = tab.dataset.demoTab;
    document.querySelectorAll('[data-demo-tab]').forEach(item => item.classList.toggle('active', item === tab));
    document.querySelectorAll('[data-demo-panel]').forEach(panel => panel.classList.toggle('hidden', panel.dataset.demoPanel !== name));
  });
});

document.querySelectorAll('.copy-button').forEach(button => {
  button.addEventListener('click', async () => {
    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(button.dataset.copy || '');
      button.textContent = '已复制';
    } catch {
      button.textContent = '复制失败';
    }
    setTimeout(() => { button.textContent = original; }, 1300);
  });
});




