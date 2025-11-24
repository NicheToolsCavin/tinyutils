;(function(){
  var GLOBAL_KEY = 'tinyutils-prefs';

  function safeLoadAll(){
    try{
      var raw = localStorage.getItem(GLOBAL_KEY);
      if(!raw) return {};
      var parsed = JSON.parse(raw);
      if(parsed && typeof parsed === 'object') return parsed;
    }catch(e){}
    return {};
  }

  function safeSaveAll(all){
    try{
      localStorage.setItem(GLOBAL_KEY, JSON.stringify(all));
    }catch(e){}
  }

  function loadPrefs(toolKey){
    var all = safeLoadAll();
    var value = all && all[toolKey];
    if(!value || typeof value !== 'object') return null;
    return value;
  }

  function savePrefs(toolKey, prefs){
    if(!toolKey) return;
    var all = safeLoadAll();
    all[toolKey] = prefs;
    safeSaveAll(all);
  }

  window.TinyUtilsStorage = {
    loadPrefs: loadPrefs,
    savePrefs: savePrefs
  };
})();

