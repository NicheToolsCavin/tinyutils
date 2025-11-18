(function(){
  function downloadBlob(options){
    try{
      var filename = options && options.filename ? String(options.filename) : 'download';
      var mimeType = options && options.mimeType ? String(options.mimeType) : 'application/octet-stream';
      var content = options && options.content;
      if (content == null) return;

      var blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){
        try{
          document.body.removeChild(a);
        }catch(e){}
        try{
          URL.revokeObjectURL(url);
        }catch(e){}
      },0);
    }catch(e){
      // Best-effort helper; failures should not crash the page.
      console.error('downloadBlob failed', e);
    }
  }

  if (!window.tuDownloadBlob) {
    window.tuDownloadBlob = downloadBlob;
  }
})();

