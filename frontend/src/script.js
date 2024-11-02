/**
 * An object with methods for creating components.
 */
const components = Object.freeze({
  // top navigation bar
  top_nav_bar: () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div class="top-nav-bar">
        <a href="/">Home</a>
        <a href="https://github.com/drew-abbo/song_rating_game">GitHub</a>
        <a href="foo">foo</a>
      </div>`
    );
  },
});
