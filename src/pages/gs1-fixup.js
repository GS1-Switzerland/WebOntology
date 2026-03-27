window.onload=init;

function init() {
  setExternalLinks();
}

function setExternalLinks() { // hyperlinks with class="external" get the Wikipedia external link icon and are set to spawn another window
  var a = document.getElementsByTagName('a');
  for (var i = 0; i < a.length; i++) {
    if (a[i].className.indexOf('external') != -1) {
      a[i].title = 'Opens in a new tab';
      a[i].target = '_blank';
    }
  }
}