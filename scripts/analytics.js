// TinyUtils - Vercel Web Analytics bootstrap (first-party, minimal)
// Loads the Vercel insights script and sets the global queue helper `va`.
(function(){
  if (window.va) return;
  window.va = window.va || function(){ (window.vaq = window.vaq || []).push(arguments); };
  var s = document.createElement('script');
  s.defer = true;
  s.src = '/_vercel/insights/script.js';
  document.head.appendChild(s);
})();
