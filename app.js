var	_
=	require('underscore')
,	fs
=	require('fs')
,	epath
=	require('path')
,	fsExists
=	fs.existsSync || epath.existsSync
,	program
=	require('commander')
		.version('0.0.1')
		.option(
				'-c, --config <config.json>'
			,	'config file [./config.json]'
			,	String
		)
		.option(
				'-i, --initialize'
			,	'Initialize DB'
			,	Boolean
			,	false
		)
		.parse(process.argv)
,	custom_config
=	fsExists(program.config) && require(program.config)
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

if	(custom_config)
	app.set('custom_config',custom_config)

app.use(
	cors(
		{
			origin:	'http://trabajando'
		,	credentials:	true
		}
	)
)
console.log("Mati")
app.use(
	function(req,res,next)
	{
		_.extend(
			req
		,	{
				visited:	new Array()
			}
		)
		next()
	}
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

if	(custom_config.application.routes)
	load(epath.join(__dirname+custom_config.application.routes))
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