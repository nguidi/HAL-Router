var	defaults
=	require('../defaults.json')
,	_
=	require('underscore')
,	URL
=	require('url')

module.exports
=	function(app)
	{
		var	config
		=	app.get('custom_config')
		||	require('../config.json')

		if(!config)
			throw new Error("config.json not loaded")

		_.each(
			_.keys(config.server)
		,	function(key)
			{
				app.set(key,config.server[key])
			}
		)

		var	mappings
		=	{}
		,	transforms
		=	{}
		,	db
		=	require(config.db.driver)
		,	status_codes_store
		=	new Object()

		_.each(
			config.status_codes
		,	function(status,code)
			{
				status_codes_store[code]
				=	{
						code:	code
					,	status:	status
					}
			}
		)
		
		_.each(
			_.isArray(config.input)
			?	config.input
			:	new Array(config.input)
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

		app.set(
			'mappings'
		,	mappings
		)
		app.set(
			'transforms'
		,	transforms
		)
		app.set(
			'defaults'
		,	defaults
		)
		app.set(
			'Store'
		,	new db.Store(config,transforms,mappings,app.get('initialize_db'))
		)
		app.set(
			'status_codes'
		,	status_codes_store
		)
		app.set(
			'base_url'
		,	URL.format(
				{
					protocol:	config.server.protocol
				,	hostname:	config.server.host
				,	port:		config.server.port
				,	pathname:	config.server.base
				}
			)
		)
		app.set(
			'api_url'
		,	URL.format(
				{
					protocol:	config.server.protocol
				,	hostname:	config.server.host
				,	port:		config.server.port
				,	pathname:	config.server.api_base+'/{action}'
				}
			)
		)
		app.set(
			'model_url'
		,	URL.format(
				{
					protocol:	config.server.protocol
				,	hostname:	config.server.host
				,	port:		config.server.port
				,	pathname:	config.server.base+'/{action}/{id}/{assoc}'
				}
			)
		)
		app.set(
			'curies'
		,	{
				api:
				[
					{
						name:		'api'
					,	href:		app.get('api_url')
					,	templated:	true
					}
				]
			,	'has-one':
				[
					{
						name:		'show'
					,	href:		app.get('model_url')
					,	templated:	true
					}
				,	{
						name:		'update'
					,	href:		app.get('model_url')
					,	templated:	true
					}
				,	{
						name:		'create'
					,	href:		app.get('model_url')
					,	templated:	true
					}
				,	{
						name:		'delete'
					,	href:		app.get('model_url')
					,	templated:	true
					}
				]
			,	'belongs-to':
				[
					{
						name:		'show'
					,	href:		app.get('model_url')
					,	templated:	true
					}
				]
			,	'has-many':
				[
					{
						name:		'list'
					,	href:		app.get('model_url')
					,	templated:	true
					}
				,	{
						name:		'find'
					,	href:		app.get('model_url')
					,	templated:	true
					}
				,	{
						name:		'filter'
					,	href:		app.get('model_url')
					,	templated:	true
					}
				]
			,	'has-and-belongs-to-many':
				[
					{
						name:		'find'
					,	href:		app.get('model_url')
					,	templated:	true
					}
				,	{
						name:		'filter'
					,	href:		app.get('model_url')
					,	templated:	true
					}
				]
			,	'link':
				[
					{
						name:		'show'
					,	href:		app.get('model_url')
					,	templated:	true
					}
				,	{
						name:		'list'
					,	href:		app.get('model_url')
					,	templated:	true
					}
				,	{
						name:		'filter'
					,	href:		app.get('model_url')
					,	templated:	true
					}
				]
			}
		)
		app.set(
			'api_base'
		,	config.server.api_base
		)
		app.set(
			'api_links'
		,	{
				'api:signin':	{href:	config.application.signin}
			,	'api:signout':	{href:	config.application.signout}
			,	'api:signup':	{href:	config.application.signup}
			}
		)
		app.set(
			'api_users'
		,	config.application.users
		)
		app.set(
			'api_signin'
		,	config.application.signin
		)
		app.set(
			'api_signout'
		,	config.application.signout
		)
		app.set(
			'api_signup'
		,	config.application.signup
		)
	}