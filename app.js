var	_
=	require('underscore')
,	nStore
=	require('nstore')
,	SessionStore
=	require('./lib/nStoreSession.js')
,	Log
=	require('log-color')
,	logger
=	new Log(
		{
			level:	'debug'
		,	color:	true
		}
	)
,	express
=	require('express')
,	load
=	require('express-load')
,	http
=	require('http')
,	app
=	express()

app.use(
	express.bodyParser()
)

app.use(
	express.cookieParser()
)

app.use(
	function(req,res,next)
	{
		res.header('Access-Control-Allow-Origin','*')
		res.header('Access-Control-Allow-Methods','POST, GET, PUT, DELETE, OPTIONS')
		res.header('Access-Control-Allow-Credentials',true)
		res.header('Access-Control-Max-Age',86400)// 24 hours
		res.header('Access-Control-Allow-Headers','X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept')
		if	(_.isEqual(req.method,'OPTIONS'))
			res.send(200)
		else
			next()
	}
)

load('config')
	.then('models')
	.then('response')
	.then('build')
	.then('routes')
	.into(app)

app.use(
	express.logger('dev')
)

app.use(
	express.favicon()
)

app.use(
	express.session(
		{
			secret:	'developers love cats'
		,	store:	new SessionStore(
							{
								dbFile:	'temp/sessions.db'
							,	maxAge:	144000
							}
						)
		,	
		}
	)
)

http
	.createServer(app)
		.listen(
			app.get('port')
		,	function()
			{
				logger.info(app.get('name')+" en funcionamiento")
				logger.info("Escuchando Puerto N° "+app.get('port'))
			}
		)