var	Resource
=	require('../lib/resource.js')
,	_
=	require('underscore')

module.exports
=	function(app)
	{
		app.set('Model',{})
		_.each(
			app.get('transforms')
		,	function(transform,transform_name)
			{
				app.get('Model')[transform_name]
				=	new	Resource.Model(
							transform_name
						,	transform
						,	app.get('mappings')[transform.storage.name]
						,	app.get('curies')
						)
			}
		)
	}