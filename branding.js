(() => {
  const applySketchyBrand = () => {
    document.title = 'Sketchy!';
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    if (appleTitle) appleTitle.setAttribute('content', 'Sketchy!');
  };

  applySketchyBrand();
  window.addEventListener('load', applySketchyBrand);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) applySketchyBrand();
  });
})();
