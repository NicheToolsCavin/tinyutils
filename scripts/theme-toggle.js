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
    var attr = document.documentElement.getAttribute('data-theme');
    if(attr === 'light' || attr === 'dark') return attr;
    var prefersLight = false;
    try{
      if(window.matchMedia){
        prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
      }
    }catch(e){}
    return prefersLight ? 'light' : 'dark';
  }

  function applyTheme(theme){
    if(theme !== 'light' && theme !== 'dark') theme = 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    try{
      localStorage.setItem(STORAGE_KEY, theme);
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
