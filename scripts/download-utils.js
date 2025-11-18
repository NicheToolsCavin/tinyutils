(function(){
  /**
   * Downloads a file using Blob URLs with proper cleanup.
   *
   * @param {Object} options - Download configuration
   * @param {string} [options.filename='download'] - The filename for the download
   * @param {string} [options.mimeType='application/octet-stream'] - MIME type of the content
   * @param {Blob|string} options.content - Content to download (Blob or string)
   *
   * @example
   * // Download a CSV file
   * tuDownloadBlob({
   *   filename: 'export.csv',
   *   mimeType: 'text/csv',
   *   content: 'Name,Email\nJohn,john@example.com'
   * });
   *
   * @example
   * // Download from existing Blob
   * tuDownloadBlob({
   *   filename: 'document.pdf',
   *   mimeType: 'application/pdf',
   *   content: pdfBlob
   * });
   */
  function downloadBlob(options){
    var appended = false;
    var url = null;
    try{
      var filename = options && options.filename ? String(options.filename) : 'download';
      var mimeType = options && options.mimeType ? String(options.mimeType) : 'application/octet-stream';
      var content = options && options.content;
      if (content == null) {
        console.warn('tuDownloadBlob: no content provided');
        return;
      }

      var blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
      url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      appended = true;
      a.click();
    }catch(e){
      // Best-effort helper; failures should not crash the page.
      console.error('tuDownloadBlob failed', e);
    }finally{
      // Cleanup: remove anchor and revoke URL after a delay
      setTimeout(function(){
        if (appended) {
          try{
            var anchors = document.querySelectorAll('a[download]');
            for (var i = 0; i < anchors.length; i++) {
              if (anchors[i].href === url) {
                document.body.removeChild(anchors[i]);
                break;
              }
            }
          }catch(e){}
        }
        if (url) {
          try{
            URL.revokeObjectURL(url);
          }catch(e){}
        }
      }, 100);
    }
  }

  if (!window.tuDownloadBlob) {
    window.tuDownloadBlob = downloadBlob;
  }
})();

