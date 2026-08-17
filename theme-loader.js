/* theme-loader.js
   Drop this as the FIRST <script> tag in <head> on every page, before any CSS.
   It reads localStorage and injects the correct theme CSS before the page renders,
   eliminating any flash of the wrong theme.

   Usage (add to every page's <head>, right after the Google Fonts link):
   <script src="theme-loader.js"></script>
*/

(function () {
  const THEMES = {
    default:  'theme-default.css',
    white:    'theme-white.css',
    classic:  'theme-classic.css',
  };

  const saved = localStorage.getItem('cesc_theme') || 'default';
  const file = THEMES[saved] || THEMES['default'];

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.id = 'active-theme';
  link.href = file;
  document.head.appendChild(link);
})();