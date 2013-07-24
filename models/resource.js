var	_
=	require('underscore')

module.exports
=	function(app)
	{
		var	Resource
		=	require('../lib/resource.js')(app)
		,	checkout
		=	require('../lib/checkout.js')(app)
		,	checkout_result
		=	checkout()
		,	transforms
		=	app.get('transforms')

		if	(checkout_result.errors!=0)
			throw	new Error("Correct Errors to Continue")

		app.set('Model',{})
		_.each(
			transforms
		,	function(transform,transform_name)
			{
				app.get('Model')[transform_name]
				=	new	Resource(
							transform_name
						,	transform
						)
			}
		)
	}