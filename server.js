//require('amd-loader')
var	config
=	require('./config.json')
if(!config)
	throw new Error("config.json not loaded")
var defaults
=	require('./defaults.json')
if(!defaults)
	throw new Error("config.json not loaded")
var	base_lib
=	config.paths.lib
,	base_model
=	config.paths.model
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
,	Acl
=	require('virgen-acl').Acl
,	acl
=	new Acl()
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
var	express
=	require('express')
,	load
=	require('express-load')
,	nor_hal
=	require('nor-hal')
	HAL
=	require(base_lib+'hal.js')(
		_
	,	nor_hal
	,	URL
	)
,	Q
=	require('q')
,	uritemplate
=	require(base_lib+'uritemplates.js').parse
,	dbStore
=	require(config.server.store)(
		_
	,	Q
	,	logger
	)
,	mappings
=	{}
,	transforms
=	{}

_.each(
	_.isArray(server.input)
	?	server.input
	:	new Array(server.input)
,	function(input)
	{
		_.extend(
			mappings
		,	require(input.mappings)
		)

		_.extend(
			transforms
		,	require(input.transforms)
		)
	}
)

var	AppCheckout
=	require(base_lib+'checkout.js')(
		_
	,	logger
	)
,	checkout
=	new AppCheckout(defaults,mappings,transforms)
if	(checkout.errors)
	throw "Corrija los errores antes de continuar"
var	Store
=	new dbStore(config,transforms,mappings)
,	Acl
=	require('virgen-acl').Acl
,	acl
=	new Acl()
,	api_acl
=	require(base_lib+'acl.js')(
		_
	,	Store
	,	Q
	,	acl
	)
,	ACL
=	new api_acl(config)
,	nStore
=	require('nstore')
,	SessionStore
=	require(base_lib+'nStoreSession.js')

ACL
	.create()
	.then(
		function(data_acl)
		{
			var	ModelCuries
			=	require(base_model+'curies.js')(
					_
				,	URL
				,	uritemplate
				)
			,	ModelApi
			=	require(base_model+'api.js')(
					_
				,	URL
				,	new ModelCuries(config)
				,	uritemplate
				)
			,	ModelAssociation
			=	require(base_model+'association.js')(
					_
				,	URL
				,	Q
				,	new ModelCuries(config)
				,	data_acl
				,	uritemplate
				)
			,	ModelStatusCodes
			=	require(base_model+'status_code.js')(
					_
				,	URL
				,	HAL
				,	uritemplate
				)
			,	ModelResource
			=	require(base_model+'resource.js')(
					_
				,	URL
				,	Q
				,	HAL
				,	Store
				,	_.extend(
						new ModelApi(config)
					,	new ModelAssociation(config,transforms)
					,	new ModelStatusCodes(config)
					)
				,	uritemplate
				)
			,	ModelBuilder
			=	require(base_lib+'model-builder.js')(
					_
				,	new ModelResource(config,data_acl)
				)
			,	ResourceBuilder
			=	require(base_lib+'builder.js')(
					_
				,	URL
				,	Q
				,	HAL
				,	Store
				,	data_acl
				,	_.extend(
						{
							Resources: new ModelBuilder(config,mappings,transforms)
						}
					,	new ModelStatusCodes(config)	
					)
				)
			,	Builder
			=	new ResourceBuilder(config)
			,	ApplicationManager
			=	require(base_lib+'api.js')(
					_
				,	HAL
				,	Q
				,	Store
				,	_.extend(
						{
							Resources: new ModelBuilder(config,mappings,transforms)
						}
					,	new ModelStatusCodes(config)	
					)
				,	ACL
				)
			,	cors
			=	require('cors')
			,	Application
			=	new ApplicationManager(config)

			logger.info("Server en funcionamiento: "+config.server.name)
			logger.info("Escuchando Puerto N° "+config.server.port)

			var	app
			=	express()

			_.each(
				config.application.rests
			,	function(rest_api)
				{
					_.each(
						require(rest_api)
					,	function(rest)
						{
							app[rest.method](
								rest.url
							,	rest.function
							)
						}
					)
				}
			)

			app.configure(
				function()
				{
					app.use(
						express.logger('dev')
					)
					app.use(
						express
							.favicon(
								base_pub+config.conection.icon
							)
					)
					app.use(
						express.bodyParser()
					)
					app.use(
						express.cookieParser()
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
					app.use(
						cors(
							{
								origin: 'http://trabajando'
							,	methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS']
							,	headers: ['X-Requested-With', 'Content-Type', 'accept']
							,	credentials: true
							}
						)
					)
				}
			)

			load(
				'routes'
			,	{
					checkext:true
				,	extlist:['.js']
				}
			).into(app);

			app.use(
				function(req,res)
				{
					var	Status_codes
					=	new (new ModelStatusCodes(config)).Status_codes()
					,	requested_url
					=	URL.parse(req.url.match(RegExp('^'+config.server.api_base+'(.*)$'))[1]).pathname
					,	api_link
					=	_.find(
							_.keys(config.application.links)
						,	function(name)
							{
								return	_.isEqual(config.application.links[name],requested_url)
							}
						)

					if	(_.isDefined(api_link))
					{
						Application
							.resolve(
								req
							,	api_link
							).then(
								function(hal_result)
								{
									console.log("Application.hal_result")
									res.json(
										hal_result
									)
								}
							)
					}	else 	{
						Builder
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
								console.log("Builder.hal_result")
								res.json(
									hal_result
								)
							}
						)
					}

				}
			)

			app.listen(
				server.port
			)
		}
	)