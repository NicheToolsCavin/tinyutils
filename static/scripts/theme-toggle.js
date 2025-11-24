;(function(){
  var STORAGE_KEY = 'tinyutils-theme';

  function safeGetStoredTheme(){
    try{
      var value = localStorage.getItem(STORAGE_KEY);
      if(value === 'light' || value === 'dark') return value;
    }catch(e){}
    return null;
  }

  function getInitialTheme(){
    var stored = safeGetStoredTheme();
    if(stored) return stored;
    var prefersLight = false;
    try{
      if(window.matchMedia){
        prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      }
    }catch(e){}
    if(prefersLight) return 'light';
    var attr = document.documentElement.getAttribute('data-theme');
    if(attr === 'light' || attr === 'dark') return attr;
    return 'dark';
  }

  function applyTheme(theme){
    if(theme !== 'light' && theme !== 'dark') theme = 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    try{
      localStorage.setItem(STORAGE_KEY, theme);
    }catch(e){}

    // Swap favicon set to match the active theme (light/dark)
    try{
      var head = document.head || document.getElementsByTagName('head')[0];
      if(head){
        var palette = theme === 'light' ? 'light' : 'dark';
        var base = '/icons/tinyutils-icon-' + palette + '-';

        // remove legacy icons so browsers don't pick stale ones
        var legacy = head.querySelectorAll('link[rel~="icon"]:not([id^="tu-"]), link[rel="apple-touch-icon"]:not([id^="tu-"])');
        legacy.forEach(function(node){ head.removeChild(node); });

        function upsertIcon(rel, sizes, id, href){
          var link = document.getElementById(id);
          if(!link){
            link = document.createElement('link');
            link.id = id;
            link.rel = rel;
            if(sizes) link.sizes = sizes;
            head.appendChild(link);
          }
          if(sizes) link.sizes = sizes;
          link.href = href;
        }

        upsertIcon('icon', '16x16', 'tu-favicon-16', base + '16.png');
        upsertIcon('icon', '32x32', 'tu-favicon-32', base + '32.png');
        upsertIcon('icon', '64x64', 'tu-favicon-64', base + '64.png');
        upsertIcon('icon', '192x192', 'tu-favicon-192', base + '192.png');
        upsertIcon('icon', '512x512', 'tu-favicon-512', base + '512.png');
        upsertIcon('shortcut icon', null, 'tu-shortcut-icon', base + '32.png');
        upsertIcon('apple-touch-icon', '180x180', 'tu-apple-icon', base + '180.png');
      }
    }catch(e){}

    var buttons = document.querySelectorAll('[data-theme-toggle]');
    var label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
    var text = theme === 'dark' ? 'Dark' : 'Light';
    for(var i=0;i<buttons.length;i++){
      var btn = buttons[i];
      btn.setAttribute('aria-label', label);
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
      btn.textContent = text;
    }
  }

  var currentTheme = getInitialTheme();
  applyTheme(currentTheme);

  window.addEventListener('DOMContentLoaded', function(){
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    if(!buttons.length) return;
    for(var i=0;i<buttons.length;i++){
      buttons[i].addEventListener('click', function(){
        var active = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
        var next = active === 'light' ? 'dark' : 'light';
        applyTheme(next);
      });
    }
  });
})();
