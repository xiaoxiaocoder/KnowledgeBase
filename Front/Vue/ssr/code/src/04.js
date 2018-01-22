const Vue = require('vue')
const server = require('express')()
const renderer = require('vue-server-renderer').createRenderer({
    template: require('fs').readFileSync('./04.template.html', 'utf-8')
})
server.get('*', (req, res) => {
    const app = new Vue({
        data: {
          url: req.url
        },
        template: `<div>访问的 URL 是： {{ url }}</div>`
      })
      const context = {
          title: '<Hello/>',
          meta: `
          <meta charset="utf-8"/>
          <script type="text/javascript" charset="UTF-8" src="https://js.t.sinajs.cn/t6/webim_prime/js/webim.js?v=1516526013553"></script>
        `
      }
      renderer.renderToString(app, context, (err,html) => {
          if(err){
              res.status(500).end('Internal Server Error')
              return
          }
          res.end(html)
          console.log(html)
      })
})
server.listen(8080)