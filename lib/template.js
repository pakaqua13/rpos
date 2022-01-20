module.exports = {
  HTML: function (title, list, body, authStatusUI=`<a href="/auth/login">login</a>`) {
    return `
    <!DOCTYPE html>
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
      <meta charset="utf-8">
      <title>WEB1 - ${title}</title>
    </head>
    <body>
      ${authStatusUI}
      <h1><a href="/">WEB</a></h1>
      ${list}
      ${body}
    </body>
    </html>
    `;
  },
  list: function (filelist) {
    var list = '<ul>';
    var i = 0;
    while (i < filelist.length) {
      list = list + `<li><a href="/page/${filelist[i]}">${filelist[i]}</a></li>`;
      i = i + 1;
    }
    return list;
  }
}