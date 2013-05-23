//require('amd-loader')
var	config
=	require('./config.js')()
if(!config)
	throw new Error("config.js not loaded")
var	base_lib
=	config.paths.lib
,	base_pub
=	config.paths.public
,	server
=	config.server
,	Log
=	require('log-color')
,	logger
=	new Log(
		{
			level:	'debug'
		,	color:	true
		}
	)
,	URL
=	require('url')
,	querystring
=	require('querystring')
,	_
=	require('underscore')
	_.str
=	require('underscore.string');
	_.isDefined
=	function(what)
	{
		return	!_.isUndefined(what)
	}
var	connect
=	require('connect')
,	nor_hal
=	require('nor-hal')
	HAL
=	require(base_lib+'hal.js')(
		_
	,	nor_hal
	)
,	Q
=	require('q')
,	dbStore
=	require(config.server.store)(
		_
	,	Q
	,	logger
	)
,	mappings
=	require(server.input.mappings)
,	transforms
=	require(server.input.transforms)
,	Store
=	new dbStore(config,transforms,mappings)
,	ModelBuilder
=	require(base_lib+'model-builder.js')(
		_
	,	HAL
	,	Q
	,	Store
	,	URL
	)
,	Resource
=	new ModelBuilder(config,mappings,transforms)

logger.info("Server en funcionamiento: "+config.server.name)
logger.info("Escuchando Puerto N° "+config.server.port)

connect()
.use(
	connect.logger('dev')
)
.use(
	connect.bodyParser()
)
.use(
	connect.cookieParser()
)
.use(
	connect.session(
		{
			secret: 'develepors loves cats'
		,	cookie:
			{
				maxAge: 1440000
			}
		}
	)
)
.use(
	connect
		.favicon(
			base_pub+config.conection.icon
		)
)
.use(
	function(req,res)
	{
		var	parsed
		=	URL.parse(req.url.match(RegExp('^'+config.server.base+'(.*)$'))[1]).pathname.split('/')
		var	model_name
		=	_.str
				.capitalize(
					_.isDefined(parsed[3])
					?	_.find(
							Resource[_.str.capitalize(parsed[1])].associations
						,	function(assoc)
							{
								return	assoc.name == parsed[3]
							}
						).target
					:	parsed[1]
				)

		if	(_.isUndefined(Resource[model_name]))
		{
			model_name
			=	'Status_codes'
			req.status_code
			=		400
		}

		Resource[model_name]
			.resolve(
				_.extend(
					req
				,	{
						visited: []
					}
				)
			)
		.then(
			function(hal_result)
			{
				console.log("Server.hal_result")
				res.end(
					JSON.stringify(
						hal_result
					)
				)
			}
		)
	}
)
.listen(
	server.port
)