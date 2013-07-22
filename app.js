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
,	cors
=	require('cors')
,	app
=	express()

app.use(
	cors(
		{
			origin:	'http://trabajando'
		,	credentials:	true
		}
	)
)

app.use(
	express.logger('dev')
)

app.use(
	express.favicon()
)

app.use(
	express.bodyParser()
)

app.use(
	express.cookieParser()
)

load('config')
	.then('models')
	.then('build')
	.then('routes')
	.into(app)

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