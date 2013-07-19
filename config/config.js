var	config
=	require('../config.json')
,	_
=	require('underscore')
if(!config)
	throw new Error("config.json not loaded")

module.exports
=	function(app)
	{
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

		app.set('mappings',mappings)
		app.set('transforms',transforms)
		app.set('Store',new db.Store(config,transforms,mappings))
	}