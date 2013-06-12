//require('amd-loader')
var	config
=	require('./config.json')
if(!config)
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
ACL
	.create()
	.then(
		function(data_acl)
		{
			var	ModelCuries
			=	require(base_model+'curies.js')(
					_
				,	URL
				)
			,	ModelApi
			=	require(base_model+'api.js')(
					_
				,	URL
				,	new ModelCuries(config)
				)
			,	ModelAssociation
			=	require(base_model+'association.js')(
					_
				,	URL
				,	Q
				,	new ModelCuries(config)
				,	data_acl
				)
			,	ModelStatusCodes
			=	require(base_model+'status_code.js')(
					_
				,	URL
				,	HAL
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
			,	Application
			=	new ApplicationManager(config)

			logger.info("Server en funcionamiento: "+config.server.name)
			logger.info("Escuchando Puerto N° "+config.server.port)

			var	app
			=	express();

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
				express.cookieSession(
					{
						secret: 'keyboard cat'
					,	cookie:
						{
							maxAge: 1440000
						}
					}
				)
			)
			app.use(
				function(req,res)
				{
					var	Status_codes
					=	new (new ModelStatusCodes(config)).Status_codes()

					res.set(
						config.conection.header
					)

					var requested_url
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