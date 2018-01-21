const Vue = require('vue')
const server = require('express')()
const renderer = require('vue-server-renderer').createRenderer({
    template: require('fs').readFileSync('./03.template.html', 'utf-8')
})
server.get('*', (req, res) => {
    const app = new Vue({
        data: {
          url: req.url
        },
        template: `<div>访问的 URL 是： {{ url }}</div>`
      })
      renderer.renderToString(app, (err,html) => {
          if(err){
              res.status(500).end('Internal Server Error')
              return
          }
          res.end(html)
          console.log(html)
      })
})
server.listen(8080)