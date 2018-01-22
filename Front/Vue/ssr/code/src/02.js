// 与服务器继承
const Vue = require('vue')
const server = require('express')()
const renderer = require('vue-server-renderer').createRenderer()
server.get('*', (req, res) => {
	console.log(1111)
	const app = new Vue({
		data: {
			url: req.url
		},
		template: '<div> 访问的URL是：{{url}}</div>'
	})
	renderer.renderToString(app, (err, html) => {
		if (err) {
			res.status(500).end('Internal server Error')
			return
		}
		res.end(`
		<!DOCTYPE html>
		<html	lang="en">
			<head> <title>Hello</title> </head>
			<body>${html}</body>
			</html>
		`)
	})
})
server.listen(8080)